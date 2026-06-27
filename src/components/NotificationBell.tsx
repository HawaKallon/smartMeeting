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
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-50">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/20" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <a
                  key={n.id}
                  href={n.link || "#"}
                  className={`block border-b border-border/50 px-4 py-3 transition-colors ${
                    n.read ? "hover:bg-muted/20" : "bg-blue-500/5 hover:bg-blue-500/10"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm font-medium text-foreground">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
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
