import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function setup() {
  const h = createHarness(), ctx = h.context(true);
  const load = name => h.load(`src/components/${name}.tsx`).default;
  const Player = load("VideoPlayer"), Panel = load("EventsPanel"), Buttons = load("EventButtons");
  const Form = load("EventForm"), Summary = load("SavedEventSummary"), Review = load("ReviewControls");
  const Delete = load("DeleteEventConfirmation"), Settings = load("ShortcutSettings");
  const { DEFAULT_EVENT_SHORTCUTS } = h.load("src/config/eventShortcuts.ts");
  let active = false, tree;
  const update = () => tree = h.render(Player, {
    isAnalysisActive: active, onAnalysisActiveChange: value => active = value,
    eventShortcuts: { ...DEFAULT_EVENT_SHORTCUTS, shot: "s" },
  }, ctx);
  const component = Type => nodes(tree, node => node.type === Type)[0];
  const buttons = () => component(Buttons).props;
  const panel = () => component(Panel).props;
  const review = () => component(Review)?.props;
  const open = () => { buttons().onOpenEvents(); update(); };
  const filter = (eventType, playerId) => { panel().onEventTypeChange(eventType); panel().onPlayerChange(playerId); update(); };
  const press = (key, extra) => { h.press(key, extra); update(); };
  const start = () => { panel().onStartReview(); update(); };
  const next = () => { review().onNext(); update(); };
  const previous = () => { review().onPrevious(); update(); };
  const exitReview = () => { review().onExit(); update(); };
  const position = () => text(nodes(h.render(Review, review()), node => node.props?.role === "status")[0]);
  const control = label => nodes(h.render(Review, review()), node => node.type === "button" && text(node) === label)[0];
  const upload = () => { nodes(tree, node => node.type === "input")[0].props.onChange({ currentTarget: {
    files: [{ name: "match.mp4", type: "video/mp4" }], value: "match.mp4",
  } }); update(); };
  const ready = () => { nodes(tree, node => node.type === "video")[0].props.onLoadedMetadata(); update(); };
  const resume = () => { nodes(tree, node => node.type === "button" && text(node) === "Resume analysis")[0].props.onClick(); update(); };
  const add = (type, playerId, timestamp) => {
    h.media.currentTime = timestamp; buttons().onSelect(type); update();
    const details = { type, ...(type === "shot" ? { outcome: "on-target", bodyPart: "foot" } : {}),
      ...(type === "pass" ? { outcome: "completed" } : {}), ...(type === "duel" ? { outcome: "won" } : {}) };
    component(Form).props.onSave(playerId, details); update();
  };
  update(); upload(); ready();
  const dispose = () => h.dispose(ctx);
  return { h, ctx, update, component, buttons, panel, review, open, filter, press, start, next, previous, exitReview,
    position, control, upload, ready, resume, add, dispose, Panel, Buttons, Form, Summary, Review, Delete, Settings,
    get tree() { return tree; } };
}

function seed(s) {
  for (const [type, playerId, timestamp] of [
    ["shot", 1, 90.75], ["pass", 3, 4.5], ["shot", 1, 12.125], ["shot", 2, 7],
    ["shot", 1, 55.875], ["duel", 2, 21], ["shot", 1, 44],
  ]) s.add(type, playerId, timestamp);
}

test("Review uses the exact shared filtered list in timestamp order, with safe boundaries and immutable data", () => {
  const s = setup(); seed(s); s.open();
  const history = s.ctx.states.find(value => Array.isArray(value) && value.length === 7);
  const players = s.h.load("src/data/players.ts").players;
  const original = JSON.stringify(history), roster = JSON.stringify(players);
  history.forEach(Object.freeze); Object.freeze(history);
  players.forEach(Object.freeze); Object.freeze(players);
  s.filter("shot", 1);
  const filtered = s.panel().events;
  Object.freeze(filtered);
  assert.deepEqual(Array.from(filtered, event => event.timestamp), [12.125, 44, 55.875, 90.75]);
  const panelUI = s.h.render(s.Panel, s.panel());
  const startButton = nodes(panelUI, node => node.type === "button" && text(node) === "Review 4 events")[0];
  assert(startButton); assert(!startButton.props.disabled);
  s.h.media.paused = true;
  s.start();
  assert(!s.component(s.Panel)); assert.equal(s.position(), "1 / 4");
  assert.equal(s.review().event, filtered[0]); assert.equal(s.h.media.currentTime, 12.125); assert(s.h.media.paused);
  assert(s.control("Previous").props.disabled); assert(!s.control("Next").props.disabled);
  s.previous(); assert.equal(s.position(), "1 / 4");
  s.next(); assert.equal(s.position(), "2 / 4"); assert.equal(s.h.media.currentTime, 44);
  s.next(); assert.equal(s.position(), "3 / 4"); assert.equal(s.h.media.currentTime, 55.875);
  s.previous(); assert.equal(s.position(), "2 / 4"); assert.equal(s.h.media.currentTime, 44);
  // Manual HTML5 playback remains under user control; navigation only seeks.
  s.h.media.paused = false;
  s.next(); assert(!s.h.media.paused);
  s.next(); assert.equal(s.position(), "4 / 4"); assert.equal(s.h.media.currentTime, 90.75);
  assert(s.control("Next").props.disabled); assert(!s.control("Previous").props.disabled);
  s.next(); assert.equal(s.position(), "4 / 4");
  assert(nodes(s.tree, node => node.type === "video")[0].props.controls);
  const summary = text(s.h.render(s.Review, s.review()));
  assert(summary.includes("01:30")); assert(summary.includes("#9")); assert(summary.includes("Shot · On Target · Foot"));
  s.exitReview(); assert(!s.review()); assert.equal(s.h.media.currentTime, 90.75);
  assert(s.component(s.Summary)); s.open();
  assert.equal(s.panel().selectedEventType, "shot"); assert.equal(s.panel().selectedPlayerId, 1);
  assert.equal(s.panel().events, filtered); assert.equal(s.panel().totalEventCount, 7);
  assert.equal(JSON.stringify(history), original); assert.equal(JSON.stringify(players), roster);
  assert(filtered.every(event => history.includes(event)));
  s.dispose(); assert.equal(s.h.listeners.size, 0);
});

