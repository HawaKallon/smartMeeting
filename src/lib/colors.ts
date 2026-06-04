import type { ColorCategory } from "@/generated/prisma/enums";

// PRD §6.5 — color-coded category styling for calendar, letters, notifications.

export const COLOR_META: Record<
  ColorCategory,
  { label: string; dot: string; badge: string }
> = {
  RED: {
    label: "Urgent / Cabinet",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-800",
  },
  AMBER: {
    label: "Internal",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
  },
  GREEN: {
    label: "Routine",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800",
  },
};
