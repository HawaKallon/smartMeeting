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
      className={`group flex h-11 items-center overflow-hidden rounded-xl text-sm transition-[background-color,color,box-shadow] duration-300 ${
        isActive
          ? collapsed
            ? "bg-[linear-gradient(135deg,rgba(0,53,128,0.14),rgba(0,53,128,0.08))] font-semibold text-[#003580] shadow-[inset_0_0_0_1px_rgba(0,53,128,0.12),0_10px_24px_rgba(0,53,128,0.08)]"
            : "font-semibold text-[#003580] shadow-[inset_3px_0_0_0_#003580,inset_0_0_0_1px_rgba(0,53,128,0.12),0_10px_24px_rgba(0,53,128,0.08)] bg-[linear-gradient(135deg,rgba(0,53,128,0.14),rgba(0,53,128,0.08))]"
          : collapsed
            ? "text-sidebar-foreground/65 hover:bg-[rgba(0,53,128,0.06)] hover:text-[#003580]"
            : "text-sidebar-foreground/65 hover:bg-[rgba(0,53,128,0.06)] hover:text-[#003580]"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center transition-[margin,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed ? "mx-auto scale-100" : "mx-3 scale-100"
        }`}
      >
        {icon}
      </span>
      <span
        className={`truncate whitespace-nowrap transition-[max-width,opacity,margin,transform] duration-250 ease-out ${
          collapsed ? "ml-0 max-w-0 translate-x-2 opacity-0" : "mr-3 max-w-[11rem] translate-x-0 opacity-100"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
