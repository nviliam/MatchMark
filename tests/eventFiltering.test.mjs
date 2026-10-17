import assert from "node:assert/strict";
import { test } from "node:test";
import { EVENT_DEFINITIONS, ORDERED_EVENT_TYPES, getEventLabel, isEventType } from "../src/config/eventDefinitions.ts";
import { getFilteredEvents } from "../src/utils/eventFiltering.ts";

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
    const result = getFilteredEvents(events, filter);
    assert.deepEqual(result.map(event => event.id), ids);
    assert.notEqual(result, events);
    for (const event of result) assert.equal(event, events.find(originalEvent => originalEvent.id === event.id));
    assert.equal(JSON.stringify(events), original);
  }
});

test("empty history and empty filter result both produce empty derived arrays", () => {
  assert.deepEqual(getFilteredEvents([], "all"), []);
  assert.deepEqual(getFilteredEvents([], "shot"), []);
  assert.deepEqual(getFilteredEvents(events, "duel"), []);
});

test("every configured type filters by stable ID rather than its label", () => {
  for (const type of ORDERED_EVENT_TYPES) {
    const event = { id: 1, type, timestamp: 12.34, playerId: 1 };
    assert.equal(getFilteredEvents([event], type)[0], event);
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
    assert.equal(getFilteredEvents(events, "shot").length, 3);
    assert.equal(events[0].type, "shot");
    assert(!("eventTypeLabel" in events[0]));
  } finally { EVENT_DEFINITIONS.shot.label = label; }
});
