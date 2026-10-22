import { players } from "../data/players";
import type { MatchEvent } from "../types/event";
import { formatPlayerLabel } from "../utils/players";
import { formatEventDetails, formatTimestamp } from "../utils/events";

type Props = { events: MatchEvent[]; disabled: boolean; onSeek: (timestamp: number) => void };

export default function EventList({ events, disabled, onSeek }: Props) {
  if (events.length === 0) return <p className="events-empty">No events yet.</p>;

  return (
    <ul className="event-list" aria-label="Saved events">
      {events.map((event) => {
        const player = players.find((player) => player.id === event.playerId);
        return (
          <li key={event.id}>
            <button type="button" disabled={disabled} onClick={() => onSeek(event.timestamp)}>
              <span className="event-list-heading">
                <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
                <strong>{formatPlayerLabel(player)}</strong>
              </span>
              <span className="event-list-details">
                {formatEventDetails(event)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
