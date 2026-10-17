import type { EventType, MatchEvent } from "../types/event";

// "all" belongs to the UI, never to a saved event.
export type EventTypeFilter = EventType | "all";

export function getFilteredEvents(events: readonly MatchEvent[], selectedEventType: EventTypeFilter): MatchEvent[] {
  const matching = selectedEventType === "all"
    ? [...events]
    : events.filter((event) => event.type === selectedEventType);
  // Only sort the derived array; retain the original objects and exact timestamps.
  return matching.sort((a, b) => a.timestamp - b.timestamp);
}
