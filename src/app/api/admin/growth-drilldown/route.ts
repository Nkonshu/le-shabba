import { NextResponse } from "next/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile } from "@/src/lib/dal";

export type DrilldownRow = { id: string; label: string; sublabel?: string; href?: string };

const METRICS = [
  // Croissance (mode date, période variable)
  "users",
  "comments",
  "proposals",
  "votes",
  "favorites",
  "referrals",
  "documentViews",
  "documentDownloads",
  "topicViews",
  // Utilisateurs (mode catégorie)
  "usersByCountry",
  "usersByRole",
  // Journal (mode date jour + mode catégorie)
  "journalActions",
  "journalByAction",
  // Anomalies
  "anomaliesReports",
  "anomaliesByStatus",
  // Écoles
  "schoolsCreated",
  "schoolsByPlan",
  "schoolsTopByMembers",
  // Paiements
  "paymentsConfirmed",
  "paymentsByMethod",
  "paymentsByStatus",
  // Partenariats
  "slotClicks",
  "slotsByPlacement",
] as const;
type Metric = (typeof METRICS)[number];

type Ctx = { matchingUserIds: string[] | null; xCountryId: string | undefined };

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric") as Metric | null;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const category = searchParams.get("category");
  const xCountry = searchParams.get("xCountry") || undefined;
  const xLevel = searchParams.get("xLevel") || undefined;
  const xUser = searchParams.get("xUser") || undefined;

  if (!metric || !METRICS.includes(metric) || (!(start && end) && !category)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const supabase = await createClient();

  let matchingUserIds: string[] | null = null;
  let xCountryId: string | undefined;
  if (xCountry) {
    const { data: country } = await supabase.from("countries").select("id").eq("code", xCountry).maybeSingle();
    xCountryId = country?.id;
  }
  if (xCountry || xLevel || xUser) {
    let idsQuery = supabase.from("profiles").select("id");
    if (xCountryId) idsQuery = idsQuery.eq("country_id", xCountryId);
    if (xLevel) idsQuery = idsQuery.eq("level_id", xLevel);
    if (xUser) idsQuery = idsQuery.eq("id", xUser);
    const { data } = await idsQuery;
    matchingUserIds = (data ?? []).map((p) => p.id);
  }
  const ctx: Ctx = { matchingUserIds, xCountryId };

  const rows = await fetchRows(supabase, metric, start, end, category, ctx);
  return NextResponse.json({ rows });
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  metric: Metric,
  start: string | null,
  end: string | null,
  category: string | null,
  { matchingUserIds, xCountryId }: Ctx
): Promise<DrilldownRow[]> {
  if (metric === "users" || metric === "referrals" || metric === "usersByCountry" || metric === "usersByRole") {
    let q = supabase
      .from("profiles")
      .select("id, full_name, role, referral_activated_at, country:countries(code)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end);
    if (metric === "referrals") q = q.not("referred_by", "is", null);
    if (metric === "usersByRole" && category) q = q.eq("role", category);
    if (matchingUserIds) q = q.in("id", matchingUserIds);
    const { data } = await q;
    const rows = data ?? [];
    const filtered =
      metric === "usersByCountry" && category
        ? rows.filter((p) => (p.country as unknown as { code: string } | null)?.code === category)
        : rows;
    return filtered.map((p) => ({
      id: p.id,
      label: p.full_name ?? "?",
      sublabel:
        metric === "referrals"
          ? p.referral_activated_at
            ? "activé"
            : "en attente"
          : ((p.country as unknown as { code: string } | null)?.code ?? undefined),
      href: `/profil/${p.id}`,
    }));
  }

  if (metric === "comments" || metric === "proposals") {
    let q = supabase
      .from("forum_answers")
      .select("id, content, topic_id, author:profiles!forum_answers_author_id_fkey(full_name)")
      .eq("type", metric === "comments" ? "comment" : "proposal")
      .order("created_at", { ascending: false })
      .limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end);
    if (matchingUserIds) q = q.in("author_id", matchingUserIds);
    const { data } = await q;
    return (data ?? []).map((a) => ({
      id: a.id,
      label: stripHtml(a.content).slice(0, 80) || "(vide)",
      sublabel: (a.author as unknown as { full_name: string | null } | null)?.full_name ?? undefined,
      href: `/forum/${a.topic_id}#answer-${a.id}`,
    }));
  }

  if (metric === "votes" || metric === "favorites") {
    const table = metric === "votes" ? "votes" : "favorites";
    let q = supabase
      .from(table)
      .select("id, target_type, target_id, user:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end);
    if (matchingUserIds) q = q.in("user_id", matchingUserIds);
    const { data } = await q;
    return (data ?? []).map((v) => ({
      id: v.id,
      label: (v.user as unknown as { full_name: string | null } | null)?.full_name ?? "?",
      sublabel: v.target_type,
      href:
        v.target_type === "topic"
          ? `/forum/${v.target_id}`
          : v.target_type === "document"
            ? `/document/${v.target_id}`
            : undefined,
    }));
  }

  if (metric === "documentViews" || metric === "documentDownloads" || metric === "topicViews") {
    // target_id n'est pas une vraie FK PostgREST (colonne polymorphe document/sujet selon
    // event_type) — jointure manuelle en deux temps plutôt qu'un embed.
    const eventType = metric === "documentViews" ? "document_view" : metric === "documentDownloads" ? "document_download" : "topic_view";
    let q = supabase
      .from("content_events")
      .select("id, target_id, user:profiles(full_name)")
      .eq("event_type", eventType)
      .order("created_at", { ascending: false })
      .limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end);
    if (matchingUserIds) q = q.in("user_id", matchingUserIds);
    const { data: events } = await q;
    const rows = events ?? [];

    const targetIds = [...new Set(rows.map((r) => r.target_id))];
    const isDoc = eventType !== "topic_view";
    const { data: targets } = targetIds.length
      ? await supabase.from(isDoc ? "documents" : "forum_topics").select("id, title").in("id", targetIds)
      : { data: [] as { id: string; title: string }[] };
    const titleById = new Map((targets ?? []).map((t) => [t.id, t.title]));

    return rows.map((r) => ({
      id: r.id,
      label: titleById.get(r.target_id) ?? "(contenu supprimé)",
      sublabel: (r.user as unknown as { full_name: string | null } | null)?.full_name ?? "anonyme",
      href: titleById.has(r.target_id) ? (isDoc ? `/document/${r.target_id}` : `/forum/${r.target_id}`) : undefined,
    }));
  }

  if (metric === "journalActions" || metric === "journalByAction") {
    let q = supabase
      .from("admin_actions_log")
      .select("id, action, target_type, target_id, note, actor:profiles!actor_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end);
    if (metric === "journalByAction" && category) q = q.eq("action", category);
    if (matchingUserIds) q = q.in("actor_id", matchingUserIds);
    const { data } = await q;
    return (data ?? []).map((entry) => ({
      id: entry.id,
      label: `${(entry.actor as unknown as { full_name: string | null } | null)?.full_name ?? "?"} — ${entry.action}`,
      sublabel: entry.note ?? undefined,
      href: entry.target_type === "user" && entry.target_id ? `/profil/${entry.target_id}` : undefined,
    }));
  }

  if (metric === "anomaliesReports" || metric === "anomaliesByStatus") {
    let q = supabase
      .from("bug_reports")
      .select("id, description, status, reporter:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end);
    if (metric === "anomaliesByStatus" && category) q = q.eq("status", category);
    if (matchingUserIds) q = q.in("reporter_id", matchingUserIds);
    const { data } = await q;
    return (data ?? []).map((r) => ({
      id: r.id,
      label: r.description.slice(0, 80),
      sublabel: (r.reporter as unknown as { full_name: string | null } | null)?.full_name ?? "anonyme",
    }));
  }

  if (metric === "schoolsCreated" || metric === "schoolsByPlan" || metric === "schoolsTopByMembers") {
    let q = supabase.from("schools").select("id, name, subdomain, plan").order("created_at", { ascending: false }).limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end);
    if (metric === "schoolsByPlan" && category) q = q.eq("plan", category);
    if (metric === "schoolsTopByMembers" && category) q = q.eq("name", category);
    if (xCountryId) q = q.eq("country_id", xCountryId);
    const { data } = await q;
    return (data ?? []).map((s) => ({
      id: s.id,
      label: s.name,
      sublabel: s.plan,
      href: s.subdomain ? `/ecole/${s.subdomain}` : undefined,
    }));
  }

  if (metric === "paymentsConfirmed" || metric === "paymentsByMethod" || metric === "paymentsByStatus") {
    let q = supabase
      .from("payments")
      .select("id, purpose, method, amount, currency, status, user:profiles!payments_user_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (start && end) q = q.gte("created_at", start).lt("created_at", end).eq("status", "confirmed");
    if (metric === "paymentsByStatus" && category) q = q.eq("status", category);
    if (metric === "paymentsByMethod" && category) {
      const match = category.match(/^(.+) \((.+)\)$/);
      if (match) q = q.eq("method", match[1]).eq("currency", match[2]);
    }
    if (matchingUserIds) q = q.in("user_id", matchingUserIds);
    const { data } = await q;
    return (data ?? []).map((p) => ({
      id: p.id,
      label: `${(p.user as unknown as { full_name: string | null } | null)?.full_name ?? "?"} — ${p.amount} ${p.currency}`,
      sublabel: `${p.purpose} · ${p.status}`,
    }));
  }

  if (metric === "slotsByPlacement") {
    let q = supabase
      .from("sponsored_slots")
      .select("id, partner_name, title, placement, active")
      .order("created_at", { ascending: false })
      .limit(100);
    if (category) q = q.eq("placement", category);
    const { data } = await q;
    return (data ?? []).map((s) => ({
      id: s.id,
      label: `${s.partner_name} — ${s.title}`,
      sublabel: s.active ? "actif" : "inactif",
    }));
  }

  // slotClicks : qui a cliqué sur ce partenariat (même source que le "voir qui a cliqué" par
  // annonce dans l'onglet Partenariats), filtré ici par le nom du partenaire cliqué sur le graphique.
  let q = supabase
    .from("sponsored_slot_clicks")
    .select("id, clicked_at, slot:sponsored_slots!inner(partner_name), user:profiles(full_name)")
    .order("clicked_at", { ascending: false })
    .limit(100);
  if (category) q = q.eq("slot.partner_name", category);
  if (matchingUserIds) q = q.in("user_id", matchingUserIds);
  const { data } = await q;
  return (data ?? []).map((c) => ({
    id: c.id,
    label: (c.user as unknown as { full_name: string | null } | null)?.full_name ?? "anonyme",
    sublabel: new Date(c.clicked_at).toLocaleString("fr-FR"),
  }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
