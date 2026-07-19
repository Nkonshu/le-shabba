"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

export type SchoolRequestRow = {
  id: string;
  school_name: string;
  estimated_students: number | null;
  desired_subdomain: string;
  created_at: string;
  requester: { full_name: string | null } | null;
};

export type SchoolRow = {
  id: string;
  name: string;
  subdomain: string | null;
  plan: string;
  member_count: number;
};

export function SchoolRequestsList({ requests, schools }: { requests: SchoolRequestRow[]; schools: SchoolRow[] }) {
  const t = useTranslations("adminSchools");
  const router = useRouter();
  const supabase = createClient();

  async function approve(id: string) {
    const { error } = await supabase.rpc("approve_school_request", { request_id: id });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("approveSuccess"));
    router.refresh();
  }

  async function reject(id: string) {
    const { error } = await supabase.rpc("reject_school_request", { request_id: id });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("rejectSuccess"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-black">{t("pendingRequestsTitle")}</h2>
        {requests.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-4 text-center text-sm text-neutral-500 dark:bg-neutral-900">
            {t("noRequests")}
          </p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium">
                  {req.school_name} <span className="text-neutral-400">— /ecole/{req.desired_subdomain}</span>
                </p>
                <p className="text-[10px] text-neutral-400">
                  {t("requestedBy", { name: req.requester?.full_name ?? "?" })}
                  {req.estimated_students ? ` · ${t("estimatedStudents", { count: req.estimated_students })}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => approve(req.id)}
                  className="min-h-11 rounded-xl bg-accent-blue px-3 text-sm font-medium text-white"
                >
                  {t("approve")}
                </button>
                <button
                  onClick={() => reject(req.id)}
                  className="min-h-11 rounded-xl border border-neutral-200 px-3 text-sm font-medium dark:border-neutral-800"
                >
                  {t("reject")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-black">{t("activeSchoolsTitle")}</h2>
        {schools.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-4 text-center text-sm text-neutral-500 dark:bg-neutral-900">
            {t("noSchools")}
          </p>
        ) : (
          schools.map((school) => (
            <div key={school.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
              <span>{school.name}</span>
              <span className="text-neutral-400">
                {school.plan} · {school.member_count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
