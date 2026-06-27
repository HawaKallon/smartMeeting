"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

interface MobileMenuButtonProps {
  children: React.ReactNode;
}

export function MobileMenuButton({ children }: MobileMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button — shown on small screens */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden sm:hidden absolute left-4 top-4 z-50 h-10 w-10 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-background/80 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border z-40 sm:hidden overflow-y-auto pt-16">
            {children}
          </div>
        </>
      )}
    </>
  );
}
