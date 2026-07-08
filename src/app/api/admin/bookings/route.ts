import { NextResponse } from "next/server";
import { getAdminBookingsPage } from "@/utils/admin/getAdminBookings";
import { requireAdmin } from "@/utils/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const payload = await getAdminBookingsPage(page);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
