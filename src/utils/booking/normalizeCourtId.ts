import { COURTS } from "@/data/app/appConfig";

export function normalizeCourtId(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") return null;

  const input = value.trim();
  if (!input) return null;

  const lowerInput = input.toLowerCase();
  const compactInput = lowerInput.replace(/[\s_-]/g, "");

  const court = COURTS.find((item, index) => {
    const displayNumber = String(index + 1);
    const aliases = [
      item.id.toLowerCase(),
      item.name.toLowerCase(),
      item.name.toLowerCase().replace(/[\s_-]/g, ""),
      displayNumber,
      `court${displayNumber}`,
    ];

    return aliases.includes(lowerInput) || aliases.includes(compactInput);
  });

  return court?.id || null;
}

export function isKnownCourtId(value: FormDataEntryValue | string | null) {
  return Boolean(normalizeCourtId(value));
}
