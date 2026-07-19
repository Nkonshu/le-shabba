"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  ChatCircle,
  CheckCircle,
  FileText,
  At,
  TrendUp,
  Medal,
  Flag,
  Fire,
  CreditCard,
} from "@phosphor-icons/react";
import { Link } from "@/src/i18n/navigation";
import { useNotifications } from "@/src/hooks/use-notifications";
import { getNotificationHref, type NotificationRow } from "@/src/lib/notifications";

const ICONS: Record<string, typeof Bell> = {
  new_answer_on_my_topic: ChatCircle,
  new_answer_on_followed_topic: ChatCircle,
  answer_marked_solution: CheckCircle,
  document_verified: FileText,
  mention: At,
  rank_up: TrendUp,
  badge_earned: Medal,
  flag_resolved: Flag,
  streak_reminder: Fire,
  payment_pending_reminder: CreditCard,
};

function notificationText(
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  n: NotificationRow
) {
  switch (n.type) {
    case "new_answer_on_my_topic":
      return t("newAnswerOnMyTopic");
    case "new_answer_on_followed_topic":
      return t("newAnswerOnFollowedTopic");
    case "answer_marked_solution":
      return t("answerMarkedSolution", { points: Number(n.payload?.points ?? 0) });
    case "document_verified":
      return t("documentVerified");
    case "mention":
      return t("mention");
    case "rank_up":
      return t("rankUp");
    case "badge_earned":
      return t("badgeEarned");
    case "flag_resolved":
      return t("flagResolved");
    case "streak_reminder":
      return t("streakReminder");
    case "payment_pending_reminder":
      return t("paymentPendingReminder");
    default:
      return t("generic");
  }
}

export function NotificationBell({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: NotificationRow[];
}) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId, initialNotifications);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("title")}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-orange px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 flex max-h-96 w-80 flex-col overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-100 p-3 dark:border-neutral-900">
              <span className="font-medium">{t("title")}</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-accent-blue">
                  {t("markAllRead")}
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-400">{t("empty")}</p>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                const href = getNotificationHref(n);
                const content = (
                  <div
                    className={`flex items-start gap-2 border-b border-neutral-50 p-3 text-sm last:border-none dark:border-neutral-900 ${
                      !n.read_at ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <Icon size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                    <div className="flex-1">
                      <p>{notificationText(t, n)}</p>
                      <p className="mt-0.5 text-[10px] text-neutral-400">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-blue" />}
                  </div>
                );

                return href ? (
                  <Link key={n.id} href={href} onClick={() => markAsRead(n.id)}>
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => markAsRead(n.id)} className="text-left">
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
