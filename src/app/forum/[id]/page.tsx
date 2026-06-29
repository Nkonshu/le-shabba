"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, MessageSquare, Send, CheckCircle2, 
  FileText, ExternalLink, Maximize2, FileSearch, 
  Layout, ImageIcon, X, Paperclip, Plus, PenTool,
  ArrowBigDown, ArrowBigUp, Star, Clock, Eye, 
  User as UserIcon, Trash2, Edit3 
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/src/utils/supabase/client";
import TiptapEditor from "@/src/components/shared/TiptapEditor";

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getRank } from "@/src/lib/rank-utils";
import { cn } from "@/lib/utils";
import { toggleVote, toggleFavorite, markAsSolution } from "@/src/lib/interactions";
import { toast, Toaster } from "sonner";
import SmartReader from "@/src/components/shared/SmartReader"; 

export default function TopicDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [topic, setTopic] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState<'discussion' | 'document'>('discussion');
  
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [replyFilePreview, setReplyFilePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyType, setReplyType] = useState<'proposal' | 'comment'>('proposal');
  const [isFavorited, setIsFavorited] = useState(false);
  const [parentReplyId, setParentReplyId] = useState<string | null>(null);
  const [favAnswerIds, setFavAnswerIds] = useState<string[]>([]);
  const proposals = answers.filter(a => !a.parent_id);
  const getCommentsForProposal = (proposalId: string) => answers.filter(a => a.parent_id === proposalId);
  const [isReaderOpen, setIsReaderOpen] = useState(false); // AJOUTÉ
  const [activeReaderUrl, setActiveReaderUrl] = useState(""); 

  useEffect(() => {
    const initPage = async () => {
      await supabase.rpc('increment_topic_views', { topic_id: id });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Charger profil
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile);

   const { data: allFavs } = await supabase
      .from('favorites')
      .select('topic_id, answer_id')
      .eq('user_id', user.id);
    
    // On check le favoris du sujet actuel
    const topicFav = allFavs?.find(f => f.topic_id === id);
    setIsFavorited(!!topicFav);

    // On stocke les IDs des réponses mises en favoris
    const ansFavs = allFavs?.filter(f => f.answer_id).map(f => f.answer_id) as string[];
    setFavAnswerIds(ansFavs || []);
  }
  fetchTopicData();
    };
    initPage();
  }, [id]);

  const fetchTopicData = async () => {
    const { data: topicData } = await supabase.from('forum_topics').select(`*, author:author_id (*)`).eq('id', id).single();
    const { data: answersData } = await supabase.from('forum_answers').select(`*, author:author_id (*)`).eq('topic_id', id).order('created_at', { ascending: true });
    setTopic(topicData);
    setAnswers(answersData || []);
    setLoading(false);
  };

  // FIX : Action de modification du sujet
  const handleEditTopic = () => {
    setReplyType('proposal'); 
    setEditingId('TOPIC_EDIT');
    setReplyContent(topic.content);
    setIsReplyOpen(true);
  };


