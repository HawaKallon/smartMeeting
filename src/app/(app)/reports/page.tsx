import { BackButton } from "@/components/BackButton";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Analytics and statistics</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-sm text-muted-foreground">Reports coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Advanced analytics and export features will be available here</p>
      </div>
    </div>
  );
}
