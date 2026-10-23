import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Player } from "../types/player";
import { formatPlayerLabel } from "../utils/players";
import { PLAYER_NAME_MAX_LENGTH, validatePlayerInput } from "../utils/roster";
import PanelCloseIcon from "./PanelCloseIcon";

type Props = {
  players: readonly Player[];
  onAdd: (name: string, number: string) => boolean;
  onUpdate: (id: Player["id"], name: string, number: string) => boolean;
  onClose: () => void;
};

export default function PlayersPanel({ players, onAdd, onUpdate, onClose }: Props) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<Player["id"] | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { closeRef.current?.focus(); }, []);

  const resetForm = useCallback(() => {
    setEditingPlayerId(null);
    setName("");
    setNumber("");
    setError("");
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (editingPlayerId === null) return;
    function handleEditEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat || event.isComposing || event.defaultPrevented
        || event.ctrlKey || event.altKey || event.metaKey) return;
      // Consume Edit cancellation before the workspace's bubble-phase panel close.
      event.preventDefault();
      resetForm();
    }
    window.addEventListener("keydown", handleEditEscape, true);
    return () => window.removeEventListener("keydown", handleEditEscape, true);
  }, [editingPlayerId, resetForm]);

  function handleEdit(player: Player) {
    if (editingPlayerId !== null) return;
    setEditingPlayerId(player.id);
    setName(player.name);
    setNumber(player.number === undefined ? "" : String(player.number));
    setError("");
    nameRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validatePlayerInput(name, number);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const saved = editingPlayerId === null ? onAdd(name, number) : onUpdate(editingPlayerId, name, number);
    if (saved) resetForm();
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
        <form className="add-player-form" aria-label={editingPlayerId === null ? "Add player" : "Edit player"} aria-describedby={error ? "add-player-error" : undefined}
          noValidate onSubmit={handleSubmit}>
          <h3>{editingPlayerId === null ? "Add player" : "Edit player"}</h3>
          <label>Name
            <input ref={nameRef} name="playerName" value={name} required maxLength={PLAYER_NAME_MAX_LENGTH}
              onChange={(event) => { setName(event.currentTarget.value); setError(""); }} />
          </label>
          <label>Shirt number <span className="optional-field">(optional, 0–99)</span>
            <input name="shirtNumber" value={number} inputMode="numeric"
              onChange={(event) => { setNumber(event.currentTarget.value); setError(""); }} />
          </label>
          {error && <p className="player-form-error" id="add-player-error" role="alert">{error}</p>}
          <div className="player-form-actions">
            <button type="submit">{editingPlayerId === null ? "Add player" : "Save changes"}</button>
            {editingPlayerId !== null && <button type="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
        {players.length === 0 ? <p className="events-empty">No players yet.</p> : (
          <ul className="roster-list" aria-label="Current players">
            {players.map((player) => <li key={player.id}>
              <span>{formatPlayerLabel(player)}</span>
              <button type="button" className="player-edit-button" aria-label={`Edit ${formatPlayerLabel(player)}`}
                disabled={editingPlayerId !== null} onClick={() => handleEdit(player)}>Edit</button>
            </li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
