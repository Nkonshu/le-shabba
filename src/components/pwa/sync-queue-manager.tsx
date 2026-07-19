"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/src/utils/supabase/client";
import { flushSyncQueue, type QueuedAnswer } from "@/src/lib/offline";

// Annexe A.7 : détection de retour en ligne → envoi automatique de la file dans l'ordre
// chronologique. Monté une seule fois à la racine, générique pour tout type de contenu mis en
// file (pour l'instant uniquement les réponses au forum).
export function SyncQueueManager() {
  const t = useTranslations("pwa");

  useEffect(() => {
    async function trySubmit(answer: QueuedAnswer): Promise<boolean> {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      let attachmentUrl: string | null = null;
      if (answer.attachment) {
        const ext = answer.attachment.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("forum-attachments")
          .upload(path, answer.attachment);
        if (uploadError) return false;
        attachmentUrl = supabase.storage.from("forum-attachments").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from("forum_answers").insert({
        topic_id: answer.topicId,
        parent_id: answer.parentId,
        cited_answer_id: answer.citedAnswerId,
        author_id: user.id,
        type: answer.type,
        content: answer.content,
        attachment_url: attachmentUrl,
      });
      return !error;
    }

    async function flush() {
      await flushSyncQueue(trySubmit, () => toast.error(t("syncFailed")));
    }

    if (navigator.onLine) flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
