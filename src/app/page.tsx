"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  FileText, MessageSquare, Eye, ChevronRight, 
  Sparkles, BookOpen, Clock, Flame, ArrowRight 
} from "lucide-react";
import { createClient } from "@/src/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [latestDocs, setLatestDocs] = useState<any[]>([]);
  const [hotTopics, setHotTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchHomeData() {
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('type', 'Cours')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: topics } = await supabase
        .from('forum_topics')
        .select('*, author:author_id(full_name)')
        .order('views_count', { ascending: false })
        .limit(5);

      setLatestDocs(docs || []);
      setHotTopics(topics || []);
      setLoading(false);
    }
    fetchHomeData();
  }, []);

return (
  <div className="max-w-6xl mx-auto px-4 pt-6 md:pt-10 pb-24 space-y-12 md:space-y-24">
    
    {/* SECTION HERO : Ajustée pour mobile */}
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 md:space-y-6 max-w-4xl"
    >
      <div className="flex items-center gap-2 text-blue-600 font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em]">
        <Sparkles className="w-3 h-3 md:w-4 md:h-4" /> Plateforme d'excellence
      </div>
      {/* Taille réduite sur mobile (text-4xl) et ajustée sur tablette (sm:text-6xl) */}
      <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-black tracking-tighter leading-[0.95] md:leading-[0.9]">
        Bienvenue Au <br className="hidden sm:block" /> Shabba
      </h1>
      <p className="text-base md:text-xl lg:text-2xl text-[#757575] font-medium leading-relaxed max-w-2xl">
        Trouve tes cours, tes épreuves et échange avec la plus grande communauté d'élèves motivés.
      </p>
    </motion.section>

    {/* GRILLE DES LISTES : Équilibrée */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24">
      
      {/* COLONNE GAUCHE : DERNIERS COURS */}
      <section className="space-y-6 md:space-y-8">
        <div className="flex items-end justify-between pb-2 border-b-2 border-black">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-blue-600 text-white rounded-lg">
              <BookOpen className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={3} />
            </div>
            {/* Titre de section plus petit sur mobile */}
            <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase">Derniers Cours</h2>
          </div>
          <Link href="/cours" className="group flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#757575] hover:text-black transition-all shrink-0">
            Voir tout <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
          </Link>
        </div>

        <div className="space-y-3 md:space-y-4">
          {loading ? (
              [1,2,3].map(i => <div key={i} className="h-20 md:h-24 bg-gray-50 animate-pulse rounded-[24px] md:rounded-[32px]" />)
          ) : latestDocs.map((doc) => (
            <Link 
  key={doc.id} 
  href={`/cours?level=${encodeURIComponent(doc.level)}&subject=${encodeURIComponent(doc.subject)}`} 
  className="flex items-center justify-between p-4 md:p-6 bg-white border border-[#E0E0E0] rounded-[24px] md:rounded-[32px] hover:border-black hover:shadow-2xl transition-all group overflow-hidden"
>
  <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0"> {/* AJOUT DE flex-1 et min-w-0 ICI */}
    <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
      <FileText className="w-5 h-5 md:w-6 md:h-6" />
    </div>
    
    <div className="min-w-0 flex-1"> {/* AJOUT DE min-w-0 et flex-1 ICI AUSSI */}
      <p className="font-black text-sm md:text-lg text-black leading-tight mb-0.5 truncate">
        {doc.title}
      </p>
      <p className="text-[8px] md:text-[10px] font-black text-[#757575] uppercase tracking-widest truncate">
        {doc.level} • {doc.subject}
      </p>
    </div>
  </div>

  <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-[#E0E0E0] group-hover:text-black transition-colors shrink-0 ml-2" />
</Link>
          ))}
        </div>
      </section>

      {/* COLONNE DROITE : SUJETS CHAUDS */}
      <section className="space-y-6 md:space-y-8">
        <div className="flex items-end justify-between pb-2 border-b-2 border-orange-500">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-orange-500 text-white rounded-lg">
              <Flame className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={3} />
            </div>
            <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase">Sujets Chauds</h2>
          </div>
          <Link href="/forum" className="group flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#757575] hover:text-black transition-all shrink-0">
            Participer <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="space-y-3 md:space-y-4">
          {loading ? (
              [1,2,3].map(i => <div key={i} className="h-20 md:h-24 bg-gray-50 animate-pulse rounded-[24px] md:rounded-[32px]" />)
          ) : hotTopics.map((topic) => (
            <Link 
              key={topic.id} 
              href={`/forum/${topic.id}`} 
              className="block p-4 md:p-6 bg-white border border-[#E0E0E0] rounded-[24px] md:rounded-[40px] hover:border-orange-500 hover:shadow-2xl transition-all group"
            >
              <h3 className="font-black text-sm md:text-xl text-black leading-tight mb-3 md:mb-4 line-clamp-1 group-hover:text-orange-600">
                  {topic.title}
              </h3>
              <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-[8px] md:text-[10px] font-black text-black uppercase tracking-tighter truncate max-w-[80px]">
                          {topic.author?.full_name?.split(' ')[0]}
                      </span>
                      <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-bold text-[#757575]">
                          <Clock className="w-[12px] h-[12px] md:w-5 md:h-5" strokeWidth={3} /> {formatDistanceToNow(new Date(topic.created_at), { locale: fr, addSuffix: false }).replace('environ ', '')}
                      </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                      <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-orange-500 bg-orange-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">
                          <Eye className="w-2.5 h-2.5 md:w-3 md:h-3" strokeWidth={3} /> {topic.views_count}
                      </div>
                      <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-[#757575] bg-gray-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg">
                          <MessageSquare className="w-2.5 h-2.5 md:w-3 md:h-3" strokeWidth={3} /> {topic.answers_count || 0}
                      </div>
                  </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  </div>
);
}