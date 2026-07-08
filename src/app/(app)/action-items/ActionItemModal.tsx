"use client";

import { X, ListTodo, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { POINT_COLORS, POINT_LABELS, STATUS_LABELS, type ActionItemListItem } from "./utils";

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
        {/* Header */}
        <div className="sticky top-0 border-b border-border bg-card px-6 py-4 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <ListTodo className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
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
        <div className="space-y-6 px-6 py-5">
          {/* Point badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-block px-3 py-1.5 rounded-md text-sm font-medium ${POINT_COLORS[item.point]}`}>
              {POINT_LABELS[item.point]}
            </span>
          </div>

          {/* Full description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Description
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {item.title}
            </p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Event
              </p>
              <p className="text-sm text-foreground">{item.eventTitle}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Owner
              </p>
              <p className="text-sm text-foreground">{item.ownerName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Timeline
              </p>
              <p className="text-sm text-foreground">
                {item.dueDate
                  ? new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Status
              </p>
              <p className="text-sm text-foreground">{STATUS_LABELS[item.status]}</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Created {formatDateTime(item.createdAt)} · Updated {formatDateTime(item.updatedAt)}
            </p>
          </div>

          {/* Meeting link */}
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
