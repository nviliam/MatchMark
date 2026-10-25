import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Player } from "../types/player";
import type { MatchEvent } from "../types/event";
import { formatPlayerLabel } from "../utils/players";
import { getPlayerEventCount, PLAYER_NAME_MAX_LENGTH, validatePlayerInput } from "../utils/roster";
import PanelCloseIcon from "./PanelCloseIcon";

type Props = {
  players: readonly Player[];
  events: readonly MatchEvent[];
  onAdd: (name: string, number: string) => boolean;
  onUpdate: (id: Player["id"], name: string, number: string) => boolean;
  onDelete: (id: Player["id"]) => boolean;
  onClose: () => void;
};

export default function PlayersPanel({ players, events, onAdd, onUpdate, onDelete, onClose }: Props) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<Player["id"] | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<Player["id"] | null>(null);
  const deletingPlayer = players.find((player) => player.id === deletingPlayerId);
  const referenceCount = deletingPlayerId === null ? 0 : getPlayerEventCount(events, deletingPlayerId);
  const mutationActive = editingPlayerId !== null || deletingPlayerId !== null;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    if (deletingPlayerId !== null) cancelDeleteRef.current?.focus();
  }, [deletingPlayerId]);

  const resetForm = useCallback(() => {
    setEditingPlayerId(null);
    setDeletingPlayerId(null);
    setName("");
    setNumber("");
    setError("");
    (nameRef.current ?? closeRef.current)?.focus();
  }, []);

  useEffect(() => {
    if (!mutationActive) return;
    function handleMutationEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat || event.isComposing || event.defaultPrevented
        || event.ctrlKey || event.altKey || event.metaKey) return;
      // Cancel Edit/Delete before the workspace's bubble-phase panel close.
      event.preventDefault();
      resetForm();
    }
    window.addEventListener("keydown", handleMutationEscape, true);
    return () => window.removeEventListener("keydown", handleMutationEscape, true);
  }, [mutationActive, resetForm]);

  function handleEdit(player: Player) {
    if (mutationActive) return;
    setEditingPlayerId(player.id);
    setName(player.name);
    setNumber(player.number === undefined ? "" : String(player.number));
    setError("");
    nameRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deletingPlayerId !== null) return;
    const result = validatePlayerInput(name, number);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const saved = editingPlayerId === null ? onAdd(name, number) : onUpdate(editingPlayerId, name, number);
    if (saved) resetForm();
  }

  function handleRequestDelete(id: Player["id"]) {
    if (mutationActive) return;
    setName("");
    setNumber("");
    setError("");
    setDeletingPlayerId(id);
  }

  function handleConfirmDelete() {
    if (editingPlayerId !== null || deletingPlayerId === null || !deletingPlayer) return;
    if (onDelete(deletingPlayerId)) resetForm();
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
        {deletingPlayerId !== null ? (
          <div className="player-delete-confirmation" role="group" aria-labelledby="player-delete-title" aria-describedby="player-delete-warning">
            <h3 id="player-delete-title">Delete {formatPlayerLabel(deletingPlayer)}?</h3>
            <p id="player-delete-warning">
              {referenceCount === 0 ? "No saved events reference this player. Saved events will be kept."
                : `${referenceCount} saved ${referenceCount === 1 ? "event references" : "events reference"} this player. Those events will be kept, but the player will appear as "Unknown player".`}
            </p>
            <div className="player-form-actions">
              <button ref={cancelDeleteRef} type="button" onClick={resetForm}>Cancel</button>
              <button className="player-delete-confirm" type="button" disabled={!deletingPlayer} onClick={handleConfirmDelete}>Delete player</button>
            </div>
          </div>
        ) : (
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
        )}
        {players.length === 0 ? <p className="events-empty">No players yet.</p> : (
          <ul className="roster-list" aria-label="Current players">
            {players.map((player) => <li key={player.id}>
              <span>{formatPlayerLabel(player)}</span>
              <button type="button" className="player-edit-button" aria-label={`Edit ${formatPlayerLabel(player)}`}
                disabled={mutationActive} onClick={() => handleEdit(player)}>Edit</button>
              <button type="button" className="player-delete-button" aria-label={`Delete ${formatPlayerLabel(player)}`}
                disabled={mutationActive} onClick={() => handleRequestDelete(player.id)}>Delete</button>
            </li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
