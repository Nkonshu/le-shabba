"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, GraduationCap, FileCheck, FileText, 
  Download, ChevronRight, Search, X, History, Globe, 
  BookOpen
} from "lucide-react";
import { getDocuments } from "@/src/lib/documents";
import { cn } from "@/lib/utils";
import SmartReader from "@/src/components/shared/SmartReader";

// 1. Ajoute ces imports en haut
import { createClient } from "@/src/utils/supabase/client";
import { toggleFavorite } from "@/src/lib/interactions";
import { Heart } from "lucide-react";
import { toast } from "sonner";



export default function EpreuvesPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // États de navigation
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // 2. À l'intérieur du composant EpreuvesPage, avant le useEffect :
const supabase = createClient();
const [favDocIds, setFavDocIds] = useState<string[]>([]);

// 3. Remplace ton useEffect par cette version qui charge les favoris :
useEffect(() => {
  const initData = async () => {
    // Charger les favoris de l'utilisateur
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: favs } = await supabase.from('favorites').select('document_id').eq('user_id', user.id).not('document_id', 'is', null);
      setFavDocIds((favs as any[])?.map(f => f.document_id) || []);
    }

    // Charger les épreuves
    getDocuments().then((data) => {
      const onlyEpreuves = data.filter((d: any) => d.type === 'Épreuve');
      setDocuments(onlyEpreuves);
      setLoading(false);
    });
  };
  initData();
}, [supabase]);

// 4. Ajoute la fonction de clic favoris :
const handleToggleFav = async (docId: string) => {
  const result = await toggleFavorite(docId, 'document');
  if (result === 'added') {
    setFavDocIds(prev => [...prev, docId]);
    toast.success("Épreuve ajoutée aux favoris");
  } else {
    setFavDocIds(prev => prev.filter(id => id !== docId));
    toast.success("Retirée des favoris");
  }
};

  // --- LOGIQUE DE RECHERCHE ---
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const searchContent = `${doc.title} ${doc.subject} ${doc.level} ${doc.country} ${doc.year}`.toLowerCase();
      return searchContent.includes(searchQuery.toLowerCase());
    });
  }, [documents, searchQuery]);

  const isSearching = searchQuery.length > 0;

  // Groupement pour la vue normale
  const levels = Array.from(new Set(documents.map(d => d.level)));
  const subjectsForLevel = selectedLevel 
    ? Array.from(new Set(documents.filter(d => d.level === selectedLevel).map(d => d.subject)))
    : [];
  const filesForSubject = (selectedLevel && selectedSubject)
    ? documents.filter(d => d.level === selectedLevel && d.subject === selectedSubject)
    : [];

  if (loading) return <div className="p-10 animate-pulse text-[#757575] font-black uppercase text-xs">Chargement des annales...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      
      {/* 1. BARRE DE RECHERCHE */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#757575] group-focus-within:text-black transition-colors">
          <Search size={20} />
        </div>
        <input 
          type="text"
          placeholder="Rechercher un examen, une année (ex: 2023)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-12 py-5 bg-gray-100 border-none rounded-3xl text-base font-bold focus:ring-2 focus:ring-black transition-all outline-none"
        />
        {isSearching && (
          <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* 2. FIL D'ARIANE */}
      {!isSearching && (
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#757575] mb-4">
          <button 
            onClick={() => { setSelectedLevel(null); setSelectedSubject(null); }}
            className={selectedLevel ? "hover:text-black" : "text-black border-b-2 border-black"}
          >
            Épreuves
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
        {isSearching ? (
          <motion.div key="search-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-[10px] font-black text-[#757575] uppercase px-2">{filteredDocs.length} examens trouvés</p>
            <div className="bg-white border border-[#E0E0E0] rounded-[32px] overflow-hidden shadow-sm">
             {filteredDocs.map((doc, index) => (
              <FileItem 
                key={doc.id} 
                doc={doc} 
                isLast={index === filteredDocs.length - 1} 
                onRead={() => setSelectedDoc(doc)} // FIX DU CLIC
                isFavorited={favDocIds.includes(doc.id)} // AJOUT FAVORIS
                onToggleFav={() => handleToggleFav(doc.id)} // AJOUT FAVORIS
              />
            ))}
            </div>
          </motion.div>
        ) : (
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
                    icon={<FileCheck size={20}/>} 
                    onClick={() => setSelectedSubject(subject)}
                    badge={`${documents.filter(d => d.level === selectedLevel && d.subject === subject).length} épreuves`}
                  />
                ))}
              </motion.div>
            )}

            {selectedSubject && (
              <motion.div key="files" className="bg-white border border-[#E0E0E0] rounded-[40px] overflow-hidden shadow-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               {/* VUE PAR MATIÈRE */}
                {filesForSubject.map((doc, index) => (
                  <FileItem 
                    key={doc.id} 
                    doc={doc} 
                    isLast={index === filesForSubject.length - 1} 
                    onRead={() => setSelectedDoc(doc)}
                    isFavorited={favDocIds.includes(doc.id)} // AJOUT FAVORIS
                    onToggleFav={() => handleToggleFav(doc.id)} // AJOUT FAVORIS
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

// --- COMPOSANTS INTERNES ---

function SelectionCard({ title, icon, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-5 md:p-8 bg-white border border-[#E0E0E0] rounded-[24px] md:rounded-[32px] hover:border-black transition-all group text-left"
    >
      <div className="flex items-center gap-3 md:gap-5">
        <div className="p-3 md:p-4 bg-black text-white rounded-xl md:rounded-2xl shrink-0">
          {/* Version responsive de l'icône */}
          {icon && <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">{icon}</div>}
        </div>
        <span className="text-lg md:text-2xl font-black tracking-tighter truncate">{title}</span>
      </div>
      <ChevronRight className="text-[#E0E0E0] group-hover:text-black transition-colors shrink-0" size={18} />
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
          <div onClick={onRead} className={cn("flex items-center justify-between p-4 md:p-6 cursor-pointer", !isLast && "border-b border-[#F0F0F0]")}>
      <div className="flex items-center gap-3 md:gap-5 min-w-0">
        <div className="p-2 md:p-3 bg-red-50 text-red-600 rounded-lg md:rounded-xl shrink-0"><FileCheck size={20} /></div>
        <div className="min-w-0">
          <p className="font-black text-sm md:text-base text-black leading-tight mb-1 truncate">{doc.title}</p>
          <div className="flex flex-wrap items-center gap-2">
             <span className="text-[8px] md:text-[9px] font-black text-[#757575] uppercase bg-gray-50 px-1.5 py-0.5 rounded">{doc.country}</span>
             <span className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded">{doc.year}</span>
          </div>
        </div>
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

        {/* BOUTON LECTURE */}
        <button className="p-3 bg-black text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg">
          <BookOpen size={14} />
        </button>
      </div>
    </div>
  );
}