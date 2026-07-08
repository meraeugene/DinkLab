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
  status: "PENDING_REVIEW" | "ACCEPTED" | "CANCELLED" | "REJECTED";
  reviewed_at?: string | null;
  reviewed_by_email?: string | null;
  review_reason?: string | null;
  courts: JoinedCourt;
};

export type AdminBookingsPayload = {
  bookingRows: AdminBooking[];
  safePage: number;
  totalCount: number;
  totalPages: number;
  filters: AdminBookingFilters;
};

export type AdminBookingFilters = {
  page: number;
  status: string;
  courtId: string;
  paymentMethod: string;
  date: string;
  q: string;
};

export type AdminScheduleBooking = {
  id: string;
  courtId: string;
  courtName: string;
  customerName: string;
  customerContact: string;
  startAt: string;
  endAt: string;
  paymentMethod: "BPI" | "GOTYME" | "ONSITE";
  totalAmount: number;
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
