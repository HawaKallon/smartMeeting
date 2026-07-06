import type { PublicEventCategory } from "@/generated/prisma/enums";

export const CATEGORY_LABELS: Record<PublicEventCategory, string> = {
  CONFERENCE: "Conference",
  WORKSHOP: "Workshop",
  TRAINING: "Training",
  MEETING: "Meeting",
  ANNOUNCEMENT: "Announcement",
  PUBLIC_NOTICE: "Public Notice",
  OTHER: "Other",
};

export const CATEGORY_LIST: PublicEventCategory[] = [
  "CONFERENCE",
  "WORKSHOP",
  "TRAINING",
  "MEETING",
  "ANNOUNCEMENT",
  "PUBLIC_NOTICE",
  "OTHER",
];

export function getCategoryLabel(category?: PublicEventCategory | null): string {
  if (!category) return "Uncategorized";
  return CATEGORY_LABELS[category] || "Other";
}
