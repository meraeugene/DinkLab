import { NextResponse } from "next/server";
import { getAdminSchedule } from "@/utils/admin/getAdminSchedule";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { todayInManila } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayInManila();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const bookings = await getAdminSchedule(date);

  return NextResponse.json(
    { bookings },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