const handleToggleSolution = async (answerId: string) => {
  // Sécurité UI : seul l'auteur du sujet peut cliquer
  if (topic.author_id !== userProfile?.id) {
    toast.error("Seul l'auteur du sujet peut valider une solution.");
    return;
  }

  const success = await markAsSolution(answerId);
  
  if (success) {
    toast.success("Génial ! Sujet résolu.");
    // CETTE LIGNE EST CAPITALE : elle recharge tout (badge, points, état)
    await fetchTopicData(); 
  }
};

  const canManage = (authorId: string) => {
    if (!userProfile) return false;
    return userProfile.id === authorId || userProfile.role === 'admin' || userProfile.role === 'super_admin';
  };

 const handleDeleteAnswer = async (answer_id: string) => {
  if (!confirm("Supprimer définitivement ?")) return;
  
  const { error } = await supabase
    .from('forum_answers')
    .delete()
    .eq('id', answer_id);

  if (error) {
    console.error("Erreur suppression:", error);
    toast.error(`Erreur : ${error.message}`); // On affiche l'erreur réelle
  } else {
    toast.success("Supprimé avec succès");
    fetchTopicData();
  }
};

  const handleDeleteTopic = async () => {
    if (!confirm("Supprimer définitivement ce sujet ?")) return;
    const { error } = await supabase.from('forum_topics').delete().eq('id', id);
    if (!error) {
      toast.success("Sujet supprimé");
      router.push('/forum');
    }
  };

  const handleVoteAction = async (targetId: string, type: 'topic' | 'answer', val: number) => {
    const success = await toggleVote(targetId, type, val);
    if (success) fetchTopicData();
  };

  const handleFavoriteAction = async (targetId: string, type: 'topic' | 'answer') => {
  const result = await toggleFavorite(targetId, type);
  
  if (type === 'topic') {
    setIsFavorited(result === 'added');
  } else {
    // Mise à jour de la liste locale des favoris de réponses
    if (result === 'added') {
      setFavAnswerIds(prev => [...prev, targetId]);
    } else {
      setFavAnswerIds(prev => prev.filter(favId => favId !== targetId));
    }
  }
  
  toast.success(result === 'added' ? "Ajouté aux favoris !" : "Retiré des favoris");
};

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReplyFile(file);
      if (file.type.startsWith('image/')) setReplyFilePreview(URL.createObjectURL(file));
      else setReplyFilePreview('pdf');
    }
  };

 const handleSendAnswer = async () => {
  if (!replyContent.trim() && !replyFile) return;
  setIsSending(true);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Connecte-toi !");

    let attachmentUrl = null;

    // 1. GESTION DE L'UPLOAD (S'il y a un fichier)
    if (replyFile) {
      const fileExt = replyFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `answers/${user.id}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from('forum-attachments')
        .upload(filePath, replyFile);

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from('forum-attachments')
        .getPublicUrl(filePath);
        
      attachmentUrl = publicUrl;
    }

    // 2. LOGIQUE DE MODIFICATION OU D'AJOUT
    if (editingId && editingId !== 'TOPIC_EDIT') {
      // Modification
      const { error } = await supabase
        .from('forum_answers')
        .update({ 
          content: replyContent, 
          attachment_url: attachmentUrl || undefined // On ne remplace que si un nouveau fichier est mis
        })
        .eq('id', editingId);
      if (error) throw error;
      toast.success("Réponse mise à jour !");
    } else if (editingId === 'TOPIC_EDIT') {
      // Modification du sujet
      const { error } = await supabase
        .from('forum_topics')
        .update({ content: replyContent })
        .eq('id', id);
      if (error) throw error;
      toast.success("Sujet mis à jour !");
    } else {
      // Nouvel ajout (Proposition ou Commentaire)
      const payload: any = {
        topic_id: id,
        content: replyContent,
        author_id: user.id,
        type: replyType,
        attachment_url: attachmentUrl
      };
      if (replyType === 'comment' && editingId === null) {
        // Cas d'un commentaire sur proposition : editingId est null car on utilise le bouton "Commenter"
        // Note : assure-toi que ton bouton "Commenter" définit bien un parent_id
      }


// FIX : Si c'est un commentaire, on lie au parent via parentReplyId
if (replyType === 'comment' && parentReplyId) {
  payload.parent_id = parentReplyId;
}
      // Simplifions : si on n'est pas en mode édition, on insert
      const { error } = await supabase.from('forum_answers').insert([payload]);
      if (error) throw error;
      toast.success("Publié au Shabba !");
    }

    // Reset total
    setReplyContent("");
    setReplyFile(null);
    setReplyFilePreview(null);
    setEditingId(null);
    setIsReplyOpen(false);
    fetchTopicData();
    
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    setIsSending(false);
  }
};

  if (loading) return <div className="flex items-center justify-center h-screen font-black text-[10px] uppercase animate-pulse">Chargement Le Shabba...</div>;
  if (!topic) return <div className="p-20 text-center font-bold">Sujet introuvable.</div>;

  const author = topic.author || { full_name: "Élève Shabba", genie_points: 0 };
  const hasAttachment = !!topic.attachment_url;

  return (
    <div className="relative flex flex-col lg:flex-row h-[calc(100vh-64px)] -m-4 md:-m-6 overflow-hidden bg-white">
      <Toaster position="top-center" richColors />
      
          <div className={cn(
            "flex-1 overflow-y-auto p-5 md:p-10 custom-scrollbar pb-32 transition-all duration-500",
            // Si on a un document, on reste sur le côté. Sinon, on centre le contenu proprement.
            hasAttachment ? (mobileView === 'document' ? 'hidden lg:block' : 'block') : "max-w-4xl mx-auto w-full border-r-0"
          )}>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#757575] font-black text-[10px] mb-8 hover:text-black transition-colors uppercase tracking-widest">
          <ChevronLeft size={14} /> Retour
        </button>

        <section className="mb-10">
<div className="flex items-center justify-between mb-6 gap-2">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold shrink-0">{author.full_name?.charAt(0)}</div>
      <div className="min-w-0">
        <p className="text-sm font-black truncate">{author.full_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 rounded", getRank(author.genie_points || 0).color)}>{getRank(author.genie_points || 0).label}</span>
          <span className="text-[9px] font-bold text-[#757575]">{author.genie_points || 0} pts</span>
        </div>
      </div>
    </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleFavoriteAction(topic.id, 'topic')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Star size={22} className={cn("transition-all", isFavorited ? "text-yellow-500 fill-yellow-500" : "text-[#E0E0E0]")} />
              </button>
              {canManage(topic.author_id) && (
                <>
                  <button onClick={handleEditTopic} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><Edit3 size={18}/></button>
                  <button onClick={handleDeleteTopic} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                </>
              )}
            </div>
          </div>

<div className="space-y-4">
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-black bg-gray-100 px-2 py-1 rounded text-[#757575] uppercase">{topic.level}</span>
      <span className="text-[8px] font-black bg-blue-50 px-2 py-1 rounded text-blue-600 uppercase">{topic.subject}</span>
    </div>
    
    {/* Titre responsive : text-2xl sur mobile, text-5xl sur PC */}
    <h1 className="text-2xl md:text-5xl font-black text-black leading-tight tracking-tighter">
        {topic.title}
    </h1>

    <div className="flex flex-wrap items-center gap-4 text-[#757575] border-y border-[#F0F0F0] py-4">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"><Clock size={12} /> {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: fr })}</div>
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"><Eye size={12} /> {topic.views_count} Vues</div>
    </div>
</div>
        </section>

        <div className="h-[1px] bg-[#F0F0F0] w-full mb-10" />

        <section className="space-y-12 pb-40">
          <div className="flex justify-center py-6 border-b border-gray-100">
            <button onClick={() => { setReplyType('proposal'); setEditingId(null); setReplyContent(""); setIsReplyOpen(true); }} className="flex items-center gap-2 px-8 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"><Plus size={18} /> Proposer une solution</button>
          </div>

          {proposals.map((prop) => (
<div key={prop.id} className="space-y-4">
  <div className="flex gap-3 sm:gap-6"> {/* Écart réduit sur mobile */}
    {/* COLONNE DE VOTE - Plus compacte */}
    <div className="flex flex-col items-center gap-1 sm:gap-2 shrink-0 pt-2">
      <button onClick={() => handleVoteAction(prop.id, 'answer', 1)} className="p-1 hover:text-blue-600 transition-colors">
        <ArrowBigUp className="w-7 h-7 sm:w-8 sm:h-8" />
      </button>
      <span className="text-xs sm:text-sm font-black">{prop.votes_count || 0}</span>
      <button onClick={() => handleVoteAction(prop.id, 'answer', -1)} className="p-1 hover:text-red-600 transition-colors">
        <ArrowBigDown className="w-7 h-7 sm:w-8 sm:h-8" />
      </button>
      
      {/* BOUTON CHECK RÉDUIT */}
      {(userProfile?.id === topic.author_id || prop.is_solution) && (
        <button 
          onClick={() => handleToggleSolution(prop.id)}
          disabled={prop.is_solution}
          className={cn(
            "mt-1 p-1.5 rounded-full transition-all",
            prop.is_solution ? "bg-green-500 text-white" : "text-gray-200 hover:text-green-500"
          )}
        >
          <CheckCircle2 size={18} />
        </button>
      )}
    </div>

                <div className="flex-1 p-4 sm:p-6 bg-gray-50 rounded-[24px] sm:rounded-[32px] border border-transparent hover:border-[#E0E0E0] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">Proposition</span>
                      <button 
                        onClick={() => handleFavoriteAction(prop.id, 'answer')} 
                        className="p-1 transition-all"
                      >
                        <Star 
                          size={18} 
                          className={cn(
                            "transition-all", 
                            favAnswerIds.includes(prop.id) 
                              ? "text-yellow-500 fill-yellow-500" 
                              : "text-[#E0E0E0] hover:text-yellow-500"
                          )} 
                        />
                      </button>                  
                      </div>
                  <div className="prose prose-sm max-w-none mb-6" dangerouslySetInnerHTML={{ __html: prop.content }} />
                  {prop.attachment_url && (
                  <div className="mb-6">
                      {prop.attachment_url.toLowerCase().endsWith('.pdf') 
                      ? <button 
                          onClick={() => { setActiveReaderUrl(prop.attachment_url); setIsReaderOpen(true); }}
                          className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-white p-3 rounded-xl border w-fit uppercase hover:scale-105 transition-transform"
                        >
                          <FileText size={16}/> Lire le justificatif PDF
                        </button>
                      : <img 
                          src={prop.attachment_url} 
                          onClick={() => { setActiveReaderUrl(prop.attachment_url); setIsReaderOpen(true); }}
                          className="max-w-xs rounded-2xl border shadow-sm cursor-zoom-in" 
                        />
                      }
                  </div>
                )}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold">{prop.author?.full_name || "Élève"}</span>
                      <span className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 rounded", getRank(prop.author?.genie_points || 0).color)}>{getRank(prop.author?.genie_points || 0).label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => { setReplyType('comment'); setParentReplyId(prop.id); setEditingId(null); setReplyContent(""); setIsReplyOpen(true); }} className="text-[9px] font-black text-[#757575] hover:text-black uppercase">Commenter</button>
                      {canManage(prop.author_id) && (
                        <div className="flex gap-2">
                           <button onClick={() => { setReplyType('proposal'); setEditingId(prop.id); setReplyContent(prop.content); setIsReplyOpen(true); }} className="text-blue-500 p-1"><Edit3 size={14}/></button>
                           <button onClick={() => handleDeleteAnswer(prop.id)} className="text-red-500 p-1"><Trash2 size={14}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ml-6 sm:ml-20 space-y-3">
                {getCommentsForProposal(prop.id).map((com) => (
                  <div key={com.id} className="p-4 bg-white border border-gray-100 rounded-[24px] shadow-sm group relative">
                    <div className="text-sm text-[#333333] mb-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: com.content }} />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-[#757575] uppercase">{com.author?.full_name}</span>
                        <span className={cn("text-[6px] font-black uppercase px-1 py-0.5 rounded", getRank(com.author?.genie_points || 0).color)}>
                            {getRank(com.author?.genie_points || 0).label}</span>
                            <span className="text-[8px] font-bold text-[#757575]">{com.author?.genie_points || 0} pts</span>
                        <span className="text-[8px] font-bold text-gray-300 uppercase">Commentaire</span>
                      </div>
                       {canManage(com.author_id) && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setReplyType('comment'); setEditingId(com.id); setReplyContent(com.content); setIsReplyOpen(true); }} className="text-blue-400"><Edit3 size={12}/></button>
                          <button onClick={() => handleDeleteAnswer(com.id)} className="text-red-400"><Trash2 size={12}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {hasAttachment && (
      <div className={`w-full lg:w-[45%] bg-[#F5F5F5] flex flex-col p-4 md:p-6 ${mobileView === 'discussion' ? 'hidden lg:flex' : 'flex h-[calc(100vh-140px)]'}`}>
        <div className="flex-1 bg-white rounded-[32px] overflow-hidden border border-[#E0E0E0] shadow-2xl relative">
          {topic.attachment_url ? (
            <iframe src={`${topic.attachment_url}#toolbar=0&view=FitH`} className="w-full h-full border-none" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20"><FileSearch size={64} /><p className="text-[10px] font-black uppercase mt-4">Pas de document</p></div>
          )}
        </div>
      </div>
      )}
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-fit">
  <Dialog open={isReplyOpen} onOpenChange={(isOpen) => { 
    setIsReplyOpen(isOpen);
    if (!isOpen) { setEditingId(null); setParentReplyId(null); setReplyContent(""); }
  }}>
    <DialogTrigger asChild>
      <button className="flex items-center gap-3 px-10 py-5 bg-black text-white rounded-[24px] shadow-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
        <PenTool size={20} />
        <span>{editingId ? 'Modifier' : 'Aider'}</span>
      </button>
    </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] bg-white rounded-[40px] p-10 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter">
                {editingId ? 'Mettre à jour' : (replyType === 'proposal' ? "Ta proposition" : "Ton commentaire")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <TiptapEditor onChange={setReplyContent} initialContent={replyContent} />
              <div className="space-y-4 pt-4">
  <div className="flex items-center gap-4">
    {/* BOUTON TROMBONE */}
    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors text-[10px] font-black uppercase tracking-widest text-[#757575] hover:text-black">
      <Paperclip size={16} />
      <span>Joindre une preuve</span>
      <input 
        type="file" 
        className="hidden" 
        onChange={handleFileChange} 
        accept="image/*,application/pdf" 
      />
    </label>

    {/* FEEDBACK VISUEL DU FICHIER CHOISI */}
    {replyFile && (
      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
        <span className="text-[10px] font-bold text-blue-600 truncate max-w-[150px]">
          {replyFile.name}
        </span>
        <button 
          onClick={() => { setReplyFile(null); setReplyFilePreview(null); }}
          className="text-blue-400 hover:text-blue-600"
        >
          <X size={14} />
        </button>
      </div>
    )}
  </div>

  {/* PRÉVISUALISATION SI IMAGE */}
  {replyFilePreview && replyFilePreview !== 'pdf' && (
    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg">
      <img src={replyFilePreview} alt="Preview" className="w-full h-full object-cover" />
    </div>
  )}
</div>
              {!editingId && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer text-[10px] font-black uppercase">
                    <Paperclip size={16} /> <span>Fichier</span>
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                  </label>
                  {replyFile && <span className="text-[10px] font-bold text-blue-600 truncate max-w-[150px]">{replyFile.name}</span>}
                </div>
              )}
              <button onClick={handleSendAnswer} disabled={isSending} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95 transition-all">
                {isSending ? "Envoi..." : (editingId ? "Sauvegarder" : "Publier au Shabba")}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <SmartReader 
        isOpen={isReaderOpen}
        url={activeReaderUrl}
        title={topic.title}
        onClose={() => setIsReaderOpen(false)}
      />
    </div>
  );
}