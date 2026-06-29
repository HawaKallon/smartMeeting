import { BackButton } from "@/components/BackButton";
import { HelpCircle, Mail, BookOpen, ChevronDown } from "lucide-react";

export default function HelpPage() {
  const faqs = [
    {
      q: "How do I check in to an event using QR code?",
      a: "When you arrive at the event location, open the event details on your phone and scan the rotating QR code at the check-in desk. Your GPS location will be verified to prevent check-in spoofing. You'll receive instant confirmation.",
    },
    {
      q: "Can I book a conference room for my meeting?",
      a: "Yes. Navigate to Rooms in the sidebar, select a room, and check its availability calendar. Click 'Book Room' to reserve a time slot. You can also create an event and assign a room during event creation.",
    },
    {
      q: "How do I RSVP to an event invitation?",
      a: "You'll receive an email invitation with a link. Log in to your account, go to your Dashboard, and find the event under Pending Invitations. Click Confirm or Decline to update your RSVP status.",
    },
    {
      q: "Who can publish meeting minutes?",
      a: "Meeting minutes are published by designated approvers (usually Permanent Secretary or above). Once the organizer drafts the minutes, an approver can review and publish them to all attendees.",
    },
    {
      q: "What is geofencing and why does it matter?",
      a: "Geofencing uses GPS to verify you're actually at the event venue before allowing check-in. This prevents remote check-ins and ensures attendance accuracy. Your device's GPS accuracy is recorded.",
    },
    {
      q: "Can I edit my profile picture and name?",
      a: "Yes. Click the pencil icon on your Profile page. You can upload a new profile picture (PNG, JPG, or WebP, max 5MB) and update your name. Changes are saved immediately.",
    },
    {
      q: "How do I track action items assigned to me?",
      a: "Visit the Action Items section from the Dashboard or sidebar. You'll see all tasks assigned to you with due dates and event context. You can mark items as Done when completed.",
    },
    {
      q: "What happens to my recordings after an event?",
      a: "Recordings are stored securely and transcribed automatically (if configured). You can access them from the event details page. Transcripts help generate meeting summaries.",
    },
  ];

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Help &amp; Centre</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find answers and learn how to use Smart Meeting</p>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="h-6 w-6 text-white" />
            <h2 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group border border-border rounded-lg">
                <summary className="flex items-center justify-between cursor-pointer px-4 py-3 hover:bg-muted/30 transition-colors">
                  <span className="font-medium text-foreground text-sm">{faq.q}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 py-3 border-t border-border bg-muted/20 text-sm text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Documentation Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-6 w-6 text-white" />
          <h2 className="text-lg font-semibold text-foreground">Documentation</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Smart Meeting helps government ministries manage meetings with attendance tracking, geofencing verification, automatic transcription, and meeting minutes. Key features include:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-foreground font-medium min-w-fit">Check-in System:</span>
            <span>QR code or manual check-in with GPS geofencing to verify attendee location</span>
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-medium min-w-fit">Room Booking:</span>
            <span>Reserve conference rooms with capacity and amenity details</span>
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-medium min-w-fit">Invitations:</span>
            <span>Send and track email invitations with RSVP status</span>
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-medium min-w-fit">Minutes &amp; Actions:</span>
            <span>Draft meeting minutes with AI-powered summaries and assign action items</span>
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-medium min-w-fit">Audit Trail:</span>
            <span>Complete activity log of all meeting-related actions</span>
          </li>
        </ul>
      </div>

      {/* Support Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-6 w-6 text-white" />
          <h2 className="text-lg font-semibold text-foreground">Contact Support</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Need additional help? Contact the Smart Meeting support team:
        </p>
        <a
          href="mailto:support@smartmeeting.gov"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          support@smartmeeting.gov
          <span>→</span>
        </a>
        <p className="text-xs text-muted-foreground mt-3">
          Response times: Monday–Friday, 9am–5pm (Government Standard Time)
        </p>
      </div>
    </div>
  );
}
