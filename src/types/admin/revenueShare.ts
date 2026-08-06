export type RevenueShareEntry = {
  id: string;
  bookingGroupId: string;
  customerName: string;
  customerEmail: string;
  courtNames: string[];
  startAt: string;
  endAt: string;
  scheduleCount: number;
  bookingValue: number;
  recordedPayment: number;
  developerShare: number;
  earnedShare: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  venueShare: number;
  timing: "COMPLETED" | "UPCOMING";
};

export type RevenueShareDashboardData = {
  commissionRate: number;
  generatedAt: string;
  entries: RevenueShareEntry[];
};
