import { NextResponse } from "next/server";
import { searchDocuments } from "@/src/lib/search";

// Annexe A.2 : recherche de similarité avant publication ("Ce document existe peut-être déjà") —
// un avertissement, jamais un blocage dur. Titre+matière suffisent à un rapprochement raisonnable.
export async function POST(request: Request) {
  const { title, subject } = (await request.json()) as { title?: string; subject?: string };
  if (!title) return NextResponse.json({ hits: [] });

  const hits = await searchDocuments(`${title} ${subject ?? ""}`.trim(), 3);
  return NextResponse.json({ hits });
}
