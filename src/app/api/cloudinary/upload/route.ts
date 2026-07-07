import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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

  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "dinklab/payment-proofs";
  const timestamp = Math.round(Date.now() / 1000).toString();
  const signature = signCloudinaryParams({ folder, timestamp }, apiSecret);

  const uploadData = new FormData();
  uploadData.append("file", file);
  uploadData.append("api_key", apiKey);
  uploadData.append("folder", folder);
  uploadData.append("timestamp", timestamp);
  uploadData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: uploadData,
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    return NextResponse.json(
      { error: "Unable to upload payment image." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
  });
}

function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string,
) {
  const base = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${base}${apiSecret}`)
    .digest("hex");
}
