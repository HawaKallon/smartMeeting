import { AlertCircle, CheckCircle2, Clock, type LucideIcon } from "lucide-react";

export type Status = "TODO" | "IN_PROGRESS" | "DONE";
export type Point = "ACTION_POINT" | "AGREED";

export type ActionItemListItem = {
  id: string;
  title: string;
  status: Status;
  point: Point;
  dueDate: string | null;
  eventTitle: string;
  eventId: string;
  ownerId: string | null;
  ownerName: string | null;
  assignedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export const STATUS_COLORS: Record<Status, { icon: string; border: string; bg: string; badge: string }> = {
  TODO: {
    icon: "text-blue-500",
    border: "border-l-blue-400",
    bg: "bg-blue-500/5",
    badge: "bg-blue-500/10 text-blue-600",
  },
  IN_PROGRESS: {
    icon: "text-amber-500",
    border: "border-l-amber-400",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/10 text-amber-600",
  },
  DONE: {
    icon: "text-green-500",
    border: "border-l-green-400",
    bg: "bg-green-500/5",
    badge: "bg-green-500/10 text-green-600",
  },
};

export const STATUS_LABELS: Record<Status, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const STATUS_ICON_COMPONENTS: Record<Status, LucideIcon> = {
  TODO: AlertCircle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
};

export const POINT_COLORS: Record<Point, string> = {
  ACTION_POINT: "bg-purple-500/10 text-purple-600 border border-purple-200",
  AGREED: "bg-cyan-500/10 text-cyan-600 border border-cyan-200",
};

export const POINT_LABELS: Record<Point, string> = {
  ACTION_POINT: "Action Point",
  AGREED: "Agreed",
};

export function getOwnerInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function isActionItemOverdue(dueDate: string | null, status: Status): boolean {
  return !!(dueDate && status !== "DONE" && new Date(dueDate) < new Date());
}

export function formatTimeline(dueDate: string | null, options?: { year?: boolean }): string {
  if (!dueDate) return "—";

  return new Date(dueDate).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    ...(options?.year ? { year: "numeric" as const } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}
