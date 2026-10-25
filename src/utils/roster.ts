import type { Player } from "../types/player";
import type { MatchEvent } from "../types/event";

export const PLAYER_NAME_MAX_LENGTH = 80;
export type NewPlayer = Omit<Player, "id">;
type ValidationResult = { ok: true; value: NewPlayer } | { ok: false; error: string };

export function validatePlayerInput(rawName: string, rawNumber: string): ValidationResult {
  const name = rawName.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > PLAYER_NAME_MAX_LENGTH) {
    return { ok: false, error: `Name must be ${PLAYER_NAME_MAX_LENGTH} characters or fewer.` };
  }
  const number = rawNumber.trim();
  if (!number) return { ok: true, value: { name } };
  if (!/^\d+$/.test(number) || Number(number) > 99) {
    return { ok: false, error: "Shirt number must be a whole number from 0 to 99, or left blank." };
  }
  return { ok: true, value: { name, number: Number(number) } };
}

export function appendPlayer(players: readonly Player[], player: NewPlayer, id: Player["id"]): Player[] {
  return [...players, { ...player, id }];
}

export function removePlayer(players: readonly Player[], id: Player["id"]): Player[] {
  return players.filter((player) => player.id !== id);
}

export function getPlayerEventCount(events: readonly MatchEvent[], playerId: Player["id"]): number {
  return events.reduce((count, event) => count + Number(event.playerId === playerId), 0);
}

export function updatePlayer(players: readonly Player[], id: Player["id"], changes: NewPlayer): Player[] {
  return players.map((player) => player.id === id ? { ...changes, id: player.id } : player);
}
