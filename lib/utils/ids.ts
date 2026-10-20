/**
 * Returns a random id for pads and profiles. Uses `crypto.randomUUID` where available (secure
 * contexts) and falls back to Math.random for plain-HTTP LAN testing, where it is undefined.
 */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
