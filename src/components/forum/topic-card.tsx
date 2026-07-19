import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";

export type TopicCardData = {
  id: string;
  title: string;
  content: string;
  subject: string;
  status: string;
  votes_count: number;
  views_count: number;
  favorites_count: number;
  created_at: string;
  tags: string[] | null;
  level: { label: string } | null;
  author: { full_name: string | null; avatar_url: string | null } | null;
  answersCount: number;
  hasSolution: boolean;
  userVote?: 1 | -1 | null;
  isFavorited?: boolean;
};

// Carte de liste : uniquement des stats non interactives (façon page "Newest Questions" de Stack
// Overflow) — voter/favoriser/consulter l'historique ne sont possibles qu'une fois le sujet ouvert
// (voir la colonne verticale interactive sur forum/[id]/page.tsx, volontairement identique partout).
export function TopicCard({ topic }: { topic: TopicCardData; userId: string | null }) {
  const t = useTranslations("forum");
  const excerpt = topic.content.replace(/<[^>]+>/g, "").trim().slice(0, 140);

  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 ${
        topic.hasSolution
          ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="flex w-16 shrink-0 flex-col items-end gap-1 pt-0.5 text-right text-xs text-neutral-500">
        <p>{t("votesCount", { count: topic.votes_count })}</p>
        <p
          className={
            topic.hasSolution
              ? "rounded bg-green-50 px-1.5 py-0.5 text-green-700 dark:bg-green-950 dark:text-green-300"
              : ""
          }
        >
          {t("answersCountStat", { count: topic.answersCount })}
        </p>
        <p>{t("viewsCount", { count: topic.views_count })}</p>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Link href={`/forum/${topic.id}`} className="line-clamp-2 font-medium">
          {topic.title}
        </Link>

        {excerpt && <p className="line-clamp-1 text-sm text-neutral-500">{excerpt}</p>}

        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {topic.level && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
                {topic.level.label}
              </span>
            )}
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {topic.subject}
            </span>
            {topic.status === "closed_duplicate" && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-900">
                {t("closedDuplicate")}
              </span>
            )}
            {(topic.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-400 dark:bg-neutral-950">
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-neutral-100 px-2 py-1 text-[10px] text-neutral-400 dark:border-neutral-900">
            {topic.author?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={topic.author.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                {topic.author?.full_name?.charAt(0) ?? "?"}
              </div>
            )}
            <span className="font-medium text-neutral-500">{topic.author?.full_name ?? t("anonymous")}</span>
            <span>· {new Date(topic.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
