"use client";

import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/layout/Header";
import SidebarLeft from "../components/layout/SidebarLeft";
import SidebarRight from "../components/layout/SidebarRight";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Détecte si on est sur la page de détail d'un sujet (ex: /forum/123)
  // On vérifie que le chemin commence par /forum/ ET qu'il y a un ID après le slash
  const isTopicDetail = pathname.startsWith('/forum/') && pathname.split('/').filter(Boolean).length > 1;

useEffect(() => {
  if ('serviceWorker' in navigator) {
    // On utilise un chemin absolu /sw.js car il est dans le dossier public
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => console.log('SW enregistré avec succès ! Scope:', reg.scope))
      .catch((err) => console.error('Échec enregistrement SW:', err));
  }
}, []);

  return (
    <html lang="fr" className={cn("font-mono", jetbrainsMono.variable)}>
      <body className="bg-white text-[#000000] antialiased">
        <Header />
        
        <div className="flex">
          {/* Colonne Gauche - Fixe */}
          <SidebarLeft />

          {/* Zone Centrale - On retire lg:pr-80 si on est dans un sujet */}
          <main className={cn(
            "flex-1 min-h-screen pt-16 md:pl-64 w-full transition-all duration-300",
            !isTopicDetail && "lg:pr-80" // On ne met la marge à droite que si la barre est visible
          )}>
            <div className={cn(
              "p-4 md:p-6 w-full mx-auto",
              isTopicDetail ? "max-w-none" : "max-w-4xl" // Largeur totale si détail, sinon centré
            )}>
              {children}
            </div>
          </main>

          {/* Colonne Droite - On la cache totalement en mode détail du forum */}
          {!isTopicDetail && <SidebarRight />}
        </div>
      </body>
    </html>
  );
}