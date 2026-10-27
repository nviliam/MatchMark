import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Player } from "../types/player";
import { formatPlayerLabel } from "../utils/players";
import type { BodyPart, EventDetails, MatchEvent, PendingEvent } from "../types/event";
import { createEventDetails, formatEventDetails, formatTimestamp, validateEventText } from "../utils/events";
import { EVENT_DEFINITIONS, isEventFieldOption, type EventDefinition, type EventFieldDefinition, type EventFieldId } from "../config/eventDefinitions";

type Props = {
  players: readonly Player[];
  pending: PendingEvent;
  initialEvent?: MatchEvent;
  disabled: boolean;
  onSave: (playerId: number | undefined, details: EventDetails) => void;
  onCancel: () => void;
};

type Step = EventFieldId | "player" | "review";
type Outcome = Extract<MatchEvent, { outcome: string }>["outcome"];

export default function EventForm({ players, pending, initialEvent, disabled, onSave, onCancel }: Props) {
  const definition: EventDefinition = EVENT_DEFINITIONS[pending.type];
  const steps: Step[] = definition.fields.map((field) => field.id);
  steps.push("player", "review");
  const [playerId, setPlayerId] = useState<number | null>(initialEvent?.playerId ?? null);
  const [outcome, setOutcome] = useState<Outcome | "">(initialEvent && "outcome" in initialEvent ? initialEvent.outcome : "");
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(initialEvent && "bodyPart" in initialEvent ? initialEvent.bodyPart : null);
  const [description, setDescription] = useState(initialEvent && "description" in initialEvent ? initialEvent.description : "");
  const [stepIndex, setStepIndex] = useState(initialEvent ? steps.length - 1 : 0);
  const stepRef = useRef<HTMLDivElement | null>(null);
  const step = steps[stepIndex];
  const field = definition.fields.find((entry) => entry.id === step);
  const stepLabel = field?.label ?? (step === "player" ? (definition.playerRequired ? "Player" : "Player (optional)") : "Review event");
  const details = createEventDetails(pending.type, outcome, bodyPart, description);
  const textValidation = field?.type === "text" ? validateEventText(field, description) : undefined;
  const player = players.find((entry) => entry.id === playerId);
  const isPlayerValid = playerId === null ? !definition.playerRequired : player !== undefined;
  const summary = [
    formatEventDetails({ type: pending.type, outcome, bodyPart, description }), playerId !== null && formatPlayerLabel(player),
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
    if (disabled || step !== "review" || !isPlayerValid || !details) return;
    onSave(player?.id, details);
  }

  return (
    <form className="event-form event-workflow panel" aria-label="Event details" onSubmit={handleSubmit}>
      <div className="workflow-summary" title={summary}>
        {initialEvent && <span className="workflow-step-label">Editing</span>}
        <span className="timestamp">{formatTimestamp(pending.timestamp)}</span>
        <span className="workflow-summary-text">{summary}</span>
      </div>
      <div className="workflow-step" key={step} ref={stepRef} tabIndex={-1}
        role="group" aria-label={stepLabel}>
        <span className="workflow-step-label">{stepLabel}</span>
        {field?.type === "options" && field.options.map((option) => (
          <button key={option.id} type="button" disabled={disabled}
            aria-pressed={(field.id === "outcome" ? outcome : bodyPart) === option.id}
            onClick={() => selectFieldOption(field, option.id)}>
            {option.label}
          </button>
        ))}
        {field?.type === "text" && (
          <>
            <label className="workflow-text-field">
              <span className="visually-hidden">{field.label}</span>
              <textarea name={field.id} value={description} rows={2} maxLength={field.maxLength}
                required={field.required} disabled={disabled} aria-describedby="event-text-hint"
                aria-invalid={description.length > 0 && !textValidation?.ok}
                onChange={(event) => setDescription(event.currentTarget.value)} />
            </label>
            <span className="workflow-text-hint" id="event-text-hint" aria-live="polite">
              {description.length > 0 && textValidation && !textValidation.ok
                ? textValidation.error : `${description.length}/${field.maxLength}${field.required ? " · Required" : ""}`}
            </span>
            <button type="button" disabled={disabled || !textValidation?.ok} onClick={advance}>Next</button>
          </>
        )}
        {step === "player" && !definition.playerRequired && (
          <button type="button" disabled={disabled} aria-pressed={playerId === null}
            onClick={() => { setPlayerId(null); advance(); }}>No player</button>
        )}
        {step === "player" && players.length === 0 && definition.playerRequired && (
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
          <button className="button-primary" type="submit" disabled={disabled || !isPlayerValid || !details}>Save</button>
        )}
      </div>
    </form>
  );
}
