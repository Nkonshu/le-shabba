import { createClient } from "@/src/utils/supabase/client";

const WINDOW_HOURS = 48;
const DOCUMENT_LIMIT = 3;
const ANSWER_LIMIT = 5;

/**
 * Annexe A.5 : pré-vérification côté client pour afficher le message exact ("Limite atteinte pour
 * les nouveaux comptes, réessaie demain") avant la tentative d'insertion — la policy RLS (§3, 0021)
 * reste la vraie barrière, ce check n'est qu'un raccourci UX pour ne pas dépendre du message
 * générique renvoyé par une violation de policy.
 */
export async function isRateLimited(userId: string, kind: "document" | "answer"): Promise<boolean> {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle();
  if (!profile) return false;

  const accountAgeMs = Date.now() - new Date(profile.created_at).getTime();
  if (accountAgeMs >= WINDOW_HOURS * 60 * 60 * 1000) return false;

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const table = kind === "document" ? "documents" : "forum_answers";
  const limit = kind === "document" ? DOCUMENT_LIMIT : ANSWER_LIMIT;

  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId)
    .gte("created_at", since);

  return (count ?? 0) >= limit;
}
