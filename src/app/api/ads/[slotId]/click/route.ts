import { NextResponse } from "next/server";
import { createClient } from "@/src/utils/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const supabase = await createClient();
  const { data: linkUrl } = await supabase.rpc("record_sponsored_click", { p_slot_id: slotId });

  if (!linkUrl) {
    return NextResponse.redirect(origin);
  }
  return NextResponse.redirect(linkUrl);
}
