import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function setup() {
  const h = createHarness();
  const validator = h.load("src/utils/sessionImport.ts");
  const utils = h.load("src/utils/session.ts");
  const definitions = h.load("src/config/eventDefinitions.ts").EVENT_DEFINITIONS;
  const events = Object.values(definitions).flatMap(def => {
    const variants = def.fields.reduce((rows, field) => rows.flatMap(row =>
      (field.type === "text" ? ["Coach note"] : field.options.map(option => option.id)).map(value => ({ ...row, [field.id]: value }))), [{}]);
    return variants.map(fields => ({ type: def.id, playerId: 7, timestamp: 1.25, ...fields }));
  }).map((event, i) => ({ ...event, id: i + 1 }));
  events.push({ id: events.length + 1, type: "custom", timestamp: 0, description: "No player" });
  const session = utils.createSessionSnapshot({ events, players: [{ id: 7, name: "Kiss Péter", number: 9 }],
    nextPlayerId: 20, nextEventId: 100, createdAt: "2026-11-09T10:00:00Z", exportedAt: "2026-11-09T11:00:00Z",
    match: { homeTeam: "Home", awayTeam: "Away", date: "2026-11-09" }, video: { fileName: "match.mp4", fileSize: 3322003024, duration: 5716.021333 } });
  return { h, validator, utils, session };
}

test("all 15 event types and every configured option roundtrip without loss", () => {
  const { validator, utils, session } = setup();
  const result = validator.parseSession(utils.serializeSession(session));
  assert.equal(result.valid, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.session)), JSON.parse(JSON.stringify(session)));
  assert.equal(new Set(result.session.events.map(event => event.type)).size, 15);
  const reordered = Object.fromEntries(Object.entries(session).reverse());
  assert.equal(validator.parseSession(JSON.stringify(reordered)).valid, true);
});

test("parser distinguishes empty, malformed, non-session and unsupported version input", async () => {
  const { validator, session } = setup();
  for (const [value, code] of [[" ", "empty"], ["{", "json"], ["null", "session"], ["[]", "session"], ["1", "session"], ["{}", "session"]]) {
    const result = validator.parseSession(value); assert.equal(result.valid, false); assert.equal(result.error.code, code);
  }
  assert.equal(validator.validateSession({ ...session, schemaVersion: 2 }).error.code, "version");
  for (const key of Object.keys(session)) {
    const copy = { ...session }; delete copy[key]; assert.equal(validator.validateSession(copy).valid, false, key);
  }
  assert.equal((await validator.readSessionFile({ text: async () => { throw new Error("disk"); } })).error.code, "read");
});

test("invalid dates, metadata, players and allocators are rejected without normalization", () => {
  const { validator, session } = setup();
  const invalid = [
    { createdAt: "banana" }, { exportedAt: 1 }, { match: { homeTeam: 3 } },
    ...["fileSize", "duration"].flatMap(key => [-1, Infinity, NaN, "3", undefined].map(value => ({ video: { ...session.video, [key]: value } }))),
    { video: { ...session.video, fileName: 1 } },
    { players: [...session.players, session.players[0]] },
    ...[-1, 0, 1.5, NaN, Infinity, "7", Number.MAX_SAFE_INTEGER].map(value => ({ players: [{ ...session.players[0], id: value }] })),
    ...["", " ", " Untrimmed ", "x".repeat(81), 42].map(value => ({ players: [{ ...session.players[0], name: value }] })),
    ...[-1, 100, 1.5, "9", null, Infinity].map(value => ({ players: [{ ...session.players[0], number: value }] })),
    ...[0, -1, 7, 1.5, "20", Number.MAX_SAFE_INTEGER].map(value => ({ nextPlayerId: value })),
    ...[0, -1, 1, 1.5, "100", Infinity].map(value => ({ nextEventId: value })),
  ];
  for (const change of invalid) assert.equal(validator.validateSession({ ...session, ...change }).valid, false, JSON.stringify(change));
  assert.equal(validator.validateSession({ ...session, video: { ...session.video, fileSize: null, duration: null } }).valid, true);
});

test("invalid event fields, identities, player IDs and optional player values are rejected", () => {
  const { validator, session } = setup();
  const first = session.events[0];
  const invalid = [
    ...[-1, NaN, Infinity, "1"].map(timestamp => ({ ...first, timestamp })),
    ...[-1, 0, 1.5, "1", Infinity].map(id => ({ ...first, id })),
    { ...first, type: "super-pass" }, { ...first, subtype: "invalid" }, { ...first, outcome: "invalid" },
    ...[undefined, null, "7", 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER].map(playerId => ({ ...first, playerId })),
    { id: 1, type: "shot", playerId: 7, timestamp: 0, outcome: "goal", bodyPart: "elbow" },
    ...["", " ", " x ", "x".repeat(161), 3].map(description => ({ id: 1, type: "custom", timestamp: 0, description })),
    { id: 1, type: "custom", timestamp: 0, description: "Valid", playerId: null },
  ];
  for (const event of invalid) assert.equal(validator.validateSession({ ...session, events: [event] }).valid, false, JSON.stringify(event));
  assert.equal(validator.validateSession({ ...session, events: [first, first] }).valid, false);
});

