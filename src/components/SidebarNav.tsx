"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, ReactNode } from "react";

// Context to determine the single active link (longest matching href)
const ActiveNavContext = createContext<string | null>(null);

export function SidebarNavProvider({ hrefs, children }: { hrefs: string[]; children: ReactNode }) {
  const pathname = usePathname();

  // Find the longest href that matches the current pathname
  const activeHref = hrefs
    .filter((href) => {
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(href + "/");
    })
    .sort((a, b) => b.length - a.length)[0] || null;

  return (
    <ActiveNavContext.Provider value={activeHref}>
      {children}
    </ActiveNavContext.Provider>
  );
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const activeHref = useContext(ActiveNavContext);
  const isActive = activeHref === href;

  return (
    <Link
      href={href}
      className={`flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm transition-all ${
        isActive
          ? "bg-[linear-gradient(135deg,rgba(0,53,128,0.14),rgba(0,53,128,0.08))] font-semibold text-[#003580] shadow-[inset_3px_0_0_0_#003580,inset_0_0_0_1px_rgba(0,53,128,0.12),0_10px_24px_rgba(0,53,128,0.08)]"
          : "text-sidebar-foreground/65 hover:bg-[rgba(0,53,128,0.06)] hover:text-[#003580]"
      }`}
    >
      {children}
    </Link>
  );
}
