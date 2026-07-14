"use client";

import { X, ListTodo, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { POINT_COLORS, POINT_LABELS, STATUS_LABELS, formatTimeline, type ActionItemListItem } from "./utils";

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
        {/* Header with Title */}
        <div className="sticky top-0 border-b border-border bg-card px-6 py-4 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${POINT_COLORS[item.point]}`}>
                  {POINT_LABELS[item.point]}
                </span>
                <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400">
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
            </div>
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
        <div className="space-y-6 px-6 py-5">
          {/* Overview Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
              Overview
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {item.title}
            </p>
          </div>

          {/* Details Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
              Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Assignee */}
              <div className="bg-secondary/30 rounded-lg border-l-3 border-blue-400 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Assignee
                </p>
                <p className="text-sm font-medium text-foreground">{item.ownerName || "—"}</p>
              </div>

              {/* Assigned by */}
              <div className="bg-secondary/30 rounded-lg border-l-3 border-purple-400 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Assigned by
                </p>
                <p className="text-sm font-medium text-foreground">{item.assignedByName || "—"}</p>
              </div>

              {/* Timeline */}
              <div className="bg-secondary/30 rounded-lg border-l-3 border-orange-400 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Timeline
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatTimeline(item.dueDate, { year: true })}
                </p>
              </div>

              {/* Event */}
              <div className="bg-secondary/30 rounded-lg border-l-3 border-green-400 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Event
                </p>
                <p className="text-sm font-medium text-foreground truncate" title={item.eventTitle}>{item.eventTitle}</p>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
              Metadata
            </h3>
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(item.createdAt)} · Updated {formatDateTime(item.updatedAt)}
            </p>
          </div>

          {/* Meeting Link */}
          <Link
            href={`/administrative/events/${item.eventId}/minutes`}
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
          >
            View meeting minutes
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
