export async function uploadPaymentProof(file: File) {
  const uploadData = new FormData();
  uploadData.append("file", file);

  const response = await fetch("/api/cloudinary/upload", {
    method: "POST",
    body: uploadData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.secureUrl || !payload?.publicId) {
    throw new Error(payload?.error || "Unable to upload payment image.");
  }

  return {
    publicId: String(payload.publicId),
    secureUrl: String(payload.secureUrl),
  };
}
