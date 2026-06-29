"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import { Trophy, Medal, Star, User, TrendingUp, ShieldCheck } from "lucide-react";
import { createClient } from "@/src/utils/supabase/client";
import { getRank } from "@/src/lib/rank-utils";
import { cn } from "@/lib/utils";

export default function SidebarRight() {
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topicAuthor, setTopicAuthor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  const pathname = usePathname();
  const params = useParams();

  // Détection du contexte
  const isTopicDetail = pathname.startsWith('/forum/') && params.id;

  useEffect(() => {
    if (isTopicDetail) {
      fetchAuthorInfo();
    } else {
      fetchRanking();
    }
  }, [isTopicDetail, params.id]);

  // Récupérer le Top 5 Global
  async function fetchRanking() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('genie_points', { ascending: false })
      .limit(5);
    setTopUsers(data || []);
  }

  // Récupérer les infos de l'auteur du sujet actuel
  async function fetchAuthorInfo() {
    setLoading(true);
    try {
      // 1. Trouver l'ID de l'auteur via le sujet
      const { data: topic } = await supabase
        .from('forum_topics')
        .select('author_id')
        .eq('id', params.id)
        .single();

      if (topic?.author_id) {
        // 2. Récupérer son profil complet
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', topic.author_id)
          .single();
        setTopicAuthor(profile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="fixed right-0 top-16 w-80 h-[calc(100vh-16px)] border-l border-[#E0E0E0] bg-white hidden xl:block overflow-y-auto p-6">
      
      {/* CAS 1 : DÉTAIL D'UN SUJET (PÉDIGRÉ DE L'AUTEUR) */}
      {isTopicDetail ? (
        <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="text-blue-600" size={20} />
            <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Profil de l'Auteur</h3>
          </div>

          {topicAuthor ? (
            <div className="space-y-6">
                <div className="flex flex-col items-center text-center p-8 bg-gray-50 rounded-[40px] border border-transparent hover:border-black transition-all group">
                    <div className="w-20 h-24 bg-black text-white rounded-[32px] flex items-center justify-center font-black text-3xl mb-4 shadow-xl group-hover:scale-105 transition-transform">
                        {topicAuthor.full_name?.charAt(0)}
                    </div>
                    <h4 className="font-black text-xl text-black leading-tight mb-2">{topicAuthor.full_name}</h4>
                    
                    {/* LE BADGE DE RANG DYNAMIQUE */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full font-black uppercase text-[8px] tracking-widest mb-4 shadow-sm",
                        getRank(topicAuthor.genie_points || 0).color
                    )}>
                        {(() => {
                            const RankIcon = getRank(topicAuthor.genie_points || 0).icon;
                            return <RankIcon size={12} strokeWidth={3} />;
                        })()}
                        {getRank(topicAuthor.genie_points || 0).label}
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <TrendingUp size={14} className="text-blue-600" />
                        <span className="text-xs font-black">{topicAuthor.genie_points?.toLocaleString()} <span className="text-gray-400">PTS</span></span>
                    </div>
                </div>

                <div className="p-6 border-2 border-dashed border-gray-100 rounded-[32px] text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed">
                        Cet auteur a contribué à la communauté pour aider ses camarades à réussir.
                    </p>
                </div>
            </div>
          ) : (
            <div className="h-40 bg-gray-50 animate-pulse rounded-[40px]" />
          )}
        </section>

      ) : (

        /* CAS 2 : VUE GÉNÉRALE (HALL OF FAME) */
        <>
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="text-yellow-500" size={20} />
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Hall of Fame</h3>
            </div>
            
            <div className="space-y-4">
              {topUsers.length > 0 ? topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-[24px] border border-transparent hover:border-black transition-all group">
                   <div className="flex items-center gap-3">
                     <div className={cn(
                         "w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs shadow-sm",
                         index === 0 ? "bg-yellow-500 text-white" : "bg-black text-white"
                     )}>
                       {index + 1}
                     </div>
                     <div>
                       <p className="text-xs font-black truncate max-w-[120px]">{user.full_name}</p>
                       <div className="flex items-center gap-1.5 mt-0.5">
                            {(() => {
                                const RankIcon = getRank(user.genie_points || 0).icon;
                                return <RankIcon size={10} className="text-gray-400" />;
                            })()}
                            <p className="text-[8px] font-bold text-[#757575] uppercase">{getRank(user.genie_points || 0).label}</p>
                       </div>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-black text-blue-600">{user.genie_points.toLocaleString()} <span className="text-[8px] text-gray-300">pts</span></p>
                   </div>
                </div>
              )) : (
                <p className="text-[10px] font-bold text-[#757575] uppercase text-center py-8 border-2 border-dashed rounded-[32px]">En attente de génies...</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <Medal className="text-blue-500" size={20} />
              <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Objectif Shabba</h3>
            </div>
            <div className="p-10 border-2 border-dashed rounded-[40px] flex flex-col items-center justify-center text-center bg-blue-50/30">
                <Star className="text-blue-200 mb-4" size={40} strokeWidth={1} />
                <p className="text-[10px] font-black text-blue-800/50 uppercase tracking-widest leading-relaxed">
                    Partage un document ou aide un camarade pour obtenir ton badge
                </p>
            </div>
          </section>
        </>
      )}
    </aside>
  );
}