test("zero matching events cannot start Review; one matching event has both navigation buttons disabled", () => {
  const s = setup(); s.open();
  const reviewButton = () => nodes(s.h.render(s.Panel, s.panel()), node => node.type === "button" && text(node).startsWith("Review "))[0];
  assert(reviewButton().props.disabled); s.start(); assert(!s.review());
  s.panel().onClose(); s.update(); s.add("pass", 3, 16.375); s.open(); s.filter("shot", 1);
  assert(reviewButton().props.disabled); s.start(); assert(!s.review());
  s.filter("pass", 3); assert(!reviewButton().props.disabled); assert.equal(text(reviewButton()), "Review 1 event");
  s.start(); assert.equal(s.position(), "1 / 1"); assert.equal(s.h.media.currentTime, 16.375);
  assert(s.control("Previous").props.disabled); assert(s.control("Next").props.disabled);
  s.previous(); s.next(); assert.equal(s.position(), "1 / 1");
  s.dispose();
});

test("Review locks mutations, overlays and event shortcuts while all six Quick Seek shortcuts keep the same index", () => {
  const s = setup(); seed(s); s.open(); s.filter("shot", 1); s.start();
  assert(!s.component(s.Buttons));
  const reviewUI = s.h.render(s.Review, s.review());
  assert.equal(nodes(reviewUI, node => node.type === "kbd").length, 0);
  assert(s.control("Exit").props.onClick); assert(s.control("Exit").props.disabled !== true);
  assert(!s.component(s.Summary)); assert(!s.component(s.Form)); assert(!s.component(s.Delete));
  assert(!s.component(s.Panel)); assert(!s.component(s.Settings));
  s.press("s"); assert(!s.component(s.Form)); assert.equal(s.position(), "1 / 4");
  for (const [key, delta] of [["2", 1.2], ["3", 1.5], ["4", 2]]) for (const shiftKey of [false, true]) {
    const before = s.h.media.currentTime;
    s.press(key, { code: `Digit${key}`, shiftKey });
    assert.equal(s.h.media.currentTime, before + (shiftKey ? -delta : delta));
    assert.equal(s.position(), "1 / 4");
  }
  s.next(); assert.equal(s.position(), "2 / 4"); assert.equal(s.h.media.currentTime, 44);
  s.press("Escape"); assert(!s.review()); assert(!s.component(s.Form));
  s.open(); assert.equal(s.panel().selectedEventType, "shot"); assert.equal(s.panel().selectedPlayerId, 1);
  s.dispose();
});

test("app Exit/Resume and video replacement/error reset ephemeral Review but preserve session filters appropriately", () => {
  const s = setup(); seed(s); s.open(); s.filter("shot", 1); s.start(); s.next();
  s.press("3", { code: "Digit3" }); const position = s.h.media.currentTime;
  s.h.media.paused = false; s.control("Exit").props.onClick(); s.update();
  assert(!s.review()); assert(s.h.media.paused);
  s.resume(); assert(!s.review()); assert(s.component(s.Buttons)); assert.equal(s.h.media.currentTime, position);
  s.open(); assert.equal(s.panel().selectedEventType, "shot"); assert.equal(s.panel().selectedPlayerId, 1);
  s.start(); assert.equal(s.position(), "1 / 4");
  s.control("Exit").props.onClick(); s.update(); s.upload(); s.ready(); s.open();
  assert(!s.review()); assert.equal(s.panel().selectedEventType, "all"); assert.equal(s.panel().selectedPlayerId, "all");
  s.panel().onClose(); s.update(); s.add("shot", 1, 3.25); s.open(); s.filter("shot", 1); s.start();
  nodes(s.tree, node => node.type === "video")[0].props.onError(); s.update();
  assert(!s.review()); s.upload(); s.ready(); assert(s.component(s.Buttons)); s.open();
  assert.equal(s.panel().selectedEventType, "all"); assert.equal(s.panel().selectedPlayerId, "all");
  assert.equal(s.panel().events.length, 0);
  s.dispose();
});

