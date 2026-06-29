import { requireAdminRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { PublicEventForm } from "../PublicEventForm";

export default async function NewPublicEventPage() {
  await requireAdminRole();

  return (
    <div className="space-y-6">
      <BackButton href="/administrative/admin/public-calendar" label="Public Calendar" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Public Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new public calendar event that will be visible to all visitors
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <PublicEventForm isNew={true} />
      </div>
    </div>
  );
}
