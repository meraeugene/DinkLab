"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function ActionButton({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      <span className="inline-flex items-center gap-2">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {pending ? `${children}...` : children}
      </span>
    </button>
  );
}
