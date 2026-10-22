import type { BodyPart, EventDetails, EventType } from "../types/event";

import { EVENT_DEFINITIONS, getEventDefinition, getEventFieldOptionLabel, getEventLabel, isEventFieldOption } from "../config/eventDefinitions.ts";

export { getEventLabel } from "../config/eventDefinitions.ts";

// Shared display boundary for saved events and partially completed drafts.
export function formatEventDetails(event: { type: string; outcome?: string; bodyPart?: string | null }): string {
  const fields = getEventDefinition(event.type)?.fields ?? [];
  return [getEventLabel(event.type), ...fields.map((field) => getEventFieldOptionLabel(field, event[field.id]))]
    .filter(Boolean).join(" · ");
}

// Keep domain construction explicit to preserve the discriminated union without casts.
// Option validation shares the workflow metadata; returned objects contain domain data only.
export function createEventDetails(type: EventType, outcome: string, bodyPart: BodyPart | null): EventDetails | null {
  switch (type) {
    case "shot":
      if (bodyPart && isEventFieldOption(EVENT_DEFINITIONS.shot.fields.find((field) => field.id === "outcome"), outcome)) {
        return { type, outcome, bodyPart };
      }
      return null;
    case "pass":
      return isEventFieldOption(EVENT_DEFINITIONS.pass.fields.find((field) => field.id === "outcome"), outcome) ? { type, outcome } : null;
    case "dribble":
      return isEventFieldOption(EVENT_DEFINITIONS.dribble.fields.find((field) => field.id === "outcome"), outcome) ? { type, outcome } : null;
    case "tackle":
    case "duel":
      return isEventFieldOption(EVENT_DEFINITIONS[type].fields.find((field) => field.id === "outcome"), outcome) ? { type, outcome } : null;
    case "key-pass":
    case "progressive-carry":
    case "interception":
    case "ball-recovery":
    case "ball-loss":
      return { type };
  }
}

export function formatTimestamp(timestamp: number) {
  const totalSeconds = Math.floor(timestamp);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
