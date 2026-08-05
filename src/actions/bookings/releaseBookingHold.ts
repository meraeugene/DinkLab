"use server";

import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const holdTokenSchema = z.string().uuid();

export async function releaseBookingHold(holdToken: string) {
  const parsed = holdTokenSchema.safeParse(holdToken);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await createAdminClient()
    .from("booking_holds")
    .delete()
    .eq("hold_token", parsed.data)
    .eq("user_id", user.id);

  return { ok: !error };
}
