import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { BugReportStatusSelect } from "@/src/components/admin/bug-report-status-select";
import { Pagination, PAGE_SIZE } from "@/src/components/admin/stats/pagination";

type BugReport = {
  id: string;
  reporter_id: string | null;
  contact_email: string | null;
  description: string;
  page_url: string | null;
  device_info: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  reporter: { full_name: string | null } | null;
};

export async function BugReportsList({
  status,
  from,
  to,
  userIds,
  sp,
  page,
}: {
  status?: string;
  from?: string;
  to?: string;
  userIds?: string[];
  sp: Record<string, string | undefined>;
  page: number;
}) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  let query = supabase
    .from("bug_reports")
    .select(
      "id, reporter_id, contact_email, description, page_url, device_info, screenshot_url, status, created_at, reporter:profiles(full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (userIds) query = query.in("reporter_id", userIds);

  const { data: reports, count } = await query;

  const rows = (reports ?? []) as unknown as BugReport[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const screenshotUrls = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.screenshot_url)
      .map(async (r) => {
        const { data } = await supabase.storage.from("bug-screenshots").createSignedUrl(r.screenshot_url!, 3600);
        if (data) screenshotUrls.set(r.id, data.signedUrl);
      })
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
        {t("bugReportsEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((report) => (
        <div key={report.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1">{report.description}</p>
            <BugReportStatusSelect id={report.id} status={report.status} />
          </div>

          {report.page_url && (
            <p className="text-xs text-neutral-400">
              {t("bugPageUrl")}: <span className="break-all">{report.page_url}</span>
            </p>
          )}
          {report.device_info && <p className="text-xs text-neutral-400">{report.device_info}</p>}

          {screenshotUrls.has(report.id) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshotUrls.get(report.id)} alt="" className="max-h-40 w-fit rounded-lg object-cover" />
          )}

          <p className="text-[10px] text-neutral-400">
            {report.reporter?.full_name ?? report.contact_email ?? t("bugAnonymous")} ·{" "}
            {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
      ))}
      <Pagination sp={sp} pageParam="aPage" page={page} totalPages={totalPages} />
    </div>
  );
}
