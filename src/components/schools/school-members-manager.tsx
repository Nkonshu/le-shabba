"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

export type SchoolMemberRow = {
  user_id: string;
  role: "member" | "school_moderator" | "school_admin";
  permissions: { documents?: boolean; forum?: boolean };
  profile: { full_name: string | null; avatar_url: string | null } | null;
};

export function SchoolMembersManager({
  schoolId,
  members,
  viewerIsSchoolAdmin,
  viewerId,
  seatsUsed,
  maxSeats,
}: {
  schoolId: string;
  members: SchoolMemberRow[];
  viewerIsSchoolAdmin: boolean;
  viewerId: string;
  seatsUsed: number;
  maxSeats: number;
}) {
  const t = useTranslations("schools");
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  async function searchUsers(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${value}%`).limit(5);
    setSearching(false);
    setResults((data ?? []).filter((p) => !members.some((m) => m.user_id === p.id)));
  }

  async function addMember(userId: string) {
    if (seatsUsed >= maxSeats) {
      toast.error(t("seatsLimitReached"));
      return;
    }
    const { error } = await supabase.rpc("add_school_member", { target_school_id: schoolId, target_user: userId });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("actionSaved"));
    setQuery("");
    setResults([]);
    router.refresh();
  }

  async function setModerator(userId: string, makeModerator: boolean, permissions?: { documents: boolean; forum: boolean }) {
    const { error } = await supabase.rpc("set_school_member_role", {
      target_school_id: schoolId,
      target_user: userId,
      new_role: makeModerator ? "school_moderator" : "member",
      new_permissions: permissions ?? null,
    });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("actionSaved"));
    router.refresh();
  }

  async function promoteCoAdmin(userId: string) {
    const { error } = await supabase.rpc("promote_to_school_admin", { target_school_id: schoolId, target_user: userId });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("actionSaved"));
    router.refresh();
  }

  async function stepDown() {
    if (!window.confirm(t("stepDownConfirm"))) return;
    const { error } = await supabase.rpc("step_down_school_admin", { target_school_id: schoolId });
    if (error) {
      toast.error(t("stepDownError"));
      return;
    }
    toast.success(t("actionSaved"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">{t("seatsUsed", { used: seatsUsed, max: maxSeats })}</p>

      {viewerIsSchoolAdmin && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => searchUsers(e.target.value)}
            placeholder={t("searchMemberPlaceholder")}
            className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addMember(r.id)}
                  className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  {r.full_name ?? "?"}
                </button>
              ))}
            </div>
          )}
          {searching && <p className="mt-1 text-xs text-neutral-400">...</p>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <div>
              <p className="font-medium">{m.profile?.full_name ?? "?"}</p>
              <p className="text-[10px] text-neutral-400">{t(`role.${m.role}`)}</p>
            </div>
            {viewerIsSchoolAdmin && m.user_id !== viewerId && (
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                {m.role === "member" && (
                  <button
                    onClick={() => setModerator(m.user_id, true)}
                    className="min-h-9 rounded-xl border border-neutral-200 px-2 text-xs font-medium dark:border-neutral-800"
                  >
                    {t("nominateModerator")}
                  </button>
                )}
                {m.role === "school_moderator" && (
                  <button
                    onClick={() => setModerator(m.user_id, false)}
                    className="min-h-9 rounded-xl border border-neutral-200 px-2 text-xs font-medium dark:border-neutral-800"
                  >
                    {t("revokeModerator")}
                  </button>
                )}
                {m.role !== "school_admin" && (
                  <button
                    onClick={() => promoteCoAdmin(m.user_id)}
                    className="min-h-9 rounded-xl border border-neutral-200 px-2 text-xs font-medium dark:border-neutral-800"
                  >
                    {t("promoteCoAdmin")}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {viewerIsSchoolAdmin && (
        <button
          onClick={stepDown}
          className="min-h-11 w-fit rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-500 dark:border-neutral-800"
        >
          {t("stepDown")}
        </button>
      )}
    </div>
  );
}
