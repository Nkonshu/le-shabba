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
  if (data) return data as SchoolMembership;

  // Le staff plateforme (admin/super_admin) a accès à toute école sans y être formellement membre —
  // même principe que requireStaff ailleurs dans l'app : le rôle plateforme prime toujours sur
  // l'appartenance à une école précise, pour le support/la modération d'urgence (§4.9 du document).
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile && ["admin", "super_admin"].includes(profile.role)) {
    return { role: "school_admin", permissions: { documents: true, forum: true } };
  }
  return null;
}

export function canModerate(membership: SchoolMembership | null, key: "documents" | "forum") {
  if (!membership) return false;
  if (membership.role === "school_admin") return true;
  if (membership.role === "school_moderator") return membership.permissions?.[key] !== false;
  return false;
}
