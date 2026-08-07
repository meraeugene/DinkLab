"use client";

import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { createManualBooking } from "@/actions/bookings/createManualBooking";
import { acquireBookingHold } from "@/actions/bookings/acquireBookingHold";
import { releaseBookingHold } from "@/actions/bookings/releaseBookingHold";
import { MAX_IMAGE_SIZE } from "@/data/booking/bookingWidget";
import type {
  BookingStep,
  BookingHold,
  BookingSelection,
  BookingWidgetProps,
  PaymentAmountMode,
  PaymentErrors,
  PaymentMethod,
  ProofUpload,
  Toast,
  ToastTone,
} from "@/types/bookingWidget";
import type { AccessChoiceAction } from "@/types/auth";
import { useBookingAvailability } from "@/hooks/useBookingAvailability";
import {
  addMonths,
  buildCalendarDates,
  getDayStatus,
} from "@/utils/booking/bookingWidgetCalendar";
import { deletePaymentProofUpload } from "@/utils/payments/deletePaymentProofUpload";
import { uploadPaymentProof } from "@/utils/payments/uploadPaymentProof";
import type { CourtSlot } from "@/lib/time";
import { createClient } from "@/utils/supabase/browser";

export function useBookingWidget({
  courts,
  signedIn,
  initialDate,
  initialEmail = "",
  initialName = "",
}: BookingWidgetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessAction, setAccessAction] =
    useState<AccessChoiceAction>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [hasBookingSession, setHasBookingSession] = useState(signedIn);
  const [step, setStep] = useState<BookingStep>("schedule");
  const [date, setDate] = useState(initialDate);
  const [calendarMonth, setCalendarMonth] = useState(initialDate.slice(0, 7));
  const [selections, setSelections] = useState<BookingSelection[]>([]);
  const [customerName, setCustomerName] = useState(initialName);
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [paymentMethod] = useState<PaymentMethod>("GOTYME");
  const [paymentAmountMode, setPaymentAmountMode] =
    useState<PaymentAmountMode>("HALF");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofUpload, setProofUpload] = useState<ProofUpload | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofDeleting, setProofDeleting] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState<PaymentErrors>({});
  const [bookingHold, setBookingHold] = useState<BookingHold | null>(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [loadingTimeStep, setLoadingTimeStep] = useState(false);
  const [continuingToPayment, setContinuingToPayment] = useState(false);
  const selectingDateRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  const calendarDates = useMemo(
    () => buildCalendarDates(calendarMonth),
    [calendarMonth],
  );
  const courtIds = useMemo(
    () => courts.map((court) => court.id),
    [courts],
  );
  const {
    availabilityByDate,
    displaySlotsByCourt,
    selectedDateLoading,
    refreshAvailabilityForDate,
  } = useBookingAvailability({
    calendarDates,
    calendarMonth,
    courtIds,
    date,
    initialDate,
    open,
  });
  const refreshAvailabilityRef = useRef(refreshAvailabilityForDate);

  useEffect(() => {
    refreshAvailabilityRef.current = refreshAvailabilityForDate;
  }, [refreshAvailabilityForDate]);

  useEffect(() => {
    document.body.style.overflow = open || accessModalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [accessModalOpen, open]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (step !== "payment" || !bookingHold) return;

    function updateCountdown() {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(bookingHold!.expiresAt).getTime() - Date.now()) / 1000),
      );
      setHoldSecondsRemaining(seconds);
      if (seconds > 0) return;

      setBookingHold(null);
      setStep("schedule");
      setToast({
        message: "Your 10-minute hold expired. Please select the times again before paying.",
        tone: "error",
      });
      void refreshAvailabilityRef.current().catch(() => undefined);
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [bookingHold, step]);

  const selectedSlots = useMemo(
    () =>
      selections.flatMap((selection) => {
        const court = courts.find((item) => item.id === selection.courtId);
        const slot = displaySlotsByCourt[selection.courtId]?.find(
          (item) => item.startHour === selection.startHour,
        );
        return court && slot ? [{ court, slot }] : [];
      }),
    [courts, displaySlotsByCourt, selections],
  );

  function showToast(message: string, tone: ToastTone = "info") {
    setToast({ message, tone });
  }

  function closeOverlay() {
    if (isPending || loadingTimeStep || continuingToPayment) return;
    releaseActiveHold();
    if (step === "payment") setStep("schedule");
    if (step === "submitted") resetForAnotherBooking();
    setOpen(false);
    setToast(null);
  }

  function releaseActiveHold() {
    const token = bookingHold?.token;
    setBookingHold(null);
    setHoldSecondsRemaining(0);
    if (!token) return;

    void releaseBookingHold(token).finally(() => {
      void refreshAvailabilityForDate().catch(() => undefined);
    });
  }

  function openBookingFlow() {
    if (!hasBookingSession) {
      setAccessError(null);
      setAccessModalOpen(true);
      return;
    }
    setOpen(true);
  }

  function closeAccessModal() {
    if (accessAction) return;
    setAccessModalOpen(false);
    setAccessError(null);
  }

  async function continueAsGuest() {
    setAccessError(null);
    setAccessAction("guest");
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setAccessAction(null);
      setAccessError(
        error.message.toLowerCase().includes("anonymous")
          ? "Guest booking is not enabled yet. Enable anonymous sign-ins in Supabase."
          : "Unable to start a guest session. Please try again.",
      );
      return;
    }

    setHasBookingSession(true);
    setAccessAction(null);
    setAccessModalOpen(false);
    setOpen(true);
    router.refresh();
  }

  async function continueWithGoogle() {
    setAccessError(null);
    setAccessAction("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setAccessAction(null);
      setAccessError("Unable to continue with Google. Please try again.");
    }
  }

  async function selectDate(value: string) {
    if (selectingDateRef.current) return;
    selectingDateRef.current = true;
    setDate(value);
    setSelections([]);
    setLoadingTimeStep(true);

    try {
      const availability = await refreshAvailabilityForDate(value);
      const slots = Object.values(availability).flat();
      const freshStatus = getDayStatus(value, initialDate, slots);

      if (freshStatus !== "available") {
        showToast(
          freshStatus === "full"
            ? "That day is now fully booked. Please choose another day."
            : "That day is no longer available. Please choose another day.",
          "error",
        );
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to load availability.",
        "error",
      );
    } finally {
      selectingDateRef.current = false;
      setLoadingTimeStep(false);
    }
  }

  function chooseCalendarMonth(month: string) {
    setCalendarMonth(month);
    if (!date.startsWith(month)) {
      const firstDay = `${month}-01`;
      setDate(
        firstDay < initialDate && initialDate.startsWith(month)
          ? initialDate
          : firstDay,
      );
      setSelections([]);
    }
  }

  function chooseSlot(courtId: string, slot: CourtSlot) {
    if (!slot.available) return;
    setSelections((current) => {
      const exists = current.some(
        (item) => item.courtId === courtId && item.startHour === slot.startHour,
      );
      return exists
        ? current.filter(
            (item) =>
              !(item.courtId === courtId && item.startHour === slot.startHour),
          )
        : [...current, { courtId, startHour: slot.startHour }];
    });
  }

  async function continueToPayment() {
    if (!selections.length || continuingToPayment) return;
    setContinuingToPayment(true);
    try {
      const availability = await refreshAvailabilityForDate();
      const availableSelections = selections.filter((selection) =>
        availability[selection.courtId]?.some(
          (slot) => slot.startHour === selection.startHour && slot.available,
        ),
      );
      setSelections(availableSelections);
      if (availableSelections.length !== selections.length) {
        showToast(
          "Some selected times are no longer available. Please review your selection.",
          "error",
        );
        return;
      }

      const formData = new FormData();
      formData.append("date", date);
      formData.append("selections", JSON.stringify(availableSelections));
      const result = await acquireBookingHold(formData);
      if (!result.ok || !result.holdToken || !result.expiresAt) {
        await refreshAvailabilityForDate().catch(() => undefined);
        showToast(result.error || "Unable to hold these slots.", "error");
        return;
      }

      setBookingHold({ token: result.holdToken, expiresAt: result.expiresAt });
      setHoldSecondsRemaining(
        Math.max(0, Math.ceil((new Date(result.expiresAt).getTime() - Date.now()) / 1000)),
      );
      setStep("payment");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to confirm availability.",
        "error",
      );
    } finally {
      setContinuingToPayment(false);
    }
  }

  async function handleProofUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Payment image must be an image file.", "error");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showToast("Payment image must be 5MB or smaller.", "error");
      return;
    }

    setProofUploading(true);
    try {
      const previousPublicId = proofUpload?.publicId;
      const upload = await uploadPaymentProof(file);

      setProofUpload({
        fileName: file.name,
        publicId: upload.publicId,
        secureUrl: upload.secureUrl,
      });
      setPaymentErrors((current) => ({ ...current, proof: undefined }));
      showToast("Payment image uploaded.", "success");

      if (previousPublicId) {
        await deletePaymentProofUpload(previousPublicId).catch(() => undefined);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to upload payment image.",
        "error",
      );
    } finally {
      setProofUploading(false);
    }
  }

  async function removeProofUpload() {
    if (!proofUpload) return;

    setProofDeleting(true);
    try {
      await deletePaymentProofUpload(proofUpload.publicId);
      setProofUpload(null);
      showToast("Payment image removed.", "info");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to remove payment image.",
        "error",
      );
    } finally {
      setProofDeleting(false);
    }
  }

  function goBack() {
    if (
      step === "payment" &&
      !isPending &&
      !loadingTimeStep &&
      !continuingToPayment
    ) {
      releaseActiveHold();
      setStep("schedule");
    }
  }

  function resetForAnotherBooking() {
    setStep("schedule");
    setSelections([]);
    setPaymentAmountMode("HALF");
    setReferenceNumber("");
    setProofUpload(null);
    setPaymentErrors({});
    setToast(null);
    setBookingHold(null);
    setHoldSecondsRemaining(0);
  }

  function backToSiteAfterSubmit() {
    resetForAnotherBooking();
    closeOverlay();
    router.refresh();
  }

  function updateCustomerContact(value: string) {
    setCustomerContact(value.replace(/\D/g, "").slice(0, 15));
    setPaymentErrors((current) => ({ ...current, contact: undefined }));
  }

  function updateCustomerEmail(value: string) {
    setCustomerEmail(value.slice(0, 254));
    setPaymentErrors((current) => ({ ...current, email: undefined }));
  }

  function updateCustomerName(value: string) {
    setCustomerName(value.slice(0, 120));
    setPaymentErrors((current) => ({ ...current, name: undefined }));
  }

  function updateReferenceNumber(value: string) {
    setReferenceNumber(value.slice(0, 120));
  }

  function submitManualBooking() {
    const nextErrors: PaymentErrors = {};

    if (!selectedSlots.length || selectedSlots.length !== selections.length) {
      showToast("Select at least one available time slot first.", "error");
      return;
    }
    if (customerName.trim().length < 2) {
      nextErrors.name = "Enter your full name.";
    }
    if (!/^\d{7,15}$/.test(customerContact.trim())) {
      nextErrors.contact = "Enter a valid contact number.";
    }
    if (customerEmail.trim() && !/^\S+@\S+\.\S+$/.test(customerEmail.trim())) {
      nextErrors.email = "Enter a valid email address or leave it blank.";
    }
    if (!proofUpload) {
      nextErrors.proof = "Upload a screenshot of your payment.";
    }
    if (Object.keys(nextErrors).length) {
      setPaymentErrors(nextErrors);
      showToast("Please correct all highlighted booking details.", "error");
      return;
    }
    if (!hasBookingSession) {
      showToast("Choose guest or Google access before booking.", "error");
      return;
    }
    if (!bookingHold || holdSecondsRemaining <= 0) {
      showToast("Your slot hold expired. Please select the times again.", "error");
      setStep("schedule");
      void refreshAvailabilityForDate().catch(() => undefined);
      return;
    }
    setPaymentErrors({});

    const formData = new FormData();
    formData.append("date", date);
    formData.append("selections", JSON.stringify(selections));
    formData.append("holdToken", bookingHold.token);
    formData.append("customerName", customerName);
    formData.append("customerContact", customerContact);
    if (customerEmail.trim()) {
      formData.append("customerEmail", customerEmail.trim());
    }
    formData.append("paymentMethod", paymentMethod);
    formData.append("paymentAmountMode", paymentAmountMode);
    formData.append(
      "referenceNumber",
      referenceNumber,
    );
    if (proofUpload) {
      formData.append("paymentProofUrl", proofUpload.secureUrl);
      formData.append("paymentProofPublicId", proofUpload.publicId);
    }

    startTransition(async () => {
      const result = await createManualBooking(formData);
      if (result?.ok) {
        setBookingHold(null);
        setHoldSecondsRemaining(0);
        showToast("Booking submitted successfully.", "success");
        setStep("submitted");
        return;
      }
      if (result && "fieldErrors" in result && result.fieldErrors) {
        setPaymentErrors(result.fieldErrors);
      }
      const errorMessage = result?.error?.toLowerCase() || "";
      if (
        errorMessage.includes("slot") ||
        errorMessage.includes("hold") ||
        errorMessage.includes("reserved")
      ) {
        setBookingHold(null);
        setHoldSecondsRemaining(0);
        await refreshAvailabilityForDate().catch(() => undefined);
        setStep("schedule");
      }
      showToast(result?.error || "Unable to submit booking.", "error");
    });
  }

  return {
    accessAction,
    accessError,
    accessModalOpen,
    availabilityByDate,
    backToSiteAfterSubmit,
    calendarDates,
    calendarMonth,
    chooseCalendarMonth,
    chooseSlot,
    closeAccessModal,
    continueToPayment,
    continuingToPayment,
    continueAsGuest,
    continueWithGoogle,
    closeOverlay,
    courts,
    customerContact,
    customerEmail,
    customerName,
    date,
    displaySlotsByCourt,
    goBack,
    handleProofUpload,
    isPending,
    loadingTimeStep,
    selectedDateLoading,
    open,
    openBookingFlow,
    paymentAmountMode,
    paymentErrors,
    paymentMethod,
    proofDeleting,
    proofUpload,
    proofUploading,
    referenceNumber,
    removeProofUpload,
    selectedSlots,
    selections,
    selectDate,
    setPaymentAmountMode,
    setStep,
    setToast,
    step,
    submitManualBooking,
    toast,
    updateCustomerContact,
    updateCustomerEmail,
    updateCustomerName,
    updateReferenceNumber,
    nextMonth: () => chooseCalendarMonth(addMonths(calendarMonth, 1)),
    previousMonth: () => chooseCalendarMonth(addMonths(calendarMonth, -1)),
  };
}
