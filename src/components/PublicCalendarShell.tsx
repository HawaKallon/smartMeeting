import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function PublicCalendarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7f9] text-slate-900">
      <div className="grid h-1.5 grid-cols-3" aria-hidden="true">
        <span className="bg-[#1f8f4e]" />
        <span className="bg-white" />
        <span className="bg-[#1f6fa8]" />
      </div>

      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#12355b] text-white shadow-sm">
              <CalendarDays className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#1f8f4e]">
                Government of Sierra Leone
              </span>
              <span className="mt-1 block text-xl font-bold tracking-tight text-[#12355b] sm:text-2xl">
                Public Events Calendar
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>

      <footer className="mt-auto border-t-4 border-[#1f8f4e] bg-[#12355b] text-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Government of Sierra Leone</p>
          <p className="text-xs text-slate-400">Official public events and announcements</p>
        </div>
      </footer>
    </div>
  );
}
