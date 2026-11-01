import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";
import { createEventDetails, createMatchEvent, formatEventDetails } from "../src/utils/events.ts";
import { getFilteredEvents } from "../src/utils/eventFiltering.ts";
import { DEFAULT_EVENT_SHORTCUTS, validateEventShortcuts } from "../src/config/eventShortcuts.ts";

const plain = value => JSON.parse(JSON.stringify(value));
const players = [{ id: 1, name: "Test Player" }];
const payloads = [
  { type: "pass", subtype: "long-ball", outcome: "completed" },
  { type: "shot", outcome: "goal", bodyPart: "head" },
  { type: "cross", outcome: "incomplete" },
  { type: "dribble", outcome: "successful" },
  { type: "ball-control", outcome: "unsuccessful" },
  { type: "ball-loss" }, { type: "goal" }, { type: "chance" },
  { type: "goalkeeper", subtype: "catch" },
  { type: "custom", description: "Counterpress" },
  { type: "tackle", outcome: "won" }, { type: "interception" },
  { type: "clearance" }, { type: "ball-recovery" }, { type: "aerial-duel", outcome: "lost" },
];

test("v1 domain factories store the exact typed payloads and only Custom allows no player", () => {
  for (const payload of payloads) {
    const details = createEventDetails(payload.type, payload.outcome ?? "", payload.bodyPart ?? null,
      payload.description ?? "", payload.subtype ?? "");
    assert.deepEqual(details, payload);
    assert.deepEqual(createMatchEvent(details, { id: 87, timestamp: 27.43 }, 1),
      { ...payload, id: 87, timestamp: 27.43, playerId: 1 });
    if (payload.type !== "custom") assert.equal(createMatchEvent(details, { id: 87, timestamp: 27.43 }), null);
  }
});

test("main-type filters include all Pass and Goalkeeper subtypes and summaries distinguish them", () => {
  const events = [
    ...["regular", "key-pass", "long-ball"].map((subtype, i) => ({ id: i + 1, timestamp: 9 - i,
      playerId: i === 1 ? 2 : 1, type: "pass", subtype, outcome: "completed" })),
    ...["save", "catch"].map((subtype, i) => ({ id: i + 4, timestamp: 2 + i, playerId: 1, type: "goalkeeper", subtype })),
  ];
  const snapshot = JSON.stringify(events);
  assert.deepEqual(getFilteredEvents(events, { eventType: "pass", playerId: "all" }).map(e => e.id), [3, 2, 1]);
  assert.deepEqual(getFilteredEvents(events, { eventType: "pass", playerId: 1 }).map(e => e.id), [3, 1]);
  assert.deepEqual(getFilteredEvents(events, { eventType: "goalkeeper", playerId: 1 }).map(e => e.id), [4, 5]);
  assert.equal(formatEventDetails(events[1]), "Pass · Key Pass · Completed");
  assert.equal(formatEventDetails(events[3]), "Goalkeeper · Save");
  assert.equal(JSON.stringify(events), snapshot);
});

test("v1 defaults match the requested rail bindings, remain unique and reserve save combinations", () => {
  assert.deepEqual(DEFAULT_EVENT_SHORTCUTS, {
    pass: "q", shot: "w", cross: "e", dribble: "r", "ball-control": "t", "ball-loss": "z",
    goal: "a", chance: "s", goalkeeper: "d", custom: "f", tackle: "y", interception: "x", clearance: "c",
    "ball-recovery": "v", "aerial-duel": "b",
  });
  assert.deepEqual(validateEventShortcuts(DEFAULT_EVENT_SHORTCUTS), DEFAULT_EVENT_SHORTCUTS);
  for (const key of ["Enter", "Ctrl+Enter", "Meta+Enter", "2", "3", "4"])
    assert.equal(validateEventShortcuts({ ...DEFAULT_EVENT_SHORTCUTS, goal: key }), null);
});

function formSession(initialEvent, disabled = false) {
  const h = createHarness(), Form = h.load("src/components/EventForm.tsx").default, ctx = h.context();
  const saves = [];
  const props = { players, pending: { type: initialEvent.type, timestamp: initialEvent.timestamp },
    initialEvent, disabled, onSave: (playerId, details) => saves.push(plain({ playerId, details })), onCancel() {} };
  let tree;
  const render = () => tree = h.render(Form, props, ctx);
  render();
  return { h, props, saves, render, get tree() { return tree; }, dispose: () => h.dispose(ctx) };
}

