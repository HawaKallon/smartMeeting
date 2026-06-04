"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
