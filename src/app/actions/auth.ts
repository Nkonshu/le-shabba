"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteOwnAccount() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
  await supabase.auth.signOut();
  redirect("/");
}
