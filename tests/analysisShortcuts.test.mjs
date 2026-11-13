import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function setup() {
  const h = createHarness(), ctx = h.context(), selected = [];
  const { useAnalysisShortcuts } = h.load("src/hooks/useAnalysisShortcuts.ts");
  const options = {
    shortcuts: h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS,
    eventShortcutsEnabled: true, quickSeekEnabled: true,
    videoRef: { current: h.media }, onEventShortcut: type => selected.push(type),
  };
  const update = () => h.render(useAnalysisShortcuts, options, ctx);
  update();
  return { h, options, update, selected, dispose: () => h.dispose(ctx) };
}

test("event mapping updates without duplicate listeners and enabled flags remain independent", () => {
  const s = setup();
  s.h.press("q"); assert.deepEqual(s.selected, ["pass"]);
  s.options.shortcuts = { ...s.options.shortcuts, pass: "k" }; s.update();
  s.h.press("q"); s.h.press("K"); assert.deepEqual(s.selected, ["pass", "pass"]);
  s.options.eventShortcutsEnabled = false; s.update();
  s.h.press("k"); assert.equal(s.selected.length, 2);
  s.h.press("2", { code: "Digit2" }); assert.equal(s.h.media.currentTime, 1.2);
  s.options.quickSeekEnabled = false; s.options.eventShortcutsEnabled = true; s.update();
  s.h.press("k"); assert.equal(s.selected.length, 3);
  s.h.press("2", { code: "Digit2" }); assert.equal(s.h.media.currentTime, 1.2);
  s.dispose(); assert.equal(s.h.listeners.size, 0);
  s.h.press("k"); s.h.press("2", { code: "Digit2" });
  assert.equal(s.selected.length, 3); assert.equal(s.h.media.currentTime, 1.2);
});

test("Quick Seek uses physical Digit keys, exact offsets, Shift and video boundaries", () => {
  const s = setup();
  for (const [code, offset] of [["Digit2", 1.2], ["Digit3", 1.5], ["Digit4", 2]]) {
    s.h.media.currentTime = 10;
    s.h.press("unrelated", { code }); assert.equal(s.h.media.currentTime, 10 + offset);
    s.h.press("unrelated", { code, shiftKey: true }); assert.equal(s.h.media.currentTime, 10);
    s.h.media.currentTime = 0.1;
    s.h.press("unrelated", { code, shiftKey: true }); assert.equal(s.h.media.currentTime, 0);
    s.h.media.currentTime = 999.9;
    s.h.press("unrelated", { code }); assert.equal(s.h.media.currentTime, 1000);
  }
  s.h.media.currentTime = 10;
  s.h.press("2", { code: "Numpad2" }); assert.equal(s.h.media.currentTime, 10);
  s.h.press("q", { code: "Digit2" }); assert.equal(s.selected.length, 0);
  s.dispose();
});

test("both listeners ignore input, textarea, select and contenteditable targets", () => {
  const s = setup();
  for (const tag of ["input", "textarea", "select", "contenteditable"]) {
    const target = new s.h.Element();
    target.closest = selector => tag !== "contenteditable" && selector.split(", ").includes(tag) ? target : null;
    target.isContentEditable = tag === "contenteditable";
    s.h.press("q", { target });
    s.h.press("2", { code: "Digit2", target });
    assert.equal(s.selected.length, 0, tag);
    assert.equal(s.h.media.currentTime, 0, tag);
  }
  s.dispose();
});

test("repeat, composition, consumed events and modifiers are ignored without preventing defaults", () => {
  const s = setup(); let prevented = 0;
  for (const guard of ["repeat", "isComposing", "defaultPrevented", "ctrlKey", "altKey", "metaKey"]) {
    const extra = { [guard]: true, preventDefault: () => prevented++ };
    s.h.press("q", extra); s.h.press("2", { ...extra, code: "Digit2" });
    assert.equal(s.selected.length, 0, guard);
    assert.equal(s.h.media.currentTime, 0, guard);
  }
  assert.equal(prevented, 0);
  s.dispose();
});