test("out-of-range or emptied external lists exit safely; valid external updates derive the new current event", () => {
  const s = setup(); seed(s); s.open(); s.filter("shot", 1); s.start(); s.next(); s.next(); s.next();
  const stateIndex = s.ctx.states.findIndex(value => Array.isArray(value) && value.length === 7);
  const saved = s.ctx.states[stateIndex];
  s.ctx.states[stateIndex] = saved.filter(event => event.type !== "shot" || event.timestamp < 50); s.update(); s.update();
  assert(!s.review()); s.open(); assert.equal(s.panel().selectedEventType, "shot"); assert.equal(s.panel().events.length, 2);
  s.ctx.states[stateIndex] = saved; s.update(); s.start();
  const id = s.review().event.id;
  s.ctx.states[stateIndex] = saved.map(event => event.id === id ? { ...event, timestamp: 13.5 } : event);
  s.update(); assert.equal(s.review().event.timestamp, 13.5); assert.equal(s.h.media.currentTime, 13.5);
  s.ctx.states[stateIndex] = []; s.update(); s.update(); assert(!s.review());
  s.dispose();
});

test("draft/edit/delete and shortcut-capture Escape priorities remain separate from Review", () => {
  const s = setup(); seed(s);
  s.buttons().onSelect("shot"); s.update(); assert(s.component(s.Form));
  s.buttons().onOpenEvents(); s.update(); assert(!s.component(s.Panel)); assert(!s.review());
  s.press("Escape"); assert(!s.component(s.Form));
  // Restore a saved summary by saving an event, then exercise Edit and Delete cancellation.
  s.add("pass", 3, 6); s.component(s.Summary).props.onEdit(); s.update();
  s.buttons().onOpenEvents(); s.update(); assert(!s.component(s.Panel)); assert(!s.review());
  s.press("Escape"); assert(s.component(s.Summary));
  s.component(s.Summary).props.onDelete(); s.update(); s.buttons().onOpenEvents(); s.update();
  assert(!s.component(s.Panel)); s.press("Escape"); assert(s.component(s.Summary));
  s.buttons().onOpenSettings(); s.update();
  const ctx = s.h.context();
  let settings = s.h.render(s.Settings, s.component(s.Settings).props, ctx);
  nodes(settings, node => node.type === "button" && node.props["aria-label"] === "Change Shot shortcut")[0].props.onClick();
  settings = s.h.render(s.Settings, s.component(s.Settings).props, ctx);
  s.press("Escape"); assert(s.component(s.Settings));
  s.h.render(s.Settings, s.component(s.Settings).props, ctx); // Capturing ended: listener removed.
  s.press("Escape"); assert(!s.component(s.Settings)); s.h.dispose(ctx);
  s.open(); s.start(); assert(s.review()); s.press("Escape"); assert(!s.review());
  s.dispose(); assert.equal(s.h.listeners.size, 0);
});

test("Review layout omits all action rails and restores normal groups/badges on Exit Review and Escape", () => {
  const s = setup(); seed(s);
  const workspace = () => nodes(s.tree, node => node.type === "div" && node.props?.className?.split(" ").includes("tagging-workspace"))[0];
  const normal = () => {
    assert.equal(workspace().props.className, "tagging-workspace");
    assert(s.component(s.Buttons));
    const controls = s.h.render(s.Buttons, s.buttons());
    assert.deepEqual(nodes(controls, node => node.props?.role === "group").map(node => node.props["aria-label"]), ["top actions", "left actions", "right actions"]);
    assert.equal(nodes(controls, node => node.type === "kbd").length, 10);
  };
  const video = nodes(s.tree, node => node.type === "video")[0];
  normal(); s.open(); s.start();
  assert.equal(workspace().props.className, "tagging-workspace tagging-workspace-review");
  assert(!s.component(s.Buttons)); assert(s.review());
  const bottom = nodes(workspace(), node => node.props?.className === "bottom-rail")[0];
  assert.equal(nodes(bottom, node => node.type === s.Review).length, 1);
  assert.equal(nodes(s.tree, node => node.type === "video")[0].key, video.key);
  assert.equal(nodes(s.tree, node => node.type === "video")[0].props.src, video.props.src);
  s.exitReview(); normal();
  s.open(); s.start(); s.press("Escape"); normal();
  s.dispose();
});
