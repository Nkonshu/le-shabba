"use client";

import { useState } from "react";
import { Star } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";
import { toggleFavorite, type VoteTargetType } from "@/src/lib/interactions";

export function FavoriteStar({
  targetType,
  targetId,
  userId,
  initialFavorited,
}: {
  targetType: VoteTargetType;
  targetId: string;
  userId: string | null;
  initialFavorited: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);
    const previous = favorited;
    setFavorited(!previous);
    try {
      await toggleFavorite(targetType, targetId, userId);
    } catch {
      setFavorited(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label="favorite"
      aria-pressed={favorited}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
    >
      <Star
        size={18}
        weight={favorited ? "fill" : "regular"}
        className={favorited ? "text-yellow-500" : "text-neutral-400"}
      />
    </button>
  );
}
