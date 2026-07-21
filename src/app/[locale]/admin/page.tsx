import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/src/lib/dal";
import { getFeatureFlags } from "@/src/lib/feature-flags";
import { createClient } from "@/src/utils/supabase/server";
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
import { StatBarChart } from "@/src/components/admin/stats/charts";
import { StatsFilterBar } from "@/src/components/admin/stats/stats-filter-bar";
import { ExportExcelButton } from "@/src/components/admin/stats/export-excel-button";
import { CrossFilterBar } from "@/src/components/admin/stats/cross-filter-bar";
import { ChartWithDrilldown } from "@/src/components/admin/stats/chart-with-drilldown";
import { AdminSidebarNav } from "@/src/components/admin/admin-sidebar-nav";
import { Pagination, PAGE_SIZE } from "@/src/components/admin/stats/pagination";
import { SearchBox } from "@/src/components/admin/stats/search-box";

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
  uRole?: string;
  uSearch?: string;
  uPage?: string;
  jFrom?: string;
  jTo?: string;
  jPage?: string;
  jSearch?: string;
  aFrom?: string;
  aTo?: string;
  aStatus?: string;
  aPage?: string;
  sFrom?: string;
  sTo?: string;
  sPlan?: string;
  sPage?: string;
  sSearch?: string;
  pFrom?: string;
  pTo?: string;
  pMethod?: string;
  pStatus?: string;
  pPage?: string;
  pSearch?: string;
  ptFrom?: string;
  ptTo?: string;
  ptPlacement?: string;
  ptPage?: string;
  ptSearch?: string;
  gFrom?: string;
  gTo?: string;
  gPeriod?: string;
  fPage?: string;
  rSearch?: string;
  xCountry?: string;
  xLevel?: string;
  xUser?: string;
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
    { data: xCountries },
    { data: xLevelsRaw },
    { data: xUsersRaw },
  ] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }),
    supabase.from("bug_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("countries").select("id, code, name").order("name"),
    supabase.from("education_levels").select("id, label, country:countries(code)").order("label"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const xLevels = (xLevelsRaw ?? []).map((l) => ({
    id: l.id as string,
    label: l.label as string,
    countryCode: (l.country as unknown as { code: string } | null)?.code ?? "",
  }));
  const xCountryIdByCode = new Map((xCountries ?? []).map((c) => [c.code, c.id]));
  const xCountryId = sp.xCountry ? xCountryIdByCode.get(sp.xCountry) : undefined;

  // Filtre croisé (pays/niveau/utilisateur) partagé par tous les onglets — résolu une seule fois ici
  // en liste d'ids de profils, réutilisée par chaque onglet sur sa propre colonne de rattachement
  // (author_id, actor_id, reporter_id, user_id...). null = pas de filtre actif ; [] = filtre actif
  // mais personne ne correspond (doit quand même restreindre à zéro résultat, pas être ignoré).
  let matchingUserIds: string[] | null = null;
  if (sp.xCountry || sp.xLevel || sp.xUser) {
    let idsQuery = supabase.from("profiles").select("id");
    if (xCountryId) idsQuery = idsQuery.eq("country_id", xCountryId);
    if (sp.xLevel) idsQuery = idsQuery.eq("level_id", sp.xLevel);
    if (sp.xUser) idsQuery = idsQuery.in("id", sp.xUser.split(","));
    const { data: matchedProfiles } = await idsQuery;
    matchingUserIds = (matchedProfiles ?? []).map((p) => p.id);
  }

  const tabs = [
    { key: "features", href: "/admin?tab=features", label: t("tabFeatures") },
    { key: "users", href: "/admin?tab=users", label: t("tabUsers") },
    { key: "journal", href: "/admin?tab=journal", label: t("tabJournal") },
    { key: "anomalies", href: "/admin?tab=anomalies", label: t("tabAnomalies") },
    { key: "schools", href: "/admin?tab=schools", label: tAdminSchools("tabSchools") },
    { key: "payments", href: "/admin?tab=payments", label: tAdminPayments("tabPayments") },
    { key: "reference-data", href: "/admin?tab=reference-data", label: tAdminReferenceData("tabReferenceData") },
    { key: "sponsored-slots", href: "/admin?tab=sponsored-slots", label: tAdminSponsoredSlots("tabSponsoredSlots") },
    { key: "growth", href: "/admin?tab=growth", label: tAdminGrowth("tabGrowth") },
  ];

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-black">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label={t("statDocuments")} value={documentsCount ?? 0} />
        <StatCard label={t("statUsers")} value={usersCount ?? 0} />
        <StatCard label={t("statTopics")} value={topicsCount ?? 0} />
        <StatCard label={t("statOpenBugs")} value={openBugReportsCount ?? 0} />
      </div>

      <CrossFilterBar
        countries={(xCountries ?? []).map((c) => ({ code: c.code, name: c.name }))}
        levels={xLevels}
        users={xUsersRaw ?? []}
        country={sp.xCountry}
        level={sp.xLevel}
        userIds={sp.xUser}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AdminSidebarNav tabs={tabs} activeTab={tab} />

        <div className="min-w-0 flex-1">
          {tab === "features" && <FeaturesTab sp={sp} />}
          {tab === "users" && <UsersTab viewerRole={profile.role} sp={sp} matchingUserIds={matchingUserIds} />}
          {tab === "journal" && <JournalTab action={action} actor={actor} sp={sp} matchingUserIds={matchingUserIds} />}
          {tab === "anomalies" && <AnomaliesTab sp={sp} matchingUserIds={matchingUserIds} />}
          {tab === "schools" && <SchoolsTab sp={sp} matchingUserIds={matchingUserIds} xCountryId={xCountryId} />}
          {tab === "payments" && <PaymentsTab sp={sp} matchingUserIds={matchingUserIds} />}
          {tab === "reference-data" && <ReferenceDataTab sp={sp} />}
          {tab === "sponsored-slots" && <SponsoredSlotsTab sp={sp} matchingUserIds={matchingUserIds} />}
          {tab === "growth" && <GrowthTab sp={sp} matchingUserIds={matchingUserIds} />}
        </div>
      </div>
    </main>
  );
}

