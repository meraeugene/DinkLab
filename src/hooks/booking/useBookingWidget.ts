"use client";

import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createManualBooking } from "@/actions/bookings/createManualBooking";
import { COURTS } from "@/data/app/appConfig";
import { MAX_IMAGE_SIZE } from "@/data/booking/bookingWidget";
import type {
  BookingStep,
  BookingWidgetProps,
  PaymentAmountMode,
  PaymentErrors,
  PaymentMethod,
  ProofUpload,
  Toast,
  ToastTone,
} from "@/types/bookingWidget";
import { useBookingAvailability } from "@/hooks/useBookingAvailability";
import { addMonths, buildCalendarDates } from "@/utils/booking/bookingWidgetCalendar";
import { deletePaymentProofUpload } from "@/utils/payments/deletePaymentProofUpload";
import { uploadPaymentProof } from "@/utils/payments/uploadPaymentProof";
import type { CourtSlot } from "@/lib/time";

export function useBookingWidget({
  signedIn,
  initialDate,
  initialName = "",
}: BookingWidgetProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>("court");
  const [date, setDate] = useState(initialDate);
  const [calendarMonth, setCalendarMonth] = useState(initialDate.slice(0, 7));
  const [courtId, setCourtId] = useState<string>(COURTS[0].id);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [customerName] = useState(initialName);
  const [customerContact, setCustomerContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BPI");
  const [paymentAmountMode, setPaymentAmountMode] =
    useState<PaymentAmountMode>("HALF");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofUpload, setProofUpload] = useState<ProofUpload | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofDeleting, setProofDeleting] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState<PaymentErrors>({});
  const [toast, setToast] = useState<Toast>(null);
  const [validatingSlotHour, setValidatingSlotHour] = useState<number | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const calendarDates = useMemo(
    () => buildCalendarDates(calendarMonth),
    [calendarMonth],
  );
  const {
    availabilityByDate,
    displaySlots,
    refreshAvailabilityForDate,
    selectedDayStatus,
  } = useBookingAvailability({
    calendarDates,
    calendarMonth,
    courtId,
    date,
    initialDate,
    open,
  });

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

  const selectedCourt = useMemo(
    () => COURTS.find((court) => court.id === courtId) || COURTS[0],
    [courtId],
  );

  const selectedSlot = useMemo(
    () =>
      displaySlots.find((slot) => slot.startHour === selectedHour) || null,
    [displaySlots, selectedHour],
  );

  function showToast(message: string, tone: ToastTone = "info") {
    setToast({ message, tone });
  }

  function closeOverlay() {
    setOpen(false);
    setToast(null);
  }

  function openBookingFlow() {
    if (!signedIn) {
      showToast("Please sign in first before booking.", "error");
      return;
    }
    setOpen(true);
  }

  function chooseCourt(value: string) {
    setCourtId(value);
    setSelectedHour(null);
  }

  function chooseDate(value: string) {
    setDate(value);
    setSelectedHour(null);
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
      setSelectedHour(null);
    }
  }

  async function chooseSlot(slot: CourtSlot) {
    if (!slot.available) return;
    setValidatingSlotHour(slot.startHour);
    try {
      const slots = await refreshAvailabilityForDate();
      const freshSlot = slots.find((item) => item.startHour === slot.startHour);

      if (!freshSlot?.available) {
        setSelectedHour(null);
        showToast(
          "That slot was just accepted. Please choose another time.",
          "error",
        );
        return;
      }

      setSelectedHour(freshSlot.startHour);
      setStep("payment");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to confirm availability.",
        "error",
      );
    } finally {
      setValidatingSlotHour(null);
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

  async function continueToTime() {
    if (selectedDayStatus !== "available") {
      showToast("Choose an available day.", "error");
      return;
    }
    try {
      await refreshAvailabilityForDate();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to load availability.",
        "error",
      );
      return;
    }
    setStep("time");
  }

  function goBack() {
    if (step === "day") setStep("court");
    if (step === "time") setStep("day");
    if (step === "payment") setStep("time");
  }

  function resetForAnotherBooking() {
    setStep("court");
    setSelectedHour(null);
    setPaymentMethod("BPI");
    setPaymentAmountMode("HALF");
    setReferenceNumber("");
    setProofUpload(null);
    setPaymentErrors({});
    setToast(null);
  }

  function backToSiteAfterSubmit() {
    resetForAnotherBooking();
    closeOverlay();
  }

  function updateCustomerContact(value: string) {
    setCustomerContact(value.replace(/\D/g, "").slice(0, 15));
    setPaymentErrors((current) => ({ ...current, contact: undefined }));
  }

  function updatePaymentMethod(value: PaymentMethod) {
    setPaymentMethod(value);
    setPaymentErrors((current) => ({ ...current, proof: undefined }));
  }

  function updateReferenceNumber(value: string) {
    setReferenceNumber(value);
    setPaymentErrors((current) => ({ ...current, proof: undefined }));
  }

  function submitManualBooking() {
    const nextErrors: PaymentErrors = {};

    if (!selectedSlot?.available) {
      showToast("Select an available time slot first.", "error");
      return;
    }
    if (customerName.trim().length < 2) {
      nextErrors.name = "Your Google account name is required.";
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
    if (paymentMethod !== "ONSITE" && !referenceNumber.trim() && !proofUpload) {
      nextErrors.proof = "Add a reference number or upload payment proof.";
      setPaymentErrors(nextErrors);
      showToast("Add a reference number or upload a payment image.", "error");
      return;
    }
    setPaymentErrors({});

    const formData = new FormData();
    formData.append("date", date);
    formData.append("courtId", courtId);
    formData.append("startHour", String(selectedSlot.startHour));
    formData.append("customerName", customerName);
    formData.append("customerContact", customerContact);
    formData.append("paymentMethod", paymentMethod);
    formData.append("paymentAmountMode", paymentAmountMode);
    formData.append(
      "referenceNumber",
      paymentMethod === "ONSITE" ? "" : referenceNumber,
    );
    if (paymentMethod !== "ONSITE" && proofUpload) {
      formData.append("paymentProofUrl", proofUpload.secureUrl);
      formData.append("paymentProofPublicId", proofUpload.publicId);
    }

    startTransition(async () => {
      const result = await createManualBooking(formData);
      if (result?.ok) {
        showToast("Booking submitted successfully.", "success");
        setStep("submitted");
        return;
      }
      if (result?.error?.toLowerCase().includes("slot")) {
        await refreshAvailabilityForDate().catch(() => undefined);
        setSelectedHour(null);
        setStep("time");
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
    chooseCourt,
    chooseDate,
    chooseSlot,
    closeOverlay,
    continueToTime,
    courtId,
    customerContact,
    customerName,
    date,
    displaySlots,
    goBack,
    handleProofUpload,
    isPending,
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
    selectedCourt,
    selectedDayStatus,
    selectedHour,
    selectedSlot,
    setPaymentAmountMode,
    setStep,
    setToast,
    step,
    submitManualBooking,
    toast,
    updateCustomerContact,
    updatePaymentMethod,
    updateReferenceNumber,
    validatingSlotHour,
    nextMonth: () => chooseCalendarMonth(addMonths(calendarMonth, 1)),
    previousMonth: () => chooseCalendarMonth(addMonths(calendarMonth, -1)),
  };
}
