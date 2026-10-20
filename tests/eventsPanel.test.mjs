import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
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
  const panel = h.render(Panel, { events: [], totalEventCount: 0, selectedEventType: "all", selectedPlayerId: "all", players: [], onEventTypeChange: value => changed = value });
  const options = nodes(nodes(panel, n => n.type === "select")[0], n => n.type === "option");
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
  const playerFilter = value => { nodes(panel(), n => n.type === "select")[1].props.onChange({ currentTarget: { value } }); update(); };
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
  for (const [type, timestamp, playerId] of [["shot", 80.25, 1], ["pass", 15.5, 3], ["shot", 12.75, 2], ["interception", 10, 1], ["pass", 22, 3], ["shot", 45.125, 1], ["tackle", 38, 2], ["ball-recovery", 5, 3]]) {
    h.media.currentTime = timestamp;
    component(Buttons).props.onSelect(type); update();
    const details = { type, ...(type === "shot" ? { outcome: "on-target", bodyPart: "foot" } : {}), ...(type === "pass" ? { outcome: "completed" } : {}), ...(type === "tackle" ? { outcome: "won" } : {}) };
    component(Form).props.onSave(playerId, details); update();
  }
  open(); count(8);
  for (const [type, expected] of [["shot", 3], ["pass", 2], ["all", 8], ["duel", 0]]) {
    filter(type); count(expected);
    assert.equal(nodes(panel(), n => n.type === "select")[0].props.value, type);
  }
  assert(text(panel()).includes("No events match these filters."));
  for (const [type, player, expected] of [["all", "all", 8], ["shot", "all", 3], ["shot", "1", 2], ["all", "1", 3], ["all", "all", 8], ["pass", "3", 2], ["duel", "1", 0]]) {
    const position = h.media.currentTime;
    filter(type); playerFilter(player); count(expected);
    assert.equal(h.media.currentTime, position);
    for (const event of component(Panel).props.events) {
      assert(type === "all" || event.type === type);
      assert(player === "all" || event.playerId === Number(player));
    }
    assert.equal(component(Panel).props.selectedPlayerId, player === "all" ? "all" : Number(player));
    assert.equal(nodes(panel(), n => n.type === "select")[1].props.value, player === "all" ? "all" : Number(player));
  }
  assert(text(panel()).includes("No events match these filters."));
  filter("shot"); playerFilter("all"); close(); open(); assert.equal(component(Panel).props.selectedEventType, "shot"); count(3);
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
  playerFilter("1"); count(2);
  assert.deepEqual(Array.from(component(Panel).props.events, event => event.timestamp), [45.125, 80.25]);
  const combinedRows = h.render(List, nodes(panel(), n => n.type === List)[0].props);
  nodes(combinedRows, n => n.type === "button")[0].props.onClick(); update();
  assert.equal(h.media.currentTime, 45.125); assert(h.media.paused); assert(!component(Panel));
  open(); count(2);
  component(Buttons).props.onOpenSettings(); update(); assert(component(Settings)); assert(!component(Panel));
  open(); assert.equal(component(Panel).props.selectedEventType, "shot");
  component(Buttons).props.onExit(); update();
  nodes(tree, n => n.type === "button" && text(n) === "Resume analysis")[0].props.onClick(); update();
  assert(!component(Panel)); open(); count(2); assert.equal(component(Panel).props.selectedPlayerId, 1);
  close(); open(); count(2); assert.equal(component(Panel).props.selectedPlayerId, 1); close();
  press("s"); assert.equal(component(Form).props.pending.type, "shot");
  assert(component(Buttons).props.eventsDisabled); open(); assert(!component(Panel)); press("Escape");
  // Saving another event while a filter is retained updates the derived results.
  h.media.currentTime = 100; press("s"); component(Form).props.onSave(1, { type: "shot", outcome: "goal", bodyPart: "head" }); update();
  component(Summary).props.onEdit(); update(); open(); assert(!component(Panel)); press("Escape");
  component(Summary).props.onDelete(); update(); open(); assert(!component(Panel));
  component(Delete).props.onConfirm(); update(); open(); count(2); playerFilter("all"); count(3); filter("all"); count(8);
  filter("shot"); playerFilter("3"); component(Buttons).props.onExit(); update(); upload(); ready(); open();
  assert.equal(component(Panel).props.selectedEventType, "all"); assert.equal(component(Panel).props.selectedPlayerId, "all"); count(0);
  filter("shot"); playerFilter("2"); nodes(tree, n => n.type === "video")[0].props.onError(); update();
  upload(); ready(); open(); assert.equal(component(Panel).props.selectedEventType, "all"); assert.equal(component(Panel).props.selectedPlayerId, "all");
  h.dispose(ctx); assert.equal(h.listeners.size, 0);
});

test("player options and selection workflow use the central roster with 18 players and duplicate labels", () => {
  const roster = Array.from({ length: 18 }, (_, i) => ({ id: i + 100, name: i < 2 ? "Same Player" : "Player " + i, ...(i === 2 ? {} : { number: i < 2 ? 9 : i }) }));
  const h = createHarness((source, filename) => filename.endsWith(path.join("src", "data", "players.ts"))
    ? "export const players = " + JSON.stringify(roster) + ";" : source);
  const Panel = h.load("src/components/EventsPanel.tsx").default;
  const Form = h.load("src/components/EventForm.tsx").default;
  const { players } = h.load("src/data/players.ts");
  const snapshot = JSON.stringify(players);
  players.forEach(Object.freeze); Object.freeze(players);
  let selected;
  const props = { events: [], totalEventCount: 0, selectedEventType: "all", selectedPlayerId: 100, players, onPlayerChange: value => selected = value };
  const panel = h.render(Panel, props);
  const select = nodes(panel, n => n.type === "select")[1];
  const options = nodes(select, n => n.type === "option");
  assert.deepEqual(options.map(n => n.props.value), ["all", ...roster.map(player => player.id)]);
  assert.equal(text(options[0]), "All players");
  assert.equal(text(options[1]), "#9 Same Player");
  assert.equal(text(options[2]), "#9 Same Player");
  assert.equal(text(options[3]), "Player 2");
  assert.equal(select.props.value, 100);
  select.props.onChange({ currentTarget: { value: "101" } }); assert.equal(selected, 101);
  for (const value of ["Unknown Player", "99999", "", "0101"]) {
    select.props.onChange({ currentTarget: { value } }); assert.equal(selected, 101);
  }
  select.props.onChange({ currentTarget: { value: "all" } }); assert.equal(selected, "all");
  const form = h.render(Form, { pending: { type: "interception", timestamp: 10 }, disabled: false });
  const step = nodes(form, n => n.props?.["aria-label"] === "Player")[0];
  const choices = nodes(step, n => n.type === "button");
  assert.equal(choices.length, 18);
  assert.deepEqual(choices.map(text), options.slice(1).map(text));
  assert.equal(JSON.stringify(players), snapshot);
});

test("unknown players render safely in both the event list and saved summary", () => {
  const h = createHarness();
  const List = h.load("src/components/EventList.tsx").default;
  const Summary = h.load("src/components/SavedEventSummary.tsx").default;
  const event = Object.freeze({ id: 1, type: "shot", playerId: 99999, timestamp: 12.375, outcome: "on-target", bodyPart: "foot" });
  const list = h.render(List, { events: Object.freeze([event]), disabled: false });
  const summary = h.render(Summary, { event, disabled: false });
  assert(text(list).includes("Unknown player"));
  assert(text(summary).includes("Unknown player"));
  assert.equal(event.playerId, 99999);
});
