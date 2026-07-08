import { NextResponse } from "next/server";
import { getAdminBookingsPage } from "@/utils/admin/getAdminBookings";
import { requireAdmin } from "@/utils/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const payload = await getAdminBookingsPage({
    page: url.searchParams.get("page") || "1",
    status: url.searchParams.get("status") || "",
    courtId: url.searchParams.get("courtId") || "",
    paymentMethod: url.searchParams.get("paymentMethod") || "",
    date: url.searchParams.get("date") || "",
    q: url.searchParams.get("q") || "",
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
