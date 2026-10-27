import type { Player } from "../types/player";
import type { MatchEvent } from "../types/event";
import { formatEventPlayer } from "../utils/players";
import { formatEventDetails, formatTimestamp } from "../utils/events";

type Props = { players: readonly Player[]; event: MatchEvent; onEdit: () => void; onDelete: () => void; disabled: boolean };

export default function SavedEventSummary({ players, event, onEdit, onDelete, disabled }: Props) {
  const summary = [
    formatEventPlayer(event.playerId, players),
    formatEventDetails(event),
  ].filter(Boolean).join(" · ");

  return (
    <div className="saved-event-summary" role="status">
      <strong className="saved-event-label">Saved</strong>
      <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
      <span className="event-summary-text" title={summary}>{summary}</span>
      <button type="button" disabled={disabled} onClick={onEdit}>Edit</button>
      <button className="button-danger" type="button" disabled={disabled} onClick={onDelete}>Delete</button>
    </div>
  );
}
