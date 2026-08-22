"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Loader2, Star } from "lucide-react";
import { sendBookingFeedback } from "@/actions/feedback/sendBookingFeedback";

export function SubmittedStep({
  bookingGroupId,
  hasNotificationEmail,
  onBackToSite,
}: {
  bookingGroupId: string | null;
  hasNotificationEmail: boolean;
  onBackToSite: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitFeedback(formData: FormData) {
    if (!bookingGroupId || !rating || pending) return;
    setMessage(null);
    formData.set("bookingGroupId", bookingGroupId);
    formData.set("rating", String(rating));

    startTransition(async () => {
      const result = await sendBookingFeedback(formData);
      if (!result.ok) {
        setMessage(result.error || "Unable to send your feedback.");
        return;
      }
      setSent(true);
      setMessage("Thank you! Your feedback was sent.");
    });
  }

  return (
    <div className="mx-auto max-w-xl py-8 text-center">
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
        Your booking request was submitted and is awaiting admin review.
        {hasNotificationEmail
          ? " If accepted, we will email you a notification and calendar invite."
          : " You can follow its status in your booking history on this browser."}
      </p>

      {bookingGroupId ? (
        <div className="mt-7 rounded-2xl border border-white/10 bg-zinc-950 p-4 text-left sm:p-5">
          {sent ? (
            <div className="py-3 text-center">
              <p className="font-display text-sm font-black uppercase tracking-[0.16em] text-sky-200">
                Feedback sent
              </p>
              <p className="mt-2 text-sm text-zinc-400">Thank you for helping us improve.</p>
            </div>
          ) : (
            <form action={submitFeedback} className="grid gap-4">
              <div className="text-center">
                <p className="font-display text-sm font-black text-white">
                  How was your booking experience?
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Choose a rating from 1 to 5 stars.
                </p>
                <div
                  aria-label="Booking experience rating"
                  className="mt-3 flex justify-center gap-1"
                  role="radiogroup"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoveredRating || rating);
                    return (
                      <button
                        aria-checked={rating === star}
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                        className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg transition hover:bg-sky-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                        disabled={pending}
                        key={star}
                        role="radio"
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setMessage(null);
                        }}
                        onMouseEnter={() => setHoveredRating(star)}
                      >
                        <Star
                          className={`h-7 w-7 transition ${active ? "fill-sky-300 text-sky-300" : "text-zinc-700"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-zinc-300">
                Comment <span className="font-normal text-zinc-600">(optional)</span>
                <textarea
                  className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black px-3 py-3 text-base text-white outline-none transition placeholder:text-zinc-700 focus:border-sky-300/45 sm:text-sm"
                  disabled={pending}
                  maxLength={1000}
                  name="comment"
                  placeholder="Tell us what went well or what we can improve"
                />
              </label>

              {message ? (
                <p className="rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-center text-xs font-semibold text-red-100">
                  {message}
                </p>
              ) : null}

              <button
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 font-display text-xs font-black uppercase tracking-[0.16em] text-sky-100 transition hover:border-sky-200/55 hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!rating || pending}
                type="submit"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {pending ? "Sending..." : "Send feedback"}
              </button>
            </form>
          )}
        </div>
      ) : null}

      <button
        className="premium-button-dark font-display mt-8 h-12 cursor-pointer rounded-xl px-6 text-xs font-black uppercase tracking-[0.24em]"
        type="button"
        onClick={onBackToSite}
      >
        Back to Site
      </button>
    </div>
  );
}
