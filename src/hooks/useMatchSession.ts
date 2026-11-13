import { useRef, useState } from "react";
import { DEFAULT_PLAYERS } from "../data/players";
import type { EventDetails, MatchEvent } from "../types/event";
import type { Player } from "../types/player";
import type { MatchMarkSession, MatchMetadata } from "../types/session";
import { createMatchEvent } from "../utils/events";
import { appendPlayer, removePlayer, updatePlayer as updateRosterPlayer, validatePlayerInput } from "../utils/roster";

export function useMatchSession() {
  const [players, setPlayers] = useState<Player[]>(() => DEFAULT_PLAYERS.map(player => ({ ...player })));
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const nextPlayerId = useRef(DEFAULT_PLAYERS.reduce((highest, player) => Math.max(highest, player.id), 0) + 1);
  const nextEventId = useRef(1);
  const matchMetadata = useRef<MatchMetadata>({});
  const sessionCreatedAt = useRef("");

  function addPlayer(name: string, number: string): boolean {
    const result = validatePlayerInput(name, number);
    if (!result.ok) return false;
    // Allocate outside the updater so React can replay the pure update safely.
    const id = nextPlayerId.current++;
    setPlayers(current => appendPlayer(current, result.value, id));
    return true;
  }

  function updatePlayer(id: Player["id"], name: string, number: string): boolean {
    if (!players.some(player => player.id === id)) return false;
    const result = validatePlayerInput(name, number);
    if (!result.ok) return false;
    setPlayers(current => updateRosterPlayer(current, id, result.value));
    return true;
  }

  function deletePlayer(id: Player["id"]): boolean {
    if (!players.some(player => player.id === id)) return false;
    setPlayers(current => removePlayer(current, id));
    return true;
  }

  function buildEvent(id: number, timestamp: number, playerId: number | undefined, details: EventDetails) {
    if (playerId !== undefined && !players.some(player => player.id === playerId)) return null;
    return createMatchEvent(details, { id, timestamp }, playerId);
  }

  function saveEvent(timestamp: number, playerId: number | undefined, details: EventDetails): boolean {
    const saved = buildEvent(nextEventId.current, timestamp, playerId, details);
    if (!saved) return false;
    nextEventId.current++;
    setEvents(current => [...current, saved]);
    return true;
  }

  function updateEvent(original: MatchEvent, playerId: number | undefined, details: EventDetails): boolean {
    const saved = buildEvent(original.id, original.timestamp, playerId, details);
    if (!saved) return false;
    setEvents(current => current.map(event => event.id === original.id ? saved : event));
    return true;
  }

  function deleteEvent(id: MatchEvent["id"]): void {
    setEvents(current => current.filter(event => event.id !== id));
  }

  function applyImportedSession(session: MatchMarkSession): void {
    setEvents(session.events.map(event => ({ ...event })));
    setPlayers(session.players.map(player => ({ ...player })));
    nextPlayerId.current = session.nextPlayerId;
    nextEventId.current = session.nextEventId;
    sessionCreatedAt.current = session.createdAt;
    matchMetadata.current = { ...session.match };
  }

  function clearEvents(): void {
    // Playback failure clears history without changing the session metadata or allocators.
    setEvents([]);
  }

  function resetAnalysisSession(createdAt: string): void {
    // A new normal video starts fresh event history but keeps the roster and its allocator.
    clearEvents();
    nextEventId.current = 1;
    matchMetadata.current = {};
    sessionCreatedAt.current = createdAt;
  }

  function getSessionData() {
    return {
      events, players, nextPlayerId: nextPlayerId.current, nextEventId: nextEventId.current,
      match: matchMetadata.current, createdAt: sessionCreatedAt.current,
    };
  }

  return {
    players, events, addPlayer, updatePlayer, deletePlayer, saveEvent, updateEvent, deleteEvent,
    applyImportedSession, clearEvents, resetAnalysisSession, getSessionData,
  };
}
