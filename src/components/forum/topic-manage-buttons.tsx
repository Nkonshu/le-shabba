"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { TopicEditDialog } from "@/src/components/forum/topic-edit-dialog";

// CRUD façon Stack Overflow sur le sujet lui-même : éditer reste toujours permis à l'auteur/staff,
// mais supprimer est bloqué (pour l'auteur, pas pour le staff/mini-admin) dès qu'une réponse a été
// acceptée ou votée — cf. la policy RLS équivalente en 0049, ceci n'est qu'un reflet côté UI.
export function TopicManageButtons({
  topicId,
  initialTitle,
  initialContent,
  canEdit,
  canDelete,
  deleteBlockedReason,
  basePath,
}: {
  topicId: string;
  initialTitle: string;
  initialContent: string;
  canEdit: boolean;
  canDelete: boolean;
  deleteBlockedReason: string | null;
  basePath: string;
}) {
  const t = useTranslations("forum");
  const tc = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);

  if (!canEdit) return null;

  async function handleEditSubmit(title: string, content: string) {
    const { error } = await supabase.from("forum_topics").update({ title, content }).eq("id", topicId);
    if (error) {
      toast.error(t("publishError"));
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!canDelete) {
      toast.error(deleteBlockedReason ?? tc("delete"));
      return;
    }
    if (!window.confirm(t("confirmDeleteTopic"))) return;
    const { error } = await supabase.from("forum_topics").delete().eq("id", topicId);
    if (error) {
      toast.error(deleteBlockedReason ?? t("publishError"));
      return;
    }
    router.push(basePath);
  }

  return (
    <>
      <button
        onClick={() => setEditing(true)}
        aria-label={tc("edit")}
        title={tc("edit")}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
      >
        <PencilSimple size={16} />
      </button>
      <button
        onClick={handleDelete}
        aria-label={tc("delete")}
        title={canDelete ? tc("delete") : (deleteBlockedReason ?? tc("delete"))}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${
          canDelete ? "text-neutral-400 hover:text-red-600" : "text-neutral-300 dark:text-neutral-700"
        }`}
      >
        <Trash size={16} />
      </button>
      {editing && (
        <TopicEditDialog
          initialTitle={initialTitle}
          initialContent={initialContent}
          onClose={() => setEditing(false)}
          onSubmit={handleEditSubmit}
        />
      )}
    </>
  );
}
