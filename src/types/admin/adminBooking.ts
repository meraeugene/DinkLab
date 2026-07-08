export type JoinedCourt = { name: string } | { name: string }[] | null;

export type AdminBooking = {
  id: string;
  user_email: string;
  customer_name: string;
  customer_contact: string;
  start_at: string;
  end_at: string;
  hourly_rate: number;
  total_amount: number;
  downpayment_amount: number;
  payment_method: "BPI" | "GOTYME" | "ONSITE";
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED";
  courts: JoinedCourt;
};

export type AdminBookingsPayload = {
  bookingRows: AdminBooking[];
  safePage: number;
  totalCount: number;
  totalPages: number;
};

export type AdminBookingNotification = {
  id: string;
  customerName: string;
  customerAvatarUrl: string | null;
  courtName: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  paymentMethod: "BPI" | "GOTYME" | "ONSITE";
  downpaymentAmount: number;
  totalAmount: number;
};
