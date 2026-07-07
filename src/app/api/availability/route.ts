import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots, isKnownCourt } from "@/lib/booking";

const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  courtId: z.string().uuid(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = availabilitySchema.safeParse({
    date: url.searchParams.get("date"),
    courtId: url.searchParams.get("courtId"),
  });

  if (!parsed.success || !isKnownCourt(parsed.data.courtId)) {
    return NextResponse.json(
      { error: "Invalid availability request." },
      { status: 400 },
    );
  }

  try {
    const slots = await getAvailableSlots(
      parsed.data.date,
      parsed.data.courtId,
    );
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json(
      { error: "Unable to load availability." },
      { status: 500 },
    );
  }
}
