export type ImportedPaymentStatus = "PAID" | "HALF_PAID" | "UNPAID";

export type BookingImportWarning = {
  location: string;
  message: string;
};

export type BookingImportResponse = {
  ok: boolean;
  error?: string;
  importedCount: number;
  skippedCount: number;
  firstImportedDate?: string;
  paymentCounts: Record<ImportedPaymentStatus, number>;
  warnings: BookingImportWarning[];
};

export type ParsedBookingListEntry = {
  sourceSheet: string;
  sourceCell: string;
  customerName: string;
  courtName: string;
  date: string;
  startHour: number;
  endHour: number;
  paymentStatus: ImportedPaymentStatus;
};

export type ParsedBookingList = {
  entries: ParsedBookingListEntry[];
  warnings: BookingImportWarning[];
};
