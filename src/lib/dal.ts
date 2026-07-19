import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";
import type { Profile } from "@/src/lib/profile";

export type { Profile };

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data as Profile | null;
});

export async function requireUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  return user;
}

export async function requireStaff(locale: string) {
  await requireUser(locale);
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect(`/${locale}`);
  }
  return profile;
}
