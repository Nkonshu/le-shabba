import { createClient } from "@/src/utils/supabase/server";

export type HotNetworkItem = {
  id: string;
  title: string;
  href: string;
  kind: "topic" | "Cours" | "Épreuve" | "Corrigé" | "Fiche de révision";
};

// "Hot Network Questions" façon Stack Overflow : mélange sujets de forum + cours/épreuves/fiches,
// classés par un score simple (les votes comptent double par rapport aux vues) — pas de fenêtre
// temporelle, la plateforme est encore trop jeune pour que "les 7 derniers jours" soit pertinent.
export async function getHotNetworkItems(limit = 8): Promise<HotNetworkItem[]> {
  const supabase = await createClient();
  const [{ data: topics }, { data: docs }] = await Promise.all([
    supabase.from("forum_topics").select("id, title, votes_count, views_count").order("views_count", { ascending: false }).limit(limit),
    supabase
      .from("documents")
      .select("id, title, type, votes_count, views_count")
      .neq("status", "removed")
      .order("views_count", { ascending: false })
      .limit(limit),
  ]);

  const scored = [
    ...(topics ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      href: `/forum/${t.id}`,
      kind: "topic" as const,
      score: t.votes_count * 2 + t.views_count,
    })),
    ...(docs ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      href: `/document/${d.id}`,
      kind: d.type as HotNetworkItem["kind"],
      score: d.votes_count * 2 + d.views_count,
    })),
  ];

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({ id: item.id, title: item.title, href: item.href, kind: item.kind }));
}
