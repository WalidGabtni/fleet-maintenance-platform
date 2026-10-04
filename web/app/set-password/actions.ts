"use server";

import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { isPasswordStrong } from "@/lib/password";

export type SetPasswordState = { error?: string } | undefined;

export async function setPassword(
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!isPasswordStrong(password)) {
    return { error: "Le mot de passe ne respecte pas les exigences de sécurité." };
  }
  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
