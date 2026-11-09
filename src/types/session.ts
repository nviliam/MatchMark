import type { MatchEvent } from "./event";
import type { Player } from "./player";

export const SESSION_SCHEMA_VERSION = 1;

export type MatchMetadata = {
  homeTeam?: string;
  awayTeam?: string;
  date?: string;
};

// A matching hint only; neither a file path nor proof of file identity.
export type SessionVideoMetadata = {
  fileName: string;
  fileSize: number | null;
  duration: number | null;
};

export type MatchMarkSession = {
  schemaVersion: typeof SESSION_SCHEMA_VERSION;
  createdAt: string;
  exportedAt: string;
  match: MatchMetadata;
  video: SessionVideoMetadata;
  players: Player[];
  events: MatchEvent[];
  nextPlayerId: number;
  nextEventId: number;
};
