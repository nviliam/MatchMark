import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function fixture() {
  const h = createHarness();
  const utils = h.load("src/utils/session.ts");
  const input = {
    createdAt: "2026-11-09T10:00:00.000Z", exportedAt: "2026-11-09T11:00:00.000Z",
    nextPlayerId: 42, players: [{ id: 7, name: "Kiss Péter", number: 9 }],
    video: { fileName: "match.mp4", fileSize: 123456, duration: 90.25, url: "blob:secret" },
    events: [
      { id: 12, type: "pass", playerId: 7, timestamp: 1.25, subtype: "key-pass", outcome: "completed" },
      { id: 30, type: "goalkeeper", playerId: 7, timestamp: 2.5, subtype: "catch" },
      { id: 31, type: "shot", playerId: 7, timestamp: 3, outcome: "goal", bodyPart: "head" },
      { id: 35, type: "custom", timestamp: 4, description: "Megjegyzés" },
    ],
    pending: { type: "goal", timestamp: 99 }, shortcuts: { shot: "s" }, overlay: "settings",
  };
  return { h, utils, input };
}

test("session v1 preserves all saved domain data, IDs, allocators and video hints without runtime state", () => {
  const { utils, input } = fixture();
  const before = JSON.stringify(input);
  const snapshot = utils.createSessionSnapshot(input);
  assert.equal(snapshot.schemaVersion, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.events)), input.events);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.players)), input.players);
  assert.equal(snapshot.nextPlayerId, 42);
  assert.equal(snapshot.nextEventId, 36);
  assert.equal(snapshot.createdAt, input.createdAt);
  assert.equal(snapshot.exportedAt, input.exportedAt);
  assert.equal(JSON.stringify(snapshot.match), "{}");
  assert.equal(JSON.stringify(snapshot.video), JSON.stringify({ fileName: "match.mp4", fileSize: 123456, duration: 90.25 }));
  const json = utils.serializeSession(snapshot);
  assert.deepEqual(JSON.parse(json), JSON.parse(JSON.stringify(snapshot)));
  assert(json.includes("\n  \"schemaVersion\""));
  assert(!json.includes("blob:"));
  for (const key of ["pending", "shortcuts", "overlay", "reviewIndex", "filters"]) assert(!Object.hasOwn(snapshot, key));
  assert(!Object.hasOwn(snapshot.events[3], "playerId"));
  snapshot.players[0].name = "Changed";
  snapshot.events[0].outcome = "incomplete";
  assert.equal(JSON.stringify(input), before);
});

test("empty export supports unavailable video duration and stable safe filenames", () => {
  const { utils, input } = fixture();
  for (const duration of [null, NaN, Infinity, -1]) {
    const session = utils.createSessionSnapshot({ ...input, events: [], players: [], video: { ...input.video, duration } });
    assert.equal(session.video.duration, null);
    assert.equal(session.nextEventId, 1);
    assert.equal(JSON.stringify(session.events), "[]");
    assert.equal(utils.getSessionFilename(session), "matchmark-session-2026-11-09.json");
    session.match = { homeTeam: "../../bad:name", awayTeam: "<>|*" };
    assert.equal(utils.getSessionFilename(session), "matchmark-session-2026-11-09.json");
    session.exportedAt = "../../bad";
    assert.equal(utils.getSessionFilename(session), "matchmark-session-undated.json");
  }
});

test("download uses UTF-8 JSON, clicks the named file and releases its temporary URL even on failure", async () => {
  const { utils, input } = fixture();
  const session = utils.createSessionSnapshot(input);
  for (const fail of [false, true]) {
    let blob, delayedCleanup, clicked = false, removed = false, revoked = false;
    const link = { click() { clicked = true; if (fail) throw new Error("Download denied"); }, remove() { removed = true; } };
    const h = createHarness(undefined, {
      Blob,
      document: { createElement: tag => { assert.equal(tag, "a"); return link; }, body: { append: element => assert.equal(element, link) } },
      URL: { createObjectURL(value) { blob = value; return "blob:download"; }, revokeObjectURL(url) { assert.equal(url, "blob:download"); revoked = true; } },
      setTimeout(fn) { delayedCleanup = fn; },
    });
    const download = h.load("src/utils/session.ts").downloadSession;
    if (fail) assert.throws(() => download(session), /Download denied/);
    else download(session);
    assert(clicked); assert(removed); assert(!revoked);
    assert.equal(link.href, "blob:download");
    assert.equal(link.download, "matchmark-session-2026-11-09.json");
    assert.equal(blob.type, "application/json;charset=utf-8");
    assert.deepEqual(JSON.parse(await blob.text()), JSON.parse(utils.serializeSession(session)));
    delayedCleanup(); assert(revoked);
  }
});

test("Settings exposes export; VideoPlayer exports current saved state without playback or workflow mutations", () => {
  const { h, utils } = fixture();
  const downloads = [];
  utils.downloadSession = session => downloads.push(session);
  const VideoPlayer = h.load("src/components/VideoPlayer.tsx").default;
  const Settings = h.load("src/components/ShortcutSettings.tsx").default;
  const Buttons = h.load("src/components/EventButtons.tsx").default;
  const Form = h.load("src/components/EventForm.tsx").default;
  const shortcuts = h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS;
  const ctx = h.context(true);
  let active = false, tree;
  const update = () => tree = h.render(VideoPlayer, { isAnalysisActive: active, onAnalysisActiveChange: value => active = value, eventShortcuts: shortcuts }, ctx);
  const component = type => nodes(tree, n => n.type === type)[0];
  update();
  nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { files: [{ name: "game.mp4", size: 456, type: "video/mp4" }], value: "" } });
  update(); nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update();
  component(Buttons).props.onOpenSettings(); update();
  let panel = h.render(Settings, component(Settings).props);
  assert(text(panel).includes("import a local backup."));
  const exportButton = nodes(panel, n => n.type === "button" && text(n) === "Export session")[0];
  assert(exportButton); assert.equal(exportButton.props.disabled, false);
  h.media.currentTime = 23.75; h.media.paused = false;
  exportButton.props.onClick(); update();
  assert.equal(downloads[0].events.length, 0);
  assert.equal(downloads[0].video.fileName, "game.mp4");
  assert.equal(downloads[0].video.fileSize, 456);
  assert.equal(downloads[0].video.duration, 1000);
  const createdAt = downloads[0].createdAt;
  component(Settings).props.onClose(); update();
  component(Buttons).props.onSelect("custom"); update();
  component(Form).props.onSave(undefined, { type: "custom", description: "Saved only" }); update();
  component(Buttons).props.onOpenSettings(); update();
  component(Settings).props.onExportSession(); update();
  assert.equal(downloads[1].events.length, 1);
  assert.equal(downloads[1].events[0].description, "Saved only");
  assert.equal(downloads[1].events[0].timestamp, 23.75);
  assert.equal(downloads[1].createdAt, createdAt);
  assert.equal(h.media.currentTime, 23.75); assert.equal(h.media.paused, false);
  component(Settings).props.onClose(); update();
  component(Buttons).props.onSelect("shot"); update();
  assert(component(Form));
  // An active draft cannot open Settings or become a saved event implicitly.
  component(Buttons).props.onOpenSettings(); update();
  assert.equal(component(Settings), undefined);
  assert.equal(downloads.length, 2);
  h.dispose(ctx);
});
