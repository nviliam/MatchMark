import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function setup() {
  const h = createHarness(), ctx = h.context(true);
  const names = ["VideoPlayer", "EventButtons", "ShortcutsPanel", "SessionPanel", "SessionImport", "EventForm", "EventsPanel", "PlayersPanel"];
  const components = Object.fromEntries(names.map(name => [name, h.load(`src/components/${name}.tsx`).default]));
  const defaults = h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS;
  let active = false, shortcuts = { ...defaults }, tree, exported;
  h.load("src/utils/session.ts").downloadSession = value => exported = value;
  const update = () => tree = h.render(components.VideoPlayer, { isAnalysisActive: active,
    onAnalysisActiveChange: value => active = value, eventShortcuts: shortcuts,
    onEventShortcutsChange: value => shortcuts = value }, ctx);
  const component = name => nodes(tree, n => n.type === components[name])[0];
  const buttons = () => component("EventButtons").props;
  update();
  nodes(tree, n => n.type === "input" && n.props.accept?.includes("video/mp4"))[0].props.onChange({
    currentTarget: { files: [{ name: "match.mp4", type: "video/mp4", size: 20 }], value: "" },
  }); update(); nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update();
  return { h, ctx, components, defaults, update, component, buttons,
    get tree() { return tree; }, get shortcuts() { return shortcuts; }, get exported() { return exported; } };
}

test("Events / Players / Shortcuts / Session menu opens exclusive named panels and restores the correct opener focus", () => {
  const s = setup();
  const menu = s.h.render(s.components.EventButtons, s.buttons());
  const controls = nodes(menu, n => n.props?.className === "analysis-controls")[0];
  assert.deepEqual(nodes(controls, n => n.type === "button").map(text), ["Events", "Players", "Shortcuts", "Session", "Exit"]);
  assert.equal(nodes(menu, n => n.type === "button" && text(n) === "Settings").length, 0);
  for (const [name, open, ref, id] of [
    ["ShortcutsPanel", "onOpenShortcuts", "shortcutsButtonRef", "shortcuts-panel"],
    ["SessionPanel", "onOpenSession", "sessionButtonRef", "session-panel"],
  ]) {
    const focus = [];
    s.buttons()[ref].current = { focus: () => focus.push("opener") };
    s.buttons()[open](); s.update();
    const renderedMenu = s.h.render(s.components.EventButtons, s.buttons());
    const opener = nodes(renderedMenu, n => n.type === "button" && n.props["aria-controls"] === id)[0];
    assert.equal(opener.props["aria-expanded"], true);
    const panelCtx = s.h.context(); panelCtx.refs[0] = { current: { focus: () => focus.push("close") } };
    const panel = s.h.render(s.components[name], s.component(name).props, panelCtx);
    assert.deepEqual(focus, ["close"]);
    assert.equal(panel.props.role, "dialog");
    assert.equal(panel.props.id, id);
    assert(nodes(panel, n => n.props?.id === panel.props["aria-labelledby"])[0]);
    if (name === "ShortcutsPanel") {
      assert.equal(nodes(panel, n => n.type === s.components.SessionImport).length, 0);
      assert(!text(panel).includes("Export session"));
    } else {
      assert(!text(panel).includes("Reset to defaults"));
      assert.equal(nodes(panel, n => n.type === s.components.SessionImport).length, 1);
    }
    nodes(panel, n => n.props?.className === "panel-close-button")[0].props.onClick(); s.update();
    assert.equal(s.component(name), undefined); assert.deepEqual(focus, ["close", "opener"]);
    s.h.dispose(panelCtx);
    s.buttons()[open](); s.update(); s.h.press("Escape"); s.update();
    assert.equal(s.component(name), undefined); assert.deepEqual(focus, ["close", "opener", "opener"]);
  }
  for (const [open, name] of [["onOpenEvents", "EventsPanel"], ["onOpenPlayers", "PlayersPanel"],
    ["onOpenShortcuts", "ShortcutsPanel"], ["onOpenSession", "SessionPanel"], ["onOpenShortcuts", "ShortcutsPanel"]]) {
    s.buttons()[open](); s.update();
    for (const other of ["EventsPanel", "PlayersPanel", "ShortcutsPanel", "SessionPanel"]) assert.equal(Boolean(s.component(other)), other === name);
  }
  s.h.dispose(s.ctx);
});

