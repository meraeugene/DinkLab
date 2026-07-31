import ExcelJS from "exceljs";
import type {
  BookingImportWarning,
  ImportedPaymentStatus,
  ParsedBookingList,
  ParsedBookingListEntry,
} from "@/types/admin/bookingImport";

const PAYMENT_STATUS_BY_COLOR: Record<string, ImportedPaymentStatus> = {
  "00FF00": "PAID",
  "FFFF00": "HALF_PAID",
  "FF0000": "UNPAID",
};

type CellBounds = {
  minColumn: number;
  minRow: number;
  maxColumn: number;
  maxRow: number;
};

export async function parseBookingListWorkbook(
  fileBuffer: Buffer,
): Promise<ParsedBookingList> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as never);

  if (!workbook.worksheets.length) {
    throw new Error("The workbook does not contain any worksheets.");
  }

  const entries: ParsedBookingListEntry[] = [];
  const warnings: BookingImportWarning[] = [];
  let recognizedSheetCount = 0;

  for (const worksheet of workbook.worksheets) {
    const title = Array.from(
      { length: Math.min(worksheet.columnCount, 20) },
      (_, index) => worksheet.getCell(1, index + 1).text,
    )
      .join(" ")
      .toUpperCase();
    if (!title.includes("DINK LAB BOOKING LIST")) {
      warnings.push({
        location: worksheet.name,
        message: "Skipped because the Dink Lab booking-list title was not found.",
      });
      continue;
    }

    const hasExpectedGrid =
      worksheet.getCell("A3").text.trim().toUpperCase() === "TIME SLOT" &&
      worksheet.getCell("A4").text.trim().toUpperCase() === "COURT" &&
      Array.from({ length: 14 }, (_, index) =>
        worksheet.getCell(4, index + 2).text.trim().toUpperCase(),
      ).some((value) => value === "COURT 1" || value === "COURT 2");
    if (!hasExpectedGrid) {
      warnings.push({
        location: worksheet.name,
        message: "Skipped because its date, court, or time-slot grid was changed.",
      });
      continue;
    }

    recognizedSheetCount += 1;
    const mergeBounds = buildMergeBounds(worksheet);

    for (let rowNumber = 5; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const startHour = parseStartHour(worksheet.getCell(rowNumber, 1).text);
      if (startHour === null) {
        if (rowNumber > 5) break;
        continue;
      }

      for (let columnNumber = 2; columnNumber <= 15; columnNumber += 1) {
        const cell = worksheet.getCell(rowNumber, columnNumber);
        if (cell.master.address !== cell.address || !cell.text.trim()) continue;

        const bounds = mergeBounds.get(cell.address) || {
          minColumn: columnNumber,
          minRow: rowNumber,
          maxColumn: columnNumber,
          maxRow: rowNumber,
        };
        const paymentStatus = getPaymentStatus(cell);
        if (!paymentStatus) {
          warnings.push({
            location: `${worksheet.name}!${cell.address}`,
            message: `Skipped ${cell.text.trim()}: use green, yellow, or red fill.`,
          });
          continue;
        }

        const endStartHour = parseStartHour(
          worksheet.getCell(bounds.maxRow, 1).text,
        );
        if (endStartHour === null) {
          warnings.push({
            location: `${worksheet.name}!${cell.address}`,
            message: "Skipped because its merged range does not match hourly rows.",
          });
          continue;
        }

        const seenCourtDates = new Set<string>();
        for (
          let bookingColumn = bounds.minColumn;
          bookingColumn <= bounds.maxColumn;
          bookingColumn += 1
        ) {
          const date = parseExcelDate(
            worksheet.getCell(3, bookingColumn).master.value,
          );
          const courtName = worksheet.getCell(4, bookingColumn).text.trim();
          if (!date || !courtName) continue;

          const courtDateKey = `${date}|${courtName.toLowerCase()}`;
          if (seenCourtDates.has(courtDateKey)) continue;
          seenCourtDates.add(courtDateKey);

          entries.push({
            sourceSheet: worksheet.name,
            sourceCell: cell.address,
            customerName: cell.text.replace(/\s+/g, " ").trim(),
            courtName,
            date,
            startHour,
            endHour: endStartHour + 1,
            paymentStatus,
          });
        }
      }
    }
  }

  if (!recognizedSheetCount) {
    throw new Error(
      "This is not the Dink Lab booking-list Excel format. Keep the original title, date row, court row, and hourly grid.",
    );
  }

  return { entries, warnings };
}

function buildMergeBounds(worksheet: ExcelJS.Worksheet) {
  const boundsByMaster = new Map<string, CellBounds>();
  for (const range of worksheet.model.merges) {
    const bounds = parseRange(range);
    boundsByMaster.set(
      worksheet.getCell(bounds.minRow, bounds.minColumn).address,
      bounds,
    );
  }
  return boundsByMaster;
}

function parseRange(range: string): CellBounds {
  const [start, end] = range.split(":");
  const startCell = parseAddress(start);
  const endCell = parseAddress(end || start);
  return {
    minColumn: startCell.column,
    minRow: startCell.row,
    maxColumn: endCell.column,
    maxRow: endCell.row,
  };
}

function parseAddress(address: string) {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) throw new Error(`Invalid Excel cell address: ${address}`);

  let column = 0;
  for (const character of match[1]) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }
  return { column, row: Number(match[2]) };
}

function parseStartHour(label: string) {
  const match = /^\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)/i.exec(label);
  if (!match) return null;

  const hour = Number(match[1]);
  if (hour < 1 || hour > 12) return null;

  let normalized = hour % 12;
  if (match[2].toUpperCase() === "PM") normalized += 12;
  if (normalized < 8) normalized += 24;
  return normalized;
}

function parseExcelDate(value: ExcelJS.CellValue) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPaymentStatus(cell: ExcelJS.Cell) {
  const fill = cell.fill;
  if (fill.type !== "pattern" || fill.pattern !== "solid") return null;
  const argb = fill.fgColor?.argb?.toUpperCase();
  return argb ? PAYMENT_STATUS_BY_COLOR[argb.slice(-6)] || null : null;
}