async function GrowthTab({ sp, matchingUserIds }: { sp: AdminSearchParams; matchingUserIds: string[] | null }) {
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
  if (matchingUserIds) {
    usersQuery = usersQuery.in("id", matchingUserIds);
    answersQuery = answersQuery.in("author_id", matchingUserIds);
    votesQuery = votesQuery.in("user_id", matchingUserIds);
    favoritesQuery = favoritesQuery.in("user_id", matchingUserIds);
    referralsQuery = referralsQuery.in("id", matchingUserIds);
    docViewsQuery = docViewsQuery.in("user_id", matchingUserIds);
    docDownloadsQuery = docDownloadsQuery.in("user_id", matchingUserIds);
    topicViewsQuery = topicViewsQuery.in("user_id", matchingUserIds);
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
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
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
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ChartWithDrilldown
          chart="line"
          metric="users"
          title={t("newUsers", { count: (users ?? []).length })}
          data={bucket(users ?? [])}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
        <ChartWithDrilldown
          chart="line"
          metric="comments"
          title={t("newComments", { count: comments.length })}
          data={bucket(comments)}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
        <ChartWithDrilldown
          chart="line"
          metric="proposals"
          title={t("newProposals", { count: proposals.length })}
          data={bucket(proposals)}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
        <ChartWithDrilldown
          chart="line"
          metric="votes"
          title={t("newVotes", { count: (votes ?? []).length })}
          data={bucket(votes ?? [])}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
        <ChartWithDrilldown
          chart="line"
          metric="favorites"
          title={t("newFavorites", { count: (favorites ?? []).length })}
          data={bucket(favorites ?? [])}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
        <div className="flex flex-col gap-2">
          <ChartWithDrilldown
            chart="line"
            metric="referrals"
            title={t("newReferrals", { count: referralRows.length })}
            data={bucket(referralRows)}
            emptyLabel={t("statsEmpty")}
            period={period}
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <p className="text-xs text-neutral-500">{t("referralActivationRate", { rate: activationRate })}</p>
        </div>
        <ChartWithDrilldown
          chart="line"
          metric="documentViews"
          title={t("documentViews", { count: (docViews ?? []).length })}
          data={bucket(docViews ?? [])}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
        <ChartWithDrilldown
          chart="line"
          metric="documentDownloads"
          title={t("documentDownloads", { count: (docDownloads ?? []).length })}
          data={bucket(docDownloads ?? [])}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
        <ChartWithDrilldown
          chart="line"
          metric="topicViews"
          title={t("topicViews", { count: (topicViews ?? []).length })}
          data={bucket(topicViews ?? [])}
          emptyLabel={t("statsEmpty")}
          period={period}
          xCountry={sp.xCountry}
          xLevel={sp.xLevel}
          xUser={sp.xUser}
        />
      </div>
    </section>
  );
}

