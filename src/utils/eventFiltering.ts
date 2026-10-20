import type { EventType, MatchEvent } from "../types/event";
import type { Player } from "../types/player";

// "all" belongs to the UI, never to a saved event.
export type EventTypeFilter = EventType | "all";
export type PlayerFilter = Player["id"] | "all";

export type EventFilters = Readonly<{
  eventType: EventTypeFilter;
  playerId: PlayerFilter;
}>;

export const DEFAULT_EVENT_FILTERS: EventFilters = Object.freeze({ eventType: "all", playerId: "all" });

export function getFilteredEvents(events: readonly MatchEvent[], filters: EventFilters): MatchEvent[] {
  const matching = events.filter((event) =>
    (filters.eventType === "all" || event.type === filters.eventType)
    && (filters.playerId === "all" || event.playerId === filters.playerId));
  // Only sort the derived array; retain the original objects and exact timestamps.
  return matching.sort((a, b) => a.timestamp - b.timestamp);
}
