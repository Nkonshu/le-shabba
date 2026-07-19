export type NotificationRow = {
  id: string;
  type: string;
  target_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

/** Construit le lien cible d'une notification — Annexe A.8, cas limite : contenu supprimé => null. */
export function getNotificationHref(notification: NotificationRow): string | null {
  switch (notification.type) {
    case "new_answer_on_my_topic":
    case "new_answer_on_followed_topic":
      return notification.target_id ? `/forum/${notification.target_id}` : null;
    case "answer_marked_solution": {
      const topicId = notification.payload?.topic_id;
      return typeof topicId === "string" ? `/forum/${topicId}#answer-${notification.target_id}` : null;
    }
    case "document_verified":
      return notification.target_id ? `/document/${notification.target_id}` : null;
    default:
      return null;
  }
}
