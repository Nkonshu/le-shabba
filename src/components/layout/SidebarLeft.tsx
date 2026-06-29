"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "../../constants/navigation";
import { cn } from "../../lib/utils";
import { createClient } from "@/src/utils/supabase/client";
import { ShieldCheck } from "lucide-react"; // Icône pour l'admin

export default function SidebarLeft() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();
  

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          setIsAdmin(true);
        }
      }
    }
    checkRole();
  }, []);

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-16px)] border-r border-[#E0E0E0] bg-white hidden md:block overflow-y-auto">
      <nav className="p-4 space-y-1">
        <p className="text-[10px] font-bold text-[#757575] uppercase tracking-wider mb-4 px-2">Menu Principal</p>
        
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive 
                  ? "bg-gray-100 text-[#000000] font-semibold" 
                  : "text-[#333333] hover:bg-gray-50 hover:text-[#000000]"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}

        {/* ONGLET ADMIN SÉCURISÉ */}
        {isAdmin && (
          <div className="pt-6">
            <p className="text-[10px] font-bold text-[#757575] uppercase tracking-wider mb-4 px-2">Gestion</p>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname.startsWith("/admin") 
                  ? "bg-black text-white font-semibold" 
                  : "text-red-600 hover:bg-red-50 font-bold"
              )}
            >
              <ShieldCheck size={18} />
              Administration
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}