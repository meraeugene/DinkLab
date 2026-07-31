"use client";

import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { BookingImportResponse } from "@/types/admin/bookingImport";

export function BookingListImporter({
  onImported,
}: {
  onImported: (result: BookingImportResponse) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BookingImportResponse | null>(null);

  async function importWorkbook() {
    if (!file || importing) return;
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/bookings/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as BookingImportResponse;
      setResult(payload);

      if (response.ok && payload.ok) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        await onImported(payload);
      }
    } catch {
      setResult({
        ok: false,
        error: "Unable to upload the Excel file. Please try again.",
        importedCount: 0,
        skippedCount: 0,
        paymentCounts: { PAID: 0, HALF_PAID: 0, UNPAID: 0 },
        warnings: [],
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-lime-200" />
            <h3 className="font-display text-sm font-black uppercase tracking-[0.16em]">
              Import Booking List
            </h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Upload the original Dink Lab booking-list format as an .xlsx file.
            Merged cells become multi-hour bookings. Green is fully paid,
            yellow is half paid, and red is unpaid.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 md:max-w-sm">
          <input
            ref={inputRef}
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full cursor-pointer rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-white/25"
            type="file"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setResult(null);
            }}
          />
          <button
            className="premium-button h-11 w-full cursor-pointer rounded-xl px-4 font-display text-xs font-black uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!file || importing}
            type="button"
            onClick={importWorkbook}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? "Importing..." : "Import Excel"}
          </button>
        </div>
      </div>

      {result ? (
        <div
          className={[
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            result.ok
              ? "border-lime-300/20 bg-lime-300/[0.06] text-lime-100"
              : "border-red-300/20 bg-red-300/[0.06] text-red-100",
          ].join(" ")}
        >
          {result.ok ? (
            <>
              <p className="font-bold">
                Imported {result.importedCount} booking
                {result.importedCount === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-xs text-zinc-300">
                {result.paymentCounts.PAID} fully paid ·{" "}
                {result.paymentCounts.HALF_PAID} half paid ·{" "}
                {result.paymentCounts.UNPAID} unpaid
              </p>
            </>
          ) : (
            <p className="font-bold">{result.error}</p>
          )}

          {result.warnings.length ? (
            <details className="mt-3 text-xs text-amber-100">
              <summary className="cursor-pointer font-bold">
                {result.skippedCount} skipped item
                {result.skippedCount === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {result.warnings.map((warning, index) => (
                  <li key={`${warning.location}-${index}`}>
                    {warning.location}: {warning.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