test("Ctrl/Cmd+Enter and the submit button use the same validated Save, including input/textarea focus", () => {
  for (const modifier of ["ctrlKey", "metaKey"]) for (const targetName of ["input", "textarea"]) {
    const s = formSession({ id: 5, timestamp: 42.5, type: "pass", subtype: "key-pass", outcome: "completed", playerId: 1 });
    const save = nodes(s.tree, n => n.type === "button" && n.props.type === "submit")[0];
    assert(!save.props.disabled);
    assert.equal(save.props["aria-keyshortcuts"], "Control+Enter Meta+Enter");
    const target = new s.h.Element(); target.closest = () => ({ tagName: targetName.toUpperCase() });
    s.h.press("Enter", { [modifier]: true, target });
    assert.equal(s.saves.length, 1);
    s.tree.props.onSubmit({ preventDefault() {} });
    assert.deepEqual(s.saves[0], s.saves[1]);
    for (const extra of [{}, { [modifier]: true, repeat: true }, { [modifier]: true, isComposing: true },
      { [modifier]: true, defaultPrevented: true }, { [modifier]: true, altKey: true }, { [modifier]: true, shiftKey: true }]) {
      s.h.press("Enter", extra);
    }
    assert.equal(s.saves.length, 2);
    s.dispose(); assert.equal(s.h.listeners.size, 0);
    s.h.press("Enter", { [modifier]: true }); assert.equal(s.saves.length, 2);
  }
});

test("Save shortcut cannot bypass invalid fields, missing/deleted players, Back or a suspended form", () => {
  const base = { id: 9, timestamp: 4, type: "pass", subtype: "regular", outcome: "completed", playerId: 1 };
  for (const event of [{ ...base, subtype: "" }, { ...base, subtype: "save" }, { ...base, outcome: "won" },
    { ...base, playerId: undefined }, { ...base, playerId: 999 },
    { id: 9, timestamp: 4, type: "goalkeeper", subtype: "regular", playerId: 1 },
    { id: 9, timestamp: 4, type: "custom", description: " " }]) {
    const s = formSession(event);
    assert(nodes(s.tree, n => n.props?.type === "submit")[0].props.disabled);
    s.h.press("Enter", { ctrlKey: true }); s.h.press("Enter", { metaKey: true });
    s.tree.props.onSubmit({ preventDefault() {} }); assert.equal(s.saves.length, 0); s.dispose();
  }
  const s = formSession(base, true);
  s.h.press("Enter", { ctrlKey: true }); assert.equal(s.saves.length, 0);
  s.props.disabled = false; s.render();
  nodes(s.tree, n => n.type === "button" && text(n) === "Back")[0].props.onClick(); s.render();
  s.h.press("Enter", { ctrlKey: true }); assert.equal(s.saves.length, 0);
  nodes(s.tree, n => n.type === "button" && text(n) === "Test Player")[0].props.onClick(); s.render();
  s.h.press("Enter", { metaKey: true }); assert.equal(s.saves.length, 1); s.dispose();
});

test("Custom textarea Enter remains text input and Ctrl+Enter waits for the eligible final step", () => {
  const s = formSession({ id: 1, timestamp: 2, type: "custom", description: "First line" });
  for (let i = 0; i < 2; i++) {
    nodes(s.tree, n => n.type === "button" && text(n) === "Back")[0].props.onClick(); s.render();
  }
  const textarea = nodes(s.tree, n => n.type === "textarea")[0];
  textarea.props.onChange({ currentTarget: { value: "First line\nSecond line" } }); s.render();
  let prevented = false;
  s.h.press("Enter", { preventDefault() { prevented = true; } });
  assert(!prevented);
  s.h.press("Enter", { ctrlKey: true }); assert.equal(s.saves.length, 0);
  for (const label of ["Next", "No player"]) {
    nodes(s.tree, n => n.type === "button" && text(n) === label)[0].props.onClick(); s.render();
  }
  s.h.press("Enter", { ctrlKey: true });
  assert.deepEqual(s.saves, [{ details: { type: "custom", description: "First line\nSecond line" } }]);
  s.dispose();
});

