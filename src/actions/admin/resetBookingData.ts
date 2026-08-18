"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

const RESET_CONFIRMATION = "RESET BOOKINGS";

type BookingProofRow = {
  payment_proof_public_id: string | null;
};

export async function resetBookingData(formData: FormData) {
  const adminUser = await requireAdmin();
  const confirmation = String(formData.get("confirmation") || "").trim();

  if (!adminUser) {
    return { ok: false, error: "Unauthorized.", deletedCount: 0 };
  }

  if (confirmation !== RESET_CONFIRMATION) {
    return {
      ok: false,
      error: `Type ${RESET_CONFIRMATION} to reset booking data.`,
      deletedCount: 0,
    };
  }

  const admin = createAdminClient();
  const { data: proofRows } = await admin
    .from("bookings")
    .select("payment_proof_public_id")
    .not("payment_proof_public_id", "is", null);

  const publicIds = Array.from(
    new Set(
      ((proofRows || []) as BookingProofRow[])
        .map((row) => row.payment_proof_public_id)
        .filter((publicId): publicId is string => Boolean(publicId)),
    ),
  );

  const deleteResult = await admin
    .from("bookings")
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteResult.error) {
    return {
      ok: false,
      error: "Unable to reset booking data.",
      deletedCount: 0,
    };
  }

  await deleteCloudinaryProofs(publicIds);
  revalidatePath("/");
  revalidatePath("/admin");

  return {
    ok: true,
    deletedCount: deleteResult.count || 0,
  };
}

async function deleteCloudinaryProofs(publicIds: string[]) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret || !publicIds.length) {
    return;
  }

  await Promise.allSettled(
    publicIds.map((publicId) =>
      deleteCloudinaryProof({
        apiKey,
        apiSecret,
        cloudName,
        publicId,
      }),
    ),
  );
}

async function deleteCloudinaryProof({
  apiKey,
  apiSecret,
  cloudName,
  publicId,
}: {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  publicId: string;
}) {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const signature = signCloudinaryParams(
    { public_id: publicId, timestamp },
    apiSecret,
  );
  const body = new FormData();
  body.append("api_key", apiKey);
  body.append("public_id", publicId);
  body.append("timestamp", timestamp);
  body.append("signature", signature);

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body,
  }).catch(() => undefined);
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
