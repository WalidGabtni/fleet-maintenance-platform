"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { friendlyDeleteError, friendlyError } from "@/lib/errors";

export async function createCustomer(formData: FormData) {
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/customers/new?error=${encodeURIComponent("Le nom est requis.")}`);

  const { error } = await supabase.from("customers").insert({
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) redirect(`/customers/new?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/customers/${id}?error=${encodeURIComponent("Le nom est requis.")}`);

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) redirect(`/customers/${id}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomer(id: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    redirect(`/customers?error=${encodeURIComponent(friendlyDeleteError(error))}`);
  }

  revalidatePath("/customers");
  redirect("/customers");
}
