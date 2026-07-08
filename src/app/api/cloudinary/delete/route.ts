import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEnv } from "@/utils/env/appEnv";
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

  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const folder = normalizeFolder(
    process.env.CLOUDINARY_UPLOAD_FOLDER || "dinklab/payment-proofs",
  );

  if (folder && !parsed.data.publicId.startsWith(`${folder}/`)) {
    return NextResponse.json({ error: "Invalid image." }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000).toString();
  const signature = signCloudinaryParams(
    { public_id: parsed.data.publicId, timestamp },
    apiSecret,
  );

  const body = new FormData();
  body.append("api_key", apiKey);
  body.append("public_id", parsed.data.publicId);
  body.append("timestamp", timestamp);
  body.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      body,
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to remove payment image." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function normalizeFolder(folder: string) {
  return folder.trim().replace(/^\/+|\/+$/g, "");
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
