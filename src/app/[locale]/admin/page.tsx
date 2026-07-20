import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/src/lib/dal";
import { getFeatureFlags } from "@/src/lib/feature-flags";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { countByDay, countBy, sumBy, countByPeriod, type StatsPeriod } from "@/src/lib/stats";
import { FeatureFlagsManager } from "@/src/components/admin/feature-flags-manager";
import { UsersTable, type AdminUserRow } from "@/src/components/admin/users-table";
import { AdminLogList } from "@/src/components/admin/admin-log-list";
import { JournalFilters } from "@/src/components/admin/journal-filters";
import { BugReportsList } from "@/src/components/admin/bug-reports-list";
import { SchoolRequestsList, type SchoolRequestRow, type SchoolRow } from "@/src/components/admin/school-requests-list";
import { PaymentsAdminList, type AdminPaymentRow } from "@/src/components/admin/payments-admin-list";
import { ReferenceDataManager, type CountryRow, type LevelRow } from "@/src/components/admin/reference-data-manager";
import { SponsoredSlotsManager, type SponsoredSlotRow } from "@/src/components/admin/sponsored-slots-manager";
import { StatBarChart, StatLineChart, StatPieChart } from "@/src/components/admin/stats/charts";
import { StatsFilterBar } from "@/src/components/admin/stats/stats-filter-bar";
import { ExportExcelButton } from "@/src/components/admin/stats/export-excel-button";

type AuditEntry = {
  id: string;
  flag_key: string;
  old_value: boolean | null;
  new_value: boolean | null;
  changed_at: string;
  changed_by: { full_name: string | null } | null;
};

