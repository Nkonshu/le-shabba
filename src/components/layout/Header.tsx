"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import SocialMenu from "./SocialMenu";
import { LogOut, User as UserIcon } from "lucide-react";
import { signInWithGoogle } from "@/src/lib/auth-actions";
import { createClient } from "@/src/utils/supabase/client";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // 1. Vérifier si un utilisateur est déjà là au chargement
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      console.log("Utilisateur actuel:", user?.email);
    };

    getUser();

    // 2. ÉCOUTER en temps réel les connexions/déconnexions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Événement Auth:", event);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // On force un rafraîchissement pour nettoyer les données
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 w-full h-16 border-b border-[#E0E0E0] bg-white/90 backdrop-blur-md z-[100] flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-1">
        <MobileMenu />
        <Link href="/" className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tighter text-[#000000]">LE SHABBA</span>
        </Link>
        <SocialMenu />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* On n'affiche rien tant qu'on ne sait pas si l'utilisateur est là (évite le clignotement) */}
        {!loading && (
          <>
            {user ? (
              /* --- VUE CONNECTÉE --- */
              <div className="flex items-center gap-3 bg-gray-50 pl-3 pr-1 py-1 rounded-full border border-gray-100">
                <div className="hidden sm:block text-right">
                  <p className="text-[9px] font-black uppercase text-[#757575] leading-none">Génie</p>
                  <p className="text-xs font-bold text-black truncate max-w-[100px]">
                    {user.email?.split("@")[0]}
                  </p>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-2 bg-white text-red-500 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              /* --- VUE DÉCONNECTÉE --- */
              <button 
                onClick={() => signInWithGoogle()}
                className="bg-[#000000] text-white px-4 md:px-5 py-2 rounded-full text-[11px] md:text-xs font-bold hover:bg-gray-800 transition-all"
              >
                Connexion Google
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}