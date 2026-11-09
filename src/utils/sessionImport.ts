import { getEventDefinition, isEventType } from "../config/eventDefinitions";
import type { BodyPart, MatchEvent } from "../types/event";
import type { Player } from "../types/player";
import { SESSION_SCHEMA_VERSION, type MatchMarkSession, type MatchMetadata } from "../types/session";
import { createEventDetails, createMatchEvent, validateEventText } from "./events";
import { validatePlayerInput } from "./roster";

export type SessionImportErrorCode = "read" | "empty" | "json" | "session" | "version" | "players" | "events" | "references" | "allocator";
export type SessionValidationResult =
  | { valid: true; session: MatchMarkSession }
  | { valid: false; error: { code: SessionImportErrorCode; message: string } };

export function sessionImportError(code: SessionImportErrorCode, message: string): SessionValidationResult {
  return { valid: false, error: { code, message } };
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const id = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value < Number.MAX_SAFE_INTEGER;
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const date = (value: unknown): value is string => typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));

export function validateSession(value: unknown): SessionValidationResult {
  const invalid = () => sessionImportError("session", "This file is not a valid MatchMark session.");
  if (!object(value) || !Object.hasOwn(value, "schemaVersion")) return invalid();
  if (value.schemaVersion !== SESSION_SCHEMA_VERSION) return sessionImportError("version", "This MatchMark session version is not supported.");
  if (!date(value.createdAt) || !date(value.exportedAt) || !object(value.match) || !object(value.video)
    || !Array.isArray(value.players) || !Array.isArray(value.events)) return invalid();
  const match: MatchMetadata = {};
  for (const key of ["homeTeam", "awayTeam", "date"] as const) {
    if (Object.hasOwn(value.match, key)) {
      if (typeof value.match[key] !== "string") return invalid();
      match[key] = value.match[key];
    }
  }
  const video = value.video;
  if (typeof video.fileName !== "string" || !(video.fileSize === null || nonnegative(video.fileSize))
    || !(video.duration === null || nonnegative(video.duration))) return invalid();
  const players: Player[] = [];
  const playerIds = new Set<number>();
  for (const player of value.players) {
    const badPlayer = () => sessionImportError("players", "The session contains invalid player data.");
    if (!object(player) || !id(player.id) || playerIds.has(player.id) || typeof player.name !== "string"
      || (Object.hasOwn(player, "number") && (typeof player.number !== "number" || !Number.isInteger(player.number)))) return badPlayer();
    const result = validatePlayerInput(player.name, player.number === undefined ? "" : String(player.number));
    if (!result.ok || result.value.name !== player.name) return badPlayer();
    playerIds.add(player.id);
    players.push({ id: player.id, name: player.name, ...(player.number === undefined ? {} : { number: player.number as number }) });
  }
  const events: MatchEvent[] = [];
  const eventIds = new Set<number>();
  for (const event of value.events) {
    const badEvent = () => sessionImportError("events", "The session contains invalid event data.");
    if (!object(event) || !id(event.id) || eventIds.has(event.id) || !nonnegative(event.timestamp)
      || typeof event.type !== "string" || !isEventType(event.type)) return badEvent();
    const definition = getEventDefinition(event.type)!;
    if ((definition.playerRequired || Object.hasOwn(event, "playerId")) && !id(event.playerId)) return badEvent();
    if (event.playerId !== undefined && !playerIds.has(event.playerId as number)) {
      return sessionImportError("references", "The session refers to a player missing from its roster.");
    }
    for (const field of definition.fields) {
      const fieldValue = event[field.id];
      if (typeof fieldValue !== "string") return badEvent();
      if (field.type === "options") {
        if (!field.options.some(option => option.id === fieldValue)) return badEvent();
      } else {
        const result = validateEventText(field, fieldValue);
        if (!result.ok || result.value !== fieldValue) return badEvent();
      }
    }
    const details = createEventDetails(event.type,
      typeof event.outcome === "string" ? event.outcome : "",
      definition.fields.some(field => field.id === "bodyPart") ? event.bodyPart as BodyPart : null,
      typeof event.description === "string" ? event.description : "",
      typeof event.subtype === "string" ? event.subtype : "");
    const saved = details && createMatchEvent(details, { id: event.id, timestamp: event.timestamp }, event.playerId as number | undefined);
    if (!saved) return badEvent();
    eventIds.add(event.id);
    events.push(saved);
  }
  if (!id(value.nextPlayerId) || players.some(player => player.id >= (value.nextPlayerId as number))
    || !id(value.nextEventId) || events.some(event => event.id >= (value.nextEventId as number))) {
    return sessionImportError("allocator", "The session contains conflicting next player or event IDs.");
  }
  // Unknown properties are ignored, never spread or merged into runtime state.
  return { valid: true, session: {
    schemaVersion: SESSION_SCHEMA_VERSION, createdAt: value.createdAt, exportedAt: value.exportedAt,
    match, video: { fileName: video.fileName, fileSize: video.fileSize, duration: video.duration },
    players, events, nextPlayerId: value.nextPlayerId, nextEventId: value.nextEventId,
  } };
}

export function parseSession(text: string): SessionValidationResult {
  if (!text.trim()) return sessionImportError("empty", "The selected session file is empty.");
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { return sessionImportError("json", "The selected file contains invalid JSON."); }
  return validateSession(value);
}

export async function readSessionFile(file: Pick<File, "text">): Promise<SessionValidationResult> {
  let content: string;
  try { content = await file.text(); }
  catch { return sessionImportError("read", "The session file could not be read. Please try again."); }
  return parseSession(content);
}
