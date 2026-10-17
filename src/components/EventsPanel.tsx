import { useEffect, useRef } from "react";
import type { MatchEvent } from "../types/event";
import { getEventLabel, isEventType, ORDERED_EVENT_TYPES } from "../config/eventDefinitions";
import type { EventTypeFilter } from "../utils/eventFiltering";
import EventList from "./EventList";

type Props = {
  events: MatchEvent[];
  totalEventCount: number;
  selectedEventType: EventTypeFilter;
  onEventTypeChange: (type: EventTypeFilter) => void;
  onClose: () => void;
  onSeek: (timestamp: number) => void;
};

export default function EventsPanel({ events, totalEventCount, selectedEventType, onEventTypeChange, onClose, onSeek }: Props) {
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
      <div className="events-panel-content">
        {totalEventCount > 0 && events.length === 0
          ? <p className="events-empty">No events match this filter.</p>
          : <EventList events={events} disabled={false} onSeek={onSeek} />}
      </div>
    </section>
  );
}
