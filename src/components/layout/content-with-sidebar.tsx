import { createClient } from "@/src/utils/supabase/server";
import { ActivitySidebar } from "@/src/components/home/activity-sidebar";
import { getHotNetworkItems } from "@/src/lib/hot-network";

// Enveloppe partagée pour toute page de consultation "autre part que l'accueil" (cours, épreuves,
// fiches, recherche...) : colonne de contenu + colonne "Activité de la communauté" / Hot Network,
// séparées par un filet vertical (demande explicite, cohérent avec les pages forum/document).
export async function ContentWithSidebar({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const [{ count: questionsToday }, { count: answersToday }, { count: votesToday }, hotItems] = await Promise.all([
    supabase.from("forum_topics").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("forum_answers").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("votes").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    getHotNetworkItems(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start">
      <main className="flex flex-1 flex-col gap-6">{children}</main>
      <aside className="flex flex-col gap-4 lg:w-72 lg:shrink-0 lg:border-l lg:border-neutral-100 lg:pl-6 dark:lg:border-neutral-900">
        <ActivitySidebar
          questionsToday={questionsToday ?? 0}
          answersToday={answersToday ?? 0}
          votesToday={votesToday ?? 0}
          hotItems={hotItems}
        />
      </aside>
    </div>
  );
}