async function ReferenceDataTab({ sp }: { sp: AdminSearchParams }) {
  const supabase = await createClient();
  let countriesQuery = supabase.from("countries").select("id, code, name").order("name");
  if (sp.rSearch) countriesQuery = countriesQuery.or(`name.ilike.%${sp.rSearch}%,code.ilike.%${sp.rSearch}%`);
  const [{ data: countries }, { data: levels }] = await Promise.all([
    countriesQuery,
    supabase.from("education_levels").select("id, country_id, label, sort_order").order("sort_order"),
  ]);

  return (
    <ReferenceDataManager
      countries={(countries as CountryRow[]) ?? []}
      levels={(levels as LevelRow[]) ?? []}
      countriesSearch={sp.rSearch}
    />
  );
}

async function SponsoredSlotsTab({ sp, matchingUserIds }: { sp: AdminSearchParams; matchingUserIds: string[] | null }) {
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

  const ptPage = Math.max(1, Number(sp.ptPage) || 1);
  let slotsQuery = supabase
    .from("sponsored_slots")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((ptPage - 1) * PAGE_SIZE, ptPage * PAGE_SIZE - 1);
  if (sp.ptSearch) slotsQuery = slotsQuery.or(`partner_name.ilike.%${sp.ptSearch}%,title.ilike.%${sp.ptSearch}%`);
  const { data: slots, count: slotsCount } = await slotsQuery;
  const slotsTotalPages = Math.max(1, Math.ceil((slotsCount ?? 0) / PAGE_SIZE));
  const levelOptions = (levels ?? []).map((l) => ({
    id: l.id as string,
    label: l.label as string,
    country_code: (l.country as unknown as { code: string } | null)?.code ?? "",
  }));

  // Pas de table "matières" dédiée (contrairement à pays/niveaux) — la matière n'est qu'un champ
  // texte libre sur documents/forum_topics. Liste dynamique = celles réellement utilisées, agrégée
  // en mémoire plutôt qu'un SELECT DISTINCT (volumes modestes, même logique que le reste du dashboard).
  const [{ data: docSubjects }, { data: topicSubjects }] = await Promise.all([
    supabase.from("documents").select("subject"),
    supabase.from("forum_topics").select("subject"),
  ]);
  const subjects = [...new Set([...(docSubjects ?? []).map((d) => d.subject), ...(topicSubjects ?? []).map((t2) => t2.subject)])].sort(
    (a, b) => a.localeCompare(b)
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
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
                  { value: "courses_list", label: t("placementCoursesList") },
                  { value: "exams_list", label: t("placementExamsList") },
                  { value: "revision_sheets_list", label: t("placementRevisionSheetsList") },
                  { value: "forum_list", label: t("placementForumList") },
                  { value: "document_detail", label: t("placementDocumentDetail") },
                  { value: "topic_detail", label: t("placementTopicDetail") },
                ],
              },
            ]}
          />
          <ExportExcelButton rows={exportRows} filename="le-shabba-partenariats" />
        </div>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {/* Pas de clic-vers-détail ici : contrairement aux clics (sponsored_slot_clicks, un
              événement par clic), les vues ne sont qu'un compteur agrégé, sans historique par
              visiteur — rien de plus précis à montrer que ce total. */}
          <StatBarChart title={t("impressionsBySlot")} data={impressionsBySlot} emptyLabel={t("statsEmpty")} />
          <ChartWithDrilldown
            chart="bar"
            metric="slotClicks"
            title={t("clicksBySlot")}
            data={clicksBySlot}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <ChartWithDrilldown
            chart="pie"
            metric="slotsByPlacement"
            title={t("byPlacement")}
            data={byPlacement}
            emptyLabel={t("statsEmpty")}
          />
        </div>
      </section>

      <SponsoredSlotsManager
        slots={(slots as SponsoredSlotRow[]) ?? []}
        countries={(countries as { id: string; code: string; name: string }[]) ?? []}
        levels={levelOptions}
        subjects={subjects}
        matchingUserIds={matchingUserIds}
        search={sp.ptSearch}
        pagination={<Pagination sp={sp} pageParam="ptPage" page={ptPage} totalPages={slotsTotalPages} />}
      />
    </div>
  );
}

