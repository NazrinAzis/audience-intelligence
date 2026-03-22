/**
 * Version-scoped localStorage helpers.
 *
 * Every user-created data key is prefixed with the active version string
 * so that V0–V5 each have completely isolated workspaces.
 *
 * The version preference itself (ai_version) is NOT scoped — it's global.
 */

const VERSION_KEY = "ai_version";
const VALID_VERSIONS = new Set(["v0", "v1", "v2", "v3", "v4", "v5"]);

/** Read the current version synchronously from localStorage. Defaults to "v1". */
export function getCurrentVersion(): string {
  if (typeof window === "undefined") return "v1";
  const v = localStorage.getItem(VERSION_KEY);
  return v && VALID_VERSIONS.has(v) ? v : "v1";
}

/** Return a version-scoped key: e.g. "v1_project_kcd2_segments" */
export function scopedKey(baseKey: string): string {
  return `${getCurrentVersion()}_${baseKey}`;
}

/** True if current version is v0 or v1 (single-segment, no project model). */
export function isV0orV1(): boolean {
  const v = getCurrentVersion();
  return v === "v0" || v === "v1";
}

/**
 * The Zustand persist store name, scoped to the current version.
 * Called once at module load time — store re-creates on version switch via page reload.
 */
export function getScopedStoreName(): string {
  return `${getCurrentVersion()}_nz-project-store-v2`;
}
