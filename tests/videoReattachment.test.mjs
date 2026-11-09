import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

const expected = { fileName: "match.mp4", fileSize: 3322003024, duration: 1000 };
const events = [{ id: 8, type: "pass", playerId: 7, timestamp: 100.25, subtype: "key-pass", outcome: "completed" }];
const file = { name: expected.fileName, size: expected.fileSize, type: "video/mp4" };
const plain = value => JSON.parse(JSON.stringify(value));

test("metadata comparison handles exact match, mismatches, nulls and inclusive 0.5s tolerance", () => {
  const h = createHarness(), { compareVideoMetadata: compare, VIDEO_DURATION_TOLERANCE_SECONDS } = h.load("src/utils/videoReattachment.ts");
  assert.equal(VIDEO_DURATION_TOLERANCE_SECONDS, 0.5);
  const exact = compare(expected, expected, events);
  for (const key of ["fileName", "fileSize", "duration", "eventTimestamps"]) assert.equal(exact[key], "match");
  assert.equal(exact.hasWarning, false);
  for (const [key, value] of [["fileName", "renamed.mp4"], ["fileSize", 20], ["duration", 999.49]]) {
    const result = compare(expected, { ...expected, [key]: value }, events);
    assert.equal(result[key], "mismatch"); assert(result.hasWarning);
  }
  for (const duration of [999.5, 1000.5]) assert.equal(compare(expected, { ...expected, duration }, events).duration, "match");
  const unknown = compare({ fileName: "", fileSize: null, duration: null }, expected, events);
  for (const key of ["fileName", "fileSize", "duration"]) assert.equal(unknown[key], "unknown");
  assert.equal(unknown.hasWarning, false);
  const multiple = compare(expected, { fileName: "other.webm", fileSize: 1, duration: 50 }, events);
  for (const key of ["fileName", "fileSize", "duration", "eventTimestamps"]) assert.equal(multiple[key], "mismatch");
});

test("max timestamp sanity check never mutates events and respects tolerance", () => {
  const h = createHarness(), { compareVideoMetadata: compare, getMaxEventTimestamp } = h.load("src/utils/videoReattachment.ts");
  const before = JSON.stringify(events);
  assert.equal(getMaxEventTimestamp([]), 0); assert.equal(getMaxEventTimestamp(events), 100.25);
  for (const duration of [200, 100.25, 99.75]) assert.equal(compare(expected, { ...expected, duration }, events).eventTimestamps, "match");
  assert.equal(compare(expected, { ...expected, duration: 99.74 }, events).eventTimestamps, "mismatch");
  assert.equal(compare(expected, { ...expected, duration: null }, events).eventTimestamps, "unknown");
  assert.equal(JSON.stringify(events), before);
});

function candidateSetup(onAttach = () => {}, customExpected = expected) {
  let serial = 0; const released = [], allocated = [];
  const h = createHarness(undefined, { URL: { createObjectURL(value) { allocated.push(value); return `blob:candidate-${++serial}`; }, revokeObjectURL(url) { released.push(url); } } });
  const Component = h.load("src/components/VideoReattachment.tsx").default, ctx = h.context(); let tree;
  ctx.refs[0] = { current: { click() {} } };
  const update = () => tree = h.render(Component, { expected: customExpected, events, onAttach }, ctx);
  const select = (chosen = file) => { nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { files: chosen ? [chosen] : [], value: "file" } }); update(); };
  const loaded = duration => { nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata({ currentTarget: { duration } }); update(); };
  const click = label => { nodes(tree, n => n.type === "button" && text(n) === label)[0].props.onClick(); update(); };
  update(); return { h, ctx, update, select, loaded, click, released, allocated, get tree() { return tree; } };
}

test("picker Cancel, invalid file, metadata error and unreadable duration never attach", () => {
  const attached = [], s = candidateSetup((...args) => attached.push(args));
  s.select(null); assert.equal(s.allocated.length, 0);
  s.select({ name: "bad.txt", type: "text/plain", size: 12 });
  assert(text(s.tree).includes("Please select an MP4 or WebM")); assert.equal(s.allocated.length, 0);
  s.select(); nodes(s.tree, n => n.type === "video")[0].props.onError(); s.update();
  assert(text(s.tree).includes("metadata could not be read")); assert.deepEqual(s.released, ["blob:candidate-1"]);
  for (const duration of [NaN, Infinity, -1]) { s.select(); s.loaded(duration); assert(text(s.tree).includes("metadata could not be read")); }
  assert.equal(attached.length, 0); assert.equal(s.released.length, 4);
  s.h.dispose(s.ctx);
});

