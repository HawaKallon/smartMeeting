import { requireRole } from "@/lib/guard";
import { EventForm } from "./EventForm";

export default async function NewEventPage() {
  await requireRole("ADMIN");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">New Event</h1>
      <div className="rounded-lg border bg-white p-6">
        <EventForm />
      </div>
    </div>
  );
}
