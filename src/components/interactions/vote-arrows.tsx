"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CaretUp, CaretDown, ThumbsUp, ThumbsDown } from "@phosphor-icons/react";
import { useAuthGate } from "@/src/components/auth/auth-modal-provider";
import { toggleVote, type VoteTargetType } from "@/src/lib/interactions";

export function VoteArrows({
  targetType,
  targetId,
  userId,
  initialCount,
  initialVote,
  layout = "column",
}: {
  targetType: VoteTargetType;
  targetId: string;
  userId: string | null;
  initialCount: number;
  initialVote: 1 | -1 | null;
  layout?: "column" | "row";
}) {
  const t = useTranslations("interactions");
  const authGate = useAuthGate();
  const [count, setCount] = useState(initialCount);
  const [vote, setVote] = useState(initialVote);
  const [pending, setPending] = useState(false);

  async function handleClick(direction: 1 | -1) {
    if (!authGate(userId)) return;
    if (pending) return;
    setPending(true);

    const previousVote = vote;
    const previousCount = count;
    const nextVote = previousVote === direction ? null : direction;
    const delta = (nextVote ?? 0) - (previousVote ?? 0);
    setVote(nextVote);
    setCount(previousCount + delta);

    try {
      await toggleVote(targetType, targetId, userId as string, direction);
    } catch {
      setVote(previousVote);
      setCount(previousCount);
    } finally {
      setPending(false);
    }
  }

  if (layout === "row") {
    return (
      <div className="flex items-center gap-0">
        <button
          onClick={() => handleClick(1)}
          aria-label={t("upvote")}
          title={t("upvote")}
          className={`flex min-h-9 min-w-9 items-center justify-center rounded-lg ${
            vote === 1 ? "text-accent-blue" : "text-neutral-400"
          }`}
        >
          <ThumbsUp size={14} weight={vote === 1 ? "fill" : "regular"} />
        </button>
        <span className="min-w-[1.5ch] text-center text-xs font-medium">{count}</span>
        <button
          onClick={() => handleClick(-1)}
          aria-label={t("downvote")}
          title={t("downvote")}
          className={`flex min-h-9 min-w-9 items-center justify-center rounded-lg ${
            vote === -1 ? "text-accent-blue" : "text-neutral-400"
          }`}
        >
          <ThumbsDown size={14} weight={vote === -1 ? "fill" : "regular"} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => handleClick(1)}
        aria-label={t("upvote")}
        title={t("upvote")}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${
          vote === 1 ? "text-accent-blue" : "text-neutral-400"
        }`}
      >
        <CaretUp size={18} weight={vote === 1 ? "fill" : "regular"} />
      </button>
      <span className="min-w-[1.5ch] text-center text-sm font-medium">{count}</span>
      <button
        onClick={() => handleClick(-1)}
        aria-label={t("downvote")}
        title={t("downvote")}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${
          vote === -1 ? "text-accent-blue" : "text-neutral-400"
        }`}
      >
        <CaretDown size={18} weight={vote === -1 ? "fill" : "regular"} />
      </button>
    </div>
  );
}