test("mismatch requires Use anyway; Choose another and Cancel release candidates without applying", () => {
  const attached = [], s = candidateSetup((...args) => attached.push(args));
  s.select({ ...file, name: "different.mp4" }); s.loaded(50);
  assert(text(s.tree).includes("This video may not match")); assert(text(s.tree).includes("shorter than some imported event"));
  assert.equal(attached.length, 0);
  s.click("Choose another video"); assert.equal(attached.length, 0); assert.equal(s.released.length, 1);
  s.select(); s.loaded(1000); s.click("Cancel"); assert.equal(attached.length, 0); assert.equal(s.released.length, 2);
  s.select({ ...file, size: 1 }); s.loaded(1000); s.click("Use this video anyway");
  assert.equal(attached.length, 1); assert.equal(attached[0][1].fileSize, 1);
  s.h.dispose(s.ctx); assert.equal(s.released.length, 3);
});

test("matching candidate requires Continue; probe URLs release on unmount and stale events are ignored", () => {
  const attached = [], s = candidateSetup((...args) => attached.push(args));
  s.select(); const old = nodes(s.tree, n => n.type === "video")[0];
  s.click("Cancel"); s.select(); old.props.onLoadedMetadata({ currentTarget: { duration: 1 } }); s.update();
  assert(text(s.tree).includes("Reading video metadata"));
  s.loaded(1000); assert(text(s.tree).includes("Video matches the imported session metadata"));
  assert(text(s.tree).includes("does not prove file identity")); assert.equal(attached.length, 0);
  s.click("Continue analysis"); assert.equal(attached.length, 1); assert.equal(attached[0][0], file);
  s.h.dispose(s.ctx); old.props.onError(); assert.equal(s.released.length, 2);
});

function workspaceSetup() {
  const released = [], allocated = []; let serial = 0, exported, active = false, tree;
  const h = createHarness(undefined, { URL: { createObjectURL(value) { allocated.push(value); return `blob:active-${++serial}`; }, revokeObjectURL(url) { released.push(url); } } });
  const names = ["VideoPlayer", "SessionImport", "VideoReattachment", "EventButtons", "EventForm", "EventsPanel", "ReviewControls", "PlayersPanel", "ShortcutSettings", "SavedEventSummary", "DeleteEventConfirmation"];
  const components = Object.fromEntries(names.map(name => [name, h.load(`src/components/${name}.tsx`).default]));
  const utils = h.load("src/utils/session.ts"), { parseSession } = h.load("src/utils/sessionImport.ts");
  utils.downloadSession = value => exported = value;
  const session = utils.createSessionSnapshot({ events: [...events, { id: 10, type: "custom", timestamp: 200.5, description: "Second clip" }], players: [{ id: 7, name: "Player", number: 9 }], nextPlayerId: 20, nextEventId: 12,
    createdAt: "2026-11-09T10:00:00Z", exportedAt: "2026-11-09T11:00:00Z", video: expected, match: { homeTeam: "Home" } });
  const ctx = h.context(true);
  const update = () => tree = h.render(components.VideoPlayer, { isAnalysisActive: active, onAnalysisActiveChange: value => active = value,
    eventShortcuts: h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS }, ctx);
  const component = name => nodes(tree, n => n.type === components[name])[0];
  update(); const parsed = parseSession(utils.serializeSession(session)); assert(parsed.valid);
  component("SessionImport").props.onImport(parsed.session); update();
  const exportWaiting = () => { nodes(tree, n => n.type === "button" && text(n) === "Export session")[0].props.onClick(); update(); return exported; };
  const attach = () => { component("VideoReattachment").props.onAttach(file, expected); update(); nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update(); };
  return { h, ctx, component, update, attach, exportWaiting, session, released, allocated, get exported() { return exported; }, get tree() { return tree; }, get active() { return active; } };
}

