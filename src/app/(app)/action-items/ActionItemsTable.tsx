"use client";

import { useState, useTransition } from "react";
import { changeItemStatus } from "./actions";
import {
  POINT_COLORS,
  POINT_LABELS,
  STATUS_COLORS,
  STATUS_ICON_COMPONENTS,
  STATUS_LABELS,
  formatTimeline,
  getOwnerInitials,
  isActionItemOverdue,
  type ActionItemListItem,
  type Status,
} from "./utils";

interface Props {
  items: ActionItemListItem[];
  canMoveAny: boolean;
  currentUserId: string;
  ownerFilter: string;
  onItemClick: (item: ActionItemListItem) => void;
}

export function ActionItemsTable({
  items: initial,
  canMoveAny,
  currentUserId,
  ownerFilter,
  onItemClick,
}: Props) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  const visible = ownerFilter === "all"
    ? items
    : items.filter((i) => i.ownerName !== null);

  function handleStatusChange(itemId: string, newStatus: Status) {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
    );

    // Call server action
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("status", newStatus);
    startTransition(() => {
      changeItemStatus(fd);
    });
  }

  function canChangeStatus(item: ActionItemListItem) {
    return canMoveAny || item.ownerId === currentUserId;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary/40">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Task
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Event
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Owner
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timeline
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {visible.map((item, idx) => {
            const overdue = isActionItemOverdue(item.dueDate, item.status);
            const StatusIcon = STATUS_ICON_COMPONENTS[item.status];
            return (
              <tr
                key={item.id}
                className={`cursor-pointer transition-colors hover:bg-secondary/30 ${
                  idx % 2 === 1 ? "bg-secondary/20" : ""
                }`}
                onClick={() => onItemClick(item)}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <StatusIcon size={16} className={STATUS_COLORS[item.status].icon} />
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-sm text-muted-foreground">{item.eventTitle}</p>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                      {getOwnerInitials(item.ownerName)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.ownerName || "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm ${
                        overdue ? "font-semibold text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {formatTimeline(item.dueDate)}
                    </span>
                    {overdue && (
                      <span className="text-xs font-semibold text-red-600">Overdue</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${POINT_COLORS[item.point]}`}>
                      {POINT_LABELS[item.point]}
                    </span>
                    <select
                      value={item.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(item.id, e.target.value as Status);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!canChangeStatus(item)}
                      className={`text-xs font-medium rounded-md px-2 py-1 border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        STATUS_COLORS[item.status].badge
                      }`}
                    >
                      <option value="TODO">{STATUS_LABELS.TODO}</option>
                      <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                      <option value="DONE">{STATUS_LABELS.DONE}</option>
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {visible.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No action items</p>
        </div>
      )}
    </div>
  );
}
