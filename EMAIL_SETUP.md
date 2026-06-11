# Email Setup Guide - Resend Integration

## Current Status
- ✅ Resend API Key is configured: `***REMOVED***`
- ✅ EMAIL_FROM is now set to: `noreply@smart-meeting.local`
- ✅ Email functions are implemented in `src/lib/email.ts`

## Issue
Emails are not sending because Resend requires a **verified sender email domain** to send production emails.

## Solution - Setup Verified Domain in Resend

### Option 1: Use Your Own Domain (Recommended)
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `smart-meeting.com`)
4. Follow Resend's instructions to add DNS records:
   - DKIM record
   - DMARC record
   - SPF record
5. Verify the domain in Resend
6. Update `.env`:
   ```
   EMAIL_FROM="noreply@smart-meeting.com"
   ```

### Option 2: Test with Resend's Test Domain
1. For testing, you can use Resend's provided test domain
2. Go to [Resend Settings](https://resend.com/settings)
3. Look for your assigned test domain (usually something like `noreply@[random].resend.dev`)
4. Update `.env` with that address:
   ```
   EMAIL_FROM="noreply@[your-resend-domain].resend.dev"
   ```

### Option 3: Quick Test Setup
For immediate testing without domain verification:
1. Use Resend's default test domain:
   ```
   EMAIL_FROM="noreply@resend.dev"
   ```
2. This works for testing but is not recommended for production

## Current Configuration
Your `.env` now has:
```env
RESEND_API_KEY="***REMOVED***"
EMAIL_FROM="noreply@smart-meeting.local"
```

## What to Do Next

1. **Find your verified domain in Resend:**
   - Log into Resend dashboard
   - Go to Domains section
   - Check what domains/emails you have verified

2. **Update EMAIL_FROM in `.env`:**
   ```
   EMAIL_FROM="your-verified-email@your-domain.com"
   ```

3. **Test the email:**
   - Publish meeting minutes
   - Assign an action item
   - Check the console logs for any errors

4. **Debug:**
   - Check Resend dashboard "Activity" tab for sent/failed emails
   - Look at console logs: `[email] failed to send...`
   - Verify the FROM email is one of your verified senders

## Email Functions Implemented
The following email notifications are set up:
- ✅ `sendInviteEmail()` - Event invitation emails
- ✅ `sendMinutesEmail()` - Published minutes notification
- ✅ `sendActionItemEmail()` - Action item assigned
- ✅ `sendReminderEmail()` - Action item due reminder

## Troubleshooting

### "Invalid from address" Error
- Your EMAIL_FROM address is not verified in Resend
- Go to Resend dashboard and verify the domain/email

### "Invalid API Key" Error
- Check that RESEND_API_KEY is correct
- Make sure there are no extra spaces or quotes

### Emails not showing in Resend Activity
- Check that EMAIL_FROM is set to a verified sender
- Check console logs for error messages
- Verify the API key has permission to send emails

### Test Recipients
- In Resend test mode, use test email addresses
- Some email providers block test emails

## References
- [Resend Documentation](https://resend.com/docs)
- [Resend Domains Setup](https://resend.com/docs/dashboard/domains)
- [Email Best Practices](https://resend.com/docs/best-practices)
