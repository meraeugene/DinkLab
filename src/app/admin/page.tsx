import { ArrowLeft, ExternalLink, Mail, Phone, ReceiptText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBookingActions } from "@/components/admin-booking-actions";
import { getAdminEmails } from "@/lib/env";
import { formatPeso } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatManilaDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type JoinedCourt = { name: string } | { name: string }[] | null;
type AdminBooking = {
  id: string;
  user_email: string;
  customer_name: string;
  customer_contact: string;
  start_at: string;
  end_at: string;
  hourly_rate: number;
  total_amount: number;
  downpayment_amount: number;
  payment_method: "BPI" | "GOTYME" | "ONSITE";
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED";
  courts: JoinedCourt;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/");
  if (!getAdminEmails().includes(user.email.toLowerCase())) redirect("/");

  const admin = createAdminClient();
  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id,user_email,customer_name,customer_contact,start_at,end_at,hourly_rate,total_amount,downpayment_amount,payment_method,payment_reference,payment_proof_url,status,courts(name)",
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const bookingRows = (bookings || []) as AdminBooking[];

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Dink Lab
            </p>
            <h1 className="mt-2 text-3xl font-display font-black">
              Admin Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Review manual payment submissions. Accepting a booking locks that
              court and time for everyone else.
            </p>
          </div>
          <Link
            className="premium-button h-12 rounded-xl px-5 font-display text-xs font-black uppercase tracking-[0.2em]"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                Review Queue
              </p>
              <h2 className="mt-2 text-lg font-black font-display">
                Booking submissions
              </h2>
            </div>
            <p className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500">
              {bookingRows.length} total
            </p>
          </div>

          {bookingRows.length ? (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {bookingRows.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.32)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-white">
                          {booking.customer_name}
                        </h3>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-500">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{booking.user_email}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span>{booking.customer_contact}</span>
                      </p>
                    </div>
                    <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Pay
                      </p>
                      <p className="text-lg font-black text-white">
                        {formatPeso(booking.downpayment_amount)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        of {formatPeso(booking.total_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoBox
                      label="Court"
                      value={getJoinedName(booking.courts)}
                    />
                    <InfoBox
                      label="Method"
                      value={formatPaymentMethod(booking.payment_method)}
                    />
                    <InfoBox
                      label="Starts"
                      value={formatManilaDateTime(booking.start_at)}
                    />
                    <InfoBox
                      label="Ends"
                      value={formatManilaDateTime(booking.end_at)}
                    />
                  </div>

                  <div className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-black/35 p-3 sm:grid-cols-[1fr_10rem] sm:items-stretch">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        <ReceiptText className="h-4 w-4" />
                        Payment proof
                      </div>
                      <p className="mt-2 truncate text-sm text-zinc-300">
                        Ref: {booking.payment_reference || "No reference"}
                      </p>
                    </div>
                    {booking.payment_proof_url ? (
                      <Link
                        className="block overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
                        href={booking.payment_proof_url}
                        target="_blank"
                      >
                        <span
                          aria-hidden="true"
                          className="block aspect-[16/10] bg-cover bg-center sm:aspect-auto sm:h-full"
                          style={{
                            backgroundImage: `url(${booking.payment_proof_url})`,
                          }}
                        />
                        <span className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300">
                          Preview proof <ExternalLink className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    ) : (
                      <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-zinc-500 sm:grid sm:place-items-center">
                        No uploaded proof
                      </p>
                    )}
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <AdminBookingActions
                      bookingId={booking.id}
                      status={booking.status}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-10 text-center text-sm text-zinc-500">
              No booking submissions yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const label =
    status === "PENDING_REVIEW"
      ? "Pending review"
      : status === "ACCEPTED"
        ? "Accepted"
        : "Cancelled";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        status === "ACCEPTED"
          ? "border-lime-400/30 bg-lime-400/10 text-lime-300"
          : status === "CANCELLED"
            ? "border-red-400/25 bg-red-400/10 text-red-200"
            : "border-amber-300/25 bg-amber-300/10 text-amber-200",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function formatPaymentMethod(value: AdminBooking["payment_method"]) {
  if (value === "GOTYME") return "GoTyme";
  if (value === "ONSITE") return "Onsite";
  return "BPI";
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-2.5">
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-zinc-200">
        {value}
      </p>
    </div>
  );
}

function getJoinedName(value: JoinedCourt) {
  if (Array.isArray(value)) return value[0]?.name || "Court";
  return value?.name || "Court";
}
