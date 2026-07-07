"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Landmark,
  ImageUp,
  Loader2,
  Moon,
  ReceiptText,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createManualBooking } from "@/app/actions";
import { COURTS } from "@/lib/constants";
import { formatPeso, getHourlyRate } from "@/lib/pricing";
import {
  CourtSlot,
  formatSlotLabel,
  getOperatingHours,
  manilaHourToUtc,
} from "@/lib/time";

type BookingWidgetProps = {
  signedIn: boolean;
  initialDate: string;
  initialName?: string;
};

type BookingStep = "court" | "day" | "time" | "payment" | "submitted";
type Availability = Record<string, CourtSlot[]>;
type AvailabilityByDate = Record<string, Availability>;
type DayStatus = "available" | "full" | "unavailable";
type PaymentMethod = "BPI" | "GOTYME" | "ONSITE";
type PaymentAmountMode = "HALF" | "FULL";
type PaymentErrorKey = "contact" | "name" | "proof";
type PaymentErrors = Partial<Record<PaymentErrorKey, string>>;
type ProofUpload = {
  fileName: string;
  publicId: string;
  secureUrl: string;
};
type ToastTone = "error" | "success" | "info";
type Toast = {
  message: string;
  tone: ToastTone;
} | null;

const OPERATING_HOURS = getOperatingHours();
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const stepMeta: Record<BookingStep, { count: string; title: string }> = {
  court: { count: "1 / 4", title: "Choose Court" },
  day: { count: "2 / 4", title: "Choose Day" },
  time: { count: "3 / 4", title: "Choose Time" },
  payment: { count: "4 / 4", title: "Payment" },
  submitted: { count: "Done", title: "Success" },
};

