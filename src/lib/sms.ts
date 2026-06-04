// SMS notifications via Twilio — commented out until email is tested and verified.
// To re-enable: uncomment everything below and add Twilio credentials to .env

// import twilio from "twilio";
//
// const sid = process.env.TWILIO_ACCOUNT_SID;
// const token = process.env.TWILIO_AUTH_TOKEN;
// const from = process.env.TWILIO_FROM;
// const client = sid && token ? twilio(sid, token) : null;
//
// async function sendSms(to: string, body: string) {
//   if (!client || !from) {
//     console.warn(`[sms] Twilio not configured — skipping SMS to ${to}`);
//     return;
//   }
//   await client.messages.create({ from, to, body });
// }

export async function sendInviteSms(_args: {
  to: string; toName: string; eventTitle: string; startAt: Date;
}) { /* SMS disabled — email only for now */ }

export async function sendActionItemSms(_args: {
  to: string; toName: string; title: string; dueDate: Date | null;
}) { /* SMS disabled — email only for now */ }

export async function sendReminderSms(_args: {
  to: string; toName: string; title: string; dueDate: Date;
}) { /* SMS disabled — email only for now */ }

export async function sendMinutesSms(_args: {
  to: string; toName: string; eventTitle: string;
}) { /* SMS disabled — email only for now */ }
