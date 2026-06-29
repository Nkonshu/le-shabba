"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  User as UserIcon, ShieldAlert, ShieldCheck, 
  Search, Ban, UserCheck, Loader2, Star 
} from "lucide-react";
import { getAllProfiles, toggleBanUser, changeUserRole } from "@/src/lib/admin-users";
import { createClient } from "@/src/utils/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getRank } from "@/src/lib/rank-utils";

export default function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // 1. Charger tous les profils
    const data = await getAllProfiles();
    setUsers(data);

    // 2. Identifier l'admin connecté pour les droits Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }
    setLoading(false);
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      (u.full_name || u.id).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // --- ACTIONS ---

  const handleToggleBan = async (user: any) => {
    if (user.role === 'super_admin') return toast.error("Impossible de bannir un Super Admin !");
    
    setProcessingId(user.id);
    try {
      await toggleBanUser(user.id, user.is_banned);
      toast.success(user.is_banned ? "Utilisateur réhabilité" : "Utilisateur banni");
      loadData();
    } catch (e) {
      toast.error("Erreur lors de l'opération");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (user: any) => {
    if (currentUser?.role !== 'super_admin') {
      return toast.error("Seul le Super Admin peut nommer des administrateurs.");
    }

    const newRole = user.role === 'admin' ? 'student' : 'admin';
    if (!confirm(`Changer le rôle de ${user.full_name} en ${newRole} ?`)) return;

    setProcessingId(user.id);
    try {
      await changeUserRole(user.id, newRole);
      toast.success(`Rôle mis à jour : ${newRole}`);
      loadData();
    } catch (e) {
      toast.error("Erreur de privilèges");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && users.length === 0) return <div className="p-20 text-center animate-pulse font-black uppercase text-xs">Chargement des membres...</div>;

  return (
    <div className="space-y-6">
      {/* BARRE DE RECHERCHE */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Chercher un élève ou un admin..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black outline-none font-bold"
        />
      </div>

      {/* TABLEAU DES UTILISATEURS */}
      <div className="overflow-hidden border border-gray-100 rounded-[32px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Utilisateur</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Mérite / Rang</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Statut</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((user) => (
              <tr key={user.id} className={cn("transition-colors", user.is_banned ? "bg-red-50/30" : "hover:bg-gray-50/50")}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2",
                        user.role === 'super_admin' ? "bg-yellow-500 text-black border-black" : 
                        user.role === 'admin' ? "bg-black text-white border-black" : "bg-gray-100 text-gray-600 border-transparent"
                    )}>
                      {user.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{user.full_name || "Anonyme"}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{user.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-blue-600">{user.genie_points || 0} pts</span>
                    <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded w-fit", getRank(user.genie_points || 0).color)}>
                        {getRank(user.genie_points || 0).label}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   {user.is_banned ? (
                     <div className="flex items-center gap-1.5 text-red-600 font-black text-[9px] uppercase tracking-widest bg-red-100 px-2 py-1 rounded-lg w-fit">
                        <Ban size={12} /> Banni
                     </div>
                   ) : (
                     <div className="flex items-center gap-1.5 text-green-600 font-black text-[9px] uppercase tracking-widest bg-green-100 px-2 py-1 rounded-lg w-fit">
                        <UserCheck size={12} /> Actif
                     </div>
                   )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* BOUTON ROLE (Uniquement Super Admin) */}
                    {currentUser?.role === 'super_admin' && user.role !== 'super_admin' && (
                        <button 
                          onClick={() => handleRoleChange(user)}
                          disabled={processingId === user.id}
                          className="p-2 hover:bg-gray-200 rounded-xl transition-all"
                          title="Changer le rôle"
                        >
                            {user.role === 'admin' ? <Star size={16} className="text-gray-400" /> : <ShieldCheck size={16} className="text-black" />}
                        </button>
                    )}

                    {/* BOUTON BAN */}
                    {user.role !== 'super_admin' && (
                        <button 
                           onClick={() => handleToggleBan(user)}
                           disabled={processingId === user.id}
                           className={cn(
                             "p-2 rounded-xl transition-all",
                             user.is_banned ? "text-green-600 hover:bg-green-100" : "text-red-600 hover:bg-red-100"
                           )}
                           title={user.is_banned ? "Réhabiliter" : "Bannir"}
                        >
                           {processingId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                        </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-20 text-center text-gray-400 font-bold uppercase text-xs italic">Aucun utilisateur ne correspond à ce nom.</div>
        )}
      </div>
    </div>
  );
}