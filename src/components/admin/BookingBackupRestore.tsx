"use client";

import { DatabaseBackup, Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { BookingRestoreResponse } from "@/types/admin/bookingBackup";

const RESTORE_CONFIRMATION = "RESTORE BOOKINGS";

export function BookingBackupRestore({
  lockError,
  onRestored,
}: {
  lockError: string | null;
  onRestored: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [pendingMode, setPendingMode] = useState<"preview" | "restore" | null>(null);
  const [result, setResult] = useState<BookingRestoreResponse | null>(null);

  async function submit(mode: "preview" | "restore") {
    if (!file || pendingMode) return;
    if (mode === "restore" && lockError) {
      setResult({ ok: false, error: lockError });
      return;
    }

    setPendingMode(mode);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      if (mode === "restore") formData.append("confirmation", confirmation);

      const response = await fetch("/api/admin/bookings/restore", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as BookingRestoreResponse;
      setResult(payload);

      if (response.ok && payload.ok && mode === "restore") {
        setConfirmation("");
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        await onRestored();
      }
    } catch {
      setResult({ ok: false, error: "Unable to process the booking backup." });
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <DatabaseBackup className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.28em] text-cyan-200/80">
            Backup &amp; Restore
          </p>
          <h2 className="mt-2 font-display text-xl font-black text-white">
            Booking data
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Download every booking as a JSON backup. Restore is non-destructive:
            it adds missing records only and never deletes or overwrites current bookings.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/35 p-4">
          <h3 className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">
            Download backup
          </h3>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            The file contains booking records and payment-proof links. Cloudinary image files are not embedded.
          </p>
          <a
            className="premium-button mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 font-display text-xs font-black uppercase tracking-[0.18em] sm:w-auto"
            href="/api/admin/bookings/backup"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </a>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-4">
          <h3 className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">
            Restore backup
          </h3>
          <input
            ref={inputRef}
            accept=".json,application/json"
            className="mt-3 block w-full cursor-pointer rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-white/25"
            type="file"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setConfirmation("");
              setResult(null);
            }}
          />
          <button
            className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!file || Boolean(pendingMode)}
            type="button"
            onClick={() => submit("preview")}
          >
            {pendingMode === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pendingMode === "preview" ? "Checking..." : "Preview restore"}
          </button>

          {result?.ok && result.mode === "preview" ? (
            <div className="mt-4 grid gap-3">
              <p className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-3 text-xs leading-5 text-cyan-100">
                Backup contains {result.backupCount || 0} records. {result.existingCount || 0} already exist and {result.restorableCount || 0} can be restored.
              </p>
              <label className="grid gap-2 text-xs font-semibold text-zinc-400">
                Type {RESTORE_CONFIRMATION} to confirm
                <input
                  className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-white/35"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              <button
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-lime-300/30 bg-lime-300/10 px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-lime-100 transition hover:border-lime-200/55 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={confirmation !== RESTORE_CONFIRMATION || Boolean(pendingMode)}
                type="button"
                onClick={() => submit("restore")}
              >
                {pendingMode === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {pendingMode === "restore" ? "Restoring..." : "Restore missing bookings"}
              </button>
            </div>
          ) : null}

          {result && (!result.ok || result.mode === "restore") ? (
            <div className={`mt-4 rounded-xl border px-3 py-3 text-xs leading-5 ${result.ok ? "border-lime-300/20 bg-lime-300/[0.06] text-lime-100" : "border-red-300/20 bg-red-300/[0.06] text-red-100"}`}>
              {result.ok
                ? `Restored ${result.restoredCount || 0} records; skipped ${result.skippedCount || 0}.`
                : result.error || "Unable to restore booking data."}
              {result.warnings?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-100">
                  {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
