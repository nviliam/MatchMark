import { useEffect, useRef } from "react";
import type { MatchEvent } from "../types/event";
import { getEventLabel, formatTimestamp } from "../utils/events";

type Props = {
  event: MatchEvent;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteEventConfirmation({ event, disabled, onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!disabled) cancelRef.current?.focus();
  }, [disabled]);

  return (
    <div className="saved-event-summary" role="group" aria-label="Delete this event?">
      <strong>Delete this event?</strong>
      <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
      <span>{getEventLabel(event.type)}</span>
      <button ref={cancelRef} type="button" disabled={disabled} onClick={onCancel}>Cancel</button>
      <button className="button-danger-confirm" type="button" disabled={disabled} onClick={onConfirm}>Delete</button>
    </div>
  );
}
