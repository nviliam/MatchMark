import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Player } from "../types/player";
import { formatPlayerLabel } from "../utils/players";
import type { BodyPart, EventDetails, MatchEvent, PendingEvent } from "../types/event";
import { createEventDetails, formatEventDetails, formatTimestamp } from "../utils/events";
import { EVENT_DEFINITIONS, isEventFieldOption, type EventDefinition, type EventFieldDefinition, type EventFieldId } from "../config/eventDefinitions";

type Props = {
  players: readonly Player[];
  pending: PendingEvent;
  initialEvent?: MatchEvent;
  disabled: boolean;
  onSave: (playerId: number, details: EventDetails) => void;
  onCancel: () => void;
};

type Step = EventFieldId | "player" | "review";
type Outcome = Extract<MatchEvent, { outcome: string }>["outcome"];

export default function EventForm({ players, pending, initialEvent, disabled, onSave, onCancel }: Props) {
  const definition: EventDefinition = EVENT_DEFINITIONS[pending.type];
  const steps: Step[] = definition.fields.map((field) => field.id);
  if (definition.playerRequired) steps.push("player");
  steps.push("review");
  const [playerId, setPlayerId] = useState<number | null>(initialEvent?.playerId ?? null);
  const [outcome, setOutcome] = useState<Outcome | "">(initialEvent && "outcome" in initialEvent ? initialEvent.outcome : "");
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(initialEvent && "bodyPart" in initialEvent ? initialEvent.bodyPart : null);
  const [stepIndex, setStepIndex] = useState(initialEvent ? steps.length - 1 : 0);
  const stepRef = useRef<HTMLDivElement | null>(null);
  const step = steps[stepIndex];
  const field = definition.fields.find((entry) => entry.id === step);
  const stepLabel = field?.label ?? (step === "player" ? "Player" : "Review event");
  const details = createEventDetails(pending.type, outcome, bodyPart);
  const player = players.find((entry) => entry.id === playerId);
  const summary = [
    formatEventDetails({ type: pending.type, outcome, bodyPart }), playerId !== null && formatPlayerLabel(player),
  ].filter(Boolean).join(" · ");

  useEffect(() => {
    if (!disabled) stepRef.current?.focus();
  }, [step, disabled]);

  function advance() {
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function selectFieldOption(field: EventFieldDefinition, value: string) {
    if (field.id === "outcome" && isEventFieldOption(field, value)) setOutcome(value);
    else if (field.id === "bodyPart" && isEventFieldOption(field, value)) setBodyPart(value);
    else return;
    advance();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || step !== "review" || !player || !details) return;
    onSave(player.id, details);
  }

  return (
    <form className="event-form event-workflow panel" aria-label="Event details" onSubmit={handleSubmit}>
      <div className="workflow-summary">
        {initialEvent && <span className="workflow-step-label">Editing</span>}
        <span className="timestamp">{formatTimestamp(pending.timestamp)}</span>
        <span>{summary}</span>
      </div>
      <div className="workflow-step" key={step} ref={stepRef} tabIndex={-1}
        role="group" aria-label={stepLabel}>
        <span className="workflow-step-label">{stepLabel}</span>
        {field && field.options.map((option) => (
          <button key={option.id} type="button" disabled={disabled}
            aria-pressed={(field.id === "outcome" ? outcome : bodyPart) === option.id}
            onClick={() => selectFieldOption(field, option.id)}>
            {option.label}
          </button>
        ))}
        {step === "player" && players.length === 0 && (
          <span role="status">No players available. Cancel this event and add a player in Players.</span>
        )}
        {step === "player" && players.map((entry) => (
          <button key={entry.id} type="button" disabled={disabled} aria-pressed={playerId === entry.id}
            onClick={() => { setPlayerId(entry.id); advance(); }}>
            {formatPlayerLabel(entry)}
          </button>
        ))}
      </div>
      <div className="event-form-actions">
        {stepIndex > 0 && (
          <button type="button" disabled={disabled} onClick={() => setStepIndex((index) => index - 1)}>Back</button>
        )}
        <button type="button" disabled={disabled} onClick={onCancel}>Cancel</button>
        {step === "review" && (
          <button className="button-primary" type="submit" disabled={disabled || !player || !details}>Save</button>
        )}
      </div>
    </form>
  );
}
