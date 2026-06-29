import { createClient } from "../utils/supabase/client";

const supabase = createClient();

export async function getDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  return error ? [] : data;
}

// AJOUTER UN DOCUMENT
export async function createDocument(doc: any) {
  const { data, error } = await supabase
    .from('documents')
    .insert([doc])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// MODIFIER UN DOCUMENT
export async function updateDocument(id: string, updates: any) {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// SUPPRIMER UN DOCUMENT
export async function deleteDocument(id: string, fileUrl?: string) {
  const supabase = createClient();

  // 1. Si on a l'URL, on extrait le nom du fichier pour le supprimer du Storage
  if (fileUrl) {
    const filePath = fileUrl.split('/').pop(); // Récupère "nom_du_fichier.pdf"
    if (filePath) {
      await supabase.storage.from('documents').remove([`library/${filePath}`]);
    }
  }

  // 2. On supprime l'entrée dans la table
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}