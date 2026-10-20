import type { Player } from "../types/player";

// Resolve the player from the roster at the call site; labels never enter saved events.
export function formatPlayerLabel(player?: Pick<Player, "name"> & Partial<Pick<Player, "number">>): string {
  if (!player) return "Unknown player";
  return player.number !== undefined && Number.isFinite(player.number)
    ? `#${player.number} ${player.name}`
    : player.name;
}
