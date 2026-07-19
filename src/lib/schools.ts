import "server-only";
import { createClient } from "@/src/utils/supabase/server";

export type School = {
  id: string;
  name: string;
  subdomain: string | null;
  plan: string;
  max_seats: number;
};

export type SchoolMembership = {
  role: "member" | "school_moderator" | "school_admin";
  permissions: { documents?: boolean; forum?: boolean };
};

export async function getSchoolBySubdomain(subdomain: string): Promise<School | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("id, name, subdomain, plan, max_seats")
    .eq("subdomain", subdomain)
    .maybeSingle();
  return data;
}

export async function getMembership(schoolId: string, userId: string): Promise<SchoolMembership | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_memberships")
    .select("role, permissions")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .maybeSingle();
  return data as SchoolMembership | null;
}

export function canModerate(membership: SchoolMembership | null, key: "documents" | "forum") {
  if (!membership) return false;
  if (membership.role === "school_admin") return true;
  if (membership.role === "school_moderator") return membership.permissions?.[key] !== false;
  return false;
}
