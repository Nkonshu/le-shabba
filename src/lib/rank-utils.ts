import { 
  Trophy, Sparkles, GraduationCap, Medal, 
  ShieldCheck, Heart, Zap, Star 
} from "lucide-react";

export const RANKS = [
  // Pour atteindre ce rang : il faut environ 10 000 likes ou 5 000 solutions validées.
  { min: 100000, label: "Légende du Shabba", color: "text-black bg-yellow-500", icon: Trophy },
  
  // Demande une présence quotidienne sur plusieurs mois.
  { min: 45000, label: "Sage du Shabba", color: "text-yellow-700 bg-yellow-100", icon: Sparkles },
  
  // Le niveau des experts reconnus.
  { min: 20000, label: "Professeur du Shabba", color: "text-orange-700 bg-orange-100", icon: GraduationCap },
  
  // Un vrai cap de difficulté ici.
  { min: 8000, label: "Major de Promo", color: "text-purple-700 bg-purple-100", icon: Medal },
  
  // Pour les élèves très actifs.
  { min: 3500, label: "Tuteur", color: "text-cyan-700 bg-cyan-100", icon: ShieldCheck },
  
  // Le début de la reconnaissance.
  { min: 1200, label: "Camarade utile", color: "text-green-700 bg-green-100", icon: Heart },
  
  // Facile à atteindre (environ 25 likes). Sert d'accroche.
  { min: 250, label: "Élève motivé", color: "text-blue-700 bg-blue-100", icon: Zap },
  
  { min: 0, label: "Nouveau", color: "text-gray-500 bg-gray-100", icon: Star },
];

export function getRank(points: number) {
  return RANKS.find(r => points >= r.min) || RANKS[RANKS.length - 1];
}