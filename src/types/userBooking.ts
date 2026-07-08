export type UserBooking = {
  id: string;
  courtName: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  downpaymentAmount: number;
  paymentMethod: "BPI" | "GOTYME" | "ONSITE";
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED" | "REJECTED";
  acceptedAt: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  hasReservedConflict?: boolean;
};