test("deleted player events roundtrip with their original ID and Unknown player display", () => {
  const { h, validator, utils, session } = setup();
  const { appendPlayer, removePlayer } = h.load("src/utils/roster.ts");
  const { createMatchEvent } = h.load("src/utils/events.ts");
  const { formatEventPlayer } = h.load("src/utils/players.ts");
  let players = appendPlayer([], { name: "Historical player", number: 9 }, 4);
  const event = createMatchEvent({ type: "goal" }, { id: 1, timestamp: 12.5 }, players[0].id);
  assert(event);
  players = removePlayer(players, 4);
  const exported = utils.createSessionSnapshot({ ...session, players, events: [event], nextPlayerId: 5, nextEventId: 2 });
  const result = validator.parseSession(utils.serializeSession(exported));
  assert.equal(result.valid, true);
  assert.equal(result.session.players.length, 0);
  assert.equal(result.session.events[0].playerId, 4);
  assert.equal(JSON.stringify(result.session), JSON.stringify(exported));
  assert.equal(formatEventPlayer(result.session.events[0].playerId, result.session.players), "Unknown player");
  const updatedPlayers = appendPlayer(result.session.players, { name: "New player" }, result.session.nextPlayerId);
  assert.equal(updatedPlayers[0].id, 5);
  assert.equal(formatEventPlayer(result.session.events[0].playerId, updatedPlayers), "Unknown player");
});

test("player allocator must exceed historical references for required and optional players", () => {
  const { validator, session } = setup();
  const players = [{ id: 1, name: "One" }, { id: 2, name: "Two" }];
  for (const event of [
    { id: 1, type: "goal", timestamp: 10, playerId: 4 },
    { id: 1, type: "custom", timestamp: 10, description: "Historical", playerId: 4 },
  ]) {
    for (const nextPlayerId of [3, 4]) {
      const result = validator.validateSession({ ...session, players, events: [event], nextPlayerId });
      assert.equal(result.valid, false);
      assert.equal(result.error.code, "allocator");
    }
    const result = validator.validateSession({ ...session, players, events: [event], nextPlayerId: 5 });
    assert.equal(result.valid, true);
    assert.equal(result.session.events[0].playerId, 4);
  }
});

test("unknown fields are stripped at every level, including prototype-looking keys", () => {
  const { validator, session } = setup();
  const value = JSON.parse(JSON.stringify(session));
  for (const obj of [value, value.match, value.video, ...value.players, ...value.events]) {
    Object.defineProperty(obj, "__proto__", { value: { polluted: true }, enumerable: true });
    obj.unknown = "ignored";
  }
  const result = validator.parseSession(JSON.stringify(value));
  assert(result.valid);
  const json = JSON.stringify(result.session);
  assert(!json.includes("__proto__")); assert(!json.includes("unknown"));
  assert.equal({}.polluted, undefined);
});

test("file UI stages valid data, reports errors and only applies on explicit confirmation", async () => {
  const { h, session } = setup();
  const Component = h.load("src/components/SessionImport.tsx").default;
  const ctx = h.context(); let tree, applied = [];
  const update = () => tree = h.render(Component, { onImport: value => applied.push(value) }, ctx);
  const read = async content => { await nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { files: [{ text: async () => content }], value: "file" } }); update(); };
  update(); await read("bad"); assert.equal(applied.length, 0); assert(text(tree).includes("invalid JSON"));
  await read(JSON.stringify(session)); assert(text(tree).includes("Replace current session?")); assert.equal(applied.length, 0);
  nodes(tree, n => n.type === "button" && text(n) === "Cancel")[0].props.onClick(); update(); assert.equal(applied.length, 0);
  await read(JSON.stringify(session));
  nodes(tree, n => n.type === "button" && text(n) === "Import session").at(-1).props.onClick(); update();
  assert.equal(applied.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(applied[0])), JSON.parse(JSON.stringify(session)));
  h.dispose(ctx);
});

function videoSetup(transform = source => source) {
  const h = createHarness(transform), ctx = h.context(true);
  const names = ["VideoPlayer", "EventButtons", "EventForm", "ShortcutSettings", "SessionImport", "SavedEventSummary", "DeleteEventConfirmation", "VideoReattachment"];
  const components = Object.fromEntries(names.map(name => [name, h.load(`src/components/${name}.tsx`).default]));
  let tree, active = false, exported;
  h.load("src/utils/session.ts").downloadSession = value => exported = value;
  const update = () => tree = h.render(components.VideoPlayer, { isAnalysisActive: active, onAnalysisActiveChange: value => active = value,
    eventShortcuts: h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS }, ctx);
  const component = name => nodes(tree, n => n.type === components[name])[0];
  const upload = () => { nodes(tree, n => n.type === "input" && n.props.type === "file")[0].props.onChange({ currentTarget: { files: [{ name: "old.mp4", size: 1, type: "video/mp4" }], value: "" } }); update(); nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update(); };
  const save = () => { component("EventButtons").props.onSelect("custom"); update(); component("EventForm").props.onSave(undefined, { type: "custom", description: "New" }); update(); };
  update();
  return { h, ctx, update, component, upload, save, get tree() { return tree; }, get exported() { return exported; } };
}

