"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CourtOption } from "@/types/bookingSettings";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";

const bandSchema = z.object({
  label: z.string().trim().min(2).max(40),
  startHour: z.coerce.number().int().min(0).max(28),
  endHour: z.coerce.number().int().min(1).max(29),
  hourlyRate: z.coerce.number().int().min(1).max(10000),
});

const courtSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.enum(["Indoor", "Outdoor"]),
});

const hoursSchema = z.object({
  openHour: z.coerce.number().int().min(0).max(24),
  closeHour: z.coerce.number().int().min(1).max(29),
});

export type BusinessRuleFieldErrors = Partial<
  Record<
    | "openHour"
    | "closeHour"
    | "pricingBands"
    | "courts"
    | `court-${number}-name`
    | `court-${number}-description`
    | `band-${number}-label`
    | `band-${number}-startHour`
    | `band-${number}-endHour`
    | `band-${number}-hourlyRate`,
    string
  >
>;

type UpdateBusinessRulesResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: BusinessRuleFieldErrors;
  courts?: CourtOption[];
};

export async function updateCourts(formData: FormData) {
  if (!(await requireAdmin())) {
    return unauthorized();
  }

  const courtIds = formData.getAll("courtId");
  const courtNames = formData.getAll("courtName");
  const courtTypes = formData.getAll("courtType");
  const deletedCourtIds = formData
    .getAll("deletedCourtId")
    .map((id) => String(id).trim())
    .filter(Boolean);
  const parsed = z
    .array(courtSchema)
    .min(1)
    .max(12)
    .safeParse(
      courtIds.map((id, index) => ({
        id,
        name: courtNames[index],
        description: courtTypes[index],
      })),
    );

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted court details.",
      fieldErrors: mapCourtIssues(parsed.error.issues),
    } satisfies UpdateBusinessRulesResult;
  }

  const courtNamesSeen = new Set<string>();
  for (let index = 0; index < parsed.data.length; index += 1) {
    const court = parsed.data[index];

    const normalizedName = court.name.toLowerCase();
    if (courtNamesSeen.has(normalizedName)) {
      return {
        ok: false,
        error: "Court names must be unique.",
        fieldErrors: {
          courts: "Use a unique name for each court.",
          [`court-${index}-name`]: "This court name is already used.",
        },
      } satisfies UpdateBusinessRulesResult;
    }
    courtNamesSeen.add(normalizedName);
  }

  const admin = createAdminClient();
  if (deletedCourtIds.length) {
    const deleteResults = await Promise.all(
      deletedCourtIds.map((id) => admin.from("courts").delete().eq("id", id)),
    );
    const failedDelete = deleteResults.find((result) => result.error);

    if (failedDelete?.error) {
      const isReferenced = failedDelete.error.code === "23503";
      return {
        ok: false,
        error: isReferenced
          ? "This court already has bookings, so it cannot be deleted."
          : "Unable to delete court.",
        fieldErrors: {
          courts: isReferenced
            ? "Courts with booking history must stay saved. Rename it instead, or keep it hidden from customers later when archive support is added."
            : failedDelete.error.message,
        },
      } satisfies UpdateBusinessRulesResult;
    }
  }

  const results = await Promise.all(
    parsed.data.map((court) =>
      court.id
        ? admin
            .from("courts")
            .update({
              name: court.name,
              description: court.description || null,
            })
            .eq("id", court.id)
        : admin.from("courts").insert({
            id: crypto.randomUUID(),
            name: court.name,
            description: court.description || null,
          }),
    ),
  );
  const failed = results.find((result) => result.error);

  if (failed?.error) {
    return {
      ok: false,
      error: "Unable to save court details.",
      fieldErrors: { courts: failed.error.message },
    } satisfies UpdateBusinessRulesResult;
  }

  revalidateApp();
  const { data: savedCourts } = await admin
    .from("courts")
    .select("id,name,description")
    .order("name", { ascending: true });

  return {
    ok: true,
    courts: savedCourts || undefined,
  } satisfies UpdateBusinessRulesResult;
}

