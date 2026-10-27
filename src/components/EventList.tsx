import type { Player } from "../types/player";
import type { MatchEvent } from "../types/event";
import { formatEventPlayer } from "../utils/players";
import { formatEventDetails, formatTimestamp } from "../utils/events";

type Props = { players: readonly Player[]; events: MatchEvent[]; disabled: boolean; onSeek: (timestamp: number) => void };

export default function EventList({ players, events, disabled, onSeek }: Props) {
  if (events.length === 0) return <p className="events-empty">No events yet.</p>;

  return (
    <ul className="event-list" aria-label="Saved events">
      {events.map((event) => {
        const playerLabel = formatEventPlayer(event.playerId, players);
        return (
          <li key={event.id}>
            <button type="button" disabled={disabled} onClick={() => onSeek(event.timestamp)}>
              <span className="event-list-heading">
                <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
                {playerLabel && <strong>{playerLabel}</strong>}
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