test("Quick Seek ignores unavailable or failed media and non-finite duration", () => {
  const s = setup();
  for (const duration of [NaN, Infinity]) {
    s.h.media.duration = duration; s.h.press("2", { code: "Digit2" });
    assert.equal(s.h.media.currentTime, 0);
  }
  s.h.media.duration = 100; s.h.media.error = {};
  s.h.press("2", { code: "Digit2" }); assert.equal(s.h.media.currentTime, 0);
  s.options.videoRef.current = null;
  assert.doesNotThrow(() => s.h.press("2", { code: "Digit2" }));
  s.dispose();
});

test("actual settings capture listener consumes key configuration before both analysis listeners", () => {
  const s = setup(), ctx = s.h.context();
  const Settings = s.h.load("src/components/ShortcutSettings.tsx").default;
  let tree, changed;
  const update = () => tree = s.h.render(Settings, {
    shortcuts: s.options.shortcuts, onChange: value => changed = value, onClose() {},
  }, ctx);
  const capture = () => {
    nodes(tree, node => node.type === "button" && node.props["aria-label"] === "Change Goal shortcut")[0].props.onClick();
    update();
  };
  update(); capture();
  s.h.press("2", { code: "Digit2" }); update();
  assert.equal(s.h.media.currentTime, 0);
  assert(text(tree).includes("reserved for Quick Seek"));
  s.h.press("q"); update();
  assert.equal(s.selected.length, 0);
  assert(text(tree).includes("already assigned"));
  s.h.press("k"); update();
  assert.equal(changed.goal, "k");
  assert.equal(s.selected.length, 0);
  capture(); s.h.press("Escape"); update();
  assert(text(tree).includes("Changes apply immediately"));
  s.h.dispose(ctx); s.dispose(); assert.equal(s.h.listeners.size, 0);
});

for (const mode of ["draft", "overlay", "Review"]) test(`workspace ${mode} blocks event shortcuts while Quick Seek remains active`, () => {
  const h = createHarness(), ctx = h.context(true), components = {};
  for (const name of ["VideoPlayer", "EventButtons", "EventForm", "EventsPanel", "ReviewControls"]) {
    components[name] = h.load(`src/components/${name}.tsx`).default;
  }
  let tree, active = false;
  const update = () => tree = h.render(components.VideoPlayer, {
    isAnalysisActive: active, onAnalysisActiveChange: value => active = value,
    eventShortcuts: h.load("src/config/eventShortcuts.ts").DEFAULT_EVENT_SHORTCUTS,
  }, ctx);
  const component = name => nodes(tree, node => node.type === components[name])[0];
  const press = (key, extra) => { h.press(key, extra); update(); };
  try {
    update();
    nodes(tree, node => node.type === "input" && node.props.type === "file")[0].props.onChange({
      currentTarget: { files: [{ name: "match.mp4", type: "video/mp4", size: 100 }], value: "" },
    }); update();
    nodes(tree, node => node.type === "video")[0].props.onLoadedMetadata(); update();
    press("f"); assert(component("EventForm"));
    component("EventForm").props.onSave(undefined, { type: "custom", description: "Saved" }); update();
    if (mode === "draft") press("q");
    else {
      component("EventButtons").props.onOpenEvents(); update();
      if (mode === "Review") { component("EventsPanel").props.onStartReview(); update(); }
    }
    const pending = component("EventForm")?.props.pending;
    h.media.currentTime = 10;
    press("w");
    assert.equal(component("EventForm")?.props.pending, pending);
    press("2", { code: "Digit2" }); assert.equal(h.media.currentTime, 11.2);
    press("@", { code: "Digit2", shiftKey: true }); assert.equal(h.media.currentTime, 10);
    if (mode === "overlay") assert(component("EventsPanel"));
    if (mode === "Review") assert.equal(component("ReviewControls").props.index, 0);
    press("Escape");
    assert.equal(component("EventForm"), undefined);
    assert.equal(component("EventsPanel"), undefined);
    assert.equal(component("ReviewControls"), undefined);
  } finally { h.dispose(ctx); }
  assert.equal(h.listeners.size, 0);
});
