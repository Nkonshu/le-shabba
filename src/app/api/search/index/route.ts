import { NextResponse } from "next/server";
import { createClient } from "@/src/utils/supabase/server";
import { indexDocument, indexTopic } from "@/src/lib/search";

// Indexation appelée juste après une publication réussie (document ou sujet de forum) — le client
// n'a jamais la clé Meilisearch (server-only, §7), donc l'indexation passe par cette route plutôt
// que par un appel direct depuis le navigateur.
export async function POST(request: Request) {
  const body = await request.json();
  const { type, id } = body as { type?: string; id?: string };

  if (!id || (type !== "document" && type !== "topic")) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const supabase = await createClient();

  if (type === "document") {
    const { data } = await supabase
      .from("documents")
      .select("id, title, type, subject, level_id, year, status")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    await indexDocument(data);
  } else {
    const { data } = await supabase
      .from("forum_topics")
      .select("id, title, content, subject, level_id, tags, is_flagged")
      .eq("id", id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    await indexTopic({ ...data, tags: data.tags ?? [] });
  }

  return NextResponse.json({ ok: true });
}
