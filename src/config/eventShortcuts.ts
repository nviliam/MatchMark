import type { EventType } from "../types/event";

export type EventShortcuts = Readonly<Record<EventType, string>>;

export const DEFAULT_EVENT_SHORTCUTS: EventShortcuts = {
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
};

export function normalizeShortcutKey(key: string): string {
  return key.normalize("NFC").toLowerCase();
}

export function findEventShortcut(shortcuts: EventShortcuts, key: string): EventType | undefined {
  // Iterate known event types without maintaining a second key-to-event mapping.
  for (const type in DEFAULT_EVENT_SHORTCUTS) {
    if (isEventType(type) && normalizeShortcutKey(shortcuts[type]) === normalizeShortcutKey(key)) return type;
  }
}

function isEventType(value: string): value is EventType {
  return Object.hasOwn(DEFAULT_EVENT_SHORTCUTS, value);
}
