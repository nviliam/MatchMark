import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

test("panel options, labels and action placement follow metadata, including an added definition", () => {
  const h = createHarness((source, filename) => filename.endsWith("eventDefinitions.ts")
    ? source.replace('label: "Shot"', 'label: "Attempt"').replace('  pass: {', '  experimental: { label: "New event", order: 5, rail: "left" },\n  pass: {')
    : source);
  const Panel = h.load("src/components/EventsPanel.tsx").default;
  const Buttons = h.load("src/components/EventButtons.tsx").default;
  const { ORDERED_EVENT_TYPES, getEventLabel } = h.load("src/config/eventDefinitions.ts");
  const { DEFAULT_EVENT_SHORTCUTS } = h.load("src/config/eventShortcuts.ts");
  let changed;
  const panel = h.render(Panel, { events: [], totalEventCount: 0, selectedEventType: "all", onEventTypeChange: value => changed = value });
  const options = nodes(panel, n => n.type === "option");
  assert.deepEqual(options.map(n => n.props.value), ["all", ...ORDERED_EVENT_TYPES]);
  for (const option of options.slice(1)) assert.equal(text(option), getEventLabel(option.props.value));
  assert.equal(options[1].props.value, "experimental");
  const select = nodes(panel, n => n.type === "select")[0];
  select.props.onChange({ currentTarget: { value: "experimental" } });
  assert.equal(changed, "experimental");
  select.props.onChange({ currentTarget: { value: "invalid" } });
  assert.equal(changed, "experimental");
  const buttons = h.render(Buttons, { shortcuts: { ...DEFAULT_EVENT_SHORTCUTS, experimental: "x" } });
  const left = nodes(buttons, n => n.props?.["aria-label"] === "left actions")[0];
  assert(text(left).includes("New event"));
  assert(text(buttons).includes("Attempt"));
});

test("filter state survives panel lifecycle, seek uses exact timestamps, and workflow guards remain intact", () => {
  const h = createHarness(), ctx = h.context(true);
  const Player = h.load("src/components/VideoPlayer.tsx").default;
  const Panel = h.load("src/components/EventsPanel.tsx").default;
  const List = h.load("src/components/EventList.tsx").default;
  const Buttons = h.load("src/components/EventButtons.tsx").default;
  const Form = h.load("src/components/EventForm.tsx").default;
  const Summary = h.load("src/components/SavedEventSummary.tsx").default;
  const Delete = h.load("src/components/DeleteEventConfirmation.tsx").default;
  const Settings = h.load("src/components/ShortcutSettings.tsx").default;
  const { DEFAULT_EVENT_SHORTCUTS } = h.load("src/config/eventShortcuts.ts");
  let active = false, tree;
  const shortcuts = { ...DEFAULT_EVENT_SHORTCUTS, shot: "s" };
  const update = () => tree = h.render(Player, { isAnalysisActive: active, onAnalysisActiveChange: value => active = value, eventShortcuts: shortcuts }, ctx);
  const component = Type => nodes(tree, n => n.type === Type)[0];
  const open = () => { component(Buttons).props.onOpenEvents(); update(); };
  const panel = () => h.render(Panel, component(Panel).props);
  const filter = value => { nodes(panel(), n => n.type === "select")[0].props.onChange({ currentTarget: { value } }); update(); };
  const press = (key, extra) => { h.press(key, extra); update(); };
  const upload = () => { nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { files: [{ name: "video.mp4", type: "video/mp4" }], value: "video.mp4" } }); update(); };
  const ready = () => { nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update(); };
  const close = () => { component(Panel).props.onClose(); update(); };
  const count = expected => {
    assert.equal(component(Panel).props.events.length, expected);
    assert.equal(text(nodes(panel(), n => n.props?.role === "status")[0]), `\u00b7 ${expected}`);
  };
  update(); upload(); ready(); open();
  assert.equal(component(Panel).props.selectedEventType, "all");
  assert.equal(text(h.render(List, nodes(panel(), n => n.type === List)[0].props)), "No events yet.");
  count(0); close();
  for (const [type, timestamp] of [["shot", 80.25], ["pass", 15.5], ["shot", 12.75], ["interception", 10], ["pass", 22], ["shot", 45.125], ["tackle", 38], ["ball-recovery", 5]]) {
    h.media.currentTime = timestamp;
    component(Buttons).props.onSelect(type); update();
    const details = { type, ...(type === "shot" ? { outcome: "on-target", bodyPart: "foot" } : {}), ...(type === "pass" ? { outcome: "completed" } : {}), ...(type === "tackle" ? { outcome: "won" } : {}) };
    component(Form).props.onSave(1, details); update();
  }
  open(); count(8);
  for (const [type, expected] of [["shot", 3], ["pass", 2], ["all", 8], ["duel", 0]]) {
    filter(type); count(expected);
    assert.equal(nodes(panel(), n => n.type === "select")[0].props.value, type);
  }
  assert(text(panel()).includes("No events match this filter."));
  filter("shot"); close(); open(); assert.equal(component(Panel).props.selectedEventType, "shot"); count(3);
  press("Escape"); open(); assert.equal(component(Panel).props.selectedEventType, "shot");
  const filtered = component(Panel).props.events;
  assert.deepEqual(Array.from(filtered, event => event.timestamp), [12.75, 45.125, 80.25]);
  const rows = h.render(List, nodes(panel(), n => n.type === List)[0].props);
  h.media.paused = true;
  nodes(rows, n => n.type === "button")[1].props.onClick(); update();
  assert.equal(h.media.currentTime, 45.125); assert(h.media.paused); assert(!component(Panel));
  open(); count(3); assert.equal(component(Panel).props.totalEventCount, 8);
  press("s"); assert(!component(Form));
  const before = h.media.currentTime; press("3", { code: "Digit3" }); assert.equal(h.media.currentTime, before + 1.5);
  component(Buttons).props.onOpenSettings(); update(); assert(component(Settings)); assert(!component(Panel));
  open(); assert.equal(component(Panel).props.selectedEventType, "shot");
  component(Buttons).props.onExit(); update();
  nodes(tree, n => n.type === "button" && text(n) === "Resume analysis")[0].props.onClick(); update();
  assert(!component(Panel)); open(); count(3); close();
  press("s"); assert.equal(component(Form).props.pending.type, "shot");
  assert(component(Buttons).props.eventsDisabled); open(); assert(!component(Panel)); press("Escape");
  // Saving another event while a filter is retained updates the derived results.
  h.media.currentTime = 100; press("s"); component(Form).props.onSave(1, { type: "shot", outcome: "goal", bodyPart: "head" }); update();
  component(Summary).props.onEdit(); update(); open(); assert(!component(Panel)); press("Escape");
  component(Summary).props.onDelete(); update(); open(); assert(!component(Panel));
  component(Delete).props.onConfirm(); update(); open(); count(3); filter("all"); count(8);
  filter("shot"); component(Buttons).props.onExit(); update(); upload(); ready(); open();
  assert.equal(component(Panel).props.selectedEventType, "all"); count(0);
  filter("shot"); nodes(tree, n => n.type === "video")[0].props.onError(); update();
  upload(); ready(); open(); assert.equal(component(Panel).props.selectedEventType, "all");
  h.dispose(ctx); assert.equal(h.listeners.size, 0);
});
