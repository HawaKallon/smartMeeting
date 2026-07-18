# Cron jobs

Vercel Hobby accounts can only run cron jobs once per day. Keep the daily action-item reminder cron active for now:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

The meeting reminder cron needs to run more frequently so it can send reminders about one hour before an activity starts. Leave it disabled while the project is on Vercel Hobby.

After upgrading to Vercel Pro, restore the 10-minute meeting reminder cron:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/meeting-reminders",
      "schedule": "*/10 * * * *"
    }
  ]
}
```
