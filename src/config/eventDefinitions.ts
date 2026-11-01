import type { EventType, MatchEvent } from "../types/event";

export type EventRail = "top" | "left" | "right";
export type EventCategory = "possession" | "defending" | "contest" | "other";
export type EventFieldId = "subtype" | "outcome" | "bodyPart" | "description";
export const CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH = 160;
export type EventFieldOption<Value extends string> = Readonly<{ id: Value; label: string }>;

// Distribute over domain events so each field keeps its own exact option IDs.
type FieldsFor<Event> = Event extends MatchEvent ? {
  [Field in EventFieldId]: Field extends keyof Event ? Field extends "description" ? Readonly<{
    id: Field;
    type: "text";
    label: string;
    required: boolean;
    maxLength: number;
  }> : Readonly<{
    id: Field;
    type: "options";
    label: string;
    required: boolean;
    options: readonly EventFieldOption<Extract<Event[Field], string>>[];
  }> : never;
}[EventFieldId] : never;

export type EventFieldDefinition = FieldsFor<MatchEvent>;
export type EventDefinition<Type extends EventType = EventType> = Readonly<{
  id: Type;
  label: string;
  category: EventCategory;
  order: number;
  rail: EventRail;
  playerRequired: boolean;
  fields: readonly FieldsFor<Extract<MatchEvent, { type: Type }>>[];
}>;

const shotOutcome = {
  type: "options",
  id: "outcome", label: "Outcome", required: true,
  options: [
    { id: "goal", label: "Goal" }, { id: "on-target", label: "On Target" },
    { id: "off-target", label: "Off Target" }, { id: "blocked", label: "Blocked" },
  ],
} as const satisfies EventFieldDefinition;

const bodyPart = {
  type: "options",
  id: "bodyPart", label: "Body Part", required: true,
  options: [{ id: "foot", label: "Foot" }, { id: "head", label: "Head" }, { id: "other", label: "Other" }],
} as const satisfies EventFieldDefinition;

const passOutcome = {
  type: "options",
  id: "outcome", label: "Outcome", required: true,
  options: [{ id: "completed", label: "Completed" }, { id: "incomplete", label: "Incomplete" }],
} as const satisfies EventFieldDefinition;

const dribbleOutcome = {
  type: "options",
  id: "outcome", label: "Outcome", required: true,
  options: [{ id: "successful", label: "Successful" }, { id: "unsuccessful", label: "Unsuccessful" }],
} as const satisfies EventFieldDefinition;

const contestOutcome = {
  type: "options",
  id: "outcome", label: "Outcome", required: true,
  options: [{ id: "won", label: "Won" }, { id: "lost", label: "Lost" }],
} as const satisfies EventFieldDefinition;

const passSubtype = {
  type: "options", id: "subtype", label: "Pass type", required: true,
  options: [{ id: "regular", label: "Regular" }, { id: "key-pass", label: "Key Pass" }, { id: "long-ball", label: "Long Ball" }],
} as const satisfies EventFieldDefinition;

const goalkeeperSubtype = {
  type: "options", id: "subtype", label: "Goalkeeper type", required: true,
  options: [{ id: "save", label: "Save" }, { id: "catch", label: "Catch" }],
} as const satisfies EventFieldDefinition;

// Keys are stable domain IDs. Changing a label never rewrites saved events.
export const EVENT_DEFINITIONS = {
  pass: { id: "pass", label: "Pass", category: "possession", order: 10, rail: "top", playerRequired: true, fields: [passSubtype, passOutcome] },
  shot: { id: "shot", label: "Shot", category: "possession", order: 20, rail: "top", playerRequired: true, fields: [shotOutcome, bodyPart] },
  cross: { id: "cross", label: "Cross", category: "possession", order: 30, rail: "top", playerRequired: true, fields: [passOutcome] },
  dribble: { id: "dribble", label: "Dribble", category: "possession", order: 40, rail: "top", playerRequired: true, fields: [dribbleOutcome] },
  "ball-control": { id: "ball-control", label: "Ball Control", category: "possession", order: 50, rail: "top", playerRequired: true, fields: [dribbleOutcome] },
  "ball-loss": { id: "ball-loss", label: "Ball Loss", category: "possession", order: 60, rail: "top", playerRequired: true, fields: [] },
  goal: { id: "goal", label: "Goal", category: "other", order: 70, rail: "left", playerRequired: true, fields: [] },
  chance: { id: "chance", label: "Chance", category: "other", order: 80, rail: "left", playerRequired: true, fields: [] },
  goalkeeper: { id: "goalkeeper", label: "Goalkeeper", category: "other", order: 90, rail: "left", playerRequired: true, fields: [goalkeeperSubtype] },
  custom: { id: "custom", label: "Custom", category: "other", order: 100, rail: "left", playerRequired: false,
    fields: [{ id: "description", type: "text", label: "Description", required: true, maxLength: CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH }] },
  tackle: { id: "tackle", label: "Tackle", category: "defending", order: 110, rail: "right", playerRequired: true, fields: [contestOutcome] },
  interception: { id: "interception", label: "Interception", category: "defending", order: 120, rail: "right", playerRequired: true, fields: [] },
  clearance: { id: "clearance", label: "Clearance", category: "defending", order: 130, rail: "right", playerRequired: true, fields: [] },
  "ball-recovery": { id: "ball-recovery", label: "Ball Recovery", category: "defending", order: 140, rail: "right", playerRequired: true, fields: [] },
  "aerial-duel": { id: "aerial-duel", label: "Aerial Duel", category: "contest", order: 150, rail: "right", playerRequired: true, fields: [contestOutcome] },
} as const satisfies { [Type in EventType]: EventDefinition<Type> };

export const ORDERED_EVENT_TYPES: readonly EventType[] = Object.freeze(
  Object.values(EVENT_DEFINITIONS).sort((a, b) => a.order - b.order).map((definition) => definition.id),
);

export function isEventType(value: string): value is EventType {
  return Object.hasOwn(EVENT_DEFINITIONS, value);
}

// Keep the strict domain model, but tolerate unknown IDs at the display boundary.
export function getEventDefinition(type: string): EventDefinition | undefined {
  return isEventType(type) ? EVENT_DEFINITIONS[type] : undefined;
}

export function getEventLabel(type: string): string {
  return getEventDefinition(type)?.label ?? "Unknown event";
}

export function isEventFieldOption<Value extends string>(
  field: { readonly options: readonly EventFieldOption<Value>[] } | undefined,
  value: string,
): value is Value {
  return field?.options.some((option) => option.id === value) ?? false;
}

export function getEventFieldOptionLabel(field: Extract<EventFieldDefinition, { type: "options" }>, value: string | null | undefined): string | undefined {
  return field.options.find((option) => option.id === value)?.label;
}
