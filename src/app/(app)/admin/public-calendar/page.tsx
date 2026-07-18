import { redirect } from "next/navigation";

export default function AdminPublicCalendarPage() {
  redirect("/administrative/events?view=public");
}
