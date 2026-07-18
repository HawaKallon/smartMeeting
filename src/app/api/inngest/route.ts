import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  emailWelcome,
  emailInvitation,
  emailPublicInvitation,
  emailReminder,
  emailMeetingReminder,
  emailMinutesPublished,
  emailActionItemAssigned,
  emailActionItemCreated,
  emailActionItemStatusChanged,
} from "@/inngest/functions";

// Serve all Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    emailWelcome,
    emailInvitation,
    emailPublicInvitation,
    emailReminder,
    emailMeetingReminder,
    emailMinutesPublished,
    emailActionItemAssigned,
    emailActionItemCreated,
    emailActionItemStatusChanged,
  ],
});
