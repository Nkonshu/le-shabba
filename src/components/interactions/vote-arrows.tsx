"use client";

import { useState } from "react";
import { CaretUp, CaretDown } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";
import { toggleVote, type VoteTargetType } from "@/src/lib/interactions";

export function VoteArrows({
  targetType,
  targetId,
  userId,
  initialCount,
  initialVote,
}: {
  targetType: VoteTargetType;
  targetId: string;
  userId: string | null;
  initialCount: number;
  initialVote: 1 | -1 | null;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [vote, setVote] = useState(initialVote);
  const [pending, setPending] = useState(false);

  async function handleClick(direction: 1 | -1) {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);

    const previousVote = vote;
    const previousCount = count;
    const nextVote = previousVote === direction ? null : direction;
    const delta = (nextVote ?? 0) - (previousVote ?? 0);
    setVote(nextVote);
    setCount(previousCount + delta);

    try {
      await toggleVote(targetType, targetId, userId, direction);
    } catch {
      setVote(previousVote);
      setCount(previousCount);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => handleClick(1)}
        aria-label="upvote"
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${
          vote === 1 ? "text-accent-blue" : "text-neutral-400"
        }`}
      >
        <CaretUp size={16} weight={vote === 1 ? "fill" : "regular"} />
      </button>
      <span className="min-w-[1.5ch] text-center text-sm font-medium">{count}</span>
      <button
        onClick={() => handleClick(-1)}
        aria-label="downvote"
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${
          vote === -1 ? "text-accent-blue" : "text-neutral-400"
        }`}
      >
        <CaretDown size={16} weight={vote === -1 ? "fill" : "regular"} />
      </button>
    </div>
  );
}
