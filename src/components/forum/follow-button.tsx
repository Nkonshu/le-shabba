"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellSlash } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

export function FollowButton({
  topicId,
  userId,
  initialSubscribed,
}: {
  topicId: string;
  userId: string | null;
  initialSubscribed: boolean;
}) {
  const t = useTranslations("forum");
  const router = useRouter();
  const supabase = createClient();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);
    const previous = subscribed;
    setSubscribed(!previous);

    if (previous) {
      await supabase.from("topic_subscriptions").delete().eq("user_id", userId).eq("topic_id", topicId);
    } else {
      await supabase.from("topic_subscriptions").insert({ user_id: userId, topic_id: topicId });
    }
    setPending(false);
  }

  return (
    <button
      onClick={toggle}
      className="flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-sm font-medium dark:border-neutral-800"
    >
      {subscribed ? <BellSlash size={16} /> : <Bell size={16} />}
      {subscribed ? t("unfollow") : t("follow")}
    </button>
  );
}
