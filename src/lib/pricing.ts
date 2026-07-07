export function getHourlyRate(startHour: number) {
  if (startHour < 15) return 200;
  return 300;
}

export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}
