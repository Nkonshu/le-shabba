import { NextResponse } from "next/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile } from "@/src/lib/dal";

export type DrilldownRow = { id: string; label: string; sublabel?: string; href?: string };

const METRICS = [
  "users",
  "comments",
  "proposals",
  "votes",
  "favorites",
  "referrals",
  "documentViews",
  "documentDownloads",
  "topicViews",
] as const;
type Metric = (typeof METRICS)[number];

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric") as Metric | null;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const xCountry = searchParams.get("xCountry") || undefined;
  const xLevel = searchParams.get("xLevel") || undefined;
  const xUser = searchParams.get("xUser") || undefined;

  if (!metric || !METRICS.includes(metric) || !start || !end) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const supabase = await createClient();

  let matchingUserIds: string[] | null = null;
  if (xCountry || xLevel || xUser) {
    let idsQuery = supabase.from("profiles").select("id");
    if (xCountry) {
      const { data: country } = await supabase.from("countries").select("id").eq("code", xCountry).maybeSingle();
      if (country) idsQuery = idsQuery.eq("country_id", country.id);
    }
    if (xLevel) idsQuery = idsQuery.eq("level_id", xLevel);
    if (xUser) idsQuery = idsQuery.eq("id", xUser);
    const { data } = await idsQuery;
    matchingUserIds = (data ?? []).map((p) => p.id);
  }

  const rows = await fetchRows(supabase, metric, start, end, matchingUserIds);
  return NextResponse.json({ rows });
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  metric: Metric,
  start: string,
  end: string,
  matchingUserIds: string[] | null
): Promise<DrilldownRow[]> {
  if (metric === "users" || metric === "referrals") {
    let q = supabase
      .from("profiles")
      .select("id, full_name, referral_activated_at, country:countries(code)")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .limit(100);
    if (metric === "referrals") q = q.not("referred_by", "is", null);
    if (matchingUserIds) q = q.in("id", matchingUserIds);
    const { data } = await q;
    return (data ?? []).map((p) => ({
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
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .limit(100);
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
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .limit(100);
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

  // documentViews / documentDownloads / topicViews : basés sur content_events, target_id n'est pas
  // une vraie FK PostgREST (colonne polymorphe document/sujet selon event_type) — jointure manuelle
  // en deux temps plutôt qu'un embed.
  const eventType = metric === "documentViews" ? "document_view" : metric === "documentDownloads" ? "document_download" : "topic_view";
  let eventsQuery = supabase
    .from("content_events")
    .select("id, target_id, user:profiles(full_name)")
    .eq("event_type", eventType)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false })
    .limit(100);
  if (matchingUserIds) eventsQuery = eventsQuery.in("user_id", matchingUserIds);
  const { data: events } = await eventsQuery;
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
