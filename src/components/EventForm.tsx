import { useEffect, useRef, useState, type FormEvent } from "react";
import { players } from "../data/players";
import type { BodyPart, EventDetails, MatchEvent, PendingEvent } from "../types/event";
import { bodyPartLabels, createEventDetails, getEventLabel, formatTimestamp, outcomeLabels, outcomeOptions } from "../utils/events";

type Props = {
  pending: PendingEvent;
  initialEvent?: MatchEvent;
  disabled: boolean;
  onSave: (playerId: number, details: EventDetails) => void;
  onCancel: () => void;
};

type Step = "outcome" | "bodyPart" | "player" | "review";
const stepLabels: Record<Step, string> = {
  outcome: "Outcome", bodyPart: "Body Part", player: "Player", review: "Review event",
};
const bodyParts: BodyPart[] = ["foot", "head", "other"];

export default function EventForm({ pending, initialEvent, disabled, onSave, onCancel }: Props) {
  const steps: Step[] = [];
  if (outcomeOptions[pending.type].length > 0) steps.push("outcome");
  if (pending.type === "shot") steps.push("bodyPart");
  steps.push("player", "review");
  const [playerId, setPlayerId] = useState<number | null>(initialEvent?.playerId ?? null);
  const [outcome, setOutcome] = useState<keyof typeof outcomeLabels | "">(initialEvent && "outcome" in initialEvent ? initialEvent.outcome : "");
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(initialEvent?.type === "shot" ? initialEvent.bodyPart : null);
  const [stepIndex, setStepIndex] = useState(initialEvent ? steps.length - 1 : 0);
  const stepRef = useRef<HTMLDivElement | null>(null);
  const step = steps[stepIndex];
  const details = createEventDetails(pending.type, outcome, bodyPart);
  const player = players.find((entry) => entry.id === playerId);
  const summary = [
    getEventLabel(pending.type), outcome && outcomeLabels[outcome],
    bodyPart && bodyPartLabels[bodyPart], player && `#${player.number} ${player.name}`,
  ].filter(Boolean).join(" · ");

  useEffect(() => {
    if (!disabled) stepRef.current?.focus();
  }, [step, disabled]);

  function advance() {
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
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
        role="group" aria-label={stepLabels[step]}>
        <span className="workflow-step-label">{stepLabels[step]}</span>
        {step === "outcome" && outcomeOptions[pending.type].map((value) => (
          <button key={value} type="button" disabled={disabled} aria-pressed={outcome === value}
            onClick={() => { setOutcome(value); advance(); }}>
            {outcomeLabels[value]}
          </button>
        ))}
        {step === "bodyPart" && bodyParts.map((value) => (
          <button key={value} type="button" disabled={disabled} aria-pressed={bodyPart === value}
            onClick={() => { setBodyPart(value); advance(); }}>
            {bodyPartLabels[value]}
          </button>
        ))}
        {step === "player" && players.map((entry) => (
          <button key={entry.id} type="button" disabled={disabled} aria-pressed={playerId === entry.id}
            onClick={() => { setPlayerId(entry.id); advance(); }}>
            #{entry.number} {entry.name}
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
