import { useEffect, useMemo, useRef } from "react";
import type { MatchEvent } from "../types/event";
import EventList from "./EventList";

type Props = {
  events: MatchEvent[];
  onClose: () => void;
  onSeek: (timestamp: number) => void;
};

export default function EventsPanel({ events, onClose, onSeek }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  // Saving after seeking backwards can leave the source history out of time order.
  const chronologicalEvents = useMemo(() => [...events].sort((a, b) => a.timestamp - b.timestamp), [events]);

  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  return (
    <section className="events-panel" id="events-panel" role="dialog" aria-labelledby="events-panel-title">
      <header className="events-panel-header">
        <h2 id="events-panel-title">Events</h2>
        <button ref={closeButtonRef} type="button" aria-label="Close events" onClick={onClose}>×</button>
      </header>
      <div className="events-panel-content">
        <EventList events={chronologicalEvents} disabled={false} onSeek={onSeek} />
      </div>
    </section>
  );
}
