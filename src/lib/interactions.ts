import { createClient } from "../utils/supabase/client";

const supabase = createClient();

// 1. Gérer le Vote
export async function toggleVote(targetId: string, type: 'topic' | 'answer', value: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Connecte-toi pour voter !");

  // On essaie d'insérer le vote
  const { error: insertError } = await supabase.from('votes').insert([{
    user_id: user.id,
    [type === 'topic' ? 'topic_id' : 'answer_id']: targetId,
    vote_type: value
  }]);

  if (insertError) {
    if (insertError.code === '23505') alert("Tu as déjà voté sur ce contenu !");
    else console.error("Erreur vote:", insertError);
    return false;
  }

  // Si l'insertion a marché, on met à jour le compteur global
  const { error: rpcError } = await supabase.rpc('handle_vote_score', { 
    row_id: targetId, 
    table_name: type === 'topic' ? 'forum_topics' : 'forum_answers',
    val: value 
  });

  if (rpcError) {
    console.error("Erreur RPC vote:", rpcError);
    return false;
  }

  return true;
}

// 2. Gérer les Favoris
// Remplace la fonction toggleFavorite par celle-ci :
export async function toggleFavorite(targetId: string, type: 'topic' | 'answer' | 'document') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Connecte-toi !");

  // Détermination de la colonne cible
  const col = type === 'topic' ? 'topic_id' : type === 'answer' ? 'answer_id' : 'document_id';
  
  const { data } = await supabase.from('favorites')
    .select('*')
    .eq('user_id', user.id)
    .eq(col, targetId)
    .single();

  if (data) {
    await supabase.from('favorites').delete().eq('id', data.id);
    return 'removed';
  } else {
    await supabase.from('favorites').insert([{ user_id: user.id, [col]: targetId }]);
    return 'added';
  }
}

// src/lib/interactions.ts

export async function markAsSolution(answerId: string) {
  const supabase = createClient();
  
  // On met à jour la réponse
  const { error } = await supabase
    .from('forum_answers')
    .update({ is_solution: true })
    .eq('id', answerId);

  if (error) {
    console.error("Erreur détaillée Supabase:", error);
    alert(`Erreur de permission : ${error.message}`);
    return false;
  }
  return true;
}