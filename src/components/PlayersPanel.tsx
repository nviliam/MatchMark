import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Player } from "../types/player";
import { formatPlayerLabel } from "../utils/players";
import { PLAYER_NAME_MAX_LENGTH, validatePlayerInput } from "../utils/roster";
import PanelCloseIcon from "./PanelCloseIcon";

type Props = {
  players: readonly Player[];
  onAdd: (name: string, number: string) => boolean;
  onClose: () => void;
};

export default function PlayersPanel({ players, onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { closeRef.current?.focus(); }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validatePlayerInput(name, number);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!onAdd(name, number)) return;
    setName("");
    setNumber("");
    setError("");
    nameRef.current?.focus();
  }

  return (
    <section className="players-panel" id="players-panel" role="dialog" aria-labelledby="players-panel-title">
      <header className="players-panel-header">
        <h2 id="players-panel-title">Players</h2>
        <button ref={closeRef} className="panel-close-button" type="button" aria-label="Close players" onClick={onClose}>
          <PanelCloseIcon />
        </button>
      </header>
      <div className="players-panel-content">
        <form className="add-player-form" aria-label="Add player" aria-describedby={error ? "add-player-error" : undefined}
          noValidate onSubmit={handleSubmit}>
          <h3>Add player</h3>
          <label>Name
            <input ref={nameRef} name="playerName" value={name} required maxLength={PLAYER_NAME_MAX_LENGTH}
              onChange={(event) => { setName(event.currentTarget.value); setError(""); }} />
          </label>
          <label>Shirt number <span className="optional-field">(optional, 0–99)</span>
            <input name="shirtNumber" value={number} inputMode="numeric"
              onChange={(event) => { setNumber(event.currentTarget.value); setError(""); }} />
          </label>
          {error && <p className="player-form-error" id="add-player-error" role="alert">{error}</p>}
          <button type="submit">Add player</button>
        </form>
        {players.length === 0 ? <p className="events-empty">No players yet.</p> : (
          <ul className="roster-list" aria-label="Current players">
            {players.map((player) => <li key={player.id}>{formatPlayerLabel(player)}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
