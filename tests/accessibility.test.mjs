import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

// These assert markup and handlers, not native focus, Tab containment or screen-reader output.
function importSetup() {
  const h = createHarness(), ctx = h.context(), applied = [];
  const Component = h.load("src/components/SessionImport.tsx").default;
  const session = h.load("src/utils/session.ts").createSessionSnapshot({
    players: [], events: [], nextPlayerId: 1, nextEventId: 1,
    createdAt: "2026-11-13T10:00:00Z", exportedAt: "2026-11-13T11:00:00Z",
    video: { fileName: "match.mp4", fileSize: 123, duration: 100 },
  });
  let tree;
  const update = () => tree = h.render(Component, { onImport: value => applied.push(value) }, ctx);
  update();
  const read = async () => {
    await nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: {
      files: [{ text: async () => JSON.stringify(session) }], value: "session.json",
    } }); update();
  };
  return { read, update, applied, dispose: () => h.dispose(ctx), get tree() { return tree; } };
}

test("import confirmation uses a named native modal with Cancel autofocus and isolated Escape cancellation", async () => {
  const s = importSetup(); await s.read();
  const dialog = nodes(s.tree, n => n.type === "dialog")[0];
  assert.equal(dialog.props["aria-modal"], "true");
  assert.equal(text(nodes(dialog, n => n.props?.id === dialog.props["aria-labelledby"])[0]), "Replace current session?");
  assert(text(nodes(dialog, n => n.props?.id === dialog.props["aria-describedby"])[0]).includes("replace the current events"));
  const cancel = nodes(dialog, n => n.type === "button" && text(n) === "Cancel")[0];
  assert.equal(cancel.props.autoFocus, true);
  assert(cancel.props.ref);
  let stopped = false, prevented = false;
  dialog.props.onKeyDown({ stopPropagation() { stopped = true; } });
  assert(stopped);
  dialog.props.onCancel({ preventDefault() { prevented = true; }, stopPropagation() {} }); s.update();
  assert(prevented);
  assert.equal(nodes(s.tree, n => n.type === "dialog").length, 0);
  const launcher = nodes(s.tree, n => n.type === "button")[0];
  assert.equal(launcher.props.disabled, false);
  assert(launcher.props.ref);
  assert.equal(s.applied.length, 0);
  await s.read();
  nodes(s.tree, n => n.type === "button" && text(n) === "Cancel")[0].props.onClick(); s.update();
  assert.equal(s.applied.length, 0);
  s.dispose();
});

test("native import confirmation still applies only on explicit Import", async () => {
  const s = importSetup(); await s.read();
  const dialog = nodes(s.tree, n => n.type === "dialog")[0];
  nodes(dialog, n => n.type === "button" && text(n) === "Import session")[0].props.onClick(); s.update();
  assert.equal(s.applied.length, 1);
  assert.equal(nodes(s.tree, n => n.type === "dialog").length, 0);
  s.dispose();
});

test("player validation marks only the invalid input and links its stable error description", () => {
  const h = createHarness(), ctx = h.context();
  const Component = h.load("src/components/PlayersPanel.tsx").default;
  let tree, saved = 0;
  const update = () => tree = h.render(Component, {
    players: [], events: [], onAdd() { saved++; return true; }, onUpdate() {}, onDelete() {}, onClose() {},
  }, ctx);
  const input = name => nodes(tree, n => n.type === "input" && n.props.name === name)[0];
  const submit = () => { nodes(tree, n => n.type === "form")[0].props.onSubmit({ preventDefault() {} }); update(); };
  update(); submit();
  assert.equal(input("playerName").props["aria-invalid"], true);
  assert.equal(input("shirtNumber").props["aria-invalid"], false);
  assert.equal(input("playerName").props["aria-describedby"], "add-player-error");
  assert.equal(text(nodes(tree, n => n.props?.id === "add-player-error")[0]), "Name is required.");
  input("playerName").props.onChange({ currentTarget: { value: "Player" } }); update();
  input("shirtNumber").props.onChange({ currentTarget: { value: "100" } }); update(); submit();
  assert.equal(input("playerName").props["aria-invalid"], false);
  assert.equal(input("shirtNumber").props["aria-invalid"], true);
  assert.equal(input("shirtNumber").props["aria-describedby"], "add-player-error");
  const error = nodes(tree, n => n.props?.id === input("shirtNumber").props["aria-describedby"])[0];
  assert.equal(error.props.role, "alert");
  assert(text(error).includes("0 to 99"));
  for (const name of ["playerName", "shirtNumber"]) {
    const label = nodes(tree, n => n.type === "label" && nodes(n, child => child === input(name)).length > 0)[0];
    assert(label); assert(input(name).props.ref);
  }
  assert.equal(saved, 0);
  input("shirtNumber").props.onChange({ currentTarget: { value: "9" } }); update();
  assert.equal(input("shirtNumber").props["aria-invalid"], false);
  assert.equal(input("shirtNumber").props["aria-describedby"], undefined);
  h.dispose(ctx);
});

