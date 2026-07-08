import { getAdminEmails } from "@/utils/env/appEnv";
import { createClient } from "@/utils/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !getAdminEmails().includes(user.email.toLowerCase())) {
    return null;
  }

  return user;
}
