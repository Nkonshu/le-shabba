// src/lib/admin-users.ts
import { createClient } from "../utils/supabase/client";

const supabase = createClient();

// Récupérer tous les utilisateurs (pour l'admin)
export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('genie_points', { ascending: false });

  return error ? [] : data;
}

// Bannir / Débannir un utilisateur
export async function toggleBanUser(userId: string, currentStatus: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: !currentStatus })
    .eq('id', userId);

  if (error) throw error;
  return true;
}

// Promouvoir en Admin (Seul Super Admin peut faire ça)
export async function changeUserRole(userId: string, newRole: 'student' | 'admin') {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw error;
  return true;
}