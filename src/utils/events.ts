import type { BaseEvent, BodyPart, EventDetails, EventType, MatchEvent } from "../types/event";

import { EVENT_DEFINITIONS, getEventDefinition, getEventFieldOptionLabel, getEventLabel, isEventFieldOption, type EventFieldDefinition } from "../config/eventDefinitions.ts";

export { getEventLabel } from "../config/eventDefinitions.ts";

// Shared display boundary for saved events and partially completed drafts.
export function formatEventDetails(event: { type: string; outcome?: string; bodyPart?: string | null; description?: string }): string {
  const fields = getEventDefinition(event.type)?.fields ?? [];
  return [getEventLabel(event.type), ...fields.map((field) => field.type === "text"
    ? event[field.id]?.trim() : getEventFieldOptionLabel(field, event[field.id]))]
    .filter(Boolean).join(" · ");
}

// Keep domain construction explicit to preserve the discriminated union without casts.
// Option validation shares the workflow metadata; returned objects contain domain data only.
export function validateEventText(field: Extract<EventFieldDefinition, { type: "text" }>, input: string):
  { ok: true; value: string } | { ok: false; error: string } {
  const value = input.trim();
  if (field.required && !value) return { ok: false, error: `${field.label} is required.` };
  if (value.length > field.maxLength) return { ok: false, error: `${field.label} must be at most ${field.maxLength} characters.` };
  return { ok: true, value };
}

export function createEventDetails(type: EventType, outcome: string, bodyPart: BodyPart | null, description = ""): EventDetails | null {
  switch (type) {
    case "custom": {
      const result = validateEventText(EVENT_DEFINITIONS.custom.fields[0], description);
      return result.ok ? { type, description: result.value } : null;
    }
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

// Assemble the domain union without weakening the required player on existing events.
export function createMatchEvent(details: EventDetails, base: Omit<BaseEvent, "playerId">, playerId?: number): MatchEvent | null {
  if (details.type === "custom") {
    const result = validateEventText(EVENT_DEFINITIONS.custom.fields[0], details.description);
    return result.ok ? { ...base, type: details.type, description: result.value,
      ...(playerId === undefined ? {} : { playerId }) } : null;
  }
  return playerId === undefined ? null : { ...details, ...base, playerId };
}

export function formatTimestamp(timestamp: number) {
  const totalSeconds = Math.floor(timestamp);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