test("all fifteen click/keyboard workflows save domain payloads, edit preserves identity, and Review renders all types", () => {
  const h = createHarness(), ctx = h.context(true);
  const load = name => h.load(`src/components/${name}.tsx`).default;
  const Video = load("VideoPlayer"), Buttons = load("EventButtons"), Form = load("EventForm");
  const Panel = load("EventsPanel"), Summary = load("SavedEventSummary"), Review = load("ReviewControls");
  const definitions = h.load("src/config/eventDefinitions.ts").EVENT_DEFINITIONS;
  let active = false, tree;
  const render = () => tree = h.render(Video, { isAnalysisActive: active, onAnalysisActiveChange: value => active = value,
    eventShortcuts: DEFAULT_EVENT_SHORTCUTS }, ctx);
  const component = Type => nodes(tree, n => n.type === Type)[0];
  render();
  nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { value: "", files: [{ name: "match.mp4", type: "video/mp4" }] } });
  render(); nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); render();
  const buttons = h.render(Buttons, component(Buttons).props);
  const railLabels = label => nodes(nodes(buttons, n => n.props?.["aria-label"] === label)[0], n => n.props?.className === "event-action-label").map(text);
  assert.deepEqual(railLabels("top actions"), ["Pass", "Shot", "Cross", "Dribble", "Ball Control", "Ball Loss"]);
  assert.deepEqual(railLabels("left actions"), ["Goal", "Chance", "Goalkeeper", "Custom"]);
  assert.deepEqual(railLabels("right actions"), ["Tackle", "Interception", "Clearance", "Ball Recovery", "Aerial Duel"]);

  for (const [i, payload] of payloads.entries()) {
    h.media.currentTime = 20.375 + i;
    component(Buttons).props.onSelect(payload.type); render();
    const clicked = plain(component(Form).props.pending);
    component(Form).props.onCancel(); render();
    h.press(DEFAULT_EVENT_SHORTCUTS[payload.type].toUpperCase()); render();
    assert.deepEqual(plain(component(Form).props.pending), clicked);
    const formCtx = h.context();
    const renderForm = () => h.render(Form, component(Form).props, formCtx);
    let form = renderForm();
    for (const field of definitions[payload.type].fields) {
      if (field.type === "text") {
        nodes(form, n => n.type === "textarea")[0].props.onChange({ currentTarget: { value: payload.description } });
        form = renderForm();
        nodes(form, n => n.type === "button" && text(n) === "Next")[0].props.onClick();
      } else {
        const label = field.options.find(option => option.id === payload[field.id]).label;
        const group = nodes(form, n => n.props?.className === "workflow-step")[0];
        nodes(group, n => n.type === "button" && text(n) === label)[0].props.onClick();
      }
      form = renderForm();
    }
    const group = nodes(form, n => n.props?.className === "workflow-step")[0];
    nodes(group, n => n.type === "button")[0].props.onClick(); renderForm();
    h.press("Enter", { ctrlKey: true }); h.dispose(formCtx); render();
    assert(!component(Form));
    const saved = plain(component(Summary).props.event);
    assert.deepEqual(saved, { ...payload, id: i + 1, timestamp: clicked.timestamp,
      ...(payload.type === "custom" ? {} : { playerId: 1 }) });
    component(Summary).props.onEdit(); render();
    const edited = payload.type === "pass" ? { ...payload, subtype: "key-pass" }
      : payload.type === "goalkeeper" ? { ...payload, subtype: "save" } : payload;
    component(Form).props.onSave(saved.playerId, edited); render();
    assert.deepEqual(plain(component(Summary).props.event), { ...saved, ...edited });
  }
  component(Buttons).props.onOpenEvents(); render();
  assert.equal(component(Panel).props.events.length, 15); // Shot Goal did not create a second Goal.
  const history = component(Panel).props.events;
  component(Panel).props.onStartReview(); render();
  for (let i = 0; i < history.length; i++) {
    const review = component(Review);
    assert.equal(review.props.event, history[i]);
    assert.equal(h.media.currentTime, history[i].timestamp - 3);
    assert(text(h.render(Review, review.props)).includes(formatEventDetails(history[i])));
    review.props.onNext(); render();
  }
  component(Review).props.onExit(); render();
  h.dispose(ctx); assert.equal(h.listeners.size, 0);
});
