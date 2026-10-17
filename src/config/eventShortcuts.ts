import type { EventType } from "../types/event";

import { ORDERED_EVENT_TYPES } from "./eventDefinitions.ts";

export type EventShortcuts = Readonly<Record<EventType, string>>;

export const DEFAULT_EVENT_SHORTCUTS: EventShortcuts = Object.freeze({
  pass: "q",
  "key-pass": "w",
  shot: "e",
  duel: "r",
  "ball-loss": "t",
  dribble: "a",
  "progressive-carry": "y",
  tackle: "z",
  interception: "h",
  "ball-recovery": "n",
});

export const EVENT_SHORTCUT_TYPES = ORDERED_EVENT_TYPES;
export const EVENT_SHORTCUTS_STORAGE_KEY = "matchmark:event-shortcuts";

export function normalizeShortcutKey(key: string): string {
  return key.normalize("NFC").toLowerCase();
}

export function formatShortcutKey(key: string): string {
  return normalizeShortcutKey(key).toUpperCase();
}

export function getShortcutKeyError(key: string, code?: string): string | null {
  const normalized = normalizeShortcutKey(key);
  // Shift can change event.key (e.g. Digit3 becomes #), but the physical seek key is reserved too.
  const seekKey = code && /^Digit[234]$/.test(code) ? code.slice(5) : normalized;
  if (seekKey === "2" || seekKey === "3" || seekKey === "4") {
    return `${seekKey} is reserved for Quick Seek.`;
  }
  // A single printable key only: no whitespace, control keys, dead keys or modifier names.
  if (!/^[\p{L}\p{N}\p{P}\p{S}]$/u.test(normalized)) {
    return "Choose a single letter, number or symbol.";
  }
  return null;
}

export function findEventShortcut(shortcuts: EventShortcuts, key: string): EventType | undefined {
  // Iterate known event types without maintaining a second key-to-event mapping.
  const normalized = normalizeShortcutKey(key);
  return EVENT_SHORTCUT_TYPES.find((type) => normalizeShortcutKey(shortcuts[type]) === normalized);
}

export function validateEventShortcuts(value: unknown): EventShortcuts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== EVENT_SHORTCUT_TYPES.length) return null;

  const normalized = {} as Record<EventType, string>;
  const usedKeys = new Set<string>();
  for (const type of EVENT_SHORTCUT_TYPES) {
    if (!Object.hasOwn(record, type) || typeof record[type] !== "string") return null;
    const key = normalizeShortcutKey(record[type]);
    if (getShortcutKeyError(key) || usedKeys.has(key)) return null;
    normalized[type] = key;
    usedKeys.add(key);
  }
  return normalized;
}

export function loadEventShortcuts(): EventShortcuts {
  try {
    const stored = window.localStorage.getItem(EVENT_SHORTCUTS_STORAGE_KEY);
    if (stored !== null) {
      const validated = validateEventShortcuts(JSON.parse(stored));
      if (validated) return validated;
    }
  } catch {
    // Invalid JSON or unavailable storage must not prevent offline analysis.
  }
  return { ...DEFAULT_EVENT_SHORTCUTS };
}

export function persistEventShortcuts(shortcuts: EventShortcuts): void {
  try {
    window.localStorage.setItem(EVENT_SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
  } catch {
    // In-memory settings remain usable when the browser denies storage access.
  }
}
