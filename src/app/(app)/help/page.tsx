import { BackButton } from "@/components/BackButton";
import { HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <BackButton href="/" label="Dashboard" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help &amp; Centre</h1>
        <p className="mt-1 text-sm text-muted-foreground">Get answers and support</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
          <p className="mt-2 text-sm text-muted-foreground">Help articles and guides will appear here</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Contact Support</h2>
          <p className="mt-2 text-sm text-muted-foreground">Email us at support@smartmeeting.gov for assistance</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Documentation</h2>
          <p className="mt-2 text-sm text-muted-foreground">Read our complete user guide and API documentation</p>
        </div>
      </div>
    </div>
  );
}
