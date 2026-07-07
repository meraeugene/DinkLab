"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  ReceiptText,
  Smartphone,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
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
type DayStatus = "available" | "full";
type PaymentMethod = "GCASH" | "BANK_TRANSFER";
type ToastTone = "error" | "success" | "info";
type Toast = {
  message: string;
  tone: ToastTone;
} | null;

const OPERATING_HOURS = getOperatingHours();
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
  const [customerName, setCustomerName] = useState(initialName);
  const [customerContact, setCustomerContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("GCASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
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
    () => getDayStatus(availabilityByDate[date]?.[courtId]),
    [availabilityByDate, courtId, date],
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

  function continueToTime() {
    if (date < initialDate || selectedDayStatus === "full") {
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
    setPaymentMethod("GCASH");
    setReferenceNumber("");
    setReceiptFile(null);
    setToast(null);
  }

  function submitManualBooking() {
    if (!selectedSlot?.available) {
      showToast("Select an available time slot first.", "error");
      return;
    }
    if (customerName.trim().length < 2) {
      showToast("Enter your full name.", "error");
      return;
    }
    if (customerContact.trim().length < 7) {
      showToast("Enter a valid contact number.", "error");
      return;
    }
    if (!signedIn) {
      showToast("Please sign in with Google before booking.", "error");
      return;
    }
    if (!referenceNumber.trim() && !receiptFile) {
      showToast("Add a reference number or upload a payment image.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("date", date);
    formData.append("courtId", courtId);
    formData.append("startHour", String(selectedSlot.startHour));
    formData.append("customerName", customerName);
    formData.append("customerContact", customerContact);
    formData.append("paymentMethod", paymentMethod);
    formData.append("referenceNumber", referenceNumber);
    if (receiptFile) formData.append("receipt", receiptFile);

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
            submit your manual payment proof.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm sm:min-w-[24rem]">
          <PriceCard label="Early " value="₱150/hr" detail="Before 12pm" />
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
          "fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl transition duration-300",
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
                paymentMethod={paymentMethod}
                receiptFile={receiptFile}
                referenceNumber={referenceNumber}
                selectedCourt={selectedCourt.name}
                selectedSlot={selectedSlot}
                onContactChange={setCustomerContact}
                onNameChange={setCustomerName}
                onPaymentMethodChange={setPaymentMethod}
                onReceiptChange={setReceiptFile}
                onReferenceChange={setReferenceNumber}
                onSubmit={submitManualBooking}
              />
            ) : null}

            {step === "submitted" ? (
              <SubmittedStep onReset={resetForAnotherBooking} />
            ) : null}
          </div>
        </div>
      </div>

      {toast ? <BookingToast toast={toast} /> : null}
    </section>
  );
}

function BookingToast({ toast }: { toast: Exclude<Toast, null> }) {
  return (
    <div
      className={[
        "fixed inset-x-4 bottom-5 z-[70] mx-auto max-w-md rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_20px_60px_rgba(0,0,0,0.4)]",
        toast.tone === "success"
          ? "border-emerald-300/30 bg-emerald-300 text-black"
          : toast.tone === "error"
            ? "border-red-300/30 bg-white text-black"
            : "border-white/15 bg-white text-black",
      ].join(" ")}
      role="status"
    >
      {toast.message}
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
          className="h-full rounded-full bg-lime-400 transition-all duration-300"
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
                "relative flex min-h-28 items-center gap-6 rounded-2xl border p-4 text-left transition",
                active
                  ? "border-lime-400 bg-lime-400/[0.06] shadow-[0_0_28px_rgba(132,204,22,0.24),inset_0_0_26px_rgba(132,204,22,0.08)]"
                  : "border-white/15 bg-white/[0.025] hover:border-white/35 hover:bg-white/[0.05]",
              ].join(" ")}
              type="button"
              onClick={() => onChooseCourt(court.id)}
            >
              <CourtMiniGraphic />
              <span>
                <span className="block text-2xl font-semibold text-white">
                  {court.name}
                </span>
                <span className="text-sm text-zinc-400">Indoor</span>
              </span>
              {active ? (
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-lime-400 text-black">
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
            const past = item < initialDate;
            const status = getDayStatus(availabilityByDate[item]?.[courtId]);
            const unavailable = past || status === "full";
            const disabled = !inMonth || unavailable;
            return (
              <button
                key={item}
                className={[
                  "relative aspect-square rounded-xl border p-1 text-center transition",
                  active && !unavailable
                    ? "border-lime-400 bg-lime-400/[0.1] text-white shadow-[0_0_20px_rgba(132,204,22,0.18)]"
                    : disabled
                      ? inMonth
                        ? "border-red-400/15 bg-red-500/[0.08] text-red-200/45"
                        : "border-transparent text-zinc-800"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-lime-400/45 hover:bg-lime-400/[0.06]",
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

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <CalendarLegend label="Available" active />
        <CalendarLegend label="Full" />
      </div>

      <button
        className="premium-button font-display mt-7 h-14 w-full rounded-xl px-6 text-xs font-black uppercase tracking-[0.28em]"
        disabled={date < initialDate || selectedStatus === "full"}
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
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
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
                        ? "border-lime-400 bg-lime-400/[0.08] text-white shadow-[0_0_24px_rgba(132,204,22,0.22)]"
                        : slot.available
                          ? "border-white/15 bg-white/[0.035] text-zinc-100 hover:border-lime-400/55 hover:bg-lime-400/[0.07]"
                          : "cursor-not-allowed border-white/8 bg-white/[0.025] text-zinc-500 opacity-80",
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
                        {new Date(slot.startAt).getTime() <= Date.now()
                          ? "Past"
                          : "Taken"}
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
  paymentMethod,
  receiptFile,
  referenceNumber,
  selectedCourt,
  selectedSlot,
  onContactChange,
  onNameChange,
  onPaymentMethodChange,
  onReceiptChange,
  onReferenceChange,
  onSubmit,
}: {
  customerContact: string;
  customerName: string;
  date: string;
  isPending: boolean;
  paymentMethod: PaymentMethod;
  receiptFile: File | null;
  referenceNumber: string;
  selectedCourt: string;
  selectedSlot: CourtSlot;
  onContactChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onReceiptChange: (value: File | null) => void;
  onReferenceChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const receiptPreviewUrl = useMemo(
    () => (receiptFile ? URL.createObjectURL(receiptFile) : ""),
    [receiptFile],
  );

  useEffect(() => {
    if (!receiptPreviewUrl) return;
    return () => URL.revokeObjectURL(receiptPreviewUrl);
  }, [receiptPreviewUrl]);

  return (
    <div className="mt-7 rounded-2xl border border-white/10 bg-black/45 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        Complete Booking
      </p>
      <div className="mt-4 grid gap-2 text-sm">
        <SummaryRow label="Court" value={selectedCourt} />
        <SummaryRow label="Date" value={formatLongDate(date)} />
        <SummaryRow label="Time" value={selectedSlot.label} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PaymentAmount
          label="Amount to pay"
          value={formatPeso(selectedSlot.rate / 2)}
          active
        />
      </div>

      <div className="mt-5 grid gap-3">
        <PaymentDetail
          icon={<Smartphone className="h-5 w-5" />}
          label="GCash Number"
          value="0917 136 5161"
        />
        <PaymentDetail
          icon={<WalletCards className="h-5 w-5" />}
          label="BDO Account"
          value="0012 3456 7890"
        />
        {/* <PaymentDetail
          icon={<UserRound className="h-5 w-5" />}
          label="Account Name"
          value="Dink Lab"
        /> */}
      </div>

      <div className="mt-5 grid gap-4">
        {/* <div className="grid gap-2 text-sm font-semibold text-zinc-300">
          Payment method
          <div className="grid grid-cols-2 gap-3">
            <PaymentMethodButton
              active={paymentMethod === "GCASH"}
              label="GCash"
              onClick={() => onPaymentMethodChange("GCASH")}
            />
            <PaymentMethodButton
              active={paymentMethod === "BANK_TRANSFER"}
              label="Bank Transfer"
              onClick={() => onPaymentMethodChange("BANK_TRANSFER")}
            />
          </div>
        </div> */}
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Full name
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-12 pr-4 text-white outline-none transition focus:border-white/45 focus:bg-white/[0.07]"
              placeholder="Juan Dela Cruz"
              value={customerName}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Contact number
          <span className="relative block">
            <Smartphone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-12 pr-4 text-white outline-none transition focus:border-white/45 focus:bg-white/[0.07]"
              placeholder="0917 000 0000"
              value={customerContact}
              onChange={(event) => onContactChange(event.target.value)}
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Reference number
          <span className="relative block">
            <ReceiptText className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-12 pr-4 text-white outline-none transition focus:border-white/45 focus:bg-white/[0.07]"
              placeholder="Leave blank to pay on-site"
              value={referenceNumber}
              onChange={(event) => onReferenceChange(event.target.value)}
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Payment image or QR proof
          <span className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-4 py-2 transition hover:border-white/45 hover:bg-white/[0.07]">
            <span className="flex min-w-0 items-center gap-3">
              {receiptPreviewUrl ? (
                <span
                  aria-hidden="true"
                  className="h-11 w-11 shrink-0 rounded-lg border border-white/10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${receiptPreviewUrl})` }}
                />
              ) : (
                <ImageUp className="h-5 w-5 shrink-0 text-zinc-500" />
              )}
              <span className="grid min-w-0 gap-1">
                <span className="truncate text-zinc-300">
                  {receiptFile ? receiptFile.name : "Upload payment image"}
                </span>
              </span>
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Image
            </span>
            <input
              accept="image/*"
              className="sr-only"
              type="file"
              onChange={(event) =>
                onReceiptChange(event.target.files?.[0] || null)
              }
            />
          </span>
        </label>
      </div>

      <button
        className="premium-button mt-6 h-14 w-full rounded-xl px-6 text-xs font-black uppercase tracking-[0.18em]"
        disabled={isPending}
        type="button"
        onClick={onSubmit}
      >
        {isPending ? "Submitting proof..." : "Submit Booking"}
        {isPending ? null : <ArrowRight className="h-5 w-5" />}
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
    <span className="grid h-20 w-20 shrink-0 grid-cols-2 overflow-hidden border border-lime-400 text-lime-400 shadow-[0_0_18px_rgba(132,204,22,0.18)]">
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} className="border border-lime-400/70" />
      ))}
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

function PaymentAmount({
  active = false,
  label,
  value,
}: {
  active?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        active
          ? "border-white/35 bg-white text-black"
          : "border-white/10 bg-white/[0.04] text-white",
      ].join(" ")}
    >
      <p
        className={
          active
            ? "text-xs uppercase tracking-[0.2em] text-zinc-700"
            : "text-xs uppercase tracking-[0.2em] text-zinc-500"
        }
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function CalendarLegend({
  active = false,
  label,
}: {
  active?: boolean;
  label: string;
}) {
  return (
    <span
      className={[
        "flex items-center justify-center rounded-xl border px-2 py-2",
        active
          ? "border-lime-400/20 bg-lime-400/[0.08] text-zinc-300"
          : "border-red-400/15 bg-red-500/[0.08] text-red-200/60",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function PaymentMethodButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "h-14 rounded-xl border px-4 text-xs font-black uppercase tracking-[0.16em] transition",
        active
          ? "border-lime-400 bg-lime-400/[0.12] text-white shadow-[0_0_24px_rgba(132,204,22,0.2)]"
          : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/35 hover:text-white",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PaymentDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
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
        <span className="text-lg font-black text-white">{value}</span>
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

function getDayStatus(slots?: CourtSlot[]): DayStatus {
  if (!slots) return "available";
  return slots.every((slot) => !slot.available) ? "full" : "available";
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
