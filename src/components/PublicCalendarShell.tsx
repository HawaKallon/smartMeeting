import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SierraLeoneFlag } from "./SierraLeoneFlag";

export function PublicCalendarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-transparent text-slate-900">
      <header className="border-b border-[#d3deef] bg-[#f8fbff]/95 shadow-[0_8px_30px_rgba(0,53,128,0.07)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003580] text-white shadow-[0_14px_30px_rgba(0,53,128,0.18)]">
              <CalendarDays className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#007236]">
                Government of Sierra Leone
              </span>
              <span className="mt-1 block text-xl font-bold tracking-tight text-[#003580] sm:text-2xl">
                Public Events Calendar
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3 rounded-full border border-[#d3deef] bg-[#edf4fd] px-3 py-2 shadow-sm">
            <SierraLeoneFlag className="h-8 w-14" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 sm:inline">
              Sierra Leone
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>

      <footer className="mt-auto border-t border-[#d3deef] bg-[#f7fbff]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="font-semibold text-[#003580]">&copy; {new Date().getFullYear()} Government of Sierra Leone</p>
            <p className="text-xs text-slate-500">Official public events and announcements</p>
          </div>
          <SierraLeoneFlag className="h-7 w-12 self-start sm:self-auto" />
        </div>
      </footer>
    </div>
  );
}
