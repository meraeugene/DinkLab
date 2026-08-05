"use client";

import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { useBookingAvailability } from "@/hooks/useBookingAvailability";
import {
  addMonths,
  buildCalendarDates,
  getDayStatus,
} from "@/utils/booking/bookingWidgetCalendar";
import { deletePaymentProofUpload } from "@/utils/payments/deletePaymentProofUpload";
import { uploadPaymentProof } from "@/utils/payments/uploadPaymentProof";
import type { CourtSlot } from "@/lib/time";

export function useBookingWidget({
  courts,
  signedIn,
  initialDate,
  initialName = "",
}: BookingWidgetProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>("schedule");
  const [date, setDate] = useState(initialDate);
  const [calendarMonth, setCalendarMonth] = useState(initialDate.slice(0, 7));
  const [selections, setSelections] = useState<BookingSelection[]>([]);
  const [customerName, setCustomerName] = useState(initialName);
  const [customerContact, setCustomerContact] = useState("");
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
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
    if (isPending || loadingTimeStep) return;
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
    if (!signedIn) {
      showToast("Please sign in first before booking.", "error");
      return;
    }
    setOpen(true);
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
    if (!selections.length) return;
    setLoadingTimeStep(true);
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
      setLoadingTimeStep(false);
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
    if (step === "payment" && !isPending && !loadingTimeStep) {
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
  }

  function updateCustomerContact(value: string) {
    setCustomerContact(value.replace(/\D/g, "").slice(0, 15));
    setPaymentErrors((current) => ({ ...current, contact: undefined }));
  }

  function updateCustomerName(value: string) {
    setCustomerName(value.slice(0, 120));
    setPaymentErrors((current) => ({ ...current, name: undefined }));
  }

  function updateReferenceNumber(value: string) {
    setReferenceNumber(value);
  }

  function submitManualBooking() {
    const nextErrors: PaymentErrors = {};

    if (!selectedSlots.length || selectedSlots.length !== selections.length) {
      showToast("Select at least one available time slot first.", "error");
      return;
    }
    if (customerName.trim().length < 2) {
      nextErrors.name = "Enter your full name.";
      setPaymentErrors(nextErrors);
      showToast("Enter your full name.", "error");
      return;
    }
    if (!/^\d{7,15}$/.test(customerContact.trim())) {
      nextErrors.contact = "Invalid contact number";
      setPaymentErrors(nextErrors);
      showToast("Enter a valid contact number.", "error");
      return;
    }
    if (!signedIn) {
      showToast("Please sign in with Google before booking.", "error");
      return;
    }
    if (!bookingHold || holdSecondsRemaining <= 0) {
      showToast("Your slot hold expired. Please select the times again.", "error");
      setStep("schedule");
      void refreshAvailabilityForDate().catch(() => undefined);
      return;
    }
    if (!proofUpload) {
      nextErrors.proof = "Upload a screenshot of your payment.";
      setPaymentErrors(nextErrors);
      showToast("Upload your payment screenshot before booking.", "error");
      return;
    }
    setPaymentErrors({});

    const formData = new FormData();
    formData.append("date", date);
    formData.append("selections", JSON.stringify(selections));
    formData.append("holdToken", bookingHold.token);
    formData.append("customerName", customerName);
    formData.append("customerContact", customerContact);
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
    availabilityByDate,
    backToSiteAfterSubmit,
    calendarDates,
    calendarMonth,
    chooseCalendarMonth,
    chooseSlot,
    continueToPayment,
    closeOverlay,
    courts,
    customerContact,
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
    updateCustomerName,
    updateReferenceNumber,
    nextMonth: () => chooseCalendarMonth(addMonths(calendarMonth, 1)),
    previousMonth: () => chooseCalendarMonth(addMonths(calendarMonth, -1)),
  };
}
