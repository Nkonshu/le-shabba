"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Trash2, WifiOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import SmartReader from "@/src/components/shared/SmartReader"; // 1. Importer le Reader

export default function DownloadsPage() {
  const [offlineDocs, setOfflineDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null); // 2. État pour la lecture

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('offline_docs') || '[]');
    setOfflineDocs(saved);
  }, []);

  const removeOffline = (url: string) => {
    if (!confirm("Supprimer ce fichier du mode hors-ligne ?")) return;
    const filtered = offlineDocs.filter(d => d.url !== url);
    setOfflineDocs(filtered);
    localStorage.setItem('offline_docs', JSON.stringify(filtered));
    caches.open('shabba-documents').then(cache => cache.delete(url));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="p-4 bg-black text-white rounded-3xl"><WifiOff size={24} /></div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Mode Hors-Ligne</h1>
          <p className="text-[#757575] text-sm font-medium">Tes documents accessibles sans connexion.</p>
        </div>
      </header>

      <div className="bg-white border border-[#E0E0E0] rounded-[40px] overflow-hidden shadow-sm">
        {offlineDocs.length > 0 ? offlineDocs.map((doc, index) => (
          <div key={doc.url} className={cn(
            "flex items-center justify-between p-6 hover:bg-gray-50 transition-all",
            index !== offlineDocs.length - 1 && "border-b border-gray-100"
          )}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 text-black rounded-xl"><FileText size={20} /></div>
              <div>
                <p className="font-bold text-sm text-black">{doc.title}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-green-600">Disponible hors-ligne</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button onClick={() => removeOffline(doc.url)} className="p-3 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={18} />
               </button>
               {/* 3. RELIER LE BOUTON À setSelectedDoc */}
               <button 
                  onClick={() => setSelectedDoc(doc)} 
                  className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                >
                  <ChevronRight size={20} />
               </button>
            </div>
          </div>
        )) : (
          <div className="p-20 text-center space-y-4">
            <Download size={48} className="text-gray-100 mx-auto" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Aucun document téléchargé.</p>
          </div>
        )}
      </div>

      {/* 4. AJOUTER LE COMPOSANT READER EN BAS */}
      <SmartReader 
        isOpen={!!selectedDoc}
        url={selectedDoc?.url}
        title={selectedDoc?.title}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  );
}