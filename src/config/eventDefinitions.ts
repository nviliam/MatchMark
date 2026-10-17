import type { EventType } from "../types/event";

type EventDefinition = {
  label: string;
  order: number;
  rail: "top" | "left" | "right";
};

// Keys are stable domain IDs. Changing a label never rewrites saved events.
export const EVENT_DEFINITIONS = {
  pass: { label: "Pass", order: 10, rail: "top" },
  "key-pass": { label: "Key Pass", order: 20, rail: "top" },
  shot: { label: "Shot", order: 30, rail: "top" },
  duel: { label: "Duel", order: 40, rail: "top" },
  "ball-loss": { label: "Ball Loss", order: 50, rail: "top" },
  dribble: { label: "Dribble", order: 60, rail: "left" },
  "progressive-carry": { label: "Progressive Carry", order: 70, rail: "left" },
  tackle: { label: "Tackle", order: 80, rail: "right" },
  interception: { label: "Interception", order: 90, rail: "right" },
  "ball-recovery": { label: "Ball Recovery", order: 100, rail: "right" },
} as const satisfies Record<EventType, EventDefinition>;

export const ORDERED_EVENT_TYPES: readonly EventType[] = Object.freeze(
  (Object.keys(EVENT_DEFINITIONS) as EventType[])
    .sort((a, b) => EVENT_DEFINITIONS[a].order - EVENT_DEFINITIONS[b].order),
);

export function isEventType(value: string): value is EventType {
  return Object.hasOwn(EVENT_DEFINITIONS, value);
}

// Keep the strict domain model, but tolerate unknown IDs at the display boundary.
export function getEventLabel(type: string): string {
  return isEventType(type) ? EVENT_DEFINITIONS[type].label : "Unknown event";
}
