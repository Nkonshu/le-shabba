"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShareNetwork, WhatsappLogo, LinkSimple } from "@phosphor-icons/react";
import { createClient } from "@/src/utils/supabase/client";
import { useFeatureFlag } from "@/src/hooks/use-feature-flag";

type ShareContentType = "document" | "topic" | "answer";
type ShareChannel = "whatsapp" | "copy_link" | "native_share";

export function ShareButton({
  contentType,
  contentId,
  path,
  title,
  subject,
  level,
  topicTitle,
  isSolved,
  userId,
}: {
  contentType: ShareContentType;
  contentId: string;
  path: string;
  title: string;
  subject?: string;
  level?: string;
  topicTitle?: string;
  isSolved?: boolean;
  userId: string | null;
}) {
  const t = useTranslations("share");
  const enabled = useFeatureFlag("growth.share_button", true);
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  const text =
    contentType === "document"
      ? t("templateDocument", { title, subject: subject ?? "", level: level ?? "", url })
      : contentType === "topic"
        ? isSolved
          ? t("templateTopicSolved", { title, url })
          : t("templateTopicOpen", { title, url })
        : t("templateAnswer", { topicTitle: topicTitle ?? "", url });

  async function logShare(channel: ShareChannel) {
    const supabase = createClient();
    await supabase.from("share_events").insert({
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      channel,
    });
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        await logShare("native_share");
      } catch {
        // annulé par l'utilisateur — pas une erreur à afficher
      }
      return;
    }
    setOpen((o) => !o);
  }

  async function shareOnWhatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
    await logShare("whatsapp");
    setOpen(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
    await logShare("copy_link");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        aria-label={t("share")}
        title={t("share")}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
      >
        <ShareNetwork size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 flex w-48 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
            <button
              onClick={shareOnWhatsapp}
              className="flex min-h-11 items-center gap-2 px-3 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <WhatsappLogo size={16} /> {t("shareOnWhatsapp")}
            </button>
            <button
              onClick={copyLink}
              className="flex min-h-11 items-center gap-2 px-3 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <LinkSimple size={16} /> {t("copyLink")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
