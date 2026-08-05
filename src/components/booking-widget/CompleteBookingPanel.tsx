import {
  ArrowRight,
  ImageUp,
  Loader2,
  ReceiptText,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ChangeEvent } from "react";
import type { CourtSlot } from "@/lib/time";
import type { CourtOption } from "@/types/bookingSettings";
import type {
  PaymentAmountMode,
  PaymentErrors,
  ProofUpload,
} from "@/types/bookingWidget";
import { formatPeso } from "@/lib/pricing";
import { formatLongDate } from "@/utils/booking/bookingWidgetCalendar";
import { PaymentAmountOption } from "./PaymentAmountOption";
import { PaymentQrCard } from "./PaymentQrCard";
import { SummaryRow } from "./SummaryRow";

export function CompleteBookingPanel({
  customerContact,
  customerName,
  date,
  confirmingSlotAvailability,
  isPending,
  paymentAmountMode,
  paymentErrors,
  proofDeleting,
  proofUpload,
  proofUploading,
  referenceNumber,
  selectedSlots,
  onContactChange,
  onNameChange,
  onPaymentAmountModeChange,
  onProofChange,
  onProofRemove,
  onReferenceChange,
  onSubmit,
}: {
  customerContact: string;
  customerName: string;
  date: string;
  confirmingSlotAvailability: boolean;
  isPending: boolean;
  paymentAmountMode: PaymentAmountMode;
  paymentErrors: PaymentErrors;
  proofDeleting: boolean;
  proofUpload: ProofUpload | null;
  proofUploading: boolean;
  referenceNumber: string;
  selectedSlots: { court: CourtOption; slot: CourtSlot }[];
  onContactChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPaymentAmountModeChange: (value: PaymentAmountMode) => void;
  onProofChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onProofRemove: () => void;
  onReferenceChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const fullAmount = selectedSlots.reduce((sum, item) => sum + item.slot.rate, 0);
  const halfAmount = fullAmount / 2;
  const scheduleByCourt = selectedSlots.reduce<
    Array<{ court: CourtOption; slots: CourtSlot[] }>
  >((groups, item) => {
    const group = groups.find((entry) => entry.court.id === item.court.id);
    if (group) {
      group.slots.push(item.slot);
    } else {
      groups.push({ court: item.court, slots: [item.slot] });
    }
    return groups;
  }, []);

  return (
    <div className="mt-7 w-full rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        Complete Booking
      </p>
      <div className="mt-4 grid gap-2 text-sm">
        <SummaryRow label="Date" value={formatLongDate(date)} />
        <div className="mt-1 grid gap-2">
          <p className="px-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
            Selected schedule
          </p>
          {scheduleByCourt.map(({ court, slots }) => {
            const sortedSlots = [...slots].sort(
              (first, second) => first.startHour - second.startHour,
            );
            return (
              <section
                className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                key={court.id}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-black uppercase tracking-[0.1em] text-white">
                      {court.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {sortedSlots.length} hour{sortedSlots.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {sortedSlots.map((slot) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2 text-xs"
                      key={slot.startHour}
                    >
                      <span className="whitespace-nowrap font-semibold text-zinc-200">
                        {slot.label}
                      </span>
                      <span className="font-bold text-zinc-400">
                        {formatPeso(slot.rate)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm font-semibold text-zinc-300">
        {confirmingSlotAvailability ? (
          <PaymentAmountSkeleton />
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-300">Payment method</p>
          <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 font-display text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100">
            GoTyme only
          </span>
        </div>
        <PaymentQrCard paymentMethod="GOTYME" />
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Full name
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              autoComplete="name"
              className={[
                "h-14 w-full rounded-xl border bg-white/[0.04] pl-12 pr-4 text-white outline-none transition focus:bg-white/[0.07]",
                paymentErrors.name
                  ? "border-red-400/70 focus:border-red-300"
                  : "border-white/10 focus:border-white/45",
              ].join(" ")}
              maxLength={120}
              placeholder="Juan Dela Cruz"
              value={customerName}
              onChange={(event) => onNameChange(event.target.value)}
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
      </div>

      <button
        className="premium-button font-display mt-6 h-14 w-full rounded-xl px-6 text-xs font-black uppercase cursor-pointer tracking-[0.28em]"
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

function PaymentAmountSkeleton() {
  return (
    <>
      <div
        aria-label="Loading payment amount options"
        className="h-4 w-40 animate-pulse rounded-full bg-white/15"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            aria-hidden="true"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            key={index}
          >
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/15" />
            <div className="mt-4 h-7 w-20 animate-pulse rounded-full bg-white/20" />
          </div>
        ))}
      </div>
    </>
  );
}
