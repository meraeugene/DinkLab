export async function deletePaymentProofUpload(publicId: string) {
  const response = await fetch("/api/cloudinary/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });

  if (!response.ok) {
    throw new Error("Unable to remove payment image.");
  }
}