test("Shortcuts editing/reset and capture Escape priority remain intact; Session also keeps Quick Seek active", () => {
  const s = setup(); s.buttons().onOpenShortcuts(); s.update();
  const panelCtx = s.h.context(); let panel;
  const render = () => panel = s.h.render(s.components.ShortcutsPanel, s.component("ShortcutsPanel").props, panelCtx);
  const capture = () => { nodes(panel, n => n.props?.["aria-label"] === "Change Goal shortcut")[0].props.onClick(); render(); };
  render(); capture(); s.h.press("k"); s.update(); render();
  assert.equal(s.shortcuts.goal, "k"); assert.equal(s.component("EventForm"), undefined);
  capture(); s.h.press("Escape"); s.update(); render();
  assert(s.component("ShortcutsPanel")); assert(text(panel).includes("Changes apply immediately."));
  nodes(panel, n => n.type === "button" && text(n) === "Reset to defaults")[0].props.onClick(); s.update(); render();
  assert.deepEqual(JSON.parse(JSON.stringify(s.shortcuts)), JSON.parse(JSON.stringify(s.defaults)));
  s.h.press("Escape"); s.update(); assert.equal(s.component("ShortcutsPanel"), undefined); s.h.dispose(panelCtx);
  s.buttons().onOpenSession(); s.update();
  s.h.media.currentTime = 10; s.h.press("2", { code: "Digit2" }); s.update();
  assert.equal(s.h.media.currentTime, 11.2); assert(s.component("SessionPanel"));
  s.h.press(s.shortcuts.shot); s.update(); assert.equal(s.component("EventForm"), undefined);
  s.h.press("Escape"); s.update(); assert.equal(s.component("SessionPanel"), undefined);
  s.h.dispose(s.ctx); assert.equal(s.h.listeners.size, 0);
});

test("Session panel exports saved data and imports through existing validation and explicit confirmation", async () => {
  const s = setup();
  s.buttons().onSelect("custom"); s.update();
  s.component("EventForm").props.onSave(undefined, { type: "custom", description: "Saved event" }); s.update();
  s.buttons().onOpenSession(); s.update();
  const panelCtx = s.h.context();
  const panel = s.h.render(s.components.SessionPanel, s.component("SessionPanel").props, panelCtx);
  nodes(panel, n => n.type === "button" && text(n) === "Export session")[0].props.onClick(); s.update();
  assert.equal(s.exported.events.length, 1); assert.equal(s.exported.events[0].description, "Saved event");
  const original = s.exported;
  const imported = { ...original, events: [{ ...original.events[0], description: "Imported event" }] };
  const importProps = nodes(panel, n => n.type === s.components.SessionImport)[0].props;
  const importCtx = s.h.context(); let tree;
  const render = () => tree = s.h.render(s.components.SessionImport, importProps, importCtx);
  const read = async content => {
    await nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { files: [{ text: async () => content }], value: "" } });
    render(); s.update();
  };
  render(); await read("invalid"); assert(text(tree).includes("invalid JSON")); assert(s.component("SessionPanel"));
  await read(JSON.stringify(imported)); assert(text(tree).includes("Replace current session?"));
  assert(s.component("SessionPanel"));
  nodes(tree, n => n.type === "button" && text(n) === "Cancel")[0].props.onClick(); render(); s.update();
  assert(s.component("SessionPanel"));
  s.component("SessionPanel").props.onExportSession(); s.update(); assert.equal(s.exported.events[0].description, "Saved event");
  await read(JSON.stringify(imported));
  nodes(tree, n => n.type === "button" && text(n) === "Import session").at(-1).props.onClick(); s.update();
  assert.equal(s.component("SessionPanel"), undefined); assert.equal(s.component("ShortcutsPanel"), undefined);
  nodes(s.tree, n => n.type === "button" && text(n) === "Export session")[0].props.onClick(); s.update();
  assert.equal(s.exported.events[0].description, "Imported event");
  assert.equal(nodes(s.tree, n => n.type === "video").length, 0);
  s.h.dispose(importCtx); s.h.dispose(panelCtx); s.h.dispose(s.ctx);
});
