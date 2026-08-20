export const EXCEL_IMPORT_EMAIL = "booking-list@dinklab.local";
export const EXCEL_IMPORT_CONTACT = "Imported from Excel";

type ExcelImportedBookingMarker = {
  customer_contact: string;
  user_email: string | null;
};

export function isExcelImportedBooking(
  booking: ExcelImportedBookingMarker,
) {
  return (
    booking.user_email === EXCEL_IMPORT_EMAIL &&
    booking.customer_contact === EXCEL_IMPORT_CONTACT
  );
}