test("export/import/validate/apply/reattach supports tagging, Review, CRUD and metadata-preserving export", () => {
  const s = workspaceSetup(), before = plain(s.exportWaiting());
  const Reattach = s.h.load("src/components/VideoReattachment.tsx").default, probeCtx = s.h.context(); let probe;
  const renderProbe = () => probe = s.h.render(Reattach, s.component("VideoReattachment").props, probeCtx);
  renderProbe(); nodes(probe, n => n.type === "input")[0].props.onChange({ currentTarget: { files: [file], value: "file" } }); renderProbe();
  nodes(probe, n => n.type === "video")[0].props.onLoadedMetadata({ currentTarget: { duration: 1000 } }); renderProbe();
  nodes(probe, n => n.type === "button" && text(n) === "Continue analysis")[0].props.onClick(); s.update();
  s.h.dispose(probeCtx); assert.equal(s.released.length, 1);
  s.h.media.currentTime = 22;
  nodes(s.tree, n => n.type === "video")[0].props.onLoadedMetadata(); s.update();
  assert(s.active); assert.equal(s.h.media.currentTime, 0); assert.equal(s.component("VideoReattachment"), undefined);
  assert(!text(s.tree).includes("Session imported."));
  s.component("EventButtons").props.onOpenSettings(); s.update(); s.component("ShortcutSettings").props.onExportSession(); s.update();
  for (const key of ["events", "players", "nextPlayerId", "nextEventId", "video", "createdAt", "match"]) assert.deepEqual(plain(s.exported[key]), before[key], key);
  s.component("ShortcutSettings").props.onClose(); s.update();
  s.component("EventButtons").props.onOpenEvents(); s.update();
  s.component("EventsPanel").props.onEventTypeChange("pass"); s.update();
  assert.equal(s.component("EventsPanel").props.events.length, 1);
  s.component("EventsPanel").props.onSeek(100.25); s.update(); assert.equal(s.h.media.currentTime, 100.25);
  s.component("EventButtons").props.onOpenEvents(); s.update(); s.component("EventsPanel").props.onStartReview(); s.update();
  assert.equal(s.h.media.currentTime, 97.25); assert.equal(s.component("ReviewControls").props.event.id, 8);
  s.component("ReviewControls").props.onExit(); s.update();
  s.component("EventButtons").props.onOpenEvents(); s.update();
  s.component("EventsPanel").props.onEventTypeChange("all"); s.update();
  s.component("EventsPanel").props.onStartReview(); s.update();
  s.component("ReviewControls").props.onNext(); s.update();
  assert.equal(s.h.media.currentTime, 197.5); assert.equal(s.component("ReviewControls").props.event.id, 10);
  s.component("ReviewControls").props.onPrevious(); s.update(); assert.equal(s.h.media.currentTime, 97.25);
  s.component("ReviewControls").props.onExit(); s.update();
  s.component("EventButtons").props.onOpenPlayers(); s.update();
  const roster = s.component("PlayersPanel").props;
  assert(roster.onAdd("New player", "10")); s.update(); assert.equal(s.component("PlayersPanel").props.players.at(-1).id, 20);
  assert(s.component("PlayersPanel").props.onUpdate(20, "Edited player", "11")); s.update();
  assert(s.component("PlayersPanel").props.onDelete(20)); s.update();
  s.component("PlayersPanel").props.onClose(); s.update();
  s.component("EventButtons").props.onSelect("pass"); s.update();
  s.component("EventForm").props.onSave(7, { type: "pass", subtype: "long-ball", outcome: "completed" }); s.update();
  assert.equal(s.component("SavedEventSummary").props.event.id, 12);
  s.component("SavedEventSummary").props.onEdit(); s.update();
  s.component("EventForm").props.onSave(7, { type: "pass", subtype: "long-ball", outcome: "incomplete" }); s.update();
  assert.equal(s.component("SavedEventSummary").props.event.id, 12);
  s.component("SavedEventSummary").props.onDelete(); s.update(); s.component("DeleteEventConfirmation").props.onConfirm(); s.update();
  s.component("EventButtons").props.onOpenSettings(); s.update(); s.component("ShortcutSettings").props.onExportSession(); s.update();
  assert.deepEqual(plain(s.exported.events), before.events); assert.equal(s.exported.nextEventId, 13); assert.equal(s.exported.nextPlayerId, 21);
  s.h.dispose(s.ctx); assert.equal(s.released.length, s.allocated.length);
});

test("active restored video failure preserves imported session and allows retry", () => {
  const s = workspaceSetup(), before = plain(s.exportWaiting());
  s.component("VideoReattachment").props.onAttach(file, expected); s.update();
  nodes(s.tree, n => n.type === "video")[0].props.onError(); s.update();
  assert(s.component("VideoReattachment")); assert.equal(s.active, false);
  for (const key of ["events", "players", "nextEventId", "nextPlayerId", "video", "createdAt", "match"]) assert.deepEqual(plain(s.exportWaiting()[key]), before[key]);
  s.attach(); assert(s.active);
  nodes(s.tree, n => n.type === "video")[0].props.onError(); s.update(); assert(s.component("VideoReattachment"));
  assert.deepEqual(plain(s.exportWaiting().events), before.events);
  s.h.dispose(s.ctx); assert.equal(s.released.length, s.allocated.length);
});

test("mismatch accepted metadata replaces only video reference in the next export", () => {
  const s = workspaceSetup(), selected = { fileName: "different.webm", fileSize: 2, duration: 900 };
  s.component("VideoReattachment").props.onAttach({ name: selected.fileName, type: "video/webm", size: 2 }, selected); s.update();
  s.h.media.duration = 900; nodes(s.tree, n => n.type === "video")[0].props.onLoadedMetadata(); s.update();
  s.component("EventButtons").props.onOpenSettings(); s.update(); s.component("ShortcutSettings").props.onExportSession(); s.update();
  assert.deepEqual(plain(s.exported.video), selected); assert.deepEqual(plain(s.exported.events), plain(s.session.events));
  assert.deepEqual(plain(s.exported.match), { homeTeam: "Home" });
  s.h.dispose(s.ctx);
});
