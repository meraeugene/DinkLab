import { NextResponse } from "next/server";
import { getUserBookingHistory } from "@/utils/booking/getAcceptedBookings";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const bookings = await getUserBookingHistory(user.id);

  return NextResponse.json(
    { bookings },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
