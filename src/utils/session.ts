import type { MatchEvent } from "../types/event";
import type { Player } from "../types/player";
import { SESSION_SCHEMA_VERSION, type MatchMarkSession, type MatchMetadata, type SessionVideoMetadata } from "../types/session";

type SnapshotInput = {
  events: readonly MatchEvent[];
  players: readonly Player[];
  video: SessionVideoMetadata;
  nextPlayerId: number;
  nextEventId?: number;
  createdAt: string;
  exportedAt: string;
  match?: MatchMetadata;
};

export function createSessionSnapshot(input: SnapshotInput): MatchMarkSession {
  const { events, players, video, match = {} } = input;
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    createdAt: input.createdAt,
    exportedAt: input.exportedAt,
    match: {
      ...(match.homeTeam !== undefined ? { homeTeam: match.homeTeam } : {}),
      ...(match.awayTeam !== undefined ? { awayTeam: match.awayTeam } : {}),
      ...(match.date !== undefined ? { date: match.date } : {}),
    },
    video: {
      fileName: video.fileName,
      fileSize: video.fileSize,
      duration: video.duration !== null && Number.isFinite(video.duration) && video.duration >= 0
        ? video.duration : null,
    },
    players: players.map((player) => ({ ...player })),
    events: events.map((event) => ({ ...event })),
    nextPlayerId: input.nextPlayerId,
    // Import must initialize its allocator from this value, never from array length.
    nextEventId: input.nextEventId ?? events.reduce((highest, event) => Math.max(highest, event.id), 0) + 1,
  };
}

export function serializeSession(session: MatchMarkSession): string {
  return JSON.stringify(session, null, 2) + "\n";
}

export function getSessionFilename(session: MatchMarkSession): string {
  // Only an ISO date is used, so user-entered team names cannot become path segments.
  const date = /^\d{4}-\d{2}-\d{2}T/.test(session.exportedAt) ? session.exportedAt.slice(0, 10) : "undated";
  return `matchmark-session-${date}.json`;
}

export function downloadSession(session: MatchMarkSession): void {
  const blob = new Blob([serializeSession(session)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = getSessionFilename(session);
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    // Allow the browser to begin consuming the download before releasing the URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
