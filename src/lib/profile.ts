// Types et helpers purs partagés entre Server et Client Components — séparés de src/lib/dal.ts
// (qui importe "server-only" et next/headers) pour ne jamais tirer ces dépendances serveur dans
// un bundle client (ex. profile-settings-form.tsx a besoin d'isCurrentlyBanned côté client).

export type Profile = {
  id: string;
  full_name: string | null;
  country_id: string | null;
  level_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  locale: "fr" | "en";
  genie_points: number;
  role: "student" | "admin" | "super_admin";
  is_banned: boolean;
  ban_reason: string | null;
  banned_until: string | null;
  created_at: string;
  badges_bronze: number;
  badges_argent: number;
  badges_or: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  referred_by: string | null;
  referral_activated_at: string | null;
};

export function isCurrentlyBanned(profile: Pick<Profile, "is_banned" | "banned_until">) {
  if (!profile.is_banned) return false;
  if (!profile.banned_until) return true;
  return new Date(profile.banned_until) > new Date();
}
