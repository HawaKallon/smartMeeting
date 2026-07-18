import { PublicCalendarShell } from "@/components/PublicCalendarShell";

export const metadata = {
  title: "Public Calendar",
};

export default function PublicCalendarLayout({ children }: { children: React.ReactNode }) {
  return <PublicCalendarShell>{children}</PublicCalendarShell>;
}
