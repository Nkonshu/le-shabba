import { ChatCircle, Eye, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { VoteArrows } from "@/src/components/interactions/vote-arrows";
import { FavoriteStar } from "@/src/components/interactions/favorite-star";

export type TopicCardData = {
  id: string;
  title: string;
  content: string;
  subject: string;
  status: string;
  votes_count: number;
  views_count: number;
  created_at: string;
  tags: string[] | null;
  level: { label: string } | null;
  author: { full_name: string | null; avatar_url: string | null } | null;
  answersCount: number;
  hasSolution: boolean;
  userVote?: 1 | -1 | null;
  isFavorited?: boolean;
};

export function TopicCard({ topic, userId }: { topic: TopicCardData; userId: string | null }) {
  const t = useTranslations("forum");
  const excerpt = topic.content.replace(/<[^>]+>/g, "").trim().slice(0, 140);

  return (
    <div className="flex gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <VoteArrows
          targetType="topic"
          targetId={topic.id}
          userId={userId}
          initialCount={topic.votes_count}
          initialVote={topic.userVote ?? null}
        />
        <div
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
            topic.hasSolution
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900"
          }`}
        >
          {topic.hasSolution && <CheckCircle size={14} weight="fill" />}
          <ChatCircle size={14} />
          {topic.answersCount}
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <Eye size={14} />
          {topic.views_count}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/forum/${topic.id}`} className="line-clamp-2 font-medium">
            {topic.title}
          </Link>
          <FavoriteStar
            targetType="topic"
            targetId={topic.id}
            userId={userId}
            initialFavorited={topic.isFavorited ?? false}
          />
        </div>

        {excerpt && <p className="line-clamp-1 text-sm text-neutral-500">{excerpt}</p>}

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

        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
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
  );
}
