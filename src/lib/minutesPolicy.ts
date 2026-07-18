// Minutes lifecycle policies: archival and edit-window enforcement

export const MINUTES_ARCHIVE_MONTHS = 6;
export const MINUTES_EDIT_WINDOW_DAYS = 2;

export function isMinutesArchived(eventStartAt: Date): boolean {
  const cutoff = new Date(eventStartAt);
  cutoff.setMonth(cutoff.getMonth() + MINUTES_ARCHIVE_MONTHS);
  return cutoff.getTime() < Date.now();
}

export function isMinutesEditWindowClosed(eventEndAt: Date): boolean {
  return eventEndAt.getTime() + MINUTES_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000 < Date.now();
}
