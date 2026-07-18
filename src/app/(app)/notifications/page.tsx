import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/BackButton";
import { Bell, ArrowUpRight } from "lucide-react";
import { markAllRead } from "./actions";

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <BackButton href="/administrative" label="Dashboard" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007236]">Inbox</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002a68]"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_16px_40px_rgba(15,35,63,0.07)]">
          <div className="px-6 py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-primary/25" />
            <p className="mt-3 text-sm text-muted-foreground">No notifications yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-[1.35rem] border shadow-sm transition-colors ${
                notif.read
                  ? "border-border bg-card hover:bg-secondary/25"
                  : "border-[#b8cdee] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] hover:bg-[linear-gradient(180deg,#f5f9ff_0%,#e8f2ff_100%)]"
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
