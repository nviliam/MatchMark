import { players } from "../data/players";
import type { MatchEvent } from "../types/event";
import { bodyPartLabels, eventLabels, formatTimestamp, outcomeLabels } from "../utils/events";

type Props = { events: MatchEvent[]; disabled: boolean; onSeek: (timestamp: number) => void };

export default function EventList({ events, disabled, onSeek }: Props) {
  if (events.length === 0) return null;

  return (
    <ul className="event-list" aria-label="Recorded events">
      {events.map((event) => {
        const player = players.find((player) => player.id === event.playerId);
        return (
          <li key={event.id}>
            <button type="button" disabled={disabled} onClick={() => onSeek(event.timestamp)}>
              {formatTimestamp(event.timestamp)} – {player ? `#${player.number} ${player.name}` : "Unknown player"}
              {" – "}{eventLabels[event.type]}
              {"outcome" in event && ` – ${outcomeLabels[event.outcome]}`}
              {event.type === "shot" && ` – ${bodyPartLabels[event.bodyPart]}`}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
