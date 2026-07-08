"use client";

import { ArrowRight } from "lucide-react";
import type { BookingWidgetProps } from "@/types/bookingWidget";
import { useBookingWidget } from "@/hooks/booking/useBookingWidget";
import { BookingToast } from "./BookingToast";
import { BookingTopBar } from "./BookingTopBar";
import { CompleteBookingPanel } from "./CompleteBookingPanel";
import { CourtStep } from "./CourtStep";
import { DayStep } from "./DayStep";
import { PriceCard } from "./PriceCard";
import { SubmittedStep } from "./SubmittedStep";
import { TimeStep } from "./TimeStep";

export function BookingWidget(props: BookingWidgetProps) {
  const booking = useBookingWidget(props);

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
        <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-3xl flex-col overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
          <BookingTopBar
            step={booking.step}
            onBack={booking.goBack}
            onClose={booking.closeOverlay}
          />

          <div
            className={[
              "min-h-0 flex-1 overflow-y-auto overscroll-contain pt-6",
              booking.step === "court" || booking.step === "time"
                ? "lg:grid lg:place-items-center"
                : "",
            ].join(" ")}
          >
            {booking.step === "court" ? (
              <div className="w-full lg:max-w-3xl">
                <CourtStep
                  courtId={booking.courtId}
                  onChooseCourt={booking.chooseCourt}
                  onContinue={() => booking.setStep("day")}
                />
              </div>
            ) : null}

            {booking.step === "day" ? (
              <DayStep
                availabilityByDate={booking.availabilityByDate}
                calendarDates={booking.calendarDates}
                calendarMonth={booking.calendarMonth}
                courtId={booking.courtId}
                date={booking.date}
                initialDate={props.initialDate}
                selectedStatus={booking.selectedDayStatus}
                onChooseDate={booking.chooseDate}
                onContinue={booking.continueToTime}
                onNextMonth={booking.nextMonth}
                onPreviousMonth={booking.previousMonth}
              />
            ) : null}

            {booking.step === "time" ? (
              <div className="w-full lg:max-w-5xl">
                <TimeStep
                  displaySlots={booking.displaySlots}
                  selectedHour={booking.selectedHour}
                  validatingSlotHour={booking.validatingSlotHour}
                  onChooseSlot={booking.chooseSlot}
                />
              </div>
            ) : null}

            {booking.step === "payment" && booking.selectedSlot ? (
              <CompleteBookingPanel
                customerContact={booking.customerContact}
                customerName={booking.customerName}
                date={booking.date}
                isPending={booking.isPending}
                paymentAmountMode={booking.paymentAmountMode}
                paymentErrors={booking.paymentErrors}
                paymentMethod={booking.paymentMethod}
                proofDeleting={booking.proofDeleting}
                proofUpload={booking.proofUpload}
                proofUploading={booking.proofUploading}
                referenceNumber={booking.referenceNumber}
                selectedCourt={booking.selectedCourt.name}
                selectedSlot={booking.selectedSlot}
                onContactChange={booking.updateCustomerContact}
                onPaymentAmountModeChange={booking.setPaymentAmountMode}
                onPaymentMethodChange={booking.updatePaymentMethod}
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
