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

export function NavLink({
  href,
  icon,
  label,
  collapsed = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  collapsed?: boolean;
}) {
  const activeHref = useContext(ActiveNavContext);
  const isActive = activeHref === href;

  return (
    <Link
      href={href}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={`group flex h-11 items-center rounded-xl text-sm transition-all ${
        isActive
          ? collapsed
            ? "justify-center bg-[linear-gradient(135deg,rgba(0,53,128,0.14),rgba(0,53,128,0.08))] font-semibold text-[#003580] shadow-[inset_0_0_0_1px_rgba(0,53,128,0.12),0_10px_24px_rgba(0,53,128,0.08)]"
            : "gap-2.5 px-3 font-semibold text-[#003580] shadow-[inset_3px_0_0_0_#003580,inset_0_0_0_1px_rgba(0,53,128,0.12),0_10px_24px_rgba(0,53,128,0.08)] bg-[linear-gradient(135deg,rgba(0,53,128,0.14),rgba(0,53,128,0.08))]"
          : collapsed
            ? "justify-center text-sidebar-foreground/65 hover:bg-[rgba(0,53,128,0.06)] hover:text-[#003580]"
            : "gap-2.5 px-3 text-sidebar-foreground/65 hover:bg-[rgba(0,53,128,0.06)] hover:text-[#003580]"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}
