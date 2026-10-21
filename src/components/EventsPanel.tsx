import { useEffect, useRef } from "react";
import type { MatchEvent } from "../types/event";
import type { Player } from "../types/player";
import { getEventLabel, isEventType, ORDERED_EVENT_TYPES } from "../config/eventDefinitions";
import type { EventTypeFilter, PlayerFilter } from "../utils/eventFiltering";
import { formatPlayerLabel } from "../utils/players";
import EventList from "./EventList";

type Props = {
  events: MatchEvent[];
  totalEventCount: number;
  selectedEventType: EventTypeFilter;
  onEventTypeChange: (type: EventTypeFilter) => void;
  players: readonly Player[];
  selectedPlayerId: PlayerFilter;
  onPlayerChange: (playerId: PlayerFilter) => void;
  onClose: () => void;
  onSeek: (timestamp: number) => void;
  onStartReview: () => void;
};

export default function EventsPanel({ events, totalEventCount, selectedEventType, onEventTypeChange,
  players, selectedPlayerId, onPlayerChange, onClose, onSeek, onStartReview }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  return (
    <section className="events-panel" id="events-panel" role="dialog" aria-labelledby="events-panel-title">
      <header className="events-panel-header">
        <h2 id="events-panel-title">Events <span className="events-count" role="status" aria-live="polite">· {events.length}</span></h2>
        <button ref={closeButtonRef} type="button" aria-label="Close events" onClick={onClose}>×</button>
      </header>
      <label className="events-filter">
        <span>Event type</span>
        <select value={selectedEventType} onChange={(event) => {
          const value = event.currentTarget.value;
          if (value === "all" || isEventType(value)) onEventTypeChange(value);
        }}>
          <option value="all">All</option>
          {ORDERED_EVENT_TYPES.map((type) => <option key={type} value={type}>{getEventLabel(type)}</option>)}
        </select>
      </label>
      <label className="events-filter">
        <span>Player</span>
        <select value={selectedPlayerId} onChange={(event) => {
          const value = event.currentTarget.value;
          if (value === "all") onPlayerChange("all");
          else {
            const player = players.find((entry) => String(entry.id) === value);
            if (player) onPlayerChange(player.id);
          }
        }}>
          <option value="all">All players</option>
          {players.map((player) => <option key={player.id} value={player.id}>{formatPlayerLabel(player)}</option>)}
        </select>
      </label>
      <div className="events-panel-content">
        {totalEventCount > 0 && events.length === 0
          ? <p className="events-empty">No events match these filters.</p>
          : <EventList events={events} disabled={false} onSeek={onSeek} />}
      </div>
      <div className="events-panel-footer">
        <button type="button" disabled={events.length === 0} onClick={onStartReview}>
          Review {events.length} {events.length === 1 ? "event" : "events"}
        </button>
      </div>
    </section>
  );
}
