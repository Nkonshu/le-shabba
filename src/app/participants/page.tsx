"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, Medal, Star, Target, CheckCircle2, 
  FileUp, Heart, TrendingUp, Info, User as UserIcon,
  ChevronRight
} from "lucide-react";
import { createClient } from "@/src/utils/supabase/client";
import { getRank, RANKS } from "@/src/lib/rank-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ParticipantsPage() {
  const [topGlobal, setTopGlobal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRankings() {
      // 1. Top 5 Global par points
      const { data: global } = await supabase
        .from('profiles')
        .select('*')
        .order('genie_points', { ascending: false })
        .limit(5);

      setTopGlobal(global || []);
      setLoading(false);
    }
    fetchRankings();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 space-y-20">
      
     {/* HEADER */}
<section className="space-y-4 pt-6 md:pt-10">
  <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-black tracking-tighter uppercase leading-[0.9]">
    Le Panthéon
  </h1>
  <p className="text-base sm:text-xl text-[#757575] max-w-2xl font-medium leading-relaxed">
    Découvre les esprits les plus brillants de la communauté Le Shabba.
  </p>
</section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-12">
        
        {/* COLONNE 1 & 2 : LE CLASSEMENT */}
        <div className="xl:col-span-2 space-y-10 order-1">
          <div className="flex items-center gap-3 border-b-4 border-black pb-4">
            <Trophy className="text-yellow-500 shrink-0 w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-tight">
            Top 5 - Maîtres du Shabba
            </h2>
         </div>

          <div className="space-y-4">
            {loading ? (
              [1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-[40px]" />)
            ) : topGlobal.map((user, index) => (
              <motion.div 
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.1 }}
  key={user.id} 
  className="group flex items-center justify-between p-4 sm:p-6 bg-white border border-[#E0E0E0] rounded-[32px] sm:rounded-[40px] hover:border-black hover:shadow-2xl transition-all"
>
  <div className="flex items-center gap-4 sm:gap-6">
     {/* CHIFFRE RANG - Plus petit sur mobile */}
     <div className={cn(
         "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl font-black text-lg sm:text-xl shadow-lg shrink-0",
         index === 0 ? "bg-yellow-500 text-white" : 
         index === 1 ? "bg-gray-300 text-white" : 
         index === 2 ? "bg-orange-400 text-white" : "bg-black text-white"
     )}>
        {index + 1}
     </div>
     
     <div className="min-w-0"> {/* min-w-0 est vital pour que le texte truncate fonctionne */}
        <h3 className="text-lg sm:text-xl font-black text-black truncate uppercase tracking-tighter">
          {user.full_name}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-1">
           {/* BADGE RANG */}
           <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg font-black uppercase text-[7px] sm:text-[9px] tracking-wider", 
              getRank(user.genie_points || 0).color
           )}>
              {(() => {
                 const RankIcon = getRank(user.genie_points || 0).icon;
                 return <RankIcon size={10} strokeWidth={3} />;
              })()}
              <span>{getRank(user.genie_points || 0).label}</span>
           </div>

           {/* SCORE */}
           <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg">
              <TrendingUp size={10} className="text-blue-600" />
              <span className="text-[8px] sm:text-[10px] font-black text-black uppercase">
                {user.genie_points.toLocaleString()} <span className="opacity-40">pts</span>
              </span>
           </div>
        </div>
     </div>
  </div>
  <ChevronRight className="text-[#E0E0E0] group-hover:text-black transition-colors hidden sm:block" size={24} />
</motion.div>
            ))}
          </div>
        </div>

        {/* COLONNE 3 : LE SYSTEME DE POINTS */}
        <aside className="space-y-10 order-2 xl:order-none">
          <div className="bg-black text-white rounded-[40px] p-8 space-y-8 shadow-2xl">
             <div className="flex items-center gap-3">
                <Info size={24} className="text-blue-400" />
                <h2 className="text-xl font-black uppercase tracking-widest">Le Barème</h2>
             </div>

             <div className="space-y-6">
                <div className="flex items-start gap-4">
                   <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Heart size={18} fill="currentColor" /></div>
                   <div>
                      <p className="text-xs font-black uppercase tracking-wider">+10 Points</p>
                      <p className="text-[11px] text-gray-400">Quand une de tes réponses ou un de tes cours reçoit un Like.</p>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><CheckCircle2 size={18} /></div>
                   <div>
                      <p className="text-xs font-black uppercase tracking-wider">+20 Points</p>
                      <p className="text-[11px] text-gray-400">Quand l'auteur d'un sujet valide ta proposition comme "Solution".</p>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><FileUp size={18} /></div>
                   <div>
                      <p className="text-xs font-black uppercase tracking-wider">+50 Points</p>
                      <p className="text-[11px] text-gray-400">Quand tu partages un document (Cours/Épreuve) validé par l'admin.</p>
                   </div>
                </div>
             </div>

             <div className="pt-6 border-t border-white/10">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-[0.2em]">Paliers de Rang</p>
            <div className="space-y-3">
   {RANKS.slice(0, 5).map((rank) => (
      <div key={rank.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors">
         <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-lg w-fit shadow-sm", rank.color)}>{rank.label}</span>
         <span className="text-[10px] font-bold text-gray-500 sm:text-right">{rank.min.toLocaleString()} <span className="text-[8px] opacity-50">PTS</span></span>
      </div>
   ))}
</div>
             </div>
          </div>

          <div className="p-8 border-4 border-dashed border-gray-100 rounded-[40px] text-center space-y-4">
             <Target className="mx-auto text-gray-200" size={48} />
             <p className="text-xs font-black text-[#757575] uppercase tracking-widest leading-relaxed">
                Aide les autres pour grimper dans le classement et débloquer des privilèges exclusifs.
             </p>
          </div>
        </aside>

      </div>
    </div>
  );
}