import crypto from "node:crypto";
import { requireEnv } from "@/utils/env/appEnv";

const DEFAULT_PAYMENT_PROOF_FOLDER = "dinklab/payment-proofs";
const CLOUDINARY_PAGE_SIZE = 500;

export type CloudinaryPaymentProofAsset = {
  createdAt: string;
  publicId: string;
};

export function getPaymentProofFolder() {
  return normalizeFolder(
    process.env.CLOUDINARY_UPLOAD_FOLDER || DEFAULT_PAYMENT_PROOF_FOLDER,
  );
}

export function isPaymentProofPublicId(publicId: string) {
  const folder = getPaymentProofFolder();
  return Boolean(folder) && publicId.startsWith(`${folder}/`);
}

export async function uploadPaymentProofFile(file: File) {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const folder = getPaymentProofFolder();
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
    throw new Error("Unable to upload payment image.");
  }

  return {
    secureUrl: String(payload.secure_url),
    publicId: String(payload.public_id),
  };
}

export async function deletePaymentProofAsset(publicId: string) {
  if (!isPaymentProofPublicId(publicId)) {
    throw new Error("Invalid payment proof public id.");
  }

  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
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

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      body,
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || !["ok", "not found"].includes(payload?.result)) {
    throw new Error("Unable to remove payment image.");
  }
}

export async function listPaymentProofAssets() {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const folder = getPaymentProofFolder();
  const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const assets: CloudinaryPaymentProofAsset[] = [];
  let nextCursor: string | undefined;

  do {
    const url = new URL(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
    );
    url.searchParams.set("prefix", `${folder}/`);
    url.searchParams.set("max_results", String(CLOUDINARY_PAGE_SIZE));
    url.searchParams.set("fields", "public_id,created_at");
    if (nextCursor) url.searchParams.set("next_cursor", nextCursor);

    const response = await fetch(url, {
      headers: { Authorization: `Basic ${authorization}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(payload?.resources)) {
      throw new Error("Unable to list Cloudinary payment proofs.");
    }

    for (const resource of payload.resources) {
      if (
        typeof resource?.public_id === "string" &&
        typeof resource?.created_at === "string" &&
        isPaymentProofPublicId(resource.public_id)
      ) {
        assets.push({
          publicId: resource.public_id,
          createdAt: resource.created_at,
        });
      }
    }

    nextCursor =
      typeof payload.next_cursor === "string"
        ? payload.next_cursor
        : undefined;
  } while (nextCursor);

  return assets;
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
