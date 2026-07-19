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
import { SchoolRequestsList, type SchoolRequestRow, type SchoolRow } from "@/src/components/admin/school-requests-list";
import { PaymentsAdminList, type AdminPaymentRow } from "@/src/components/admin/payments-admin-list";
import { ReferenceDataManager, type CountryRow, type LevelRow } from "@/src/components/admin/reference-data-manager";

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
  const tAdminSchools = await getTranslations("adminSchools");
  const tAdminPayments = await getTranslations("adminPayments");
  const tAdminReferenceData = await getTranslations("adminReferenceData");

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
        <Link
          href="/admin?tab=schools"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "schools" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {tAdminSchools("tabSchools")}
        </Link>
        <Link
          href="/admin?tab=payments"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "payments" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {tAdminPayments("tabPayments")}
        </Link>
        <Link
          href="/admin?tab=reference-data"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "reference-data" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {tAdminReferenceData("tabReferenceData")}
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
      {tab === "schools" && <SchoolsTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "reference-data" && <ReferenceDataTab />}
    </main>
  );
}

async function ReferenceDataTab() {
  const supabase = await createClient();
  const [{ data: countries }, { data: levels }] = await Promise.all([
    supabase.from("countries").select("id, code, name").order("name"),
    supabase.from("education_levels").select("id, country_id, label, sort_order").order("sort_order"),
  ]);

  return (
    <ReferenceDataManager
      countries={(countries as CountryRow[]) ?? []}
      levels={(levels as LevelRow[]) ?? []}
    />
  );
}

async function SchoolsTab() {
  const supabase = await createClient();
  const [{ data: requests }, { data: schools }, { data: memberships }] = await Promise.all([
    supabase
      .from("school_requests")
      .select("id, school_name, estimated_students, desired_subdomain, created_at, requester:profiles!school_requests_requester_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("schools").select("id, name, subdomain, plan").order("created_at", { ascending: false }),
    supabase.from("school_memberships").select("school_id"),
  ]);

  const memberCounts = new Map<string, number>();
  for (const m of memberships ?? []) {
    memberCounts.set(m.school_id, (memberCounts.get(m.school_id) ?? 0) + 1);
  }
  const schoolRows: SchoolRow[] = (schools ?? []).map((s) => ({
    ...s,
    member_count: memberCounts.get(s.id) ?? 0,
  }));

  return <SchoolRequestsList requests={(requests as unknown as SchoolRequestRow[]) ?? []} schools={schoolRows} />;
}

async function PaymentsTab() {
  const supabase = await createClient();
  const [{ data: pending }, { data: confirmed }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, purpose, method, amount, currency, external_reference, created_at, user:profiles!payments_user_id_fkey(full_name)")
      .eq("method", "manual_whatsapp_om")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("payments").select("amount, currency").eq("status", "confirmed"),
  ]);

  const revenueByCurrency = new Map<string, number>();
  for (const p of confirmed ?? []) {
    revenueByCurrency.set(p.currency, (revenueByCurrency.get(p.currency) ?? 0) + Number(p.amount));
  }

  return (
    <PaymentsAdminList
      pending={(pending as unknown as AdminPaymentRow[]) ?? []}
      revenue={[...revenueByCurrency.entries()].map(([currency, total]) => ({ currency, total }))}
    />
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
