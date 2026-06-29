import { createClient } from "../utils/supabase/client";

// src/lib/forum.ts

export async function getTopics() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('forum_topics')
    .select(`
      *,
      author:author_id (
        full_name,
        genie_points
      ),
      answers:forum_answers (
        content
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur de récupération :", error);
    return [];
  }

  // On garde le contenu des réponses pour la recherche 
  // et on calcule le nombre pour l'affichage
  return data.map(topic => ({
    ...topic,
    answers_count: topic.answers?.length || 0,
    // On crée une chaîne de caractères simple avec toutes les réponses pour faciliter la recherche
    all_answers_text: topic.answers?.map((a: any) => a.content).join(" ") || ""
  }));
}