export async function updateOperatingHours(formData: FormData) {
  if (!(await requireAdmin())) {
    return unauthorized();
  }

  const parsed = hoursSchema.safeParse({
    openHour: formData.get("openHour"),
    closeHour: formData.get("closeHour"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please choose valid operating hours.",
      fieldErrors: mapHourIssues(parsed.error.issues),
    } satisfies UpdateBusinessRulesResult;
  }

  const { openHour, closeHour } = parsed.data;
  if (closeHour <= openHour) {
    return {
      ok: false,
      error: "Closing hour must be after opening hour.",
      fieldErrors: {
        openHour: "Opening must be before closing.",
        closeHour: "Closing must be after opening.",
      },
    } satisfies UpdateBusinessRulesResult;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("booking_settings").upsert({
    id: true,
    open_hour: openHour,
    close_hour: closeHour,
    timezone: "Asia/Manila",
  });

  if (error) {
    return {
      ok: false,
      error: "Unable to update operating hours.",
    } satisfies UpdateBusinessRulesResult;
  }

  revalidateApp();
  return { ok: true } satisfies UpdateBusinessRulesResult;
}

export async function updatePricingBands(formData: FormData) {
  if (!(await requireAdmin())) {
    return unauthorized();
  }

  const labels = formData.getAll("label");
  const starts = formData.getAll("startHour");
  const ends = formData.getAll("endHour");
  const rates = formData.getAll("hourlyRate");
  const parsed = z
    .array(bandSchema)
    .min(1)
    .max(8)
    .safeParse(
      labels.map((label, index) => ({
        label,
        startHour: starts[index],
        endHour: ends[index],
        hourlyRate: rates[index],
      })),
    );

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted pricing bands.",
      fieldErrors: mapBandIssues(parsed.error.issues),
    } satisfies UpdateBusinessRulesResult;
  }

  const sortedBands = [...parsed.data].sort(
    (a, b) => a.startHour - b.startHour,
  );
  let coveredUntil = sortedBands[0].startHour;
  for (const band of sortedBands) {
    const index = parsed.data.indexOf(band);
    if (band.endHour <= band.startHour) {
      return {
        ok: false,
        error: "Each price band must end after it starts.",
        fieldErrors: {
          pricingBands: "Fix the highlighted pricing band.",
          [`band-${index}-startHour`]: "Start must be before end.",
          [`band-${index}-endHour`]: "End must be after start.",
        },
      } satisfies UpdateBusinessRulesResult;
    }
    if (band.startHour > coveredUntil) {
      return {
        ok: false,
        error: "Pricing bands cannot have gaps.",
        fieldErrors: {
          pricingBands:
            "Every operating hour needs a price. Adjust starts and ends so bands touch.",
          [`band-${index}-startHour`]:
            "This starts after the previous band ends.",
        },
      } satisfies UpdateBusinessRulesResult;
    }
    if (band.startHour < coveredUntil) {
      return {
        ok: false,
        error: "Pricing bands cannot overlap.",
        fieldErrors: {
          pricingBands:
            "Pricing bands should touch, not overlap. Adjust the highlighted start hour.",
          [`band-${index}-startHour`]: "This overlaps the previous band.",
        },
      } satisfies UpdateBusinessRulesResult;
    }
    coveredUntil = band.endHour;
  }

  const admin = createAdminClient();
  const deleteResult = await admin
    .from("pricing_bands")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteResult.error) {
    return {
      ok: false,
      error: "Unable to replace pricing bands.",
    } satisfies UpdateBusinessRulesResult;
  }

  const { error } = await admin.from("pricing_bands").insert(
    sortedBands.map((band, index) => ({
      label: band.label,
      start_hour: band.startHour,
      end_hour: band.endHour,
      hourly_rate: band.hourlyRate,
      sort_order: (index + 1) * 10,
      active: true,
    })),
  );

  if (error) {
    return {
      ok: false,
      error: "Unable to save pricing bands.",
      fieldErrors: { pricingBands: error.message },
    } satisfies UpdateBusinessRulesResult;
  }

  revalidateApp();
  return { ok: true } satisfies UpdateBusinessRulesResult;
}

function mapCourtIssues(issues: z.ZodIssue[]) {
  const fieldErrors: BusinessRuleFieldErrors = {};
  for (const issue of issues) {
    const [index, field] = issue.path;
    if (typeof index !== "number") {
      fieldErrors.courts = "Check the court details.";
    } else if (field === "name") {
      fieldErrors[`court-${index}-name`] =
        "Court name must be at least 2 characters.";
    } else if (field === "description") {
      fieldErrors[`court-${index}-description`] =
        "Choose Indoor or Outdoor.";
    }
  }
  return fieldErrors;
}

function mapHourIssues(issues: z.ZodIssue[]) {
  const fieldErrors: BusinessRuleFieldErrors = {};
  for (const issue of issues) {
    if (issue.path[0] === "openHour") {
      fieldErrors.openHour = "Enter an opening hour from 0 to 24.";
    }
    if (issue.path[0] === "closeHour") {
      fieldErrors.closeHour = "Enter a closing hour from 1 to 29.";
    }
  }
  return fieldErrors;
}

function mapBandIssues(issues: z.ZodIssue[]) {
  const fieldErrors: BusinessRuleFieldErrors = {};
  for (const issue of issues) {
    const [index, field] = issue.path;
    if (typeof index !== "number") {
      fieldErrors.pricingBands = "Check the pricing bands.";
    } else if (field === "label") {
      fieldErrors[`band-${index}-label`] = "Use a short label.";
    } else if (field === "startHour") {
      fieldErrors[`band-${index}-startHour`] = "Start hour must be 0 to 28.";
    } else if (field === "endHour") {
      fieldErrors[`band-${index}-endHour`] = "End hour must be 1 to 29.";
    } else if (field === "hourlyRate") {
      fieldErrors[`band-${index}-hourlyRate`] =
        "Rate must be a positive amount.";
    }
  }
  return fieldErrors;
}

function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/admin");
}

function unauthorized() {
  return { ok: false, error: "Unauthorized." } satisfies UpdateBusinessRulesResult;
}
