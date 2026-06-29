// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { FileText, Users, ShieldAlert, Plus, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/src/utils/supabase/client";
import { useRouter } from "next/navigation";
import DocsManager from "./_components/DocsManager";
import UsersManager from "./_components/UsersManager";


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'docs' | 'users'>('docs');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState({ docs: 0, users: 0, topics: 0 });

  function StatCard({ icon, label, value, color }: any) {
    return (
        <div className={cn("p-8 rounded-[32px] flex items-center gap-6 shadow-sm border border-transparent hover:border-black transition-all", color)}>
            <div className="p-4 bg-white rounded-2xl shadow-sm">{icon}</div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{label}</p>
                <p className="text-3xl font-black text-black">{value.toLocaleString()}</p>
            </div>
        </div>
    )
}

  useEffect(() => {

        async function fetchGlobalStats() {
        const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: topicsCount } = await supabase.from('forum_topics').select('*', { count: 'exact', head: true });
        
        setStats({
            docs: docsCount || 0,
            users: usersCount || 0,
            topics: topicsCount || 0
        });
    }
    fetchGlobalStats();

    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        router.push('/'); // Redirige les élèves
      } else {
        setLoading(false);
      }
    }
    checkAccess();
  }, []);

  if (loading) return <div className="p-20 font-black animate-pulse uppercase text-xs">Vérification des droits Admin...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-black uppercase">Le Shabba Admin</h1>
          <p className="text-[#757575] font-medium">Contrôle total de la bibliothèque et de la communauté.</p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('docs')}
            className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'docs' ? "bg-white text-black shadow-sm" : "text-[#757575] hover:text-black"
            )}
          >
            <FileText size={16} /> Documents
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'users' ? "bg-white text-black shadow-sm" : "text-[#757575] hover:text-black"
            )}
          >
            <Users size={16} /> Utilisateurs
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <StatCard icon={<FileText className="text-blue-600" />} label="Documents" value={stats.docs} color="bg-blue-50" />
      <StatCard icon={<Users className="text-purple-600" />} label="Utilisateurs" value={stats.users} color="bg-purple-50" />
      <StatCard icon={<MessageSquare className="text-orange-600" />} label="Discussions" value={stats.topics} color="bg-orange-50" />
</div>
      <main className="bg-white border border-[#E0E0E0] rounded-[40px] p-8 shadow-sm min-h-[500px]">
        {activeTab === 'docs' ? <DocsManager /> : <UsersManager />}
      </main>
    </div>
  );
}
