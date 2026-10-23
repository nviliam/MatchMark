import type { Player } from "../types/player";

// Demo seed only. Runtime consumers receive the current React roster via props.
export const DEFAULT_PLAYERS: readonly Readonly<Player>[] = Object.freeze([
  { id: 1, name: "Kovács Péter", number: 9 },
  { id: 2, name: "Nagy Bence", number: 11 },
  { id: 3, name: "Tóth Ádám", number: 7 },
].map((player) => Object.freeze(player)));
