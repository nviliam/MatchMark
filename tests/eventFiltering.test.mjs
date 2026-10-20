import assert from "node:assert/strict";
import { test } from "node:test";
import { EVENT_DEFINITIONS, ORDERED_EVENT_TYPES, getEventLabel, isEventType } from "../src/config/eventDefinitions.ts";
import { formatPlayerLabel } from "../src/utils/players.ts";
import { DEFAULT_EVENT_FILTERS, getFilteredEvents } from "../src/utils/eventFiltering.ts";

const types = ["shot", "pass", "shot", "interception", "pass", "shot", "tackle", "ball-recovery"];
const events = Object.freeze(types.map((type, index) => Object.freeze({
  id: index + 1, type, timestamp: [74.25, 12.5, 45.125, 20, 90, 45.125, 33, 10][index], playerId: 1,
  ...(type === "shot" ? { outcome: "on-target", bodyPart: "foot" } : {}),
  ...(type === "pass" ? { outcome: "completed" } : {}),
  ...(type === "tackle" ? { outcome: "won" } : {}),
})));

test("All -> Shot -> Pass -> All gives the correct chronological subsets without mutating history", () => {
  const original = JSON.stringify(events);
  for (const [filter, ids] of [
    ["all", [8, 2, 4, 7, 3, 6, 1, 5]], ["shot", [3, 6, 1]], ["pass", [2, 5]], ["all", [8, 2, 4, 7, 3, 6, 1, 5]],
  ]) {
    const result = getFilteredEvents(events, { eventType: filter, playerId: "all" });
    assert.deepEqual(result.map(event => event.id), ids);
    assert.notEqual(result, events);
    for (const event of result) assert.equal(event, events.find(originalEvent => originalEvent.id === event.id));
    assert.equal(JSON.stringify(events), original);
  }
});

test("empty history and empty filter result both produce empty derived arrays", () => {
  assert.deepEqual(getFilteredEvents([], { eventType: "all", playerId: "all" }), []);
  assert.deepEqual(getFilteredEvents([], { eventType: "shot", playerId: "all" }), []);
  assert.deepEqual(getFilteredEvents(events, { eventType: "duel", playerId: "all" }), []);
});

test("every configured type filters by stable ID rather than its label", () => {
  for (const type of ORDERED_EVENT_TYPES) {
    const event = { id: 1, type, timestamp: 12.34, playerId: 1 };
    assert.equal(getFilteredEvents([event], { eventType: type, playerId: "all" })[0], event);
    assert(isEventType(type));
    assert.equal(getEventLabel(type), EVENT_DEFINITIONS[type].label);
  }
  assert(!isEventType("all"));
  assert(!isEventType("Shot"));
  for (const id of ["legacy-event", "__proto__", "constructor", "toString", ""]) {
    assert(!isEventType(id));
    assert.equal(getEventLabel(id), "Unknown event");
  }
});

test("renaming a label does not change IDs, filtering or saved objects", () => {
  const label = EVENT_DEFINITIONS.shot.label;
  try {
    EVENT_DEFINITIONS.shot.label = "Attempt";
    assert.equal(getEventLabel("shot"), "Attempt");
    assert.equal(getFilteredEvents(events, { eventType: "shot", playerId: "all" }).length, 3);
    assert.equal(events[0].type, "shot");
    assert(!("eventTypeLabel" in events[0]));
  } finally { EVENT_DEFINITIONS.shot.label = label; }
});

const multiPlayerEvents = Object.freeze(events.map((event, index) => Object.freeze({
  ...event, playerId: [1, 3, 2, 1, 3, 1, 2, 999][index],
})));

test("AND pipeline handles All/All, type-only, player-only, combined and empty results", () => {
  const before = JSON.stringify(multiPlayerEvents);
  const cases = [
    [{ eventType: "all", playerId: "all" }, [8, 2, 4, 7, 3, 6, 1, 5]],
    [{ eventType: "shot", playerId: "all" }, [3, 6, 1]],
    [{ eventType: "all", playerId: 1 }, [4, 6, 1]],
    [{ eventType: "shot", playerId: 1 }, [6, 1]],
    [{ eventType: "pass", playerId: 3 }, [2, 5]],
    [{ eventType: "duel", playerId: 1 }, []],
    [{ eventType: "all", playerId: 2 }, [7, 3]],
    [{ eventType: "all", playerId: 999 }, [8]],
    [{ eventType: "shot", playerId: 12345 }, []],
    [{ eventType: "all", playerId: "all" }, [8, 2, 4, 7, 3, 6, 1, 5]],
  ];
  for (const [filters, expected] of cases) {
    const result = getFilteredEvents(multiPlayerEvents, Object.freeze(filters));
    assert.deepEqual(result.map(event => event.id), expected);
    assert.equal(result.length, expected.length);
    assert.notEqual(result, multiPlayerEvents);
    for (const event of result) assert.equal(event, multiPlayerEvents.find(original => original.id === event.id));
    assert.equal(JSON.stringify(multiPlayerEvents), before);
  }
  assert.deepEqual(getFilteredEvents([], { eventType: "shot", playerId: 1 }), []);
  assert(Object.isFrozen(DEFAULT_EVENT_FILTERS));
  assert.deepEqual(DEFAULT_EVENT_FILTERS, { eventType: "all", playerId: "all" });
});

test("stable player IDs remain independent of roster length, names and shirt numbers", () => {
  const roster = Array.from({ length: 18 }, (_, i) => ({ id: i + 1, name: "Same name", number: 9 }));
  const original = JSON.stringify(multiPlayerEvents);
  const before = getFilteredEvents(multiPlayerEvents, { eventType: "shot", playerId: roster[0].id });
  roster[0].name = "Renamed player"; roster[0].number = 99;
  const after = getFilteredEvents(multiPlayerEvents, { eventType: "shot", playerId: roster[0].id });
  assert.deepEqual(after, before);
  assert(after.every(event => event.playerId === 1));
  assert.equal(JSON.stringify(multiPlayerEvents), original);
  assert(multiPlayerEvents.every(event => !["playerName", "playerNumber", "playerLabel"].some(key => key in event)));
});

test("player labels share the known-player, missing-number and unknown-player fallbacks", () => {
  assert.equal(formatPlayerLabel({ name: "Test Player", number: 9 }), "#9 Test Player");
  assert.equal(formatPlayerLabel({ name: "Test Player" }), "Test Player");
  assert.equal(formatPlayerLabel({ name: "Test Player", number: 0 }), "#0 Test Player");
  assert.equal(formatPlayerLabel(undefined), "Unknown player");
});
