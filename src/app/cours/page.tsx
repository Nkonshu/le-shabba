"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, GraduationCap, BookOpen, FileText, 
  Download, ChevronRight, Search, X, Filter, 
  Heart
} from "lucide-react";
import { getDocuments } from "@/src/lib/documents";
import { useSearchParams } from "next/navigation";
import SmartReader from "@/src/components/shared/SmartReader";
import { toggleFavorite } from "@/src/lib/interactions";
import { cn } from "@/lib/utils";
import { createClient } from "@/src/utils/supabase/client";

export default function CoursPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  // États de navigation
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [favDocIds, setFavDocIds] = useState<string[]>([]);
const supabase = createClient();
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: favs } = await supabase
          .from('favorites')
          .select('document_id')
          .eq('user_id', user.id)
          .not('document_id', 'is', null);
        
        // On force le typage pour éviter l'erreur sur le .map
        const ids = (favs as any[])?.map(f => f.document_id) || [];
        setFavDocIds(ids);
      }
      
      // On récupère les documents
      const data = await getDocuments();
      const onlyCours = data.filter((d: any) => d.type === 'Cours');
      setDocuments(onlyCours);
      setLoading(false);

      // Logique d'auto-sélection
      const levelParam = searchParams.get('level');
      const subjectParam = searchParams.get('subject');
      if (levelParam) setSelectedLevel(levelParam);
      if (subjectParam) setSelectedSubject(subjectParam);
    };

    initData(); // <--- TRÈS IMPORTANT : N'oublie pas d'appeler la fonction !
  }, [searchParams, supabase]);

  const handleToggleFav = async (docId: string) => {
    const result = await toggleFavorite(docId, 'document');
    if (result === 'added') setFavDocIds(prev => [...prev, docId]);
    else setFavDocIds(prev => prev.filter(id => id !== docId));
};

  // --- LOGIQUE DE RECHERCHE ET FILTRAGE ---
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const searchContent = `${doc.title} ${doc.subject} ${doc.level} ${doc.country} ${doc.year}`.toLowerCase();
      return searchContent.includes(searchQuery.toLowerCase());
    });
  }, [documents, searchQuery]);

  // Si on recherche, on aplatit la vue (on ne montre plus le drill-down)
  const isSearching = searchQuery.length > 0;

  // Groupement pour la vue normale
  const levels = Array.from(new Set(documents.map(d => d.level)));
  const subjectsForLevel = selectedLevel 
    ? Array.from(new Set(documents.filter(d => d.level === selectedLevel).map(d => d.subject)))
    : [];
  const filesForSubject = (selectedLevel && selectedSubject)
    ? documents.filter(d => d.level === selectedLevel && d.subject === selectedSubject)
    : [];

  if (loading) return <div className="p-10 animate-pulse text-[#757575] font-bold">Initialisation de la bibliothèque...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      
      {/* 1. BARRE DE RECHERCHE UNIFIÉE */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#757575] group-focus-within:text-black transition-colors">
          <Search size={20} />
        </div>
        <input 
          type="text"
          placeholder="Rechercher un cours, une année, un pays..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-12 py-4 bg-gray-100 border-none rounded-2xl text-base font-medium focus:ring-2 focus:ring-black transition-all outline-none"
        />
        {isSearching && (
          <button 
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 2. NAVIGATION / FIL D'ARIANE (Caché si recherche active) */}
      {!isSearching && (
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#757575] mb-4">
          <button 
            onClick={() => { setSelectedLevel(null); setSelectedSubject(null); }}
            className={selectedLevel ? "hover:text-black" : "text-black border-b-2 border-black"}
          >
            Bibliothèque
          </button>
          {selectedLevel && (
            <>
              <ChevronRight size={12} />
              <button 
                onClick={() => setSelectedSubject(null)}
                className={selectedSubject ? "hover:text-black" : "text-black border-b-2 border-black"}
              >
                {selectedLevel}
              </button>
            </>
          )}
        </nav>
      )}

      <AnimatePresence mode="wait">
        {/* VUE RECHERCHE ACTIVE */}
        {isSearching ? (
          <motion.div 
            key="search-results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-xs font-bold text-[#757575] px-2">{filteredDocs.length} résultats pour "{searchQuery}"</p>
            <div className="bg-white border border-[#E0E0E0] rounded-3xl overflow-hidden shadow-sm">
              {filteredDocs.map((doc, index) => (
                <FileItem 
                  key={doc.id} 
                  doc={doc} 
                  isLast={index === filteredDocs.length - 1} 
                  // AJOUTE CES 3 LIGNES CI-DESSOUS
                  onRead={() => setSelectedDoc(doc)} 
                  isFavorited={favDocIds.includes(doc.id)}
                  onToggleFav={() => handleToggleFav(doc.id)}
                />
              ))}
              {filteredDocs.length === 0 && (
                <div className="p-10 text-center text-[#757575] text-sm italic">Aucun document ne correspond à votre recherche.</div>
              )}
            </div>
          </motion.div>
        ) : (
          /* VUE DRILL-DOWN NORMALE (On garde ton code précédent ici) */
          <>
            {!selectedLevel && (
              <motion.div key="levels" className="grid grid-cols-1 sm:grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {levels.map(level => (
                   <SelectionCard key={level} title={level} icon={<GraduationCap size={24}/>} onClick={() => setSelectedLevel(level)} />
                ))}
              </motion.div>
            )}

            {selectedLevel && !selectedSubject && (
              <motion.div key="subjects" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {subjectsForLevel.map(subject => (
                  <SelectionCard 
                    key={subject} 
                    title={subject} 
                    icon={<BookOpen size={20}/>} 
                    onClick={() => setSelectedSubject(subject)}
                    badge={`${documents.filter(d => d.level === selectedLevel && d.subject === subject).length} fichiers`}
                  />
                ))}
              </motion.div>
            )}

            {selectedSubject && (
              <motion.div key="files" className="bg-white border border-[#E0E0E0] rounded-3xl overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {filesForSubject.map((doc, index) => (
                  <FileItem 
                  key={doc.id} 
                  doc={doc} 
                  isLast={index === filesForSubject.length - 1} 
                  onRead={() => setSelectedDoc(doc)}
                  />
                ))}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      <SmartReader 
        isOpen={!!selectedDoc}
        url={selectedDoc?.file_url}
        title={selectedDoc?.title}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  );
}

