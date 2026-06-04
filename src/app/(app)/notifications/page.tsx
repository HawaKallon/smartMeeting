import { BackButton } from "@/components/BackButton";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stay updated on all activities</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-sm text-muted-foreground">No notifications yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">You'll see updates about meetings, invitations, and more here</p>
      </div>
    </div>
  );
}