type AdminSearchParams = {
  tab?: string;
  action?: string;
  actor?: string;
  uFrom?: string;
  uTo?: string;
  uCountry?: string;
  uRole?: string;
  jFrom?: string;
  jTo?: string;
  aFrom?: string;
  aTo?: string;
  aStatus?: string;
  sFrom?: string;
  sTo?: string;
  sPlan?: string;
  pFrom?: string;
  pTo?: string;
  pMethod?: string;
  pStatus?: string;
  ptFrom?: string;
  ptTo?: string;
  ptPlacement?: string;
  gFrom?: string;
  gTo?: string;
  gPeriod?: string;
};

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const { locale } = await params;
  const profile = await requireStaff(locale);
  const sp = await searchParams;
  const { tab = "features", action, actor } = sp;
  const t = await getTranslations("admin");
  const tAdminSchools = await getTranslations("adminSchools");
  const tAdminPayments = await getTranslations("adminPayments");
  const tAdminReferenceData = await getTranslations("adminReferenceData");
  const tAdminSponsoredSlots = await getTranslations("adminSponsoredSlots");
  const tAdminGrowth = await getTranslations("adminGrowth");

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

      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 dark:border-neutral-900">
        <Link
          href="/admin?tab=features"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "features" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("tabFeatures")}
        </Link>
        <Link
          href="/admin?tab=users"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "users" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("tabUsers")}
        </Link>
        <Link
          href="/admin?tab=journal"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "journal" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {t("tabJournal")}
        </Link>
        <Link
          href="/admin?tab=anomalies"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
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
        <Link
          href="/admin?tab=sponsored-slots"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "sponsored-slots" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {tAdminSponsoredSlots("tabSponsoredSlots")}
        </Link>
        <Link
          href="/admin?tab=growth"
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium leading-[2.75rem] ${
            tab === "growth" ? "border-accent-blue" : "border-transparent text-neutral-500"
          }`}
        >
          {tAdminGrowth("tabGrowth")}
        </Link>
      </div>

      {tab === "features" && <FeaturesTab />}
      {tab === "users" && <UsersTab viewerRole={profile.role} sp={sp} />}
      {tab === "journal" && <JournalTab action={action} actor={actor} sp={sp} />}
      {tab === "anomalies" && <AnomaliesTab sp={sp} />}
      {tab === "schools" && <SchoolsTab sp={sp} />}
      {tab === "payments" && <PaymentsTab sp={sp} />}
      {tab === "reference-data" && <ReferenceDataTab />}
      {tab === "sponsored-slots" && <SponsoredSlotsTab sp={sp} />}
      {tab === "growth" && <GrowthTab sp={sp} />}
    </main>
  );
}

async function GrowthTab({ sp }: { sp: AdminSearchParams }) {
  const t = await getTranslations("adminGrowth");
  const period = (["day", "week", "month", "year"].includes(sp.gPeriod ?? "") ? sp.gPeriod : "day") as StatsPeriod;
  const supabase = await createClient();

  const gFrom = sp.gFrom;
  const gTo = sp.gTo ? `${sp.gTo}T23:59:59` : undefined;

  let usersQuery = supabase.from("profiles").select("created_at");
  let answersQuery = supabase.from("forum_answers").select("type, created_at");
  let votesQuery = supabase.from("votes").select("created_at");
  let favoritesQuery = supabase.from("favorites").select("created_at");
  let referralsQuery = supabase.from("profiles").select("created_at, referral_activated_at").not("referred_by", "is", null);
  let docViewsQuery = supabase.from("content_events").select("created_at").eq("event_type", "document_view");
  let docDownloadsQuery = supabase.from("content_events").select("created_at").eq("event_type", "document_download");
  let topicViewsQuery = supabase.from("content_events").select("created_at").eq("event_type", "topic_view");

  if (gFrom) {
    usersQuery = usersQuery.gte("created_at", gFrom);
    answersQuery = answersQuery.gte("created_at", gFrom);
    votesQuery = votesQuery.gte("created_at", gFrom);
    favoritesQuery = favoritesQuery.gte("created_at", gFrom);
    referralsQuery = referralsQuery.gte("created_at", gFrom);
    docViewsQuery = docViewsQuery.gte("created_at", gFrom);
    docDownloadsQuery = docDownloadsQuery.gte("created_at", gFrom);
    topicViewsQuery = topicViewsQuery.gte("created_at", gFrom);
  }
  if (gTo) {
    usersQuery = usersQuery.lte("created_at", gTo);
    answersQuery = answersQuery.lte("created_at", gTo);
    votesQuery = votesQuery.lte("created_at", gTo);
    favoritesQuery = favoritesQuery.lte("created_at", gTo);
    referralsQuery = referralsQuery.lte("created_at", gTo);
    docViewsQuery = docViewsQuery.lte("created_at", gTo);
    docDownloadsQuery = docDownloadsQuery.lte("created_at", gTo);
    topicViewsQuery = topicViewsQuery.lte("created_at", gTo);
  }

  const [
    { data: users },
    { data: answers },
    { data: votes },
    { data: favorites },
    { data: referrals },
    { data: docViews },
    { data: docDownloads },
    { data: topicViews },
  ] = await Promise.all([
    usersQuery,
    answersQuery,
    votesQuery,
    favoritesQuery,
    referralsQuery,
    docViewsQuery,
    docDownloadsQuery,
    topicViewsQuery,
  ]);

  const comments = (answers ?? []).filter((a) => a.type === "comment");
  const proposals = (answers ?? []).filter((a) => a.type === "proposal");
  const referralRows = referrals ?? [];
  const activatedCount = referralRows.filter((r) => r.referral_activated_at).length;
  const activationRate = referralRows.length > 0 ? Math.round((activatedCount / referralRows.length) * 100) : 0;

  const bucket = (rows: { created_at: string }[]) => countByPeriod(rows, (r) => r.created_at, period);

  return (
    <div className="flex flex-col gap-4">
      <StatsFilterBar
        tab="growth"
        paramPrefix="g"
        from={sp.gFrom}
        to={sp.gTo}
        selects={[
          {
            key: "Period",
            value: period,
            options: [
              { value: "day", label: t("periodDay") },
              { value: "week", label: t("periodWeek") },
              { value: "month", label: t("periodMonth") },
              { value: "year", label: t("periodYear") },
            ],
          },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatLineChart title={t("newUsers", { count: (users ?? []).length })} data={bucket(users ?? [])} emptyLabel={t("statsEmpty")} />
        <StatLineChart title={t("newComments", { count: comments.length })} data={bucket(comments)} emptyLabel={t("statsEmpty")} />
        <StatLineChart title={t("newProposals", { count: proposals.length })} data={bucket(proposals)} emptyLabel={t("statsEmpty")} />
        <StatLineChart title={t("newVotes", { count: (votes ?? []).length })} data={bucket(votes ?? [])} emptyLabel={t("statsEmpty")} />
        <StatLineChart
          title={t("newFavorites", { count: (favorites ?? []).length })}
          data={bucket(favorites ?? [])}
          emptyLabel={t("statsEmpty")}
        />
        <div className="flex flex-col gap-2">
          <StatLineChart title={t("newReferrals", { count: referralRows.length })} data={bucket(referralRows)} emptyLabel={t("statsEmpty")} />
          <p className="text-xs text-neutral-500">{t("referralActivationRate", { rate: activationRate })}</p>
        </div>
        <StatLineChart
          title={t("documentViews", { count: (docViews ?? []).length })}
          data={bucket(docViews ?? [])}
          emptyLabel={t("statsEmpty")}
        />
        <StatLineChart
          title={t("documentDownloads", { count: (docDownloads ?? []).length })}
          data={bucket(docDownloads ?? [])}
          emptyLabel={t("statsEmpty")}
        />
        <StatLineChart
          title={t("topicViews", { count: (topicViews ?? []).length })}
          data={bucket(topicViews ?? [])}
          emptyLabel={t("statsEmpty")}
        />
      </div>
    </div>
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

async function SponsoredSlotsTab({ sp }: { sp: AdminSearchParams }) {
  const t = await getTranslations("adminSponsoredSlots");
  const supabase = await createClient();
  const [{ data: countries }, { data: levels }] = await Promise.all([
    supabase.from("countries").select("id, code, name").order("name"),
    supabase.from("education_levels").select("id, label, country:countries(code)").order("label"),
  ]);

  let statsQuery = supabase
    .from("sponsored_slots")
    .select("id, partner_name, title, placement, subject, impressions_count, clicks_count, active, starts_at, ends_at, created_at")
    .order("created_at", { ascending: false });
  if (sp.ptFrom) statsQuery = statsQuery.gte("created_at", sp.ptFrom);
  if (sp.ptTo) statsQuery = statsQuery.lte("created_at", `${sp.ptTo}T23:59:59`);
  if (sp.ptPlacement) statsQuery = statsQuery.eq("placement", sp.ptPlacement);
  const { data: statSlots } = await statsQuery;
  const rows = statSlots ?? [];

  const impressionsBySlot = rows
    .slice()
    .sort((a, b) => b.impressions_count - a.impressions_count)
    .slice(0, 8)
    .map((s) => ({ label: s.partner_name, value: s.impressions_count }));
  const clicksBySlot = rows
    .slice()
    .sort((a, b) => b.clicks_count - a.clicks_count)
    .slice(0, 8)
    .map((s) => ({ label: s.partner_name, value: s.clicks_count }));
  const byPlacement = countBy(rows, (r) => r.placement);

  const exportRows = rows.map((s) => ({
    Partenaire: s.partner_name,
    Titre: s.title,
    Emplacement: s.placement,
    Matière: s.subject ?? "",
    Vues: s.impressions_count,
    Clics: s.clicks_count,
    "Taux de clic (%)": s.impressions_count > 0 ? Number(((s.clicks_count / s.impressions_count) * 100).toFixed(2)) : 0,
    Actif: s.active ? "Oui" : "Non",
    Début: s.starts_at ?? "",
    Fin: s.ends_at ?? "",
  }));

  const { data: slots } = await supabase.from("sponsored_slots").select("*").order("created_at", { ascending: false });
  const levelOptions = (levels ?? []).map((l) => ({
    id: l.id as string,
    label: l.label as string,
    country_code: (l.country as unknown as { code: string } | null)?.code ?? "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatsFilterBar
            tab="sponsored-slots"
            paramPrefix="pt"
            from={sp.ptFrom}
            to={sp.ptTo}
            selects={[
              {
                key: "Placement",
                value: sp.ptPlacement,
                options: [
                  { value: "home_feed", label: t("placementHomeFeed") },
                  { value: "subject", label: t("placementSubject") },
                ],
              },
            ]}
          />
          <ExportExcelButton rows={exportRows} filename="le-shabba-partenariats" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatBarChart title={t("impressionsBySlot")} data={impressionsBySlot} emptyLabel={t("statsEmpty")} />
          <StatBarChart title={t("clicksBySlot")} data={clicksBySlot} emptyLabel={t("statsEmpty")} />
          <StatPieChart title={t("byPlacement")} data={byPlacement} emptyLabel={t("statsEmpty")} />
        </div>
      </div>

      <SponsoredSlotsManager
        slots={(slots as SponsoredSlotRow[]) ?? []}
        countries={(countries as { id: string; code: string; name: string }[]) ?? []}
        levels={levelOptions}
      />
    </div>
  );
}

async function SchoolsTab({ sp }: { sp: AdminSearchParams }) {
  const t = await getTranslations("adminSchools");
  const supabase = await createClient();

  let schoolsQuery = supabase.from("schools").select("id, name, subdomain, plan, created_at").order("created_at", { ascending: false });
  if (sp.sFrom) schoolsQuery = schoolsQuery.gte("created_at", sp.sFrom);
  if (sp.sTo) schoolsQuery = schoolsQuery.lte("created_at", `${sp.sTo}T23:59:59`);
  if (sp.sPlan) schoolsQuery = schoolsQuery.eq("plan", sp.sPlan);

  const [{ data: requests }, { data: schools }, { data: memberships }] = await Promise.all([
    supabase
      .from("school_requests")
      .select("id, school_name, estimated_students, desired_subdomain, created_at, requester:profiles!school_requests_requester_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    schoolsQuery,
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

  const byPlan = countBy(schools ?? [], (s) => s.plan);
  const topByMembers = schoolRows
    .slice()
    .sort((a, b) => b.member_count - a.member_count)
    .slice(0, 8)
    .map((s) => ({ label: s.name, value: s.member_count }));
  const overTime = countByDay(schools ?? [], (s) => s.created_at);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <StatsFilterBar
          tab="schools"
          paramPrefix="s"
          from={sp.sFrom}
          to={sp.sTo}
          selects={[
            {
              key: "Plan",
              value: sp.sPlan,
              options: [
                { value: "trial", label: "trial" },
                { value: "standard", label: "standard" },
                { value: "premium", label: "premium" },
              ],
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatPieChart title={t("schoolsByPlan")} data={byPlan} emptyLabel={t("statsEmpty")} />
          <StatBarChart title={t("schoolsTopByMembers")} data={topByMembers} emptyLabel={t("statsEmpty")} />
          <StatLineChart title={t("schoolsOverTime")} data={overTime} emptyLabel={t("statsEmpty")} />
        </div>
      </div>

      <SchoolRequestsList requests={(requests as unknown as SchoolRequestRow[]) ?? []} schools={schoolRows} />
    </div>
  );
}

async function PaymentsTab({ sp }: { sp: AdminSearchParams }) {
  const t = await getTranslations("adminPayments");
  const supabase = await createClient();

  let statsQuery = supabase.from("payments").select("id, purpose, method, amount, currency, status, created_at");
  if (sp.pFrom) statsQuery = statsQuery.gte("created_at", sp.pFrom);
  if (sp.pTo) statsQuery = statsQuery.lte("created_at", `${sp.pTo}T23:59:59`);
  if (sp.pMethod) statsQuery = statsQuery.eq("method", sp.pMethod);
  if (sp.pStatus) statsQuery = statsQuery.eq("status", sp.pStatus);

  const [{ data: pending }, { data: confirmed }, { data: statsRows }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, purpose, method, amount, currency, external_reference, created_at, user:profiles!payments_user_id_fkey(full_name)")
      .eq("method", "manual_whatsapp_om")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("payments").select("amount, currency").eq("status", "confirmed"),
    statsQuery,
  ]);

  const revenueByCurrency = new Map<string, number>();
  for (const p of confirmed ?? []) {
    revenueByCurrency.set(p.currency, (revenueByCurrency.get(p.currency) ?? 0) + Number(p.amount));
  }

  const rows = statsRows ?? [];
  const confirmedRows = rows.filter((r) => r.status === "confirmed");
  const revenueByMethod = sumBy(
    confirmedRows,
    (r) => `${r.method} (${r.currency})`,
    (r) => Number(r.amount)
  );
  const revenueOverTime = (() => {
    const sums = new Map<string, number>();
    for (const r of confirmedRows) {
      const day = r.created_at.slice(0, 10);
      sums.set(day, (sums.get(day) ?? 0) + Number(r.amount));
    }
    return [...sums.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
  })();
  const statusBreakdown = countBy(rows, (r) => r.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <StatsFilterBar
          tab="payments"
          paramPrefix="p"
          from={sp.pFrom}
          to={sp.pTo}
          selects={[
            {
              key: "Method",
              value: sp.pMethod,
              options: [
                { value: "paypal", label: "PayPal" },
                { value: "manual_whatsapp_om", label: "WhatsApp/Orange Money" },
                { value: "mobile_money_aggregator", label: "Mobile Money" },
              ],
            },
            {
              key: "Status",
              value: sp.pStatus,
              options: [
                { value: "pending", label: "pending" },
                { value: "confirmed", label: "confirmed" },
                { value: "rejected", label: "rejected" },
                { value: "refunded", label: "refunded" },
              ],
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatBarChart title={t("revenueByMethod")} data={revenueByMethod} emptyLabel={t("statsEmpty")} />
          <StatPieChart title={t("statusBreakdown")} data={statusBreakdown} emptyLabel={t("statsEmpty")} />
          <StatLineChart title={t("revenueOverTime")} data={revenueOverTime} emptyLabel={t("statsEmpty")} />
        </div>
      </div>

      <PaymentsAdminList
        pending={(pending as unknown as AdminPaymentRow[]) ?? []}
        revenue={[...revenueByCurrency.entries()].map(([currency, total]) => ({ currency, total }))}
      />
    </div>
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

async function UsersTab({ viewerRole, sp }: { viewerRole: string; sp: AdminSearchParams }) {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: countries } = await supabase.from("countries").select("id, code, name").order("name");
  const countryIdByCode = new Map((countries ?? []).map((c) => [c.code, c.id]));

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, genie_points, is_banned, banned_until, ban_reason, created_at, country:countries(code, name), level:education_levels(label)"
    )
    .order("created_at", { ascending: false });

  if (sp.uFrom) query = query.gte("created_at", sp.uFrom);
  if (sp.uTo) query = query.lte("created_at", `${sp.uTo}T23:59:59`);
  if (sp.uRole) query = query.eq("role", sp.uRole);
  if (sp.uCountry && countryIdByCode.has(sp.uCountry)) query = query.eq("country_id", countryIdByCode.get(sp.uCountry));

  const { data: users } = await query;
  const rows = (users ?? []) as unknown as (AdminUserRow & {
    country: { code: string; name: string } | null;
    level: { label: string } | null;
  })[];

  const signupsOverTime = countByDay(rows, (u) => u.created_at);
  const byCountry = countBy(rows, (u) => u.country?.code ?? "?");
  const byRole = countBy(rows, (u) => u.role);

  const exportRows = rows.map((u) => ({
    Nom: u.full_name ?? "",
    Pays: u.country?.name ?? "",
    Niveau: u.level?.label ?? "",
    Rôle: u.role,
    Points: u.genie_points,
    "Inscrit le": u.created_at.slice(0, 10),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatsFilterBar
            tab="users"
            paramPrefix="u"
            from={sp.uFrom}
            to={sp.uTo}
            selects={[
              {
                key: "Country",
                value: sp.uCountry,
                options: (countries ?? []).map((c) => ({ value: c.code, label: c.name })),
              },
              {
                key: "Role",
                value: sp.uRole,
                options: [
                  { value: "student", label: t("role.student") },
                  { value: "admin", label: t("role.admin") },
                  { value: "super_admin", label: t("role.super_admin") },
                ],
              },
            ]}
          />
          <ExportExcelButton rows={exportRows} filename="le-shabba-utilisateurs" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatLineChart title={t("usersSignupsOverTime")} data={signupsOverTime} emptyLabel={t("statsEmpty")} />
          <StatBarChart title={t("usersByCountry")} data={byCountry} emptyLabel={t("statsEmpty")} />
          <StatPieChart title={t("usersByRole")} data={byRole} emptyLabel={t("statsEmpty")} />
        </div>
      </div>

      <UsersTable users={rows} viewerRole={viewerRole} />
    </div>
  );
}

async function JournalTab({
  action,
  actor,
  sp,
}: {
  action?: string;
  actor?: string;
  sp: AdminSearchParams;
}) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  let statsQuery = supabase.from("admin_actions_log").select("id, action, created_at");
  if (action) statsQuery = statsQuery.eq("action", action);
  if (actor) statsQuery = statsQuery.eq("actor_id", actor);
  if (sp.jFrom) statsQuery = statsQuery.gte("created_at", sp.jFrom);
  if (sp.jTo) statsQuery = statsQuery.lte("created_at", `${sp.jTo}T23:59:59`);
  const { data: statsRows } = await statsQuery;
  const rows = statsRows ?? [];

  const byAction = countBy(rows, (r) => r.action);
  const overTime = countByDay(rows, (r) => r.created_at);

  return (
    <div className="flex flex-col gap-4">
      <JournalFilters actors={await fetchStaff(supabase)} action={action} actor={actor} />
      <StatsFilterBar tab="journal" paramPrefix="j" from={sp.jFrom} to={sp.jTo} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatBarChart title={t("journalByAction")} data={byAction} emptyLabel={t("statsEmpty")} />
        <StatLineChart title={t("journalActionsOverTime")} data={overTime} emptyLabel={t("statsEmpty")} />
      </div>
      <AdminLogList action={action} actor={actor} from={sp.jFrom} to={sp.jTo} />
    </div>
  );
}

async function AnomaliesTab({ sp }: { sp: AdminSearchParams }) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  let statsQuery = supabase.from("bug_reports").select("id, status, created_at");
  if (sp.aStatus) statsQuery = statsQuery.eq("status", sp.aStatus);
  if (sp.aFrom) statsQuery = statsQuery.gte("created_at", sp.aFrom);
  if (sp.aTo) statsQuery = statsQuery.lte("created_at", `${sp.aTo}T23:59:59`);
  const { data: statsRows } = await statsQuery;
  const rows = statsRows ?? [];

  const byStatus = countBy(rows, (r) => r.status);
  const overTime = countByDay(rows, (r) => r.created_at);

  return (
    <div className="flex flex-col gap-4">
      <StatsFilterBar
        tab="anomalies"
        paramPrefix="a"
        from={sp.aFrom}
        to={sp.aTo}
        selects={[
          {
            key: "Status",
            value: sp.aStatus,
            options: [
              { value: "open", label: "open" },
              { value: "in_progress", label: "in_progress" },
              { value: "resolved", label: "resolved" },
              { value: "wont_fix", label: "wont_fix" },
            ],
          },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatPieChart title={t("anomaliesByStatus")} data={byStatus} emptyLabel={t("statsEmpty")} />
        <StatLineChart title={t("anomaliesOverTime")} data={overTime} emptyLabel={t("statsEmpty")} />
      </div>
      <BugReportsList status={sp.aStatus} from={sp.aFrom} to={sp.aTo} />
    </div>
  );
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
