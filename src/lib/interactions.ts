import { createClient } from "@/src/utils/supabase/client";

export type VoteTargetType = "topic" | "answer" | "document";

// Upsert dès le départ (§4.5/§9) : un clic vote, un second clic sur la même flèche retire le vote
// (delete, jamais un simple upsert qui laisserait une ligne à value=0), l'autre flèche change de sens.
export async function toggleVote(
  targetType: VoteTargetType,
  targetId: string,
  userId: string,
  direction: 1 | -1
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("votes")
    .select("id, value")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing && existing.value === direction) {
    await supabase.from("votes").delete().eq("id", existing.id);
    return null;
  }
  if (existing) {
    await supabase.from("votes").update({ value: direction }).eq("id", existing.id);
    return direction;
  }
  await supabase
    .from("votes")
    .insert({ user_id: userId, target_type: targetType, target_id: targetId, value: direction });
  return direction;
}

export async function toggleFavorite(targetType: VoteTargetType, targetId: string, userId: string) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return false;
  }
  await supabase.from("favorites").insert({ user_id: userId, target_type: targetType, target_id: targetId });
  return true;
}
