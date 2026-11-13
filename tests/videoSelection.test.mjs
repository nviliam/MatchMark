import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function setup() {
  let fail = false, serial = 0, active = false, tree, exported;
  const released = [];
  const h = createHarness(undefined, { URL: {
    createObjectURL() {
      if (fail) throw new Error("Object URL unavailable");
      return `blob:video-${++serial}`;
    },
    revokeObjectURL(url) { released.push(url); },
  } });
  const ctx = h.context(true);
  const components = Object.fromEntries(["VideoPlayer", "EventButtons", "EventForm", "PlayersPanel", "EventsPanel", "ShortcutSettings"]
    .map(name => [name, h.load(`src/components/${name}.tsx`).default]));
  h.load("src/utils/session.ts").downloadSession = session => exported = session;
  const update = () => tree = h.render(components.VideoPlayer, {
    isAnalysisActive: active, onAnalysisActiveChange: value => active = value,
    eventShortcuts: h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS,
  }, ctx);
  const component = name => nodes(tree, node => node.type === components[name])[0];
  const video = () => nodes(tree, node => node.type === "video")[0];
  const select = (name = "new.mp4") => {
    nodes(tree, node => node.type === "input" && node.props.type === "file")[0].props.onChange({
      currentTarget: { files: [{ name, type: "video/mp4", size: 123 }], value: name },
    });
    update();
  };
  const ready = () => { video().props.onLoadedMetadata(); update(); };
  const resume = () => {
    nodes(tree, node => node.type === "button" && text(node) === "Resume analysis")[0].props.onClick(); update();
  };
  const snapshot = () => {
    component("EventButtons").props.onOpenSettings(); update();
    component("ShortcutSettings").props.onExportSession(); update();
    const result = JSON.parse(JSON.stringify(exported));
    delete result.exportedAt;
    component("ShortcutSettings").props.onClose(); update();
    return result;
  };
  update(); select("old.mp4"); ready();
  component("EventButtons").props.onOpenPlayers(); update();
  assert(component("PlayersPanel").props.onAdd("Added player", "18")); update();
  const player = component("PlayersPanel").props.players.at(-1);
  component("PlayersPanel").props.onClose(); update();
  h.media.currentTime = 24.5;
  component("EventButtons").props.onSelect("goal"); update();
  component("EventForm").props.onSave(player.id, { type: "goal" }); update();
  const before = snapshot();
  component("EventButtons").props.onOpenEvents(); update();
  component("EventsPanel").props.onEventTypeChange("goal");
  component("EventsPanel").props.onPlayerChange(player.id); update();
  component("EventsPanel").props.onClose(); update();
  component("EventButtons").props.onSelect("shot"); update();
  const pending = component("EventForm").props.pending;
  component("EventButtons").props.onExit(); update();
  return { h, ctx, released, before, pending, update, component, video, select, ready, resume, snapshot,
    failNext: () => { fail = true; }, get tree() { return tree; } };
}

test("failed normal video URL creation preserves the session, video, filters and suspended draft", () => {
  const s = setup();
  try {
    const oldVideo = s.video();
    s.failNext();
    assert.doesNotThrow(() => s.select());
    assert.equal(s.video().props.src, oldVideo.props.src);
    assert.equal(s.video().key, oldVideo.key);
    assert.deepEqual(s.released, []);
    assert(text(s.tree).includes("Your current session has been kept"));
    assert.equal(s.component("EventForm").props.pending, s.pending);
    assert.equal(s.component("EventForm").props.disabled, true);
    assert(text(s.tree).includes("old.mp4"));
    s.resume();
    assert.equal(s.h.media.currentTime, 24.5);
    assert.equal(s.component("EventForm").props.disabled, false);
    s.component("EventForm").props.onCancel(); s.update();
    assert.deepEqual(s.snapshot(), s.before);
    s.component("EventButtons").props.onOpenEvents(); s.update();
    const panel = s.component("EventsPanel").props;
    assert.equal(panel.selectedEventType, "goal");
    assert.equal(panel.selectedPlayerId, s.before.events[0].playerId);
    assert.equal(JSON.stringify(panel.events), JSON.stringify(s.before.events));
    assert.deepEqual(s.released, []);
  } finally { s.h.dispose(s.ctx); }
  assert.deepEqual(s.released, ["blob:video-1"]);
});

test("successful normal video selection resets analysis and releases the old URL while preserving the roster", () => {
  const s = setup();
  try {
    s.select();
    assert.equal(s.video().props.src, "blob:video-2");
    assert.deepEqual(s.released, ["blob:video-1"]);
    assert.equal(s.component("EventForm"), undefined);
    assert.equal(nodes(s.tree, node => node.type === "button" && text(node) === "Resume analysis").length, 0);
    s.ready();
    const after = s.snapshot();
    assert.deepEqual(after.events, []);
    assert.deepEqual(after.players, s.before.players);
    assert.equal(after.nextPlayerId, s.before.nextPlayerId);
    assert.equal(after.nextEventId, 1);
    assert.equal(after.video.fileName, "new.mp4");
    s.component("EventButtons").props.onOpenEvents(); s.update();
    const panel = s.component("EventsPanel").props;
    assert.equal(panel.selectedEventType, "all");
    assert.equal(panel.selectedPlayerId, "all");
  } finally { s.h.dispose(s.ctx); }
  assert.deepEqual(s.released, ["blob:video-1", "blob:video-2"]);
});
