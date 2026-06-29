import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "Public Events Calendar | Government of Sierra Leone",
  description: "Official public events published by Government of Sierra Leone ministries.",
};

export default function PublicCalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-emerald-800 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/public-calendar" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
              <CalendarDays className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
                Government of Sierra Leone
              </span>
              <span className="block text-lg font-semibold sm:text-xl">Public Events Calendar</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-13rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
          Official public events published by Government of Sierra Leone ministries.
        </div>
      </footer>
    </div>
  );
}
