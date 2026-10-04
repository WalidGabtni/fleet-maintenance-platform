"use server";

import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/site-url";
import { logAuthActivity } from "@/lib/activityLog";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Saisissez votre e-mail et votre mot de passe." };
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await logAuthActivity({
      email,
      action: "login_failed",
      description: `Tentative de connexion échouée pour ${email}`,
    });
    return { error: "E-mail ou mot de passe invalide." };
  }

  // Belt-and-suspenders with the proxy.ts gate: catches an account that was
  // already deactivated *before* this sign-in, right here with a clear
  // message, instead of relying on the redirect("/") → middleware → redirect
  // chain to surface it (that chain still blocks access either way, but
  // doesn't reliably carry the message through).
  const { data: profile } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile && !profile.active) {
    await supabase.auth.signOut();
    await logAuthActivity({
      email,
      action: "login_failed",
      description: `Tentative de connexion refusée pour ${email} (compte désactivé)`,
    });
    return { error: "Votre compte a été désactivé. Contactez un administrateur." };
  }

  await logAuthActivity({
    email,
    action: "login_success",
    description: `Connexion réussie pour ${email}`,
  });

  redirect("/");
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type ForgotPasswordState = { error?: string; success?: boolean } | undefined;

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Saisissez votre adresse e-mail." };
  }

  const supabase = await getSupabaseClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/finish`,
  });

  // Always report success, regardless of whether the address has an account —
  // otherwise this becomes a way to check which e-mails are registered.
  return { success: true };
}

export type VerifyResetCodeState = { error?: string } | undefined;

export async function verifyResetCode(
  _prevState: VerifyResetCodeState,
  formData: FormData,
): Promise<VerifyResetCodeState> {
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  if (!code) {
    return { error: "Saisissez le code reçu par e-mail." };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });

  if (error) {
    return { error: "Code invalide ou expiré. Demandez-en un nouveau." };
  }

  redirect("/set-password");
}
