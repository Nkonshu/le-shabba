import { getTranslations } from "next-intl/server";
import { requireUser } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { FavoritesDocuments } from "@/src/components/library/favorites-documents";
import { FavoritesForum } from "@/src/components/forum/favorites-forum";

export default async function FavoritesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; level?: string; subject?: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const { tab = "documents", level, subject } = await searchParams;
  const t = await getTranslations("favorites");

  const supabase = await createClient();
  const [{ count: documentsCount }, { count: forumCount }] = await Promise.all([
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("target_type", "document"),
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("target_type", "topic"),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-black">{t("title")}</h1>

      <div className="flex gap-2 border-b border-neutral-100 dark:border-neutral-900">
        <Link
          href="/favoris?tab=documents"
          className={`min-h-11 border-b-2 px-3 leading-[2.75rem] text-sm font-medium ${
            tab === "documents" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("documentsTab", { count: documentsCount ?? 0 })}
        </Link>
        <Link
          href="/favoris?tab=forum"
          className={`min-h-11 border-b-2 px-3 leading-[2.75rem] text-sm font-medium ${
            tab === "forum" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("forumTab", { count: forumCount ?? 0 })}
        </Link>
      </div>

      {tab === "documents" ? (
        <FavoritesDocuments userId={user.id} level={level} subject={subject} />
      ) : (
        <FavoritesForum userId={user.id} />
      )}
    </main>
  );
}
