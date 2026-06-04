import { BackButton } from "@/components/BackButton";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your preferences</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Email, password, and personal information</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">Email alerts and notification preferences</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
          <p className="mt-1 text-sm text-muted-foreground">Data sharing and privacy controls</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
          <p className="mt-1 text-sm text-muted-foreground">Connected apps and services</p>
        </div>
      </div>
    </div>
  );
}
