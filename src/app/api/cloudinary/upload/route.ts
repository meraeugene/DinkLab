import { NextResponse } from "next/server";
import { uploadPaymentProofFile } from "@/utils/cloudinary/paymentProofStorage";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing image." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Payment image must be an image file." },
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "Payment image must be 5MB or smaller." },
      { status: 400 },
    );
  }

  try {
    const upload = await uploadPaymentProofFile(file);
    return NextResponse.json(upload);
  } catch {
    return NextResponse.json(
      { error: "Unable to upload payment image." },
      { status: 502 },
    );
  }
}
