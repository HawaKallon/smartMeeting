import Link from "next/link";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "Public Calendar",
};

export default function PublicCalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/public-calendar" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Public Calendar</h1>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Upcoming public events and announcements
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Ministry Events. All rights reserved.</p>
      </footer>
    </div>
  );
}