export function BookingWidget({
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
  const [availabilityByDate, setAvailabilityByDate] =
    useState<AvailabilityByDate>({});
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
  const [isPending, startTransition] = useTransition();

  const calendarDates = useMemo(
    () => buildCalendarDates(calendarMonth),
    [calendarMonth],
  );
  const availabilityDates = useMemo(
    () =>
      calendarDates.filter(
        (item) => isSameMonth(item, calendarMonth) && item >= initialDate,
      ),
    [calendarDates, calendarMonth, initialDate],
  );
  const availabilityKey = availabilityDates.join("|");

  useEffect(() => {
    if (!open) return;

    let alive = true;
    const missingDates = availabilityDates.filter(
      (item) => !availabilityByDate[item]?.[courtId],
    );

    if (!missingDates.length) return;

    Promise.all(
      missingDates.map(async (item) => {
        const params = new URLSearchParams({ date: item, courtId });
        const response = await fetch(`/api/availability?${params.toString()}`);
        if (!response.ok) return [item, mergeSlots(item, [])] as const;
        const data = await response.json().catch(() => null);
        return [
          item,
          mergeSlots(item, Array.isArray(data?.slots) ? data.slots : []),
        ] as const;
      }),
    )
      .catch(() =>
        missingDates.map((item) => [item, mergeSlots(item, [])] as const),
      )
      .then((entries) => {
        if (!alive) return;
        setAvailabilityByDate((current) => {
          const next = { ...current };
          for (const [item, slots] of entries) {
            next[item] = {
              ...(next[item] || {}),
              [courtId]: slots,
            };
          }
          return next;
        });
      });

    return () => {
      alive = false;
    };
  }, [availabilityByDate, availabilityDates, availabilityKey, courtId, open]);

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
      getDisplaySlots(date, availabilityByDate[date]?.[courtId]).find(
        (slot) => slot.startHour === selectedHour,
      ) || null,
    [availabilityByDate, courtId, date, selectedHour],
  );

  const displaySlots = useMemo(
    () => getDisplaySlots(date, availabilityByDate[date]?.[courtId]),
    [availabilityByDate, courtId, date],
  );
  const selectedDayStatus = useMemo(
    () => getDayStatus(date, initialDate, availabilityByDate[date]?.[courtId]),
    [availabilityByDate, courtId, date, initialDate],
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
      showToast("Please sign in with Google before booking.", "error");
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

  function chooseSlot(slot: CourtSlot) {
    if (!slot.available) return;
    setSelectedHour(slot.startHour);
    setStep("payment");
  }

  async function deleteProofUpload(publicId: string) {
    const response = await fetch("/api/cloudinary/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      throw new Error("Unable to remove payment image.");
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
      const uploadData = new FormData();
      uploadData.append("file", file);
      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: uploadData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.secureUrl || !payload?.publicId) {
        throw new Error(payload?.error || "Unable to upload payment image.");
      }

      const previousPublicId = proofUpload?.publicId;
      setProofUpload({
        fileName: file.name,
        publicId: payload.publicId,
        secureUrl: payload.secureUrl,
      });
      setPaymentErrors((current) => ({ ...current, proof: undefined }));
      showToast("Payment image uploaded.", "success");

      if (previousPublicId) {
        await deleteProofUpload(previousPublicId).catch(() => undefined);
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
      await deleteProofUpload(proofUpload.publicId);
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

  function continueToTime() {
    if (selectedDayStatus !== "available") {
      showToast("Choose an available day.", "error");
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
      showToast(result?.error || "Unable to submit booking.", "error");
    });
  }

  return (
    <section
      id="schedule"
      className="court-section relative mx-auto max-w-7xl px-4 py-16 sm:px-6"
    >
      <div className="mb-8 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <p className="font-display text-sm font-black uppercase tracking-[0.35em] text-zinc-500">
            Court Booking
          </p>
          <h2 className="font-display hero-shine-text mt-3 text-3xl font-black uppercase leading-tight sm:text-6xl">
            BOOK SLOT NOW
          </h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Open the booking flow, choose your court, pick a day and time, then
            submit payment.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm sm:min-w-[24rem]">
          <PriceCard label="Early" value="₱150/hr" detail="Before 12pm" />
          <PriceCard label="Day" value="₱200/hr" detail="8am-3pm" />
          <PriceCard label="Night" value="₱300/hr" detail="3pm-1am" />
        </div>
      </div>

      <button
        className="premium-button font-display h-14 w-full rounded-xl px-6 text-xs font-black uppercase tracking-[0.28em]"
        type="button"
        onClick={openBookingFlow}
      >
        Book a Slot
        <ArrowRight className="h-4 w-4" />
      </button>

      <div
        className={[
          "fixed inset-0 z-50 bg-black transition duration-300",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-2xl flex-col overflow-hidden px-4 py-4 text-white sm:px-6">
          <BookingTopBar step={step} onBack={goBack} onClose={closeOverlay} />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain  pt-6">
            {step === "court" ? (
              <CourtStep
                courtId={courtId}
                onChooseCourt={chooseCourt}
                onContinue={() => {
                  setStep("day");
                }}
              />
            ) : null}

            {step === "day" ? (
              <DayStep
                date={date}
                calendarDates={calendarDates}
                calendarMonth={calendarMonth}
                availabilityByDate={availabilityByDate}
                courtId={courtId}
                initialDate={initialDate}
                selectedStatus={selectedDayStatus}
                onChooseDate={chooseDate}
                onContinue={continueToTime}
                onNextMonth={() =>
                  chooseCalendarMonth(addMonths(calendarMonth, 1))
                }
                onPreviousMonth={() =>
                  chooseCalendarMonth(addMonths(calendarMonth, -1))
                }
              />
            ) : null}

            {step === "time" ? (
              <TimeStep
                displaySlots={displaySlots}
                selectedHour={selectedHour}
                onChooseSlot={chooseSlot}
              />
            ) : null}

            {step === "payment" && selectedSlot ? (
              <CompleteBookingPanel
                customerContact={customerContact}
                customerName={customerName}
                date={date}
                isPending={isPending}
                paymentAmountMode={paymentAmountMode}
                paymentMethod={paymentMethod}
                paymentErrors={paymentErrors}
                proofDeleting={proofDeleting}
                proofUpload={proofUpload}
                proofUploading={proofUploading}
                referenceNumber={referenceNumber}
                selectedCourt={selectedCourt.name}
                selectedSlot={selectedSlot}
                onContactChange={(value) => {
                  setCustomerContact(value.replace(/\D/g, "").slice(0, 15));
                  setPaymentErrors((current) => ({
                    ...current,
                    contact: undefined,
                  }));
                }}
                onPaymentAmountModeChange={setPaymentAmountMode}
                onPaymentMethodChange={(value) => {
                  setPaymentMethod(value);
                  setPaymentErrors((current) => ({
                    ...current,
                    proof: undefined,
                  }));
                }}
                onProofChange={handleProofUpload}
                onProofRemove={removeProofUpload}
                onReferenceChange={(value) => {
                  setReferenceNumber(value);
                  setPaymentErrors((current) => ({
                    ...current,
                    proof: undefined,
                  }));
                }}
                onSubmit={submitManualBooking}
              />
            ) : null}

            {step === "submitted" ? (
              <SubmittedStep onReset={resetForAnotherBooking} />
            ) : null}
          </div>
        </div>
      </div>

      {toast ? (
        <BookingToast toast={toast} onClose={() => setToast(null)} />
      ) : null}
    </section>
  );
}

function BookingToast({
  onClose,
  toast,
}: {
  onClose: () => void;
  toast: Exclude<Toast, null>;
}) {
  return (
    <div
      className={[
        "fixed inset-x-4 top-5 z-[70] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_20px_60px_rgba(0,0,0,0.4)]",
        toast.tone === "success"
          ? "border-emerald-300/30 bg-emerald-300 text-black"
          : toast.tone === "error"
            ? "border-red-300/30 bg-white text-black"
            : "border-white/15 bg-white text-black",
      ].join(" ")}
      role="status"
    >
      <span>{toast.message}</span>
      <button
        aria-label="Close message"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/10 transition hover:bg-black/10"
        type="button"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function BookingTopBar({
  step,
  onBack,
  onClose,
}: {
  step: BookingStep;
  onBack: () => void;
  onClose: () => void;
}) {
  const index =
    step === "court" ? 1 : step === "day" ? 2 : step === "time" ? 3 : 4;
  const progress = step === "submitted" ? 100 : (index / 4) * 100;

  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between gap-3">
        <button
          aria-label="Go back"
          className={[
            "menu-icon-button",
            step === "court" || step === "submitted"
              ? "pointer-events-none opacity-0"
              : "",
          ].join(" ")}
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
            {stepMeta[step].count}
          </p>
          <h3 className="font-display mt-1 text-xl font-black">
            {stepMeta[step].title}
          </h3>
        </div>
        <button
          aria-label="Close booking"
          className="menu-icon-button"
          type="button"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function CourtStep({
  courtId,
  onChooseCourt,
  onContinue,
}: {
  courtId: string;
  onChooseCourt: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="grid gap-4">
        {COURTS.map((court) => {
          const active = court.id === courtId;

          return (
            <button
              key={court.id}
              className={[
                "relative flex min-h-32 items-center gap-5 rounded-2xl border p-3 text-left transition sm:gap-6 sm:p-4",
                active
                  ? "border-white/80 bg-white/[0.08] shadow-[0_0_28px_rgba(255,255,255,0.16),inset_0_0_26px_rgba(255,255,255,0.08)]"
                  : "border-white/15 bg-white/[0.025] hover:border-white/35 hover:bg-white/[0.05]",
              ].join(" ")}
              type="button"
              onClick={() => onChooseCourt(court.id)}
            >
              <CourtMiniGraphic />
              <span>
                <span className="block text-lg tracking-wider font-semibold font-display uppercase text-white">
                  {court.name}
                </span>
                <span className="text-sm text-zinc-400">Indoor</span>
              </span>
              {active ? (
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-white text-black">
                  <Check className="h-4 w-4" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        className="premium-button font-display mt-7 h-14 w-full rounded-xl px-6 text-xs font-black uppercase tracking-[0.28em]"
        type="button"
        onClick={onContinue}
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function DayStep({
  availabilityByDate,
  calendarDates,
  calendarMonth,
  courtId,
  date,
  initialDate,
  selectedStatus,
  onChooseDate,
  onContinue,
  onNextMonth,
  onPreviousMonth,
}: {
  availabilityByDate: AvailabilityByDate;
  calendarDates: string[];
  calendarMonth: string;
  courtId: string;
  date: string;
  initialDate: string;
  selectedStatus: DayStatus;
  onChooseDate: (value: string) => void;
  onContinue: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-3">
          <button
            aria-label="Previous month"
            className="menu-icon-button"
            type="button"
            onClick={onPreviousMonth}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
            {formatMonthTitle(calendarMonth)}
          </p>
          <button
            aria-label="Next month"
            className="menu-icon-button"
            type="button"
            onClick={onNextMonth}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <span
              key={`${day}-${index}`}
              className="py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-zinc-600"
            >
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDates.map((item) => {
            const active = item === date;
            const inMonth = isSameMonth(item, calendarMonth);
            const status = getDayStatus(
              item,
              initialDate,
              availabilityByDate[item]?.[courtId],
            );
            const disabled = !inMonth || status !== "available";
            return (
              <button
                key={item}
                className={[
                  "relative aspect-square rounded-xl border p-1 text-center transition",
                  active && status === "available"
                    ? "border-white/80 bg-white/[0.12] text-white shadow-[0_0_20px_rgba(255,255,255,0.16)]"
                    : !inMonth
                      ? "border-transparent text-zinc-800"
                      : status === "full"
                        ? "border-red-400/20 bg-red-500/[0.16] text-red-100/70"
                        : status === "unavailable"
                          ? "border-white/5 bg-white/[0.02] text-zinc-700"
                          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/45 hover:bg-white/[0.06]",
                ].join(" ")}
                disabled={disabled}
                type="button"
                onClick={() => onChooseDate(item)}
              >
                <span className="text-sm font-bold">
                  {Number(item.slice(-2))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <CalendarLegend label="Available" tone="available" />
        <CalendarLegend label="Full" tone="full" />
        <CalendarLegend label="Unavailable" tone="unavailable" />
      </div>

      <button
        className="premium-button font-display mt-7 h-14 w-full rounded-xl px-6 text-xs font-black uppercase tracking-[0.28em]"
        disabled={selectedStatus !== "available"}
        type="button"
        onClick={onContinue}
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function TimeStep({
  displaySlots,
  selectedHour,
  onChooseSlot,
}: {
  displaySlots: CourtSlot[];
  selectedHour: number | null;
  onChooseSlot: (slot: CourtSlot) => void;
}) {
  return (
    <div>
      <div className="grid gap-5">
        {groupSlotsByRate(displaySlots).map((group) => (
          <div key={group.label}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                {group.label === "Night" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                {group.label}
              </p>
              <p className="text-sm font-black text-white">
                {formatPeso(group.rate)}/hr
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {group.slots.map((slot) => {
                const active = selectedHour === slot.startHour;

                return (
                  <button
                    key={slot.startAt}
                    className={[
                      "relative min-h-16 rounded-xl border p-3 text-center transition",
                      active
                        ? "border-white/80 bg-white/[0.1] text-white shadow-[0_0_24px_rgba(255,255,255,0.16)]"
                        : slot.available
                          ? "border-white/15 bg-white/[0.035] text-zinc-100 hover:border-white/55 hover:bg-white/[0.07]"
                          : "cursor-not-allowed border-white/8 bg-white/[0.025] text-zinc-600",
                    ].join(" ")}
                    disabled={!slot.available}
                    type="button"
                    onClick={() => onChooseSlot(slot)}
                  >
                    <span className="block text-lg font-bold leading-none">
                      {formatTimeCardLabel(slot.startHour)}
                    </span>
                    {!slot.available ? (
                      <span className="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-700">
                        Unavailable
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompleteBookingPanel({
  customerContact,
  customerName,
  date,
  isPending,
  paymentAmountMode,
  paymentMethod,
  paymentErrors,
  proofDeleting,
  proofUpload,
  proofUploading,
  referenceNumber,
  selectedCourt,
  selectedSlot,
  onContactChange,
  onPaymentAmountModeChange,
  onPaymentMethodChange,
  onProofChange,
  onProofRemove,
  onReferenceChange,
  onSubmit,
}: {
  customerContact: string;
  customerName: string;
  date: string;
  isPending: boolean;
  paymentAmountMode: PaymentAmountMode;
  paymentMethod: PaymentMethod;
  paymentErrors: PaymentErrors;
  proofDeleting: boolean;
  proofUpload: ProofUpload | null;
  proofUploading: boolean;
  referenceNumber: string;
  selectedCourt: string;
  selectedSlot: CourtSlot;
  onContactChange: (value: string) => void;
  onPaymentAmountModeChange: (value: PaymentAmountMode) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onProofChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onProofRemove: () => void;
  onReferenceChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const halfAmount = selectedSlot.rate / 2;
  const fullAmount = selectedSlot.rate;

  return (
    <div className="mt-7 rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        Complete Booking
      </p>
      <div className="mt-4 grid gap-2 text-sm">
        <SummaryRow label="Court" value={selectedCourt} />
        <SummaryRow label="Date" value={formatLongDate(date)} />
        <SummaryRow label="Time" value={selectedSlot.label} />
      </div>

      <div className="mt-5 grid gap-2 text-sm font-semibold text-zinc-300">
        Choose payment amount
        <div className="grid gap-3 sm:grid-cols-2">
          <PaymentAmountOption
            active={paymentAmountMode === "HALF"}
            label="Half payment"
            value={formatPeso(halfAmount)}
            onClick={() => onPaymentAmountModeChange("HALF")}
          />
          <PaymentAmountOption
            active={paymentAmountMode === "FULL"}
            label="Full payment"
            value={formatPeso(fullAmount)}
            onClick={() => onPaymentAmountModeChange("FULL")}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2 text-sm font-semibold text-zinc-300">
          Choose payment method
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <PaymentMethodButton
              active={paymentMethod === "BPI"}
              label="BPI"
              tone="bpi"
              onClick={() => onPaymentMethodChange("BPI")}
            />
            <PaymentMethodButton
              active={paymentMethod === "GOTYME"}
              label="GOTYME"
              tone="gotyme"
              onClick={() => onPaymentMethodChange("GOTYME")}
            />
            <PaymentMethodButton
              active={paymentMethod === "ONSITE"}
              label="Onsite"
              tone="onsite"
              onClick={() => onPaymentMethodChange("ONSITE")}
            />
          </div>
        </div>
        {paymentMethod !== "ONSITE" ? (
          <PaymentQrCard paymentMethod={paymentMethod} />
        ) : (
          <PaymentDetail
            icon={<WalletCards className="h-5 w-5" />}
            label="Onsite Payment"
            value="Pay at Dink Lab"
          />
        )}
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Full name from Google
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              className={[
                "h-14 w-full rounded-xl border bg-white/[0.025] pl-12 pr-4 text-zinc-300 outline-none",
                paymentErrors.name ? "border-red-400/70" : "border-white/10",
              ].join(" ")}
              placeholder="Juan Dela Cruz"
              readOnly
              value={customerName}
            />
          </span>
          {paymentErrors.name ? (
            <span className="text-xs text-red-300">{paymentErrors.name}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Contact number
          <span className="relative block">
            <Smartphone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              inputMode="numeric"
              className={[
                "h-14 w-full rounded-xl border bg-white/[0.04] pl-12 pr-4 text-white outline-none transition focus:bg-white/[0.07]",
                paymentErrors.contact
                  ? "border-red-400/70 focus:border-red-300"
                  : "border-white/10 focus:border-white/45",
              ].join(" ")}
              pattern="[0-9]*"
              placeholder="09170000000"
              value={customerContact}
              onChange={(event) => onContactChange(event.target.value)}
            />
          </span>
          {paymentErrors.contact ? (
            <span className="text-xs text-red-300">
              {paymentErrors.contact}
            </span>
          ) : null}
        </label>
        {paymentMethod !== "ONSITE" ? (
          <>
            <label className="grid gap-2 text-sm font-semibold text-zinc-300">
              Reference number
              <span className="relative block">
                <ReceiptText className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  className={[
                    "h-14 w-full rounded-xl border bg-white/[0.04] pl-12 pr-4 text-white outline-none transition focus:bg-white/[0.07]",
                    paymentErrors.proof
                      ? "border-red-400/70 focus:border-red-300"
                      : "border-white/10 focus:border-white/45",
                  ].join(" ")}
                  placeholder="Leave blank if proof is uploaded"
                  value={referenceNumber}
                  onChange={(event) => onReferenceChange(event.target.value)}
                />
              </span>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-300">
              Payment image or QR proof
              <span
                className={[
                  "flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed bg-white/[0.04] px-4 py-2 transition hover:bg-white/[0.07]",
                  paymentErrors.proof
                    ? "border-red-400/70 hover:border-red-300"
                    : "border-white/20 hover:border-white/45",
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {proofUpload ? (
                    <span
                      aria-hidden="true"
                      className="h-11 w-11 shrink-0 rounded-lg border border-white/10 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${proofUpload.secureUrl})`,
                      }}
                    />
                  ) : proofUploading ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-zinc-300" />
                  ) : (
                    <ImageUp className="h-5 w-5 shrink-0 text-zinc-500" />
                  )}
                  <span className="grid min-w-0 gap-1">
                    <span className="truncate text-zinc-300">
                      {proofUploading
                        ? "Uploading payment image..."
                        : proofUpload
                          ? proofUpload.fileName
                          : "Upload payment image"}
                    </span>
                    <span className="text-xs text-zinc-600">
                      Image up to 5MB
                    </span>
                  </span>
                </span>
                {proofUpload ? (
                  <button
                    aria-label="Remove payment image"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-red-300/40 hover:text-red-200"
                    disabled={proofDeleting}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onProofRemove();
                    }}
                  >
                    {proofDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Image
                  </span>
                )}
                <input
                  accept="image/*"
                  className="sr-only"
                  disabled={proofUploading || proofDeleting}
                  type="file"
                  onChange={onProofChange}
                />
              </span>
              {paymentErrors.proof ? (
                <span className="text-xs text-red-300">
                  {paymentErrors.proof}
                </span>
              ) : null}
            </label>
          </>
        ) : null}
      </div>

      <button
        className="premium-button font-display mt-6 h-14 w-full rounded-xl px-6 text-xs font-black uppercase tracking-[0.28em]"
        disabled={isPending || proofUploading || proofDeleting}
        type="button"
        onClick={onSubmit}
      >
        {isPending ? "Booking..." : "Book"}
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

function SubmittedStep({ onReset }: { onReset: () => void }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/15 text-emerald-300">
        <BadgeCheck className="h-8 w-8" />
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
        Success
      </p>
      <h3 className="font-display hero-shine-text mt-3 text-3xl font-black uppercase">
        Booking Submitted
      </h3>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-zinc-400">
        Your proof was submitted. This slot remains open until admin accepts a
        booking from the dashboard.
      </p>
      <button
        className="premium-button-dark font-display mt-8 h-12 rounded-xl px-6 text-xs font-black uppercase tracking-[0.24em]"
        type="button"
        onClick={onReset}
      >
        Book Another Slot
      </button>
    </div>
  );
}

function CourtMiniGraphic() {
  return (
    <span
      aria-hidden="true"
      className="h-28 w-28 shrink-0 rounded-xl border border-white/20 bg-black bg-cover bg-center shadow-[0_0_18px_rgba(255,255,255,0.12)] sm:h-32 sm:w-32"
      style={{ backgroundImage: "url(/court-selection.png)" }}
    >
      <span className="sr-only">Dink Lab court</span>
    </span>
  );
}

function PriceCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="shine-card silver-border rounded-2xl bg-white/[0.035] p-4 shadow-[0_0_36px_rgba(255,255,255,0.06)]">
      <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white sm:text-xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-300">{detail}</p>
    </div>
  );
}

function PaymentAmountOption({
  active,
  label,
  onClick,
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      className={[
        "rounded-2xl border p-4 text-left transition",
        active
          ? "border-white/80 bg-white/[0.12] text-white shadow-[0_0_24px_rgba(255,255,255,0.14)]"
          : "border-white/10 bg-white/[0.04] text-white hover:border-white/30",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      <p
        className={
          active
            ? "text-xs uppercase tracking-[0.2em] text-zinc-200"
            : "text-xs uppercase tracking-[0.2em] text-zinc-500"
        }
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </button>
  );
}

function CalendarLegend({ label, tone }: { label: string; tone: DayStatus }) {
  return (
    <span
      className={[
        "flex items-center justify-center rounded-xl border px-2 py-2",
        tone === "available"
          ? "border-white/20 bg-white/[0.08] text-zinc-200"
          : tone === "full"
            ? "border-red-400/20 bg-red-500/[0.14] text-red-100/70"
            : "border-white/10 bg-white/[0.03] text-zinc-600",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function PaymentMethodButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: "bpi" | "gotyme" | "onsite";
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "inline-flex h-12 items-center justify-center rounded-xl border px-2 text-xs uppercase font-display tracking-[0.12em] transition sm:h-14 sm:px-4 sm:text-xs sm:tracking-[0.16em]",
        active
          ? tone === "gotyme"
            ? "border-cyan-300/65 bg-cyan-500/20 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
            : tone === "bpi"
              ? "border-red-300/65 bg-red-500/20 text-red-50 shadow-[0_0_24px_rgba(239,68,68,0.18)]"
              : "border-white/45 bg-white/[0.12] text-white shadow-[0_0_24px_rgba(255,255,255,0.12)]"
          : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/35 hover:text-white",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PaymentQrCard({
  paymentMethod,
}: {
  paymentMethod: Exclude<PaymentMethod, "ONSITE">;
}) {
  const isBpi = paymentMethod === "BPI";
  const details = isBpi
    ? {
        accent: "border-red-300/35 bg-red-500/[0.08]",
        image: "/payment-bpi-qr.jpg",
        label: "BPI",
        name: "Gem Bngcya",
        number: "**********782",
      }
    : {
        accent: "border-cyan-300/35 bg-cyan-500/[0.08]",
        image: "/payment-gotyme-qr.jpg",
        label: "GoTyme",
        name: "Gem Daryl Bangcaya",
        number: "********2697",
      };

  return (
    <div className={`rounded-2xl border p-4 ${details.accent}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            {details.label}
          </p>
          <p className="mt-1 font-bold text-white">{details.name}</p>
          <p className="text-sm text-zinc-400">{details.number}</p>
        </div>
        <Landmark className="h-5 w-5 text-white/70" />
      </div>
      <div
        aria-label={`${details.label} QR code`}
        className="mt-4 aspect-square w-full rounded-xl border border-white/10 bg-white bg-contain bg-center bg-no-repeat"
        role="img"
        style={{ backgroundImage: `url(${details.image})` }}
      />
    </div>
  );
}

function PaymentDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="icon-chip h-11 w-11 rounded-xl">{icon}</span>
      <span>
        <span className="block text-xs uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </span>
        <span className="text-lg font-medium text-white">{value}</span>
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}

function addMonths(month: string, offset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthIndex - 1 + offset, 1));
  return next.toISOString().slice(0, 7);
}

function buildCalendarDates(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthIndex - 1, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setUTCDate(start.getUTCDate() + index);
    return value.toISOString().slice(0, 10);
  });
}

function formatMonthTitle(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}

function isSameMonth(date: string, month: string) {
  return date.startsWith(month);
}

function getDayStatus(
  date: string,
  initialDate: string,
  slots?: CourtSlot[],
): DayStatus {
  if (date < initialDate) return "unavailable";
  if (!slots) return "available";
  const futureSlots = slots.filter(
    (slot) => new Date(slot.startAt).getTime() > Date.now(),
  );
  if (!futureSlots.length) return "unavailable";
  return futureSlots.every((slot) => !slot.available) ? "full" : "available";
}

function getDisplaySlots(date: string, slots?: CourtSlot[]) {
  return mergeSlots(date, slots || []);
}

function mergeSlots(date: string, slots: CourtSlot[]) {
  const byHour = new Map(slots.map((slot) => [slot.startHour, slot]));
  return buildCanonicalSlots(date).map(
    (slot) => byHour.get(slot.startHour) || slot,
  );
}

function buildCanonicalSlots(date: string) {
  const now = Date.now();
  return OPERATING_HOURS.map((hour) => {
    const start = manilaHourToUtc(date, hour);
    const end = manilaHourToUtc(date, hour + 1);

    return {
      startHour: hour,
      label: formatSlotLabel(hour),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      available: start.getTime() > now,
      rate: getHourlyRate(hour),
    };
  });
}

function formatTimeCardLabel(startHour: number) {
  const normalized = startHour % 24;
  const suffix = normalized < 12 ? "AM" : "PM";
  const twelveHour = normalized % 12 || 12;
  return `${twelveHour}:00 ${suffix}`;
}

function groupSlotsByRate(slots: CourtSlot[]) {
  const groups = [
    { label: "Day", rate: 200, slots: [] as CourtSlot[] },
    { label: "Night", rate: 300, slots: [] as CourtSlot[] },
  ];

  for (const slot of slots) {
    const group = groups.find((item) => item.rate === slot.rate);
    if (group) group.slots.push(slot);
  }

  return groups.filter((group) => group.slots.length);
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  }).format(dateToUtc(date));
}

function dateToUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
