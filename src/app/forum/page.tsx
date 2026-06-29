"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, Eye, Plus, CheckCircle2, 
  Send, Search, X, Clock 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";
import { createClient } from "@/src/utils/supabase/client";
import { getTopics } from "@/src/lib/forum";
import TiptapEditor from "@/src/components/shared/TiptapEditor";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getRank } from "@/src/lib/rank-utils";
import { cn } from "@/lib/utils";
import { LEVELS, SUBJECTS } from "@/src/constants/academic";

export default function ForumPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
   const [step, setStep] = useState(1);

  // Formulaire
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [level, setLevel] = useState("Terminale D");
  const [subject, setSubject] = useState("Mathématiques");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { refreshTopics(); }, []);

  // src/app/forum/page.tsx

useEffect(() => {
  refreshTopics();
  
  // Petite astuce : on rafraîchit quand la fenêtre redevient active
  window.addEventListener('focus', refreshTopics);
  return () => window.removeEventListener('focus', refreshTopics);
}, []);

  const refreshTopics = async () => {
    const data = await getTopics();
    setTopics(data);
    setLoading(false);
  };

  // LOGIQUE DE RECHERCHE
// src/app/forum/page.tsx

const filteredTopics = useMemo(() => {
  const query = searchQuery.toLowerCase();
  
  return topics.filter(t => {
    // 1. Recherche dans les infos du sujet (avec sécurité || "")
    const topicContent = `${t.title || ""} ${t.subject || ""} ${t.level || ""} ${t.author?.full_name || ""}`.toLowerCase();
    
    // 2. Recherche dans le texte des réponses (on ajoute (t.all_answers_text || "") pour éviter le crash)
    const answersContent = (t.all_answers_text || "").toLowerCase();

    // On retourne vrai si le mot est dans le sujet OU dans l'une des réponses
    return topicContent.includes(query) || answersContent.includes(query);
  });
}, [topics, searchQuery]);

  const handleCreateTopic = async () => {
    if (!title || !content) return;
    setIsPublishing(true);
    try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let attachmentUrl = null;
    if (file) {
        const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage.from('forum-attachments').upload(filePath, file);
        if (upErr) throw upErr;
        attachmentUrl = supabase.storage.from('forum-attachments').getPublicUrl(filePath).data.publicUrl;
    }

    const { error } = await supabase.from('forum_topics').insert([{ 
        title, content, level, subject, author_id: user.id, attachment_url: attachmentUrl 
    }]);
    if (error) throw error;
    setOpen(false); setTitle(""); setContent(""); setFile(null);
    refreshTopics();
} catch (e) { console.error(e); } finally { setIsPublishing(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      
      {/* HEADER & COMPTEUR */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter">Forum</h1>
          <p className="text-[#757575] text-sm font-medium">
            {topics.length} questions posées par la communauté.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
              <Plus size={18} strokeWidth={3} />
              <span>Poser une question</span>
            </button>
          </DialogTrigger>
<DialogContent className="w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-white rounded-[32px] p-6 md:p-10 border-none shadow-2xl custom-scrollbar">
  <DialogHeader>
    <div className="flex justify-between items-center pr-6">
      <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Poser une question</DialogTitle>
      <span className="text-[10px] font-black bg-gray-100 px-3 py-1 rounded-full text-gray-400">ÉTAPE {step}/3</span>
    </div>
  </DialogHeader>

  <div className="space-y-6 pt-6">
    <AnimatePresence mode="wait">
      {/* --- ÉTAPE 1 : CONTEXTE --- */}
      {step === 1 && (
        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ta Classe</label>
                <input list="level-list" placeholder="Terminale..." className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black" value={level} onChange={e => setLevel(e.target.value)} />
                <datalist id="level-list">{LEVELS.map(l => <option key={l} value={l} />)}</datalist>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">La Matière</label>
                <input list="subject-list" placeholder="Maths..." className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black" value={subject} onChange={e => setSubject(e.target.value)} />
                <datalist id="subject-list">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
             </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Titre de ta question</label>
            <input placeholder="Ex: Problème de dérivée..." className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-black" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </motion.div>
      )}

      {/* --- ÉTAPE 2 : DESCRIPTION --- */}
      {step === 2 && (
        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Détaille ton blocage</label>
          <TiptapEditor onChange={setContent} initialContent={content} />
        </motion.div>
      )}

      {/* --- ÉTAPE 3 : PIÈCE JOINTE --- */}
      {step === 3 && (
        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
          <div className="p-6 sm:p-10 border-4 border-dashed rounded-[32px] sm:rounded-[40px] flex flex-col items-center justify-center gap-3 relative bg-blue-50/30 hover:bg-blue-50 transition-colors group text-center">
            <ImageIcon className={cn("text-blue-200 transition-transform group-hover:scale-110", file && "text-blue-600")} size={48} />
            <div>
                <p className="text-[10px] sm:text-xs font-black uppercase text-blue-900/40">Une photo de ton cahier ?</p>
                <p className="text-[8px] font-bold text-blue-900/20 uppercase tracking-widest">PDF ou Image (Max 10MB)</p>
            </div>
            <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file && (
                <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 shadow-lg">
                    <CheckCircle2 size={12} /> {file.name}
                </div>
            )}
          </div>
          <p className="text-[8px] sm:text-[9px] text-center text-gray-400 uppercase font-bold px-4">Indispensable pour recevoir une aide précise !</p>
        </motion.div>
      )}
    </AnimatePresence>

    {/* NAVIGATION DU FORMULAIRE */}
    <div className="flex gap-3 pt-4">
      {step > 1 && (
        <button onClick={() => setStep(step - 1)} className="px-8 py-4 bg-gray-100 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Retour</button>
      )}
      
      {step < 3 ? (
        <button 
            onClick={() => setStep(step + 1)} 
            disabled={step === 1 && (!title || !level || !subject)}
            className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
        >
            Suivant
        </button>
      ) : (
        <button 
            onClick={handleCreateTopic} 
            disabled={isPublishing}
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
            {isPublishing ? "Publication..." : "Publier au Shabba"}
        </button>
      )}
    </div>
  </div>
</DialogContent>
        </Dialog>
      </header>

      {/* BARRE DE RECHERCHE */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#757575] group-focus-within:text-black transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Rechercher une question, un auteur, une matière..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-12 py-5 bg-gray-100 border-none rounded-[24px] text-base font-bold focus:ring-2 focus:ring-black transition-all outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-5 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* LISTE DES SUJETS */}
      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-40 w-full bg-gray-50 animate-pulse rounded-[32px]" />)
        ) : (
          <AnimatePresence>
            {filteredTopics.map((topic) => (
              <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
{/* Dans ton map sur les topics */}
<Link href={`/forum/${topic.id}`} className="block group">
  <motion.div className="p-5 md:p-8 bg-white border border-[#E0E0E0] rounded-[32px] md:rounded-[40px] hover:border-black transition-all">
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
      {/* HEADER MOBILE (Avatar + Chiffre) */}
      <div className="flex items-center gap-4 sm:flex-col sm:gap-1 shrink-0">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-full flex items-center justify-center font-black text-base">
          {topic.author?.full_name?.charAt(0) || "S"}
        </div>
        {/* On peut cacher les votes sur mobile ou les mettre à côté de l'avatar */}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-black text-base md:text-xl text-black leading-tight mb-2 line-clamp-2">
          {topic.title}
        </h3>
        
        {/* INFOS AUTEUR ET DATE */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
           <span className="text-[10px] font-black">{topic.author?.full_name}</span>
           <span className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 rounded", getRank(topic.author?.genie_points || 0).color)}>
              {getRank(topic.author?.genie_points || 0).label}
           </span>
           <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(topic.created_at), { addSuffix: false, locale: fr }).replace('environ', '')}</span>
        </div>

        {/* BADGES ET COMPTEURS BAS DE CARTE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-50 gap-3">
           <div className="flex items-center gap-2">
              <span className="text-[8px] font-black bg-gray-100 px-2 py-1 rounded text-[#757575] uppercase">{topic.level}</span>
              <span className="text-[8px] font-black bg-blue-50 px-2 py-1 rounded text-blue-600 uppercase">{topic.subject}</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[9px] font-black text-[#757575] uppercase"><MessageSquare size={12}/> {topic.answers_count}</div>
              <div className="flex items-center gap-1 text-[9px] font-black text-[#757575] uppercase"><Eye size={12}/> {topic.views_count}</div>
           </div>
        </div>
      </div>
    </div>
  </motion.div>
</Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}