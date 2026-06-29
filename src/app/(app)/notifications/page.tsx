import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { Bell, ArrowUpRight } from "lucide-react";
import { markRead, markAllRead } from "./actions";

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No notifications yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-lg border transition-colors ${
                notif.read
                  ? "border-border bg-card hover:bg-muted/20"
                  : "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10"
              }`}
            >
              {notif.link ? (
                <Link href={notif.link} className="block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {notif.title}
                        {!notif.read && <span className="h-2 w-2 bg-blue-500 rounded-full" />}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{notif.body}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    {notif.createdAt.toLocaleString("en-GB")}
                  </p>
                </Link>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {notif.title}
                        {!notif.read && <span className="h-2 w-2 bg-blue-500 rounded-full" />}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{notif.body}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    {notif.createdAt.toLocaleString("en-GB")}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
