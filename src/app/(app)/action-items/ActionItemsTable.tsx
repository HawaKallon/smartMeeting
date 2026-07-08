"use client";

import { useState, useTransition } from "react";
import { changeItemStatus } from "./actions";

type Status = "TODO" | "IN_PROGRESS" | "DONE";

type Item = {
  id: string;
  title: string;
  status: Status;
  dueDate: string | null;
  eventTitle: string;
  ownerName: string | null;
};

interface Props {
  items: Item[];
  canMoveAny: boolean;
  ownerFilter: string;
}

const STATUS_LABELS: Record<Status, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_COLORS: Record<Status, string> = {
  TODO: "bg-blue-500/10 text-blue-600 border border-blue-200",
  IN_PROGRESS: "bg-amber-500/10 text-amber-600 border border-amber-200",
  DONE: "bg-green-500/10 text-green-600 border border-green-200",
};

export function ActionItemsTable({ items: initial, canMoveAny, ownerFilter }: Props) {
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

  function isOverdue(dueDate: string | null, status: Status): boolean {
    return !!(dueDate && status !== "DONE" && new Date(dueDate + "T00:00:00") < new Date());
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
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
          {visible.map((item) => {
            const overdue = isOverdue(item.dueDate, item.status);
            return (
              <tr
                key={item.id}
                className="hover:bg-secondary/30 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">{item.eventTitle}</p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">
                    {item.ownerName || "—"}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        overdue ? "font-semibold text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {formatDate(item.dueDate)}
                    </span>
                    {overdue && (
                      <span className="text-xs font-semibold text-red-600">Overdue</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value as Status)}
                    disabled={!canMoveAny}
                    className={`text-xs font-medium rounded-md px-2 py-1 border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      STATUS_COLORS[item.status]
                    }`}
                  >
                    <option value="TODO">{STATUS_LABELS.TODO}</option>
                    <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                    <option value="DONE">{STATUS_LABELS.DONE}</option>
                  </select>
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
