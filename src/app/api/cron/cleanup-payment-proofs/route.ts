import { NextResponse } from "next/server";
import {
  deletePaymentProofAsset,
  listPaymentProofAssets,
} from "@/utils/cloudinary/paymentProofStorage";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const STALE_AFTER_MS = 60 * 60 * 1000;
const DATABASE_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 10;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const cutoff = Date.now() - STALE_AFTER_MS;
    const assets = await listPaymentProofAssets();
    const staleAssets = assets.filter(
      (asset) => new Date(asset.createdAt).getTime() <= cutoff,
    );
    const referencedIds = await getReferencedPaymentProofIds(
      staleAssets.map((asset) => asset.publicId),
    );
    const orphanedAssets = staleAssets.filter(
      (asset) => !referencedIds.has(asset.publicId),
    );

    let deleted = 0;
    let failed = 0;
    for (let index = 0; index < orphanedAssets.length; index += DELETE_BATCH_SIZE) {
      const batch = orphanedAssets.slice(index, index + DELETE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((asset) => deletePaymentProofAsset(asset.publicId)),
      );
      deleted += results.filter((result) => result.status === "fulfilled").length;
      failed += results.filter((result) => result.status === "rejected").length;
    }

    return NextResponse.json({
      ok: failed === 0,
      scanned: assets.length,
      stale: staleAssets.length,
      referenced: referencedIds.size,
      deleted,
      failed,
    });
  } catch (error) {
    console.error("Payment proof cleanup failed", error);
    return NextResponse.json(
      { error: "Unable to clean up payment proofs." },
      { status: 500 },
    );
  }
}

async function getReferencedPaymentProofIds(publicIds: string[]) {
  const referencedIds = new Set<string>();
  if (!publicIds.length) return referencedIds;

  const admin = createAdminClient();
  for (let index = 0; index < publicIds.length; index += DATABASE_BATCH_SIZE) {
    const batch = publicIds.slice(index, index + DATABASE_BATCH_SIZE);
    const { data, error } = await admin
      .from("bookings")
      .select("payment_proof_public_id")
      .in("payment_proof_public_id", batch);

    if (error) throw error;
    for (const booking of data || []) {
      if (booking.payment_proof_public_id) {
        referencedIds.add(String(booking.payment_proof_public_id));
      }
    }
  }

  return referencedIds;
}
