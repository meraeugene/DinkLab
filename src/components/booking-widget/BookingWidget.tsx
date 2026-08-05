"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BookingWidgetProps } from "@/types/bookingWidget";
import { formatHourRange, formatPeso } from "@/lib/pricing";
import { useBookingWidget } from "@/hooks/booking/useBookingWidget";
import { BookingToast } from "./BookingToast";
import { BookingTopBar } from "./BookingTopBar";
import { CompleteBookingPanel } from "./CompleteBookingPanel";
import { PriceCard } from "./PriceCard";
import { ScheduleStep } from "./ScheduleStep";
import { SubmittedStep } from "./SubmittedStep";

export function BookingWidget(props: BookingWidgetProps) {
  const booking = useBookingWidget(props);
  const stepScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (booking.step === "payment") {
      stepScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [booking.step]);

  return (
    <section
      id="schedule"
      className="site-container court-section relative  px-4 py-16 sm:px-6 "
    >
      <div className="mb-8  flex flex-col justify-between gap-8">
        <div>
          <p className="font-display text-sm font-black uppercase tracking-[0.35em] text-zinc-500">
            Court Booking
          </p>
          <h2 className="font-display hero-shine-text mt-3 text-3xl font-black uppercase leading-tight sm:text-6xl">
            BOOK SLOT NOW
          </h2>
          {/* <p className="mt-4 max-w-2xl text-zinc-400">
            Open the booking flow, choose your court, pick a day and time, then
            submit payment.
          </p> */}
        </div>
        <div>
          <h3 className="mb-4 font-display text-xl font-black uppercase tracking-[0.16em] text-white sm:text-2xl">
            DinkLab Pricelist
          </h3>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            {props.pricingBands.map((band) => (
              <PriceCard
                detail={formatHourRange(band.startHour, band.endHour)}
                key={band.id}
                label={band.label}
                value={`${formatPeso(band.hourlyRate)}/hr`}
              />
            ))}
          </div>
        </div>

        <div className="flex w-full justify-stretch sm:justify-start">
          <button
            className="premium-button font-display h-14 w-full cursor-pointer rounded-xl px-6 text-xs font-black uppercase tracking-[0.28em] sm:max-w-sm"
            type="button"
            onClick={booking.openBookingFlow}
          >
            Book a Slot
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className={[
          "fixed inset-0 z-50 bg-black transition duration-300",
          booking.open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-xl flex-col overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
          <BookingTopBar
            disabled={booking.isPending || booking.loadingTimeStep}
            selectedDate={booking.step !== "submitted" ? booking.date : undefined}
            step={booking.step}
            onBack={booking.goBack}
            onClose={booking.closeOverlay}
          />

          <div
            ref={stepScrollRef}
            className={[
              "min-h-0 flex-1 overflow-y-auto overscroll-contain pt-6",
              booking.step === "payment" ? "lg:grid lg:place-items-center" : "",
            ].join(" ")}
          >
            {booking.step === "schedule" ? (
              <ScheduleStep
                availabilityByDate={booking.availabilityByDate}
                calendarDates={booking.calendarDates}
                calendarMonth={booking.calendarMonth}
                courts={booking.courts}
                date={booking.date}
                displaySlotsByCourt={booking.displaySlotsByCourt}
                initialDate={props.initialDate}
                loading={booking.loadingTimeStep || booking.selectedDateLoading}
                selections={booking.selections}
                onChooseSlot={booking.chooseSlot}
                onContinue={booking.continueToPayment}
                onNextMonth={booking.nextMonth}
                onPreviousMonth={booking.previousMonth}
                onSelectDate={booking.selectDate}
              />
            ) : null}

            {booking.step === "payment" && booking.selectedSlots.length ? (
              <CompleteBookingPanel
                customerContact={booking.customerContact}
                customerName={booking.customerName}
                confirmingSlotAvailability={booking.loadingTimeStep}
                date={booking.date}
                isPending={booking.isPending}
                paymentAmountMode={booking.paymentAmountMode}
                paymentErrors={booking.paymentErrors}
                proofDeleting={booking.proofDeleting}
                proofUpload={booking.proofUpload}
                proofUploading={booking.proofUploading}
                referenceNumber={booking.referenceNumber}
                selectedSlots={booking.selectedSlots}
                onContactChange={booking.updateCustomerContact}
                onNameChange={booking.updateCustomerName}
                onPaymentAmountModeChange={booking.setPaymentAmountMode}
                onProofChange={booking.handleProofUpload}
                onProofRemove={booking.removeProofUpload}
                onReferenceChange={booking.updateReferenceNumber}
                onSubmit={booking.submitManualBooking}
              />
            ) : null}

            {booking.step === "submitted" ? (
              <SubmittedStep onBackToSite={booking.backToSiteAfterSubmit} />
            ) : null}
          </div>
        </div>
      </div>

      {booking.toast ? (
        <BookingToast
          toast={booking.toast}
          onClose={() => booking.setToast(null)}
        />
      ) : null}
    </section>
  );
}
