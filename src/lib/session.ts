export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;

export function isSessionWithinIdleLimit(lastActivityAt: Date | null | undefined) {
  // Existing accounts receive their first activity timestamp on their next visit.
  if (!lastActivityAt) return true;

  return Date.now() - lastActivityAt.getTime() < SESSION_IDLE_TIMEOUT_MS;
}
