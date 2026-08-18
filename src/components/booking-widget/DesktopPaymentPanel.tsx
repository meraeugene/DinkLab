import Image from "next/image";
import {
  ArrowRight,
  Download,
  ImageUp,
  Loader2,
  Mail,
  ReceiptText,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import type { CourtSlot } from "@/lib/time";
import { formatPeso } from "@/lib/pricing";
import { paymentQrDetails } from "@/data/payments/paymentQrDetails";
import type { CourtOption } from "@/types/bookingSettings";
import type {
  PaymentAmountMode,
  PaymentErrors,
  ProofUpload,
} from "@/types/bookingWidget";
import { formatLongDate } from "@/utils/booking/bookingWidgetCalendar";
import { PaymentAmountOption } from "./PaymentAmountOption";

type SelectedSlot = { court: CourtOption; slot: CourtSlot };

export function DesktopPaymentPanel({
  confirmingSlotAvailability,
  customerContact,
  customerEmail,
  customerName,
  date,
  isPending,
  paymentAmountMode,
  paymentErrors,
  proofDeleting,
  proofUpload,
  proofUploading,
  referenceNumber,
  selectedSlots,
  onContactChange,
  onEmailChange,
  onNameChange,
  onPaymentAmountModeChange,
  onProofChange,
  onProofRemove,
  onReferenceChange,
  onSubmit,
}: {
  confirmingSlotAvailability: boolean;
  customerContact: string;
  customerEmail: string;
  customerName: string;
  date: string;
  isPending: boolean;
  paymentAmountMode: PaymentAmountMode;
  paymentErrors: PaymentErrors;
  proofDeleting: boolean;
  proofUpload: ProofUpload | null;
  proofUploading: boolean;
  referenceNumber: string;
  selectedSlots: SelectedSlot[];
  onContactChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPaymentAmountModeChange: (value: PaymentAmountMode) => void;
  onProofChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onProofRemove: () => void;
  onReferenceChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const fullAmount = selectedSlots.reduce(
    (total, item) => total + item.slot.rate,
    0,
  );
  const halfAmount = fullAmount / 2;
  const qr = paymentQrDetails.GOTYME;

  return (
    <section
      aria-labelledby="desktop-payment-heading"
      className="hidden min-w-0 rounded-2xl border border-white/15 bg-black p-5 lg:order-2 lg:block xl:p-6"
    >
      <h4
        className="font-display text-base font-black uppercase tracking-[0.14em] text-white"
        id="desktop-payment-heading"
      >
        Payment
      </h4>

      <div className="mt-6 grid gap-6">
        <section className="rounded-xl border border-white/15 bg-white/[0.035] p-4">
          <p className="font-display text-[0.62rem] font-black uppercase tracking-[0.18em] text-zinc-500">
            Selected booking
          </p>
          <p className="mt-3 text-sm font-semibold text-white">
            {formatLongDate(date)}
          </p>

          <div className="mt-3 grid gap-2">
            {selectedSlots.length ? (
              selectedSlots.map(({ court, slot }) => (
                <div
                  className="flex items-center justify-between gap-3 text-xs"
                  key={`${court.id}-${slot.startHour}`}
                >
                  <span className="min-w-0 truncate text-zinc-300">
                    {court.name} · {slot.label}
                  </span>
                  <span className="shrink-0 font-bold text-white">
                    {formatPeso(slot.rate)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs leading-5 text-zinc-500">
                Select one or more available court-hours from the schedule.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
            <span className="text-sm font-semibold text-zinc-300">Total</span>
            <span className="font-display text-2xl font-black text-white">
              {formatPeso(fullAmount)}
            </span>
          </div>
        </section>

        <fieldset className="grid gap-3">
          <legend className="mb-3 font-display text-[0.62rem] font-black uppercase tracking-[0.18em] text-zinc-500">
            Payment amount
          </legend>
          {confirmingSlotAvailability ? (
            <div className="grid grid-cols-2 gap-3">
              <span className="h-20 animate-pulse rounded-2xl bg-white/[0.05]" />
              <span className="h-20 animate-pulse rounded-2xl bg-white/[0.05]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <PaymentAmountOption
                active={paymentAmountMode === "HALF"}
                label="50% downpayment"
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
          )}
        </fieldset>

        <section>
          <p className="font-display text-[0.62rem] font-black uppercase tracking-[0.18em] text-zinc-500">
            Pay with
          </p>
          <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.035] p-4">
            <Image
              alt="GoTyme payment QR code"
              className="aspect-square h-auto w-full rounded-lg bg-white object-contain p-2"
              height={720}
              src={qr.image}
              width={720}
            />
            <div className="mt-4 min-w-0 text-center">
              <p className="font-display text-lg font-black text-white">
                GoTyme
              </p>
            </div>
            <a
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] font-display text-[0.62rem] font-black uppercase tracking-[0.16em] text-white transition hover:border-white/45 hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              download="dinklab-gotyme-qr.jpg"
              href={qr.image}
            >
              <Download className="h-4 w-4" />
              Download QR
            </a>
          </div>
        </section>

        <div className="grid gap-3">
          <DesktopTextField
            autoComplete="name"
            error={paymentErrors.name}
            icon={<UserRound className="h-4 w-4" />}
            label="Customer name"
            placeholder="Enter your full name"
            value={customerName}
            onChange={onNameChange}
          />
          <DesktopTextField
            error={paymentErrors.contact}
            icon={<Smartphone className="h-4 w-4" />}
            inputMode="numeric"
            label="Contact number"
            placeholder="09XX XXX XXXX"
            value={customerContact}
            onChange={onContactChange}
          />
          <DesktopTextField
            autoComplete="email"
            error={paymentErrors.email}
            icon={<Mail className="h-4 w-4" />}
            inputMode="email"
            label="Email address (optional)"
            placeholder="name@example.com"
            type="email"
            value={customerEmail}
            onChange={onEmailChange}
          />
          <DesktopTextField
            icon={<ReceiptText className="h-4 w-4" />}
            label="Reference number (optional)"
            placeholder="Enter reference number"
            value={referenceNumber}
            onChange={onReferenceChange}
          />
        </div>

        <label className="grid gap-3">
          <span className="font-display text-[0.62rem] font-black uppercase tracking-[0.18em] text-zinc-500">
            Payment proof
          </span>
          <span
            className={[
              "flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed bg-white/[0.035] px-4 py-3 transition hover:bg-white/[0.07]",
              paymentErrors.proof
                ? "border-red-400/70"
                : "border-white/20 hover:border-white/45",
            ].join(" ")}
          >
            <span className="flex min-w-0 items-center gap-3">
              {proofUploading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white" />
              ) : (
                <ImageUp className="h-5 w-5 shrink-0 text-zinc-400" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-zinc-200">
                  {proofUploading
                    ? "Uploading payment proof..."
                    : proofUpload?.fileName || "Upload payment proof"}
                </span>
                <span className="mt-1 block text-xs text-zinc-600">
                  PNG or JPG, up to 5MB
                </span>
              </span>
            </span>
            {proofUpload ? (
              <button
                aria-label="Remove payment image"
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-red-300/40 hover:text-red-200"
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
            ) : null}
            <input
              accept="image/*"
              className="sr-only"
              disabled={proofDeleting || proofUploading}
              type="file"
              onChange={onProofChange}
            />
          </span>
          {paymentErrors.proof ? (
            <span className="text-xs text-red-300">{paymentErrors.proof}</span>
          ) : null}
        </label>

        <button
          className="premium-button font-display h-14 w-full cursor-pointer rounded-xl px-6 text-xs font-black uppercase tracking-[0.24em]"
          disabled={isPending || proofDeleting || proofUploading}
          type="button"
          onClick={onSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              Submit Booking
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}

function DesktopTextField({
  autoComplete,
  error,
  icon,
  inputMode,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  error?: string;
  icon: ReactNode;
  inputMode?: "email" | "numeric";
  label: string;
  placeholder: string;
  type?: "email" | "text";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-display text-[0.58rem] font-black uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
          {icon}
        </span>
        <input
          autoComplete={autoComplete}
          className={[
            "h-12 w-full rounded-xl border bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:bg-white/[0.06]",
            error
              ? "border-red-400/70 focus:border-red-300"
              : "border-white/12 focus:border-white/45",
          ].join(" ")}
          inputMode={inputMode}
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}