// --- PETITS COMPOSANTS INTERNES POUR LE PROPRE ---

function SelectionCard({ title, icon, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-6 bg-white border border-[#E0E0E0] rounded-2xl hover:border-black hover:shadow-lg transition-all group text-left"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-black text-white rounded-xl">{icon}</div>
        <span className="text-xl font-black">{title}</span>
      </div>
      {badge ? <span className="text-[10px] font-black px-3 py-1 bg-gray-100 rounded-full uppercase">{badge}</span> : <ChevronRight className="text-[#E0E0E0] group-hover:text-black" />}
    </button>
  );
}

function FileItem({ doc, isLast, onRead, isFavorited, onToggleFav }: any) {
  return (
    <div 
      onClick={onRead} 
      className={cn(
        "flex items-center justify-between p-5 hover:bg-gray-50 transition-colors cursor-pointer",
        !isLast && "border-b border-[#F0F0F0]"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20} /></div>
        <div>
          <p className="font-bold text-[#333333] text-sm">{doc.title}</p>
          <p className="text-[10px] font-bold text-[#757575] uppercase tracking-wider">{doc.level} • {doc.subject}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* BOUTON FAVORIS */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Heart size={20} className={cn("transition-all", isFavorited ? "fill-red-500 text-red-500" : "text-gray-300")} />
        </button>

        {/* BOUTON DOWNLOAD */}
        <a href={doc.file_url} download onClick={(e) => e.stopPropagation()} className="p-3 bg-black text-white rounded-full hover:scale-110 transition-transform shadow-lg">
          <Download size={14} />
        </a>
      </div>
    </div>
  );
}