test("confirmed import restores data, detaches video, resets workflow and protects against normal video selection", () => {
  const { session } = setup(); const s = videoSetup(); s.upload(); s.save();
  s.component("EventButtons").props.onOpenSettings(); s.update();
  s.component("ShortcutSettings").props.onImportSession(session); s.update();
  assert.equal(nodes(s.tree, n => n.type === "video").length, 0);
  assert(text(s.tree).includes("Session imported.")); assert(s.component("VideoReattachment"));
  assert.equal(nodes(s.tree, n => n.type === "input" && n.props.accept?.includes("video/mp4")).length, 0);
  nodes(s.tree, n => n.type === "button" && text(n) === "Export session")[0].props.onClick(); s.update();
  for (const key of ["players", "events", "nextPlayerId", "nextEventId", "video", "match", "createdAt"]) {
    assert.equal(JSON.stringify(s.exported[key]), JSON.stringify(session[key]), key);
  }
  assert.equal(s.component("EventForm"), undefined); assert.equal(s.component("ShortcutSettings"), undefined);
  s.h.dispose(s.ctx);
});

test("invalid import and cancelled confirmation preserve existing video, events and roster", async () => {
  const { session } = setup(); const s = videoSetup(); s.upload(); s.save();
  s.component("EventButtons").props.onOpenSettings(); s.update();
  s.component("ShortcutSettings").props.onExportSession(); s.update();
  const before = JSON.stringify(s.exported); s.h.media.currentTime = 24; s.h.media.paused = false;
  const Import = s.h.load("src/components/SessionImport.tsx").default, ctx = s.h.context(); let tree;
  const update = () => tree = s.h.render(Import, { onImport: s.component("ShortcutSettings").props.onImportSession }, ctx);
  const read = async content => { await nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { files: [{ text: async () => content }], value: "" } }); update(); };
  update(); await read("invalid"); await read(JSON.stringify(session));
  nodes(tree, n => n.type === "button" && text(n) === "Cancel")[0].props.onClick(); update();
  s.component("ShortcutSettings").props.onExportSession(); s.update();
  const old = JSON.parse(before), current = JSON.parse(JSON.stringify(s.exported)); delete old.exportedAt; delete current.exportedAt;
  assert.deepEqual(current, old); assert.equal(s.h.media.currentTime, 24); assert.equal(s.h.media.paused, false);
  assert.equal(nodes(s.tree, n => n.type === "video").length, 1);
  s.h.dispose(ctx); s.h.dispose(s.ctx);
});

test("imported sparse IDs resume at 9 and deletion never reuses the allocated ID", () => {
  const s = videoSetup();
  const { session } = setup();
  session.events = [1, 4, 8].map(id => ({ id, type: "custom", timestamp: id, description: "Existing" }));
  session.nextEventId = 9;
  s.component("SessionImport").props.onImport(session); s.update();
  s.component("VideoReattachment").props.onAttach({ name: "match.mp4", type: "video/mp4", size: session.video.fileSize }, session.video); s.update();
  nodes(s.tree, n => n.type === "video")[0].props.onLoadedMetadata(); s.update(); s.save();
  assert.equal(s.component("SavedEventSummary").props.event.id, 9);
  s.component("SavedEventSummary").props.onDelete(); s.update();
  s.component("DeleteEventConfirmation").props.onConfirm(); s.update(); s.save();
  assert.equal(s.component("SavedEventSummary").props.event.id, 10);
  s.component("EventButtons").props.onOpenSettings(); s.update(); s.component("ShortcutSettings").props.onExportSession(); s.update();
  assert.equal(s.exported.nextEventId, 11);
  s.h.dispose(s.ctx);
});

test("normal session allocator never reuses deletions and Edit preserves its ID without consuming another", () => {
  const s = videoSetup(); s.upload(); s.save(); s.save();
  assert.equal(s.component("SavedEventSummary").props.event.id, 2);
  s.component("SavedEventSummary").props.onEdit(); s.update();
  s.component("EventForm").props.onSave(undefined, { type: "custom", description: "Edited" }); s.update();
  assert.equal(s.component("SavedEventSummary").props.event.id, 2);
  s.component("SavedEventSummary").props.onDelete(); s.update();
  s.component("DeleteEventConfirmation").props.onConfirm(); s.update(); s.save();
  assert.equal(s.component("SavedEventSummary").props.event.id, 3);
  s.h.dispose(s.ctx);
});

test("file read completed after unmount cannot stage or apply an import", async () => {
  const { h, session } = setup(); const Component = h.load("src/components/SessionImport.tsx").default;
  const ctx = h.context(); let applied = false, resolve;
  const tree = h.render(Component, { onImport: () => applied = true }, ctx);
  const pendingRead = nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: {
    files: [{ text: () => new Promise(done => resolve = done) }], value: "file",
  } });
  h.dispose(ctx); resolve(JSON.stringify(session)); await pendingRead;
  assert.equal(applied, false);
  assert.equal(ctx.states[0], null);
});
