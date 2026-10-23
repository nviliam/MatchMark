import { useEffect, useRef } from "react";
import type { MatchEvent } from "../types/event";
import type { Player } from "../types/player";
import { formatPlayerLabel } from "../utils/players";
import { formatEventDetails, formatTimestamp } from "../utils/events";

type Props = {
  players: readonly Player[];
  event: MatchEvent;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onExit: () => void;
};

export default function ReviewControls({ players, event, index, total, onPrevious, onNext, onExit }: Props) {
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const player = players.find((entry) => entry.id === event.playerId);

  useEffect(() => { controlsRef.current?.focus(); }, []);

  return (
    <div className="review-controls" role="group" aria-label="Event review" ref={controlsRef} tabIndex={-1}>
      <strong className="saved-event-label">Review</strong>
      <button type="button" disabled={index <= 0} onClick={onPrevious}>Previous</button>
      <span className="review-position" role="status" aria-live="polite">{index + 1} / {total}</span>
      <button type="button" disabled={index >= total - 1} onClick={onNext}>Next</button>
      <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
      <span>{formatPlayerLabel(player)}</span>
      <span>{formatEventDetails(event)}</span>
      <button type="button" onClick={onExit}>Exit Review</button>
    </div>
  );
}
