"use client";

import { X, ListTodo, ArrowRight, Calendar, User, CheckCircle2, TargetIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { POINT_COLORS, POINT_LABELS, STATUS_LABELS, STATUS_ICON_COMPONENTS, formatTimeline, type ActionItemListItem } from "./utils";

interface Props {
  item: ActionItemListItem | null;
  open: boolean;
  onClose: () => void;
}

export function ActionItemModal({ item, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open || !item) return null;

  const formatDateTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) +
      " " +
      date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="sticky top-0 border-b border-border bg-card px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close action item details"
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Title Card with Point Badge */}
          <div className="rounded-lg border border-border bg-secondary/20 p-4 border-l-4 border-l-primary">
            <div className="mb-3">
              <span className={`inline-block px-3 py-1.5 rounded-md text-sm font-medium ${POINT_COLORS[item.point]}`}>
                {POINT_LABELS[item.point]}
              </span>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
          </div>

          {/* Description */}
          <p className="text-sm text-foreground/90 leading-relaxed">
            {item.title}
          </p>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Assignee Card */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3 hover:bg-secondary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <User size={14} />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Assignee
              </p>
              <p className="text-sm font-medium text-foreground truncate" title={item.ownerName || ""}>
                {item.ownerName || "—"}
              </p>
            </div>

            {/* Assigned by Card */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3 hover:bg-secondary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <TargetIcon size={14} />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Assigned by
              </p>
              <p className="text-sm font-medium text-foreground truncate" title={item.assignedByName || ""}>
                {item.assignedByName || "—"}
              </p>
            </div>

            {/* Timeline Card */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3 hover:bg-secondary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Calendar size={14} />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Timeline
              </p>
              <p className="text-sm font-medium text-foreground">
                {formatTimeline(item.dueDate, { year: true })}
              </p>
            </div>

            {/* Status Card */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3 hover:bg-secondary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center text-green-400">
                  {(() => {
                    const IconComponent = STATUS_ICON_COMPONENTS[item.status];
                    return <IconComponent size={14} />;
                  })()}
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Status
              </p>
              <p className="text-sm font-medium text-foreground">
                {STATUS_LABELS[item.status]}
              </p>
            </div>

            {/* Event Card - Full width at bottom */}
            <div className="col-span-2 rounded-lg border border-border bg-secondary/30 p-3 hover:bg-secondary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ListTodo size={14} />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Event
              </p>
              <p className="text-sm font-medium text-foreground">
                {item.eventTitle}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(item.createdAt)} · Updated {formatDateTime(item.updatedAt)}
            </p>
          </div>

          {/* Meeting Link */}
          <Link
            href={`/administrative/events/${item.eventId}/minutes`}
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View meeting minutes
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
