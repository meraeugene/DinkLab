export function formatAcceptedBookingDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