async function SchoolsTab({
  sp,
  matchingUserIds,
  xCountryId,
}: {
  sp: AdminSearchParams;
  matchingUserIds: string[] | null;
  xCountryId: string | undefined;
}) {
  const t = await getTranslations("adminSchools");
  const supabase = await createClient();

  let schoolsQuery = supabase.from("schools").select("id, name, subdomain, plan, created_at").order("created_at", { ascending: false });
  if (sp.sFrom) schoolsQuery = schoolsQuery.gte("created_at", sp.sFrom);
  if (sp.sTo) schoolsQuery = schoolsQuery.lte("created_at", `${sp.sTo}T23:59:59`);
  if (sp.sPlan) schoolsQuery = schoolsQuery.eq("plan", sp.sPlan);
  if (xCountryId) schoolsQuery = schoolsQuery.eq("country_id", xCountryId);

  let requestsQuery = supabase
    .from("school_requests")
    .select("id, school_name, estimated_students, desired_subdomain, created_at, requester:profiles!school_requests_requester_id_fkey(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (matchingUserIds) requestsQuery = requestsQuery.in("requester_id", matchingUserIds);

  const [{ data: requests }, { data: schools }, { data: memberships }] = await Promise.all([
    requestsQuery,
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

  // Requête paginée séparée pour la liste "écoles actives" — les graphiques ci-dessus (byPlan,
  // topByMembers, overTime) restent calculés sur schoolsQuery en entier, pas sur cette page.
  const sPage = Math.max(1, Number(sp.sPage) || 1);
  let pageSchoolsQuery = supabase
    .from("schools")
    .select("id, name, subdomain, plan, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((sPage - 1) * PAGE_SIZE, sPage * PAGE_SIZE - 1);
  if (sp.sFrom) pageSchoolsQuery = pageSchoolsQuery.gte("created_at", sp.sFrom);
  if (sp.sTo) pageSchoolsQuery = pageSchoolsQuery.lte("created_at", `${sp.sTo}T23:59:59`);
  if (sp.sPlan) pageSchoolsQuery = pageSchoolsQuery.eq("plan", sp.sPlan);
  if (xCountryId) pageSchoolsQuery = pageSchoolsQuery.eq("country_id", xCountryId);
  if (sp.sSearch) pageSchoolsQuery = pageSchoolsQuery.ilike("name", `%${sp.sSearch}%`);
  const { data: pageSchools, count: schoolsCount } = await pageSchoolsQuery;
  const pageSchoolRows: SchoolRow[] = (pageSchools ?? []).map((s) => ({
    ...s,
    member_count: memberCounts.get(s.id) ?? 0,
  }));
  const schoolsTotalPages = Math.max(1, Math.ceil((schoolsCount ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
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
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ChartWithDrilldown
            chart="pie"
            metric="schoolsByPlan"
            title={t("schoolsByPlan")}
            data={byPlan}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
          />
          <ChartWithDrilldown
            chart="bar"
            metric="schoolsTopByMembers"
            title={t("schoolsTopByMembers")}
            data={topByMembers}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
          />
          <ChartWithDrilldown
            chart="line"
            metric="schoolsCreated"
            title={t("schoolsOverTime")}
            data={overTime}
            emptyLabel={t("statsEmpty")}
            period="day"
            xCountry={sp.xCountry}
          />
        </div>
      </section>

      <SchoolRequestsList
        requests={(requests as unknown as SchoolRequestRow[]) ?? []}
        schools={pageSchoolRows}
        schoolsSearch={sp.sSearch}
        schoolsPagination={<Pagination sp={sp} pageParam="sPage" page={sPage} totalPages={schoolsTotalPages} />}
      />
    </div>
  );
}

async function PaymentsTab({ sp, matchingUserIds }: { sp: AdminSearchParams; matchingUserIds: string[] | null }) {
  const t = await getTranslations("adminPayments");
  const supabase = await createClient();

  let statsQuery = supabase.from("payments").select("id, purpose, method, amount, currency, status, created_at");
  if (sp.pFrom) statsQuery = statsQuery.gte("created_at", sp.pFrom);
  if (sp.pTo) statsQuery = statsQuery.lte("created_at", `${sp.pTo}T23:59:59`);
  if (sp.pMethod) statsQuery = statsQuery.eq("method", sp.pMethod);
  if (sp.pStatus) statsQuery = statsQuery.eq("status", sp.pStatus);
  if (matchingUserIds) statsQuery = statsQuery.in("user_id", matchingUserIds);

  const pPage = Math.max(1, Number(sp.pPage) || 1);
  let pendingQuery = supabase
    .from("payments")
    .select(
      "id, purpose, method, amount, currency, external_reference, created_at, user:profiles!payments_user_id_fkey(full_name)",
      { count: "exact" }
    )
    .eq("method", "manual_whatsapp_om")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .range((pPage - 1) * PAGE_SIZE, pPage * PAGE_SIZE - 1);
  if (sp.pSearch) pendingQuery = pendingQuery.ilike("external_reference", `%${sp.pSearch}%`);
  let confirmedQuery = supabase.from("payments").select("amount, currency").eq("status", "confirmed");
  if (matchingUserIds) {
    pendingQuery = pendingQuery.in("user_id", matchingUserIds);
    confirmedQuery = confirmedQuery.in("user_id", matchingUserIds);
  }

  const [{ data: pending, count: pendingCount }, { data: confirmed }, { data: statsRows }] = await Promise.all([
    pendingQuery,
    confirmedQuery,
    statsQuery,
  ]);
  const pendingTotalPages = Math.max(1, Math.ceil((pendingCount ?? 0) / PAGE_SIZE));

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
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
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
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ChartWithDrilldown
            chart="bar"
            metric="paymentsByMethod"
            title={t("revenueByMethod")}
            data={revenueByMethod}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <ChartWithDrilldown
            chart="pie"
            metric="paymentsByStatus"
            title={t("statusBreakdown")}
            data={statusBreakdown}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <ChartWithDrilldown
            chart="line"
            metric="paymentsConfirmed"
            title={t("revenueOverTime")}
            data={revenueOverTime}
            emptyLabel={t("statsEmpty")}
            period="day"
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
        </div>
      </section>

      <PaymentsAdminList
        pending={(pending as unknown as AdminPaymentRow[]) ?? []}
        revenue={[...revenueByCurrency.entries()].map(([currency, total]) => ({ currency, total }))}
        pendingSearch={sp.pSearch}
        pendingPagination={<Pagination sp={sp} pageParam="pPage" page={pPage} totalPages={pendingTotalPages} />}
      />
    </div>
  );
}

async function FeaturesTab({ sp }: { sp: AdminSearchParams }) {
  const supabase = await createClient();
  const fPage = Math.max(1, Number(sp.fPage) || 1);
  const [flags, { data: auditLog, count }] = await Promise.all([
    getFeatureFlags(),
    supabase
      .from("feature_flags_audit")
      .select("id, flag_key, old_value, new_value, changed_at, changed_by:profiles(full_name)", { count: "exact" })
      .order("changed_at", { ascending: false })
      .range((fPage - 1) * PAGE_SIZE, fPage * PAGE_SIZE - 1),
  ]);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <FeatureFlagsManager
      flags={flags}
      auditLog={(auditLog as unknown as AuditEntry[]) ?? []}
      auditPagination={<Pagination sp={sp} pageParam="fPage" page={fPage} totalPages={totalPages} />}
    />
  );
}

async function UsersTab({
  viewerRole,
  sp,
  matchingUserIds,
}: {
  viewerRole: string;
  sp: AdminSearchParams;
  matchingUserIds: string[] | null;
}) {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const uPage = Math.max(1, Number(sp.uPage) || 1);
  const USERS_COLUMNS =
    "id, full_name, avatar_url, role, genie_points, is_banned, banned_until, ban_reason, created_at, country:countries(code, name), level:education_levels(label)";

  // Requête complète (non paginée) pour les graphiques et l'export — la pagination ne s'applique
  // qu'à la liste affichée, jamais aux agrégats ni à l'export Excel qui doivent refléter tout ce
  // qui correspond aux filtres actifs, pas seulement la page courante.
  let query = supabase.from("profiles").select(USERS_COLUMNS).order("created_at", { ascending: false });
  if (sp.uFrom) query = query.gte("created_at", sp.uFrom);
  if (sp.uTo) query = query.lte("created_at", `${sp.uTo}T23:59:59`);
  if (sp.uRole) query = query.eq("role", sp.uRole);
  if (matchingUserIds) query = query.in("id", matchingUserIds);
  const { data: users } = await query;
  const rows = (users ?? []) as unknown as (AdminUserRow & {
    country: { code: string; name: string } | null;
    level: { label: string } | null;
  })[];

  // Requête paginée séparée, uniquement pour la liste — même filtres, mais bornée à une page.
  let pageQuery = supabase
    .from("profiles")
    .select(USERS_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((uPage - 1) * PAGE_SIZE, uPage * PAGE_SIZE - 1);
  if (sp.uFrom) pageQuery = pageQuery.gte("created_at", sp.uFrom);
  if (sp.uTo) pageQuery = pageQuery.lte("created_at", `${sp.uTo}T23:59:59`);
  if (sp.uRole) pageQuery = pageQuery.eq("role", sp.uRole);
  if (matchingUserIds) pageQuery = pageQuery.in("id", matchingUserIds);
  if (sp.uSearch) pageQuery = pageQuery.ilike("full_name", `%${sp.uSearch}%`);
  const { data: pageUsers, count } = await pageQuery;
  const pageRows = (pageUsers ?? []) as unknown as AdminUserRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

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
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatsFilterBar
            tab="users"
            paramPrefix="u"
            from={sp.uFrom}
            to={sp.uTo}
            selects={[
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
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ChartWithDrilldown
            chart="line"
            metric="users"
            title={t("usersSignupsOverTime")}
            data={signupsOverTime}
            emptyLabel={t("statsEmpty")}
            period="day"
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <ChartWithDrilldown
            chart="bar"
            metric="usersByCountry"
            title={t("usersByCountry")}
            data={byCountry}
            emptyLabel={t("statsEmpty")}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <ChartWithDrilldown
            chart="pie"
            metric="usersByRole"
            title={t("usersByRole")}
            data={byRole}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <SearchBox key={sp.uSearch ?? ""} paramKey="uSearch" defaultValue={sp.uSearch} placeholder={t("usersSearchPlaceholder")} />
        <UsersTable users={pageRows} viewerRole={viewerRole} />
        <Pagination sp={sp} pageParam="uPage" page={uPage} totalPages={totalPages} />
      </section>
    </div>
  );
}

async function JournalTab({
  action,
  actor,
  sp,
  matchingUserIds,
}: {
  action?: string;
  actor?: string;
  sp: AdminSearchParams;
  matchingUserIds: string[] | null;
}) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  let statsQuery = supabase.from("admin_actions_log").select("id, action, created_at");
  if (action) statsQuery = statsQuery.eq("action", action);
  if (actor) statsQuery = statsQuery.eq("actor_id", actor);
  if (sp.jFrom) statsQuery = statsQuery.gte("created_at", sp.jFrom);
  if (sp.jTo) statsQuery = statsQuery.lte("created_at", `${sp.jTo}T23:59:59`);
  if (matchingUserIds) statsQuery = statsQuery.in("actor_id", matchingUserIds);
  const { data: statsRows } = await statsQuery;
  const rows = statsRows ?? [];

  const byAction = countBy(rows, (r) => r.action);
  const overTime = countByDay(rows, (r) => r.created_at);

  const jPage = Math.max(1, Number(sp.jPage) || 1);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <JournalFilters actors={await fetchStaff(supabase)} action={action} actor={actor} />
        <StatsFilterBar tab="journal" paramPrefix="j" from={sp.jFrom} to={sp.jTo} />
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ChartWithDrilldown
            chart="bar"
            metric="journalByAction"
            title={t("journalByAction")}
            data={byAction}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <ChartWithDrilldown
            chart="line"
            metric="journalActions"
            title={t("journalActionsOverTime")}
            data={overTime}
            emptyLabel={t("statsEmpty")}
            period="day"
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <AdminLogList
          action={action}
          actor={actor}
          from={sp.jFrom}
          to={sp.jTo}
          userIds={matchingUserIds ?? undefined}
          search={sp.jSearch}
          sp={sp}
          page={jPage}
        />
      </section>
    </div>
  );
}

async function AnomaliesTab({ sp, matchingUserIds }: { sp: AdminSearchParams; matchingUserIds: string[] | null }) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  let statsQuery = supabase.from("bug_reports").select("id, status, created_at");
  if (sp.aStatus) statsQuery = statsQuery.eq("status", sp.aStatus);
  if (sp.aFrom) statsQuery = statsQuery.gte("created_at", sp.aFrom);
  if (sp.aTo) statsQuery = statsQuery.lte("created_at", `${sp.aTo}T23:59:59`);
  if (matchingUserIds) statsQuery = statsQuery.in("reporter_id", matchingUserIds);
  const { data: statsRows } = await statsQuery;
  const rows = statsRows ?? [];

  const byStatus = countBy(rows, (r) => r.status);
  const overTime = countByDay(rows, (r) => r.created_at);

  const aPage = Math.max(1, Number(sp.aPage) || 1);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
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
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ChartWithDrilldown
            chart="pie"
            metric="anomaliesByStatus"
            title={t("anomaliesByStatus")}
            data={byStatus}
            emptyLabel={t("statsEmpty")}
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
          <ChartWithDrilldown
            chart="line"
            metric="anomaliesReports"
            title={t("anomaliesOverTime")}
            data={overTime}
            emptyLabel={t("statsEmpty")}
            period="day"
            xCountry={sp.xCountry}
            xLevel={sp.xLevel}
            xUser={sp.xUser}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <BugReportsList status={sp.aStatus} from={sp.aFrom} to={sp.aTo} userIds={matchingUserIds ?? undefined} sp={sp} page={aPage} />
      </section>
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
