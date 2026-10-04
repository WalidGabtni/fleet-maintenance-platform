"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";

async function requireUserId() {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, userId: user.id };
}

export async function hideModule(moduleKey: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("dashboard_hidden_modules")
    .upsert({ user_id: userId, module_key: moduleKey }, { onConflict: "user_id,module_key" });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function restoreModule(moduleKey: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("dashboard_hidden_modules")
    .delete()
    .eq("user_id", userId)
    .eq("module_key", moduleKey);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
