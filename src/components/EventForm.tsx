import { useState, type FormEvent } from "react";
import { players } from "../data/players";
import type { BodyPart, EventDetails, PendingEvent } from "../types/event";
import { bodyPartLabels, createEventDetails, eventLabels, formatTimestamp, outcomeLabels, outcomeOptions } from "../utils/events";

type Props = {
  pending: PendingEvent;
  disabled: boolean;
  onSave: (playerId: number, details: EventDetails) => void;
  onCancel: () => void;
};

const bodyParts: BodyPart[] = ["foot", "head", "other"];

export default function EventForm({ pending, disabled, onSave, onCancel }: Props) {
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState("");
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
  const details = createEventDetails(pending.type, outcome, bodyPart);
  const playerExists = players.some((player) => player.id === playerId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !playerExists || playerId === null || !details) return;
    onSave(playerId, details);
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h2>{eventLabels[pending.type]} – {formatTimestamp(pending.timestamp)}</h2>
      <label className="player-picker">
        Player
        <select value={playerId ?? ""} required onChange={(event) => {
          const value = event.currentTarget.value;
          setPlayerId(value === "" ? null : Number(value));
        }}>
          <option value="">Select a player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>{player.number} – {player.name}</option>
          ))}
        </select>
      </label>
      {outcomeOptions[pending.type].length > 0 && (
        <fieldset>
          <legend>Outcome</legend>
          {outcomeOptions[pending.type].map((value) => (
            <label key={value}>
              <input type="radio" name="outcome" checked={outcome === value}
                onChange={() => setOutcome(value)} required />
              {outcomeLabels[value]}
            </label>
          ))}
        </fieldset>
      )}
      {pending.type === "shot" && (
        <fieldset>
          <legend>Body Part</legend>
          {bodyParts.map((value) => (
            <label key={value}>
              <input type="radio" name="bodyPart" checked={bodyPart === value}
                onChange={() => setBodyPart(value)} required />
              {bodyPartLabels[value]}
            </label>
          ))}
        </fieldset>
      )}
      <div className="event-form-actions">
        <button type="submit" disabled={disabled || !playerExists || !details}>Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
