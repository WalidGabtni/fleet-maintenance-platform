"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { isPasswordStrong } from "@/lib/password";

export async function updateProfileName(formData: FormData) {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) {
    redirect(`/account?error=${encodeURIComponent("Le nom est requis.")}`);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }
  if (!data) {
    redirect(`/account?error=${encodeURIComponent("La mise à jour a échoué. Réessayez ou contactez un administrateur.")}`);
  }

  revalidatePath("/", "layout");
  redirect(`/account?success=${encodeURIComponent("Nom mis à jour.")}`);
}

export async function changePassword(formData: FormData) {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmNewPassword = String(formData.get("confirm_new_password") ?? "");

  if (!isPasswordStrong(newPassword)) {
    redirect(
      `/account?error=${encodeURIComponent(
        "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
      )}`,
    );
  }
  if (newPassword !== confirmNewPassword) {
    redirect(`/account?error=${encodeURIComponent("Les nouveaux mots de passe ne correspondent pas.")}`);
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    redirect(`/account?error=${encodeURIComponent("Mot de passe actuel incorrect.")}`);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    redirect(`/account?error=${encodeURIComponent(updateError.message)}`);
  }

  redirect(`/account?success=${encodeURIComponent("Mot de passe mis à jour.")}`);
}
