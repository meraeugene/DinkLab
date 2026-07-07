import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptBooking, cancelManualBooking } from "@/app/actions";
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
  payment_method: "GCASH" | "BANK_TRANSFER";
  payment_reference: string | null;
  payment_proof_path: string | null;
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
      "id,user_email,customer_name,customer_contact,start_at,end_at,hourly_rate,total_amount,payment_method,payment_reference,payment_proof_path,status,courts(name)",
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const bookingRows = (bookings || []) as AdminBooking[];
  const receiptUrls = new Map<string, string>();
  await Promise.all(
    bookingRows.map(async (booking) => {
      if (!booking.payment_proof_path) return;
      const { data } = await admin.storage
        .from("payment-receipts")
        .createSignedUrl(booking.payment_proof_path, 60 * 60);
      if (data?.signedUrl) receiptUrls.set(booking.id, data.signedUrl);
    }),
  );

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
              Dink Lab
            </p>
            <h1 className="mt-2 text-4xl font-black">Admin Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Review manual payment submissions. Accepting a booking locks that
              court and time for everyone else.
            </p>
          </div>
          <Link
            className="rounded-full border border-white/15 px-5 py-3 text-sm transition hover:border-white/35"
            href="/"
          >
            Back to site
          </Link>
        </div>

        <section className="mt-8 rounded-xl border border-white/10 bg-zinc-950 p-5">
          <h2 className="text-xl font-bold">Booking submissions</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="border-b border-white/10 py-3">Customer</th>
                  <th className="border-b border-white/10 py-3">Contact</th>
                  <th className="border-b border-white/10 py-3">Court</th>
                  <th className="border-b border-white/10 py-3">Time</th>
                  <th className="border-b border-white/10 py-3">Amount</th>
                  <th className="border-b border-white/10 py-3">Method</th>
                  <th className="border-b border-white/10 py-3">Proof</th>
                  <th className="border-b border-white/10 py-3">Status</th>
                  <th className="border-b border-white/10 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookingRows.map((booking) => (
                  <tr key={booking.id} className="align-top text-zinc-300">
                    <td className="border-b border-white/5 py-3">
                      <p className="font-semibold text-white">
                        {booking.customer_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {booking.user_email}
                      </p>
                    </td>
                    <td className="border-b border-white/5 py-3">
                      {booking.customer_contact}
                    </td>
                    <td className="border-b border-white/5 py-3">
                      {getJoinedName(booking.courts)}
                    </td>
                    <td className="border-b border-white/5 py-3">
                      <p>{formatManilaDateTime(booking.start_at)}</p>
                      <p className="text-xs text-zinc-500">
                        Ends {formatManilaDateTime(booking.end_at)}
                      </p>
                    </td>
                    <td className="border-b border-white/5 py-3">
                      <p>{formatPeso(booking.total_amount)}</p>
                      <p className="text-xs text-zinc-500">
                        {formatPeso(booking.hourly_rate)}/hr
                      </p>
                    </td>
                    <td className="border-b border-white/5 py-3">
                      {formatPaymentMethod(booking.payment_method)}
                    </td>
                    <td className="border-b border-white/5 py-3">
                      <p className="max-w-40 truncate text-xs text-zinc-400">
                        Ref: {booking.payment_reference || "-"}
                      </p>
                      {receiptUrls.get(booking.id) ? (
                        <Link
                          className="mt-1 inline-flex rounded-lg border border-white/15 px-3 py-1 text-xs transition hover:border-white/40"
                          href={receiptUrls.get(booking.id)!}
                          target="_blank"
                        >
                          View image
                        </Link>
                      ) : null}
                    </td>
                    <td className="border-b border-white/5 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="border-b border-white/5 py-3">
                      <div className="flex gap-2">
                        {booking.status === "PENDING_REVIEW" ? (
                          <form action={acceptBooking}>
                            <input
                              name="bookingId"
                              type="hidden"
                              value={booking.id}
                            />
                            <button className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-zinc-200">
                              Accept
                            </button>
                          </form>
                        ) : null}
                        {booking.status !== "CANCELLED" ? (
                          <form action={cancelManualBooking}>
                            <input
                              name="bookingId"
                              type="hidden"
                              value={booking.id}
                            />
                            <button className="rounded-lg border border-white/15 px-3 py-2 text-xs transition hover:border-white/40">
                              Cancel
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bookingRows.length ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No booking submissions yet.
              </p>
            ) : null}
          </div>
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
  return value === "BANK_TRANSFER" ? "Bank Transfer" : "GCash";
}

function getJoinedName(value: JoinedCourt) {
  if (Array.isArray(value)) return value[0]?.name || "Court";
  return value?.name || "Court";
}
