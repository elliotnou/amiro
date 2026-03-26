/** Get the first name from a full name — everything except the last word. */
export function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0]
}
