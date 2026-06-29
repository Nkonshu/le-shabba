"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  FileText, Plus, Search, Trash2, Edit3, 
  Download, FileUp, X, Loader2 
} from "lucide-react";
import { 
  getDocuments, createDocument, 
  updateDocument, deleteDocument 
} from "@/src/lib/documents";
import { createClient } from "@/src/utils/supabase/client";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { COUNTRIES, DOC_TYPES, EXAM_TYPES, LEVELS, SUBJECTS } from "@/src/constants/academic";
import { AnimatePresence, motion } from "framer-motion";

export default function DocsManager() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

  // État du formulaire
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "Cours",
    level: "Terminale D",
    subject: "Mathématiques",
    year: new Date().getFullYear().toString(),
    country: "Bénin",
  establishment: "", // NOUVEAU
  exam_type: "Examen Officiel" // NOUVEAU
  });
  const [file, setFile] = useState<File | null>(null);

  const supabase = createClient();

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    const data = await getDocuments();
    setDocs(data);
    setLoading(false);
  }

  const filteredDocs = useMemo(() => {
    return docs.filter(d => 
      `${d.title} ${d.subject} ${d.level}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [docs, searchQuery]);

  // --- LOGIQUE DE SAUVEGARDE (ADD / EDIT) ---
  const handleSubmit = async () => {
    if (!formData.title) return toast.error("Le titre est obligatoire");
    setIsSaving(true);

    try {
      let fileUrl = null;

      // 1. Gérer l'upload du fichier si présent
    if (file) {
      // On nettoie le nom du fichier pour éviter les caractères spéciaux
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
      
      // On enlève le dossier "library/" pour tester si c'est lui qui bloque
      const filePath = fileName; 

      const { data: upData, error: uploadError } = await supabase.storage
        .from('documents') // VÉRIFIE QUE CE NOM EST IDENTIQUE DANS TON DASHBOARD
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Erreur détaillée Supabase Storage:", uploadError);
        throw new Error(`Erreur d'upload : ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      fileUrl = publicUrl;
    }

      const payload = { ...formData, file_url: fileUrl || undefined };

      if (editId) {
        await updateDocument(editId, payload);
        toast.success("Document mis à jour");
      } else {
        if (!file) throw new Error("Un fichier est requis pour un nouveau document");
        await createDocument(payload);
        toast.success("Nouveau document indexé !");
      }

      setIsModalOpen(false);
      resetForm();
      loadDocs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

 const resetForm = () => {
  setFormData({
    title: "", 
    type: "Cours", 
    level: "Terminale D",
    subject: "Mathématiques", 
    year: "2024", 
    country: "Bénin",
    establishment: "",      // AJOUTÉ
    exam_type: "Examen Officiel", // AJOUTÉ
    
  });
  setFile(null);
  setEditId(null);
  setStep(1);
};

const handleDelete = async (doc: any) => { // Reçoit l'objet doc entier
  if (!confirm(`Supprimer définitivement "${doc.title}" ?`)) return;
  try {
    // On passe l'ID et l'URL pour nettoyer le storage
    await deleteDocument(doc.id, doc.file_url); 
    toast.success("Document et fichier supprimés");
    loadDocs();
  } catch (e) { 
    toast.error("Erreur lors de la suppression"); 
  }
};

  return (
    <div className="space-y-6">
      {/* BARRE D'ACTIONS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un document..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black outline-none font-bold"
          />
        </div>

        <Dialog open={isModalOpen} onOpenChange={(val) => { setIsModalOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg w-full md:w-auto">
              <Plus size={18} /> Ajouter un fichier
            </button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-white rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 border-none shadow-2xl custom-scrollbar">
  <DialogHeader>
    <div className="flex justify-between items-center pr-6">
        <DialogTitle className="text-2xl font-black tracking-tighter uppercase">
            {editId ? "Modifier" : "Nouvel Index"}
        </DialogTitle>
        <span className="text-[10px] font-black bg-gray-100 px-3 py-1 rounded-full text-gray-400">ÉTAPE {step}/3</span>
    </div>
  </DialogHeader>

  <div className="space-y-6 pt-6">
    <AnimatePresence mode="wait">
      {/* --- ÉTAPE 1 : L'IDENTITÉ DU DOCUMENT --- */}
      {step === 1 && (
        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Titre de l'ouvrage</label>
            <input placeholder="Ex: Cours sur l'énergie cinétique" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-black" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nature du contenu</label>
            <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </motion.div>
      )}

      {/* --- ÉTAPE 2 : LE CONTEXTE ACADÉMIQUE --- */}
      {step === 2 && (
        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Classe</label>
                <input list="level-list" placeholder="Terminale D..." className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} />
                <datalist id="level-list">{LEVELS.map(l => <option key={l} value={l} />)}</datalist>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Matière</label>
                <input list="subject-list" placeholder="Physique..." className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                <datalist id="subject-list">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
             </div>
          </div>
          {/* Champ conditionnel : n'apparaît que pour les épreuves */}
          {formData.type === 'Épreuve' && (
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Établissement d'origine</label>
                <input placeholder="Ex: Lycée Coulibaly" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm" value={formData.establishment} onChange={e => setFormData({...formData, establishment: e.target.value})} />
            </div>
          )}
        </motion.div>
      )}

      {/* --- ÉTAPE 3 : FICHIER ET FINALISATION --- */}
      {step === 3 && (
        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
           <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Session / Année</label>
                <input placeholder="2024" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Pays</label>
                <input list="country-list" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                <datalist id="country-list">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
             </div>
           </div>

          <div className="p-8 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center gap-3 relative bg-gray-50 hover:bg-gray-100 transition-colors">
             <FileUp className="text-gray-300" size={32} />
             <p className="text-[10px] font-black uppercase text-gray-400">PDF ou Image</p>
             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
             {file && <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{file.name}</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* --- NAVIGATION DU FORMULAIRE --- */}
    <div className="flex gap-3 pt-4">
      {step > 1 && (
        <button onClick={() => setStep(step - 1)} className="px-6 py-4 bg-gray-100 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Retour</button>
      )}
      
      {step < 3 ? (
        <button 
            onClick={() => setStep(step + 1)} 
            disabled={step === 1 && !formData.title}
            className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
        >
            Suivant
        </button>
      ) : (
        <button 
            onClick={handleSubmit} 
            disabled={isSaving || (!editId && !file)}
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
            {isSaving ? <Loader2 className="animate-spin mx-auto" size={18} /> : (editId ? "Mettre à jour" : "Indexer maintenant")}
        </button>
      )}
    </div>
  </div>
</DialogContent>
        </Dialog>
      </div>

      {/* TABLEAU DES DOCUMENTS */}
      <div className="overflow-hidden border border-gray-100 rounded-[32px]">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Document</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Classe / Matière</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg text-black group-hover:bg-black group-hover:text-white transition-colors">
                        <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{doc.title}</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{doc.type}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold">{doc.level}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase">{doc.subject}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
<button onClick={() => { 
    setFormData({ 
      title: doc.title, 
      type: doc.type, 
      level: doc.level, 
      subject: doc.subject, 
      year: doc.year, 
      country: doc.country,
      establishment: doc.establishment || "", // AJOUTÉ
      exam_type: doc.exam_type || "Examen Officiel" // AJOUTÉ
    });
    setEditId(doc.id);
    setIsModalOpen(true);
}} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
  <Edit3 size={16} />
</button>
                    <button onClick={() => handleDelete(doc)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    <a href={doc.file_url} target="_blank" className="p-2 text-gray-400 hover:text-black transition-colors"><Download size={16} /></a>
                  <Trash2 size={16} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDocs.length === 0 && !loading && (
          <div className="p-20 text-center text-gray-400 font-bold uppercase text-xs">Aucun document trouvé.</div>
        )}
      </div>
    </div>
  );
}