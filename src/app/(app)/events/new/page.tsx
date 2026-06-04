import { requireStaffRole } from "@/lib/guard";
import { EventForm } from "./EventForm";
import { BackButton } from "@/components/BackButton";

export default async function NewEventPage() {
  await requireStaffRole();

  return (
    <div className="flex flex-col h-full space-y-4">
      <BackButton href="/" label="Dashboard" />
      <h1 className="text-2xl font-bold text-foreground">New Event</h1>
      <div className="flex-1 rounded-xl border border-border bg-card p-6 overflow-y-auto">
        <EventForm />
      </div>
    </div>
  );
}
