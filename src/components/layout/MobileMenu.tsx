"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/src/constants/navigation";

export default function MobileMenu() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* Ce bouton ne s'affiche que sur mobile (md:hidden) */}
        <button className="md:hidden p-2 -ml-2 text-[#333333]" aria-label="Ouvrir le menu">
          <Menu size={24} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 bg-white">
        <SheetTitle className="sr-only">Menu de navigation Le Shabba</SheetTitle>
        
        <div className="p-6 border-b border-[#E0E0E0]">
          <span className="font-black text-xl tracking-tighter">LE SHABBA</span>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-black uppercase transition-all w-full",
                      isActive 
                        ? "bg-black text-white shadow-lg" 
                        : "text-[#333333] active:bg-gray-100"
                    )}
                  >
                <Icon size={22} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}