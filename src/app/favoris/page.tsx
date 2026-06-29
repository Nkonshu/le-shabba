"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, GraduationCap, BookOpen, FileText, 
  Download, ChevronRight, MessageSquare, Heart, X 
} from "lucide-react";
import { createClient } from "@/src/utils/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getRank } from "@/src/lib/rank-utils";

export default function FavorisPage() {
  const [favDocs, setFavDocs] = useState<any[]>([]);
  const [favTopics, setFavTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'docs' | 'forum'>('docs');
  const supabase = createClient();

  // États de navigation pour les documents
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    fetchFavoris();
  }, []);

  const fetchFavoris = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupérer documents favoris
    const { data: docs } = await supabase
      .from('favorites')
      .select('documents (*)')
      .eq('user_id', user.id)
      .not('document_id', 'is', null);

    // 2. Récupérer sujets favoris
    const { data: topics } = await supabase
      .from('favorites')
      .select('forum_topics (*, author:author_id (*))')
      .eq('user_id', user.id)
      .not('topic_id', 'is', null);

    setFavDocs(docs?.map(d => d.documents).filter(Boolean) || []);
    setFavTopics(topics?.map(t => t.forum_topics).filter(Boolean) || []);
    setLoading(false);
  };

  // --- LOGIQUE NAVIGATION DOCUMENTS ---
  const levels = Array.from(new Set(favDocs.map(d => d.level)));
  const subjectsForLevel = selectedLevel 
    ? Array.from(new Set(favDocs.filter(d => d.level === selectedLevel).map(d => d.subject)))
    : [];
  const filesForSubject = (selectedLevel && selectedSubject)
    ? favDocs.filter(d => d.level === selectedLevel && d.subject === selectedSubject)
    : [];

  if (loading) return <div className="p-10 animate-pulse text-[#757575] font-black uppercase text-xs">Chargement de tes pépites...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-yellow-400 text-white rounded-[24px] shadow-lg shadow-yellow-100">
                <Heart size={24} fill="white" />
            </div>
            <div>
                <h1 className="text-3xl font-black text-black tracking-tighter uppercase">Mes Favoris</h1>
                <p className="text-[#757575] text-sm font-medium">Tout ce que tu as jugé important.</p>
            </div>
        </div>

        {/* SELECTEUR D'ONGLET */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('docs')}
            className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'docs' ? "bg-white text-black shadow-sm" : "text-[#757575] hover:text-black"
            )}
          >
            Documents ({favDocs.length})
          </button>
          <button 
            onClick={() => setActiveTab('forum')}
            className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'forum' ? "bg-white text-black shadow-sm" : "text-[#757575] hover:text-black"
            )}
          >
            Forum ({favTopics.length})
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'docs' ? (
          <motion.div key="docs-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             {/* NAVIGATION DRILL-DOWN */}
             <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#757575]">
                <button onClick={() => { setSelectedLevel(null); setSelectedSubject(null); }} className={selectedLevel ? "hover:text-black" : "text-black border-b-2 border-black"}>Bibliothèque</button>
                {selectedLevel && (
                    <>
                    <ChevronRight size={12} />
                    <button onClick={() => setSelectedSubject(null)} className={selectedSubject ? "hover:text-black" : "text-black border-b-2 border-black"}>{selectedLevel}</button>
                    </>
                )}
            </nav>

            {!selectedLevel && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {levels.length > 0 ? levels.map(level => (
                   <SelectionCard key={level} title={level} icon={<GraduationCap size={24}/>} onClick={() => setSelectedLevel(level)} />
                )) : <EmptyState message="Aucun document en favoris" />}
              </div>
            )}

            {selectedLevel && !selectedSubject && (
              <div className="space-y-3">
                {subjectsForLevel.map(subject => (
                  <SelectionCard 
                    key={subject} title={subject} icon={<BookOpen size={20}/>} 
                    onClick={() => setSelectedSubject(subject)}
                    badge={`${favDocs.filter(d => d.level === selectedLevel && d.subject === subject).length} fichiers`}
                  />
                ))}
              </div>
            )}

            {selectedSubject && (
              <div className="bg-white border border-[#E0E0E0] rounded-[40px] overflow-hidden shadow-sm">
                {filesForSubject.map((doc, index) => (
                  <FileItem key={doc.id} doc={doc} isLast={index === filesForSubject.length - 1} />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="forum-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
             {favTopics.length > 0 ? favTopics.map(topic => (
               <TopicItem key={topic.id} topic={topic} />
             )) : <EmptyState message="Aucune discussion en favoris" />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- PETITS COMPOSANTS ---

function SelectionCard({ title, icon, onClick, badge }: any) {
    return (
      <button onClick={onClick} className="w-full flex items-center justify-between p-8 bg-white border border-[#E0E0E0] rounded-[32px] hover:border-black hover:shadow-xl transition-all group text-left">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-black text-white rounded-2xl">{icon}</div>
          <span className="text-2xl font-black tracking-tighter">{title}</span>
        </div>
        {badge && <span className="text-[9px] font-black px-3 py-1.5 bg-gray-100 rounded-full uppercase">{badge}</span>}
      </button>
    );
}

function FileItem({ doc, isLast }: any) {
    return (
      <div className={cn("flex items-center justify-between p-6", !isLast && "border-b border-[#F0F0F0]")}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20} /></div>
          <div>
            <p className="font-bold text-black text-sm">{doc.title}</p>
            <p className="text-[10px] font-bold text-[#757575] uppercase">{doc.level} • {doc.subject}</p>
          </div>
        </div>
        <a href={doc.file_url} target="_blank" className="p-3 bg-black text-white rounded-2xl hover:scale-110 transition-all"><Download size={14} /></a>
      </div>
    );
}

function TopicItem({ topic }: any) {
    return (
        <Link href={`/forum/${topic.id}`} className="block p-6 bg-white border border-[#E0E0E0] rounded-[32px] hover:border-black transition-all">
            <div className="flex items-center gap-4 mb-3">
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                    {topic.author?.full_name?.charAt(0)}
                </div>
                <div>
                    <p className="text-[10px] font-black">{topic.author?.full_name}</p>
                    <span className={cn("text-[7px] font-black uppercase px-1 py-0.5 rounded", getRank(topic.author?.genie_points || 0).color)}>{getRank(topic.author?.genie_points || 0).label}</span>
                </div>
            </div>
            <h3 className="font-bold text-lg leading-tight mb-2">{topic.title}</h3>
            <div className="flex items-center gap-4 text-[9px] font-black text-[#757575] uppercase tracking-widest">
                <span className="bg-gray-100 px-2 py-1 rounded">{topic.subject}</span>
                <div className="flex items-center gap-1"><MessageSquare size={12}/> Forum</div>
            </div>
        </Link>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-[40px] flex flex-col items-center gap-4">
            <Heart size={48} className="text-gray-100" />
            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em]">{message}</p>
        </div>
    );
}