test("Saved status region contains only confirmation text while Edit and Delete remain outside", () => {
  const h = createHarness(), Component = h.load("src/components/SavedEventSummary.tsx").default;
  const tree = h.render(Component, {
    event: { id: 1, type: "custom", timestamp: 10, description: "Saved note" }, players: [],
    disabled: false, onEdit() {}, onDelete() {},
  });
  const status = nodes(tree, n => n.props?.role === "status")[0];
  assert.equal(text(status), "Saved");
  assert.equal(nodes(status, n => ["button", "input", "a"].includes(n.type)).length, 0);
  assert.deepEqual(nodes(tree, n => n.type === "button").map(text), ["Edit", "Delete"]);
});

for (const duration of [100, 50]) test(`reattach ${duration === 100 ? "match" : "mismatch"} exposes explicit reading/result/return focus targets`, () => {
  const h = createHarness(), ctx = h.context();
  const Component = h.load("src/components/VideoReattachment.tsx").default;
  const expected = { fileName: "match.mp4", fileSize: 123, duration: 100 };
  let tree, attached = 0;
  const update = () => tree = h.render(Component, { expected, events: [], onAttach() { attached++; } }, ctx);
  update();
  const launcherRef = nodes(tree, n => n.type === "button")[0].props.ref;
  nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: {
    files: [{ name: "match.mp4", type: "video/mp4", size: 123 }], value: "match.mp4",
  } }); update();
  const reading = nodes(tree, n => n.props?.role === "status")[0];
  assert.equal(reading.props.tabIndex, -1); assert(reading.props.ref);
  nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata({ currentTarget: { duration } }); update();
  const result = nodes(tree, n => n.props?.className?.includes("video-match-result"))[0];
  assert.equal(result.props.tabIndex, -1); assert(result.props.ref);
  assert(nodes(result, n => n.props?.id === result.props["aria-describedby"])[0]);
  assert.equal(result.props.role, undefined);
  assert.equal(nodes(tree, n => n.type === "button" && text(n) === (duration === 100 ? "Continue analysis" : "Use this video anyway")).length, 1);
  nodes(tree, n => n.type === "button" && text(n) === "Cancel")[0].props.onClick(); update();
  assert.equal(nodes(tree, n => n.type === "button")[0].props.ref, launcherRef);
  assert.equal(attached, 0);
  h.dispose(ctx);
});

test("non-modal panels retain named close buttons, while visible Review controls need no redundant labels", () => {
  const h = createHarness();
  const common = { players: [], events: [], onClose() {} };
  for (const [name, props] of [
    ["EventsPanel", { ...common, totalEventCount: 0, selectedEventType: "all", selectedPlayerId: "all" }],
    ["PlayersPanel", common],
    ["ShortcutSettings", { shortcuts: h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS, onChange() {}, onClose() {} }],
  ]) {
    const ctx = h.context(), Component = h.load(`src/components/${name}.tsx`).default;
    const tree = h.render(Component, props, ctx);
    assert.equal(tree.props.role, "dialog");
    assert.equal(tree.props["aria-modal"], undefined);
    assert(nodes(tree, n => n.props?.id === tree.props["aria-labelledby"])[0]);
    const close = nodes(tree, n => n.props?.className === "panel-close-button")[0];
    assert(close.props["aria-label"].startsWith("Close "));
    assert.equal(close.props.type, "button");
    h.dispose(ctx);
  }
  const Review = h.load("src/components/ReviewControls.tsx").default;
  const tree = h.render(Review, { event: { type: "custom", description: "Note", timestamp: 0 }, players: [], index: 0, total: 1 });
  for (const button of nodes(tree, n => n.type === "button")) {
    assert(text(button)); assert.equal(button.props["aria-label"], undefined);
  }
  const Icon = h.load("src/components/PanelCloseIcon.tsx").default;
  assert.equal(h.render(Icon, {}).props["aria-hidden"], "true");
});
