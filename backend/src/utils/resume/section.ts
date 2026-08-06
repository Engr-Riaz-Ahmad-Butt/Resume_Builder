/**
 * Backend stub of getSectionTitle — frontend uses Lingui for localization.
 * FLAG: localized titles remain a frontend concern.
 */
export function getSectionTitle(type: string): string {
  if (!type) return "";
  return type
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
