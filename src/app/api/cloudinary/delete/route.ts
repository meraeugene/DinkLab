import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deletePaymentProofAsset,
  isPaymentProofPublicId,
} from "@/utils/cloudinary/paymentProofStorage";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const deleteSchema = z.object({
  publicId: z.string().trim().min(1).max(255),
});

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid image." }, { status: 400 });
  }

  if (!isPaymentProofPublicId(parsed.data.publicId)) {
    return NextResponse.json({ error: "Invalid image." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: references, error: referenceError } = await admin
    .from("bookings")
    .select("id")
    .eq("payment_proof_public_id", parsed.data.publicId)
    .limit(1);
  if (referenceError) {
    return NextResponse.json(
      { error: "Unable to verify payment image." },
      { status: 500 },
    );
  }
  if (references?.length) {
    return NextResponse.json(
      { error: "This payment image belongs to a booking." },
      { status: 409 },
    );
  }

  try {
    await deletePaymentProofAsset(parsed.data.publicId);
  } catch {
    return NextResponse.json(
      { error: "Unable to remove payment image." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
