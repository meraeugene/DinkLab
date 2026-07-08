import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots, isKnownCourt } from "@/utils/booking/bookingAvailability";
import { normalizeCourtId } from "@/utils/booking/normalizeCourtId";

const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  courtId: z.string().min(1),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = availabilitySchema.safeParse({
    date: url.searchParams.get("date"),
    courtId: url.searchParams.get("courtId"),
  });

  const courtId = parsed.success ? normalizeCourtId(parsed.data.courtId) : null;

  if (!parsed.success || !courtId || !isKnownCourt(courtId)) {
    return NextResponse.json(
      { error: "Invalid availability request." },
      { status: 400 },
    );
  }

  try {
    const slots = await getAvailableSlots(
      parsed.data.date,
      courtId,
    );
    return NextResponse.json(
      { slots },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load availability." },
      { status: 500 },
    );
  }
}
