"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Trophy, Zap, MessageSquare, TrendingUp } from "lucide-react";
import { createClient } from "@/src/utils/supabase/client";
import { getRank } from "@/src/lib/rank-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function SocialMenu() {
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [hotTopics, setHotTopics] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  // On charge les données uniquement quand on ouvre le menu pour économiser les ressources
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchSocialData();
    }
  };

  async function fetchSocialData() {
    // 1. Top 5 des Génies
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .order('genie_points', { ascending: false })
      .limit(5);

    // 2. Top 3 Sujets les plus vus
    const { data: topics } = await supabase
      .from('forum_topics')
      .select('id, title, views_count')
      .order('views_count', { ascending: false })
      .limit(3);

    setTopUsers(users || []);
    setHotTopics(topics || []);
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button className="lg:hidden p-2 text-[#333333] active:scale-90 transition-transform" aria-label="Voir le classement">
          <Trophy size={22} className="text-yellow-500" />
        </button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[300px] p-0 bg-white border-none shadow-2xl flex flex-col h-full">
        <SheetTitle className="sr-only">Classement et Sujets Chauds</SheetTitle>
        
        <div className="p-6 border-b border-[#E0E0E0] bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" size={20} />
            <span className="font-black text-sm uppercase tracking-widest">Réputation</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
          
          {/* SECTION : HALL OF FAME */}
          <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Hall of Fame</h3>
            <div className="space-y-4">
              {topUsers.length > 0 ? topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg font-black text-[10px] shadow-sm",
                        index === 0 ? "bg-yellow-500 text-white shadow-yellow-100" : "bg-black text-white"
                    )}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-black truncate max-w-[100px]">{user.full_name}</p>
                      <p className="text-[8px] font-bold text-blue-600 uppercase">{getRank(user.genie_points || 0).label}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-black text-black">{user.genie_points.toLocaleString()} <span className="opacity-30">pts</span></p>
                  </div>
                </div>
              )) : (
                <div className="py-4 text-[10px] text-gray-400 italic">Chargement des génies...</div>
              )}
            </div>
          </section>

          <div className="h-[1px] bg-gray-100 w-full" />

          {/* SECTION : HOT TOPICS */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Zap size={16} className="text-orange-500" />
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Hot Topics</h3>
            </div>
            
            <div className="space-y-3">
              {hotTopics.length > 0 ? hotTopics.map((topic) => (
                <Link 
                  key={topic.id} 
                  href={`/forum/${topic.id}`}
                  onClick={() => setIsOpen(false)} // Ferme le menu quand on clique sur un sujet
                  className="group block p-4 bg-gray-50 rounded-2xl border border-transparent active:border-orange-200 transition-all"
                >
                  <h4 className="text-[11px] font-bold text-black line-clamp-2 leading-tight mb-2 group-hover:text-orange-600 transition-colors">
                    {topic.title}
                  </h4>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[8px] font-black text-orange-500 uppercase">
                         <MessageSquare size={10} /> Participer
                      </div>
                      <div className="text-[8px] font-bold text-gray-400">{topic.views_count} vues</div>
                  </div>
                </Link>
              )) : (
                <div className="space-y-3">
                  <div className="h-14 w-full bg-gray-50 rounded-2xl animate-pulse" />
                  <div className="h-14 w-full bg-gray-50 rounded-2xl animate-pulse" />
                </div>
              )}
            </div>
          </section>

        </div>
      </SheetContent>
    </Sheet>
  );
}