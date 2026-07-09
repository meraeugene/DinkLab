import {
  ArrowRight,
  ImageUp,
  Loader2,
  ReceiptText,
  Smartphone,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ChangeEvent } from "react";
import type { CourtSlot } from "@/lib/time";
import type {
  PaymentAmountMode,
  PaymentErrors,
  PaymentMethod,
  ProofUpload,
} from "@/types/bookingWidget";
import { formatPeso } from "@/lib/pricing";
import { formatLongDate } from "@/utils/booking/bookingWidgetCalendar";
import { PaymentAmountOption } from "./PaymentAmountOption";
import { PaymentDetail } from "./PaymentDetail";
import { PaymentMethodButton } from "./PaymentMethodButton";
import { PaymentQrCard } from "./PaymentQrCard";
import { SummaryRow } from "./SummaryRow";

export function CompleteBookingPanel({
  customerContact,
  customerName,
  date,
  confirmingSlotAvailability,
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
  confirmingSlotAvailability: boolean;
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
          Full name
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
