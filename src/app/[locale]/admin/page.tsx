import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/src/lib/dal";
import { getFeatureFlags } from "@/src/lib/feature-flags";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { FeatureFlagsManager } from "@/src/components/admin/feature-flags-manager";
import { UsersTable, type AdminUserRow } from "@/src/components/admin/users-table";
import { AdminLogList } from "@/src/components/admin/admin-log-list";
import { JournalFilters } from "@/src/components/admin/journal-filters";
import { BugReportsList } from "@/src/components/admin/bug-reports-list";

type AuditEntry = {
  id: string;
  flag_key: string;
  old_value: boolean | null;
  new_value: boolean | null;
  changed_at: string;
  changed_by: { full_name: string | null } | null;
};

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; action?: string; actor?: string }>;
}) {
  const { locale } = await params;
  const profile = await requireStaff(locale);
  const { tab = "features", action, actor } = await searchParams;
  const t = await getTranslations("admin");

  const supabase = await createClient();
  const [
    { count: documentsCount },
    { count: usersCount },
    { count: topicsCount },
    { count: openBugReportsCount },
  ] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }),
    supabase.from("bug_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-black">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label={t("statDocuments")} value={documentsCount ?? 0} />
        <StatCard label={t("statUsers")} value={usersCount ?? 0} />
        <StatCard label={t("statTopics")} value={topicsCount ?? 0} />
        <StatCard label={t("statOpenBugs")} value={openBugReportsCount ?? 0} />
      </div>

      <div className="flex gap-2 border-b border-neutral-100 dark:border-neutral-900">
        <Link
          href="/admin?tab=features"
          className={`min-h-11 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "features" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("tabFeatures")}
        </Link>
        <Link
          href="/admin?tab=users"
          className={`min-h-11 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "users" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("tabUsers")}
        </Link>
        <Link
          href="/admin?tab=journal"
          className={`min-h-11 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "journal" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("tabJournal")}
        </Link>
        <Link
          href="/admin?tab=anomalies"
          className={`min-h-11 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "anomalies" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("tabAnomalies")}
        </Link>
      </div>

      {tab === "features" && (
        <FeaturesTab />
      )}
      {tab === "users" && <UsersTab viewerRole={profile.role} />}
      {tab === "journal" && (
        <div className="flex flex-col gap-4">
          <JournalFilters
            actors={await fetchStaff(supabase)}
            action={action}
            actor={actor}
          />
          <AdminLogList action={action} actor={actor} />
        </div>
      )}
      {tab === "anomalies" && <BugReportsList />}
    </main>
  );
}

async function FeaturesTab() {
  const supabase = await createClient();
  const [flags, { data: auditLog }] = await Promise.all([
    getFeatureFlags(),
    supabase
      .from("feature_flags_audit")
      .select("id, flag_key, old_value, new_value, changed_at, changed_by:profiles(full_name)")
      .order("changed_at", { ascending: false })
      .limit(20),
  ]);

  return <FeatureFlagsManager flags={flags} auditLog={(auditLog as unknown as AuditEntry[]) ?? []} />;
}

async function UsersTab({ viewerRole }: { viewerRole: string }) {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, genie_points, is_banned, banned_until, ban_reason, created_at")
    .order("created_at", { ascending: false });

  return <UsersTable users={(users as AdminUserRow[]) ?? []} viewerRole={viewerRole} />;
}

async function fetchStaff(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "super_admin"]);
  return data ?? [];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 text-center dark:border-neutral-800">
      <p className="text-xl font-black">{value}</p>
      <p className="text-[10px] text-neutral-400">{label}</p>
    </div>
  );
}
