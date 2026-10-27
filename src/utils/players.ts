import type { Player } from "../types/player";

// An absent relationship is valid; an unresolved relationship is an unknown player.
export function formatEventPlayer(playerId: Player["id"] | undefined, players: readonly Player[]): string {
  return playerId === undefined ? "" : formatPlayerLabel(players.find((player) => player.id === playerId));
}

// Resolve the player from the roster at the call site; labels never enter saved events.
export function formatPlayerLabel(player?: Pick<Player, "name"> & Partial<Pick<Player, "number">>): string {
  if (!player) return "Unknown player";
  return player.number !== undefined && Number.isFinite(player.number)
    ? `#${player.number} ${player.name}`
    : player.name;
}
