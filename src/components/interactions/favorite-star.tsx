"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookmarkSimple } from "@phosphor-icons/react";
import { useAuthGate } from "@/src/components/auth/auth-modal-provider";
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
  const t = useTranslations("interactions");
  const authGate = useAuthGate();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!authGate(userId)) return;
    if (pending) return;
    setPending(true);
    const previous = favorited;
    setFavorited(!previous);
    try {
      await toggleFavorite(targetType, targetId, userId as string);
    } catch {
      setFavorited(previous);
    } finally {
      setPending(false);
    }
  }

  const label = favorited ? t("unfavorite") : t("favorite");

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      title={label}
      aria-pressed={favorited}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
    >
      <BookmarkSimple
        size={18}
        weight={favorited ? "fill" : "regular"}
        className={favorited ? "text-yellow-500" : "text-neutral-400"}
      />
    </button>
  );
}
