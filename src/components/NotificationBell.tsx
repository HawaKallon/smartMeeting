"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/generated/prisma/client";

interface NotificationBellProps {
  initialNotifications: Notification[];
}

export function NotificationBell({ initialNotifications }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-primary transition-colors hover:bg-muted"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-[1.25rem] border border-border bg-card shadow-[0_24px_70px_rgba(0,53,128,0.16)]">
          <div className="border-b border-border px-4 py-4">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/25" />
                <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <a
                    key={n.id}
                    href={n.link || "#"}
                    className={`block border-b border-border/50 px-4 py-3 transition-colors ${
                    n.read ? "hover:bg-muted/50" : "bg-secondary/70 hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm font-medium text-foreground">{n.title}</p>
                    {!n.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#007236]" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
