import { players } from "../data/players";
import type { MatchEvent } from "../types/event";
import { bodyPartLabels, eventLabels, formatTimestamp, outcomeLabels } from "../utils/events";

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
                <strong>{player ? `#${player.number} ${player.name}` : "Unknown player"}</strong>
              </span>
              <span className="event-list-details">
                {eventLabels[event.type]}
                {"outcome" in event && ` · ${outcomeLabels[event.outcome]}`}
                {event.type === "shot" && ` · ${bodyPartLabels[event.bodyPart]}`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
