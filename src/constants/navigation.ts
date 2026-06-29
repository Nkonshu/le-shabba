import { Home, BookOpen, Download, Star, FileText, MessageSquare, Users } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Cours", href: "/cours", icon: BookOpen },
  { label: "Téléchargements", href: "/downloads", icon: Download },
  { label: "Favoris", href: "/favoris", icon: Star },
  { label: "Épreuves", href: "/epreuves", icon: FileText },
  { label: "Sujets", href: "/forum", icon: MessageSquare },
  { label: "Participants", href: "/participants", icon: Users },
];