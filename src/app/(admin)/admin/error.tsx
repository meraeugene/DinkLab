"use client";

import { useEffect } from "react";
import { AdminDashboardError } from "@/components/admin/AdminDashboardError";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard failed to load.", error);
  }, [error]);

  return <AdminDashboardError reset={reset} />;
}
