"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { isCurrentlyBanned } from "@/src/lib/profile";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "student" | "admin" | "super_admin";
  genie_points: number;
  is_banned: boolean;
  banned_until: string | null;
  ban_reason: string | null;
  created_at: string;
};

const DURATIONS = [7, 30, 90] as const;

export function UsersTable({ users, viewerRole }: { users: AdminUserRow[]; viewerRole: string }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [banDialogUserId, setBanDialogUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("7");
  const [submitting, setSubmitting] = useState(false);

  async function submitBan(userId: string) {
    if (!reason.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("admin_ban_user", {
      target_user: userId,
      reason,
      duration_days: duration === "permanent" ? null : Number(duration),
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    setBanDialogUserId(null);
    setReason("");
    toast.success(t("actionSaved"));
    router.refresh();
  }

  async function unban(userId: string) {
    const { error } = await supabase.rpc("admin_unban_user", { target_user: userId });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("actionSaved"));
    router.refresh();
  }

  async function setRole(userId: string, newRole: "admin" | "student") {
    const { error } = await supabase.rpc("admin_set_user_role", { target_user: userId, new_role: newRole });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("actionSaved"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => {
        const banned = isCurrentlyBanned(user);
        const isSuperAdmin = user.role === "super_admin";

        return (
          <div key={user.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                    {user.full_name?.charAt(0) ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-medium">{user.full_name ?? t("anonymous")}</p>
                  <p className="text-[10px] text-neutral-400">
                    {t("memberSince", { date: new Date(user.created_at).toLocaleDateString() })}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  user.role === "student"
                    ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-900"
                    : "bg-accent-blue/10 text-accent-blue"
                }`}
              >
                {t(`role.${user.role}`)}
              </span>
            </div>

            <p className="text-xs text-neutral-500">{t("pointsCount", { count: user.genie_points })}</p>

            <p
              className={`text-xs font-medium ${
                banned ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
              }`}
              title={user.ban_reason ?? undefined}
            >
              {banned
                ? user.banned_until
                  ? t("suspendedUntil", { date: new Date(user.banned_until).toLocaleDateString() })
                  : t("bannedStatus")
                : t("activeStatus")}
            </p>

            {!isSuperAdmin && (
              <div className="flex flex-wrap gap-2 pt-1">
                {banned ? (
                  <button
                    onClick={() => unban(user.id)}
                    className="min-h-11 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800"
                  >
                    {t("rehabilitate")}
                  </button>
                ) : (
                  <button
                    onClick={() => setBanDialogUserId(user.id)}
                    className="min-h-11 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800"
                  >
                    {t("suspend")}
                  </button>
                )}
                {viewerRole === "super_admin" && user.role === "student" && (
                  <button
                    onClick={() => setRole(user.id, "admin")}
                    className="min-h-11 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800"
                  >
                    {t("promote")}
                  </button>
                )}
                {viewerRole === "super_admin" && user.role === "admin" && (
                  <button
                    onClick={() => setRole(user.id, "student")}
                    className="min-h-11 rounded-xl border border-neutral-200 px-3 text-xs font-medium text-red-600 dark:border-neutral-800"
                  >
                    {t("revoke")}
                  </button>
                )}
              </div>
            )}

            {banDialogUserId === user.id && (
              <div className="mt-2 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("banReasonPlaceholder")}
                  className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                />
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {t("banDurationDays", { days: d })}
                    </option>
                  ))}
                  <option value="permanent">{t("banDurationPermanent")}</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBanDialogUserId(null)}
                    className="min-h-11 flex-1 rounded-xl border border-neutral-200 text-sm dark:border-neutral-800"
                  >
                    {tCommon("cancel")}
                  </button>
                  <button
                    onClick={() => submitBan(user.id)}
                    disabled={submitting || !reason.trim()}
                    className="min-h-11 flex-1 rounded-xl bg-red-600 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {t("confirmSuspend")}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
