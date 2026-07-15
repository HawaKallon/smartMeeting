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

export const CATEGORY_COLORS: Record<PublicEventCategory, string> = {
  CONFERENCE: "border-[#c9d9f2] bg-[#edf3fd] text-[#003580]",
  MEETING: "border-[#cfe5d7] bg-[#edf8f1] text-[#007236]",
  ANNOUNCEMENT: "border-[#fde8a6] bg-[#fff7dd] text-[#9a6800]",
  WORKSHOP: "border-[#c9d9f2] bg-[#eef4ff] text-[#003580]",
  TRAINING: "border-[#fde8a6] bg-[#fff8e5] text-[#8d6400]",
  PUBLIC_NOTICE: "border-[#fde8a6] bg-[#fff7dd] text-[#9a6800]",
  OTHER: "border-slate-200 bg-slate-50 text-slate-700",
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

export function getCategoryColor(category?: PublicEventCategory | null): string {
  if (!category) return "border-slate-200 bg-slate-50 text-slate-700";
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
}
