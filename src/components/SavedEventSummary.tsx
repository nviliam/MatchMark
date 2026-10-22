import { players } from "../data/players";
import type { MatchEvent } from "../types/event";
import { formatPlayerLabel } from "../utils/players";
import { formatEventDetails, formatTimestamp } from "../utils/events";

type Props = { event: MatchEvent; onEdit: () => void; onDelete: () => void; disabled: boolean };

export default function SavedEventSummary({ event, onEdit, onDelete, disabled }: Props) {
  const player = players.find((entry) => entry.id === event.playerId);
  const summary = [
    formatPlayerLabel(player),
    formatEventDetails(event),
  ].filter(Boolean).join(" · ");

  return (
    <div className="saved-event-summary" role="status">
      <strong className="saved-event-label">Saved</strong>
      <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
      <span>{summary}</span>
      <button type="button" disabled={disabled} onClick={onEdit}>Edit</button>
      <button className="button-danger" type="button" disabled={disabled} onClick={onDelete}>Delete</button>
    </div>
  );
}
