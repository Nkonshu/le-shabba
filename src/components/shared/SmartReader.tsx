"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, ZoomIn, ZoomOut, Moon, Sun, 
  BookOpen, Maximize, Minimize, Type, 
  CheckCircle,
  DownloadCloud
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadForOffline } from "@/src/lib/offline";
import { toast } from "sonner";

interface SmartReaderProps {
  url: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

type Theme = 'light' | 'dark' | 'sepia';

export default function SmartReader({ url, title, isOpen, onClose }: SmartReaderProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [zoom, setZoom] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false);
const [isSaved, setIsSaved] = useState(false);
const scrollRef = useRef<HTMLDivElement>(null);

const handleOfflineSave = async () => {
  setIsDownloading(true);
  const success = await downloadForOffline(url, title);
  setIsDownloading(false);
  
  if (success) {
    setIsSaved(true);
    toast.success("Document disponible hors-ligne !");
  } else {
    toast.error("Erreur lors du téléchargement.");
  }
};
  // Bloquer le scroll du corps quand le lecteur est ouvert
 useEffect(() => {
    if (isOpen && url) {
      const savedPosition = localStorage.getItem(`bookmark_${url}`);
      if (savedPosition && scrollRef.current) {
        // On attend un court instant que l'iframe charge pour scroller
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: parseInt(savedPosition),
            behavior: 'smooth'
          });
          toast.info("Reprise là où tu t'es arrêté !");
        }, 800);
      }
    }
  }, [isOpen, url]);

    const handleScroll = () => {
    if (scrollRef.current && url) {
      const currentPos = scrollRef.current.scrollTop;
      // On ne sauvegarde que si on a vraiment défilé
      if (currentPos > 100) {
        localStorage.setItem(`bookmark_${url}`, currentPos.toString());
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[200] flex flex-col transition-colors duration-500",
      theme === 'light' && "bg-[#FFFFFF]",
      theme === 'dark' && "bg-[#121212]",
      theme === 'sepia' && "bg-[#F4ECD8]"
    )}>
      
      {/* BARRE D'OUTILS SUPÉRIEURE */}
      <header className={cn(
        "flex items-center justify-between p-4 border-b transition-colors",
        theme === 'light' && "border-gray-100",
        theme === 'dark' && "border-white/10",
        theme === 'sepia' && "border-[#E4D5B7]"
      )}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className={cn(
            "p-2 rounded-xl transition-all active:scale-90",
            theme === 'dark' ? "text-white hover:bg-white/10" : "text-black hover:bg-gray-100"
          )}>
            <X size={24} />
          </button>
          <div>
            <h2 className={cn(
              "text-xs font-black uppercase tracking-widest line-clamp-1 max-w-[150px] md:max-w-md",
              theme === 'dark' ? "text-gray-400" : "text-gray-500"
            )}>{title}</h2>
          </div>
        </div>

        {/* RÉGLAGES */}
        <div className="flex items-center gap-2 md:gap-4">

            {/* BOUTON HORS-LIGNE */}
        <button 
          onClick={handleOfflineSave}
          disabled={isDownloading || isSaved}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            isSaved ? "bg-green-500 text-white" : 
            theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-black hover:bg-gray-200"
          )}
        >
          {isDownloading ? (
              <span className="animate-pulse">Enregistrement...</span>
          ) : isSaved ? (
              <><CheckCircle size={14} /> Enregistré</>
          ) : (
              <><DownloadCloud size={14} /> Mode Hors-ligne</>
          )}
        </button>
  
          {/* Zoom (Desktop uniquement) */}
          <div className="hidden md:flex items-center bg-gray-500/10 rounded-xl overflow-hidden">
             <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-2 hover:bg-gray-500/20"><ZoomOut size={18} /></button>
             <span className="text-[10px] font-black w-10 text-center">{zoom}%</span>
             <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-2 hover:bg-gray-500/20"><ZoomIn size={18} /></button>
          </div>

          {/* Thèmes */}
          <div className="flex items-center gap-1 bg-gray-500/10 p-1 rounded-xl">
             <button onClick={() => setTheme('light')} className={cn("p-2 rounded-lg transition-all", theme === 'light' && "bg-white text-black shadow-sm")}><Sun size={16} /></button>
             <button onClick={() => setTheme('sepia')} className={cn("p-2 rounded-lg transition-all", theme === 'sepia' && "bg-[#F4ECD8] text-[#5B4636] shadow-sm")}><Type size={16} /></button>
             <button onClick={() => setTheme('dark')} className={cn("p-2 rounded-lg transition-all", theme === 'dark' && "bg-[#121212] text-white shadow-sm")}><Moon size={16} /></button>
          </div>
        </div>
      </header>

      {/* ZONE DU DOCUMENT */}
      <main 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto relative p-2 md:p-10 flex justify-center custom-scrollbar"
      >
        <div 
          key={theme}
          className={cn(
            "w-full max-w-5xl h-[2000px] shadow-2xl rounded-lg overflow-hidden transition-all transform-gpu", // On force une grande hauteur pour le conteneur
            theme === 'dark' ? "bg-black" : "bg-white"
          )}
          style={{ 
            width: `${zoom}%`, 
            maxWidth: zoom > 100 ? 'none' : '64rem',
            filter: theme === 'dark' ? 'invert(0.9) hue-rotate(180deg)' : 'unset' 
          }}
        >
          <iframe 
            src={`${url}#toolbar=0&view=FitH`} 
            className="w-full h-full border-none pointer-events-none" // pointer-events-none force le scroll sur le parent
            title={title}
          />
        </div>
      </main>

      {/* FOOTER MOBILE (Pour quitter sur petit écran) */}
      <footer className="md:hidden p-4 flex justify-center">
         <button onClick={onClose} className="bg-black text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
            Quitter la lecture
         </button>
      </footer>
    </div>
  );
}