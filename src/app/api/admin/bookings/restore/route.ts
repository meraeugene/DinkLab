import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  bookingBackupSchema,
  type BookingBackupRow,
  type BookingRestoreResponse,
} from "@/types/admin/bookingBackup";
import { getAdminMutationLockError } from "@/utils/admin/getAdminMutationLockError";
import { requireAdmin } from "@/utils/admin/requireAdmin";
import { isMissingAvatarColumn } from "@/utils/supabase/isMissingAvatarColumn";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const RESTORE_CONFIRMATION = "RESTORE BOOKINGS";
const ID_BATCH_SIZE = 200;

export async function POST(request: Request) {
  const adminUser = await requireAdmin();
  if (!adminUser) return restoreError("Unauthorized.", 401);

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode") === "restore" ? "restore" : "preview";

  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".json")) {
    return restoreError("Choose a Dink Lab booking backup JSON file.");
  }
  if (file.size > MAX_BACKUP_BYTES) {
    return restoreError("The booking backup must be 20 MB or smaller.");
  }

  const rawBackup = await file
    .text()
    .then((contents) => JSON.parse(contents) as unknown)
    .catch(() => null);
  const parsed = bookingBackupSchema.safeParse(rawBackup);
  if (!parsed.success) {
    return restoreError("This is not a valid Dink Lab booking backup.");
  }

  const admin = createAdminClient();
  const courtIds = Array.from(
    new Set(parsed.data.bookings.map((booking) => booking.court_id)),
  );
  const { data: courts, error: courtsError } = courtIds.length
    ? await admin.from("courts").select("id").in("id", courtIds)
    : { data: [], error: null };

  if (courtsError) return restoreError("Unable to verify backup courts.", 500);

  const knownCourtIds = new Set((courts || []).map((court) => court.id));
  const missingCourtIds = courtIds.filter((courtId) => !knownCourtIds.has(courtId));
  if (missingCourtIds.length) {
    return restoreError(
      `The backup references ${missingCourtIds.length} court(s) that no longer exist.`,
      409,
    );
  }

  const existingIds = await getExistingBookingIds(
    admin,
    parsed.data.bookings.map((booking) => booking.id),
  );
  if (!existingIds) return restoreError("Unable to compare the backup.", 500);

  const restorableRows = parsed.data.bookings.filter(
    (booking) => !existingIds.has(booking.id),
  );
  const preview: BookingRestoreResponse = {
    ok: true,
    mode: "preview",
    backupCount: parsed.data.bookings.length,
    existingCount: parsed.data.bookings.length - restorableRows.length,
    restorableCount: restorableRows.length,
    generatedAt: parsed.data.generatedAt,
    warnings: [],
  };

  if (mode === "preview") return NextResponse.json(preview);

  const lockError = getAdminMutationLockError();
  if (lockError) return restoreError(lockError, 503);
  if (formData.get("confirmation") !== RESTORE_CONFIRMATION) {
    return restoreError(`Type ${RESTORE_CONFIRMATION} to restore the backup.`);
  }

  const groups = groupBookings(restorableRows);
  let restoredCount = 0;
  const warnings: string[] = [];

  for (const [groupId, rows] of groups) {
    let { error } = await admin.from("bookings").insert(rows);

    if (error && isMissingAvatarColumn(error)) {
      const fallbackRows = rows.map(({ customer_avatar_url, ...row }) => {
        void customer_avatar_url;
        return row;
      });
      error = (await admin.from("bookings").insert(fallbackRows)).error;
    }

    if (error) {
      warnings.push(`Skipped booking group ${groupId}: ${restoreSkipReason(error.message)}`);
      continue;
    }

    restoredCount += rows.length;
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({
    ok: true,
    mode: "restore",
    backupCount: parsed.data.bookings.length,
    existingCount: existingIds.size,
    restorableCount: restorableRows.length,
    restoredCount,
    skippedCount: restorableRows.length - restoredCount,
    generatedAt: parsed.data.generatedAt,
    warnings: warnings.slice(0, 50),
  } satisfies BookingRestoreResponse);
}

async function getExistingBookingIds(
  admin: ReturnType<typeof createAdminClient>,
  bookingIds: string[],
) {
  const existingIds = new Set<string>();

  for (let index = 0; index < bookingIds.length; index += ID_BATCH_SIZE) {
    const batch = bookingIds.slice(index, index + ID_BATCH_SIZE);
    if (!batch.length) continue;
    const { data, error } = await admin.from("bookings").select("id").in("id", batch);
    if (error) return null;
    for (const row of data || []) existingIds.add(row.id);
  }

  return existingIds;
}

function groupBookings(rows: BookingBackupRow[]) {
  const groups = new Map<string, BookingBackupRow[]>();
  for (const row of rows) {
    const group = groups.get(row.booking_group_id) || [];
    group.push(row);
    groups.set(row.booking_group_id, group);
  }
  return groups;
}

function restoreSkipReason(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("booking_slot") ||
    normalized.includes("exclusion constraint") ||
    normalized.includes("duplicate key")
  ) {
    return "one or more slots conflict with a current booking.";
  }
  if (normalized.includes("foreign key")) {
    return "a referenced user or court no longer exists.";
  }
  return "the database rejected the saved record.";
}

function restoreError(error: string, status = 400) {
  return NextResponse.json(
    { ok: false, error } satisfies BookingRestoreResponse,
    { status },
  );
}
