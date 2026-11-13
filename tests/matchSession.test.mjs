import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness } from "./helpers/componentHarness.mjs";

function setup() {
  const h = createHarness(), ctx = h.context();
  const { useMatchSession } = h.load("src/hooks/useMatchSession.ts");
  let session;
  const update = () => session = h.render(useMatchSession, {}, ctx);
  update();
  return { h, update, get session() { return session; } };
}

test("session player CRUD validates input and never reuses deleted IDs", () => {
  const s = setup(), initialId = s.session.getSessionData().nextPlayerId;
  assert.equal(s.session.addPlayer(" ", ""), false);
  assert.equal(s.session.getSessionData().nextPlayerId, initialId);
  assert(s.session.addPlayer(" New player ", "18")); s.update();
  const added = s.session.players.at(-1);
  assert.equal(added.id, initialId);
  assert.equal(added.name, "New player");
  assert.equal(s.session.updatePlayer(added.id, "", ""), false);
  assert(s.session.updatePlayer(added.id, "Edited", "")); s.update();
  assert.equal(s.session.players.at(-1).id, initialId);
  assert.equal(s.session.players.at(-1).name, "Edited");
  assert.equal(s.session.players.at(-1).number, undefined);
  assert(s.session.deletePlayer(initialId)); s.update();
  assert.equal(s.session.deletePlayer(initialId), false);
  assert(s.session.addPlayer("Next", "")); s.update();
  assert.equal(s.session.players.at(-1).id, initialId + 1);
});

test("session event CRUD preserves edit identity and allocates only successful creates", () => {
  const s = setup(), playerId = s.session.players[0].id;
  assert.equal(s.session.saveEvent(12.5, undefined, { type: "goal" }), false);
  assert.equal(s.session.saveEvent(12.5, 999, { type: "goal" }), false);
  assert.equal(s.session.getSessionData().nextEventId, 1);
  assert(s.session.saveEvent(12.5, playerId, { type: "shot", outcome: "on-target", bodyPart: "foot" })); s.update();
  const original = s.session.events[0];
  assert(s.session.updateEvent(original, playerId, { type: "shot", outcome: "goal", bodyPart: "head" })); s.update();
  assert.equal(s.session.events[0].id, 1);
  assert.equal(s.session.events[0].timestamp, 12.5);
  assert.equal(s.session.events[0].outcome, "goal");
  assert.equal(s.session.events[0].bodyPart, "head");
  assert.equal(original.outcome, "on-target");
  assert.equal(s.session.getSessionData().nextEventId, 2);
  s.session.deleteEvent(1); s.update();
  assert.equal(s.session.events.length, 0);
  assert(s.session.saveEvent(20, undefined, { type: "custom", description: "Next" })); s.update();
  assert.equal(s.session.events[0].id, 2);
});

test("deleting a player retains historical event references and Unknown player display", () => {
  const s = setup(), playerId = s.session.players[0].id;
  assert(s.session.saveEvent(10, playerId, { type: "goal" })); s.update();
  const event = s.session.events[0];
  assert(s.session.deletePlayer(playerId)); s.update();
  assert.equal(s.session.events[0], event);
  assert.equal(event.playerId, playerId);
  const { formatEventPlayer } = s.h.load("src/utils/players.ts");
  assert.equal(formatEventPlayer(event.playerId, s.session.players), "Unknown player");
});

test("validated imported session restores copied domain data and sparse allocators for snapshots", () => {
  const s = setup();
  const { createSessionSnapshot } = s.h.load("src/utils/session.ts");
  const { validateSession } = s.h.load("src/utils/sessionImport.ts");
  const input = createSessionSnapshot({
    players: [{ id: 2, name: "Existing" }],
    events: [{ id: 8, type: "goal", playerId: 4, timestamp: 15 }],
    nextPlayerId: 10, nextEventId: 20, match: { homeTeam: "Home" },
    createdAt: "2026-11-13T10:00:00Z", exportedAt: "2026-11-13T11:00:00Z",
    video: { fileName: "match.mp4", fileSize: 123, duration: 100 },
  });
  const validated = validateSession(input);
  assert(validated.valid);
  s.session.applyImportedSession(validated.session); s.update();
  const snapshot = createSessionSnapshot({ ...s.session.getSessionData(), video: input.video, exportedAt: input.exportedAt });
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), JSON.parse(JSON.stringify(input)));
  assert.notEqual(s.session.players[0], validated.session.players[0]);
  assert.notEqual(s.session.events[0], validated.session.events[0]);
  assert.notEqual(s.session.getSessionData().match, validated.session.match);
  assert(s.session.addPlayer("New", "")); s.update();
  assert.equal(s.session.players.at(-1).id, 10);
  assert(s.session.saveEvent(20, undefined, { type: "custom", description: "Continued" })); s.update();
  assert.equal(s.session.events.at(-1).id, 20);
  assert.equal(s.session.events[0].playerId, 4);
});

test("playback history clearing preserves metadata and allocators; normal reset keeps only the roster and player allocator", () => {
  const s = setup();
  s.session.resetAnalysisSession("original creation time"); s.update();
  assert(s.session.addPlayer("Added", "")); s.update();
  assert(s.session.saveEvent(10, undefined, { type: "custom", description: "Saved" })); s.update();
  const before = s.session.getSessionData();
  s.session.clearEvents(); s.update();
  const cleared = s.session.getSessionData();
  assert.equal(cleared.events.length, 0);
  assert.equal(cleared.nextEventId, before.nextEventId);
  assert.equal(cleared.nextPlayerId, before.nextPlayerId);
  assert.equal(cleared.createdAt, before.createdAt);
  assert.equal(cleared.match, before.match);
  s.session.resetAnalysisSession("new creation time"); s.update();
  const reset = s.session.getSessionData();
  assert.equal(reset.players, before.players);
  assert.equal(reset.nextPlayerId, before.nextPlayerId);
  assert.equal(reset.events.length, 0);
  assert.equal(reset.nextEventId, 1);
  assert.equal(reset.createdAt, "new creation time");
  assert.equal(JSON.stringify(reset.match), "{}");
});
