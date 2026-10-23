import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PLAYERS } from "../src/data/players.ts";
import { appendPlayer, PLAYER_NAME_MAX_LENGTH, validatePlayerInput } from "../src/utils/roster.ts";
import { formatPlayerLabel } from "../src/utils/players.ts";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

test("player input trims names, accepts accents/apostrophes/hyphens, and permits an absent shirt number", () => {
  assert.deepEqual(validatePlayerInput("  Kiss P\u00e9ter  ", "18"), { ok: true, value: { name: "Kiss P\u00e9ter", number: 18 } });
  for (const name of ["Nagy-Kiss Anna", "O'Connor", "Kiss P\u00e9ter", "A".repeat(PLAYER_NAME_MAX_LENGTH)]) {
    assert.deepEqual(validatePlayerInput(name, "  "), { ok: true, value: { name } });
  }
  assert.equal(formatPlayerLabel(validatePlayerInput("Kiss P\u00e9ter", "").value), "Kiss P\u00e9ter");
});

test("empty or overlong names are rejected", () => {
  for (const name of ["", "   ", "\t\n", "A".repeat(PLAYER_NAME_MAX_LENGTH + 1)]) {
    const result = validatePlayerInput(name, "18");
    assert.equal(result.ok, false); assert(result.error);
  }
});

test("shirt numbers must be whole numbers from 0 through 99 when supplied", () => {
  for (const number of ["-1", "3.5", "100", "abc", "NaN", "Infinity", "1e1", "0x10", "+3"]) {
    assert.equal(validatePlayerInput("Player", number).ok, false, number);
  }
  for (const number of ["0", "99", " 18 ", "07"]) {
    assert.deepEqual(validatePlayerInput("Player", number), { ok: true, value: { name: "Player", number: Number(number) } });
  }
});

test("numeric IDs are independent of position, names and shirt numbers; seed and existing objects remain untouched", () => {
  assert(Object.isFrozen(DEFAULT_PLAYERS)); assert(DEFAULT_PLAYERS.every(Object.isFrozen));
  const snapshot = JSON.stringify(DEFAULT_PLAYERS);
  assert.equal(appendPlayer([], { name: "First" })[0].id, 1);
  const sparse = Object.freeze([{ id: 12, name: "Same", number: 7 }, { id: 3, name: "Same", number: 7 }].map(Object.freeze));
  const first = appendPlayer(sparse, { name: "Same", number: 7 });
  const second = appendPlayer(first, { name: "Same", number: 7 });
  assert.deepEqual(second.map(player => player.id), [12, 3, 13, 14]);
  assert.equal(second[0], sparse[0]); assert.equal(sparse.length, 2);
  const added = appendPlayer(DEFAULT_PLAYERS, { name: DEFAULT_PLAYERS[0].name, number: DEFAULT_PLAYERS[0].number });
  assert.equal(added.length, DEFAULT_PLAYERS.length + 1);
  assert.equal(JSON.stringify(DEFAULT_PLAYERS), snapshot);
});

test("Players form shows textual validation, adds valid input, resets fields and supports duplicate submissions", () => {
  const h = createHarness(), ctx = h.context(), Panel = h.load("src/components/PlayersPanel.tsx").default;
  let players = [], tree, closed = false;
  const update = () => tree = h.render(Panel, { players, onClose: () => closed = true, onAdd: (name, number) => {
    const result = validatePlayerInput(name, number);
    if (!result.ok) return false;
    players = appendPlayer(players, result.value); return true;
  } }, ctx);
  const input = name => nodes(tree, n => n.type === "input" && n.props.name === name)[0];
  const change = (name, value) => { input(name).props.onChange({ currentTarget: { value } }); update(); };
  const submit = () => { nodes(tree, n => n.type === "form")[0].props.onSubmit({ preventDefault() {} }); update(); };
  update(); assert(text(tree).includes("No players yet."));
  assert.equal(nodes(tree, n => n.type === "label").length, 2);
  change("playerName", "  "); submit();
  assert.equal(text(nodes(tree, n => n.props?.role === "alert")[0]), "Name is required."); assert.equal(players.length, 0);
  change("playerName", "  Kiss P\u00e9ter  "); change("shirtNumber", "3.5"); submit();
  assert(text(nodes(tree, n => n.props?.role === "alert")[0]).includes("whole number")); assert.equal(players.length, 0);
  change("shirtNumber", "18"); submit();
  assert.equal(players[0].name, "Kiss P\u00e9ter"); assert.equal(players[0].number, 18);
  assert.equal(input("playerName").props.value, ""); assert.equal(input("shirtNumber").props.value, "");
  assert.equal(nodes(tree, n => n.props?.role === "alert").length, 0);
  assert(text(tree).includes("#18 Kiss P\u00e9ter"));
  change("playerName", "Kiss P\u00e9ter"); change("shirtNumber", "18"); submit();
  assert.equal(players.length, 2); assert.notEqual(players[0].id, players[1].id);
  change("playerName", "No number"); submit(); assert(!Object.hasOwn(players[2], "number"));
  const snapshot = JSON.stringify(players);
  nodes(tree, n => n.props?.["aria-label"] === "Close players")[0].props.onClick();
  assert(closed); assert.equal(JSON.stringify(players), snapshot);
  const reopened = h.render(Panel, { players });
  assert(nodes(reopened, n => n.type === "input").every(n => n.props.value === ""));
  h.dispose(ctx);
});

function setup() {
  const h = createHarness(), ctx = h.context(true), components = {};
  for (const name of ["VideoPlayer", "PlayersPanel", "EventButtons", "EventsPanel", "EventForm", "EventList", "SavedEventSummary", "ReviewControls", "DeleteEventConfirmation", "ShortcutSettings"]) {
    components[name] = h.load(`src/components/${name}.tsx`).default;
  }
  const { DEFAULT_EVENT_SHORTCUTS } = h.load("src/config/eventShortcuts.ts");
  let active = false, tree;
  const update = () => tree = h.render(components.VideoPlayer, { isAnalysisActive: active, onAnalysisActiveChange: value => active = value, eventShortcuts: DEFAULT_EVENT_SHORTCUTS }, ctx);
  const component = name => nodes(tree, n => n.type === components[name])[0];
  const buttons = () => component("EventButtons").props;
  const open = () => { buttons().onOpenPlayers(); update(); };
  const roster = () => component("PlayersPanel").props.players;
  const close = () => { component("PlayersPanel").props.onClose(); update(); };
  const add = (name, number = "") => { const result = component("PlayersPanel").props.onAdd(name, number); update(); return result; };
  const press = (key, extra) => { h.press(key, extra); update(); };
  const upload = () => { nodes(tree, n => n.type === "input" && n.props.type === "file")[0].props.onChange({ currentTarget: { files: [{ type: "video/mp4", name: "match.mp4" }], value: "match.mp4" } }); update(); };
  const ready = () => { nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update(); };
  const resume = () => { nodes(tree, n => n.type === "button" && text(n) === "Resume analysis")[0].props.onClick(); update(); };
  update(); upload(); ready();
  return { h, ctx, components, component, update, buttons, open, roster, close, add, press, upload, ready, resume,
    get tree() { return tree; }, dispose: () => h.dispose(ctx) };
}

test("runtime roster starts from independent demo objects and persists across close, Exit/Resume, video replacement and error", () => {
  const s = setup(); s.open();
  const seed = s.h.load("src/data/players.ts").DEFAULT_PLAYERS;
  assert.equal(JSON.stringify(s.roster()), JSON.stringify(seed)); assert.notEqual(s.roster(), seed);
  s.roster().forEach((player, i) => assert.notEqual(player, seed[i]));
  const original = JSON.stringify(seed);
  assert(s.add("Kiss P\u00e9ter", "18")); assert(s.add("Kiss P\u00e9ter", "18")); assert(s.add("No number"));
  const roster = s.roster(); assert.equal(new Set(roster.map(p => p.id)).size, roster.length);
  s.close(); s.open(); assert.equal(s.roster(), roster);
  s.press("Escape"); assert(!s.component("PlayersPanel")); s.open(); assert.equal(s.roster(), roster);
  s.buttons().onOpenSettings(); s.update(); assert(s.component("ShortcutSettings")); assert(!s.component("PlayersPanel"));
  s.open(); assert(!s.component("ShortcutSettings"));
  s.h.media.currentTime = 42.5; s.buttons().onExit(); s.update(); assert(!s.component("PlayersPanel"));
  s.resume(); assert(!s.component("PlayersPanel")); assert.equal(s.h.media.currentTime, 42.5); assert(s.h.media.paused);
  s.open(); assert.equal(s.roster(), roster);
  s.buttons().onExit(); s.update(); s.upload(); s.ready(); s.open(); assert.equal(s.roster(), roster);
  nodes(s.tree, n => n.type === "video")[0].props.onError(); s.update();
  assert(!s.component("PlayersPanel")); s.upload(); s.ready(); s.open(); assert.equal(s.roster(), roster);
  assert.equal(JSON.stringify(seed), original);
  // A fresh component session models reload: runtime additions are intentionally not persisted.
  const fresh = s.h.render(s.components.VideoPlayer, { isAnalysisActive: false }, s.h.context(true));
  assert(!nodes(fresh, n => n.type === s.components.PlayersPanel).length);
  const reload = setup(); reload.open(); assert.equal(JSON.stringify(reload.roster()), JSON.stringify(seed));
  reload.dispose(); s.dispose();
});

test("new players flow immediately through filters, metadata workflow, Saved, Events, Edit and Review without changing event data", () => {
  const s = setup(); s.open(); s.add("Kiss P\u00e9ter", "18"); s.add("No number");
  const roster = s.roster(), player = roster.at(-1);
  s.buttons().onOpenEvents(); s.update();
  const panel = s.component("EventsPanel"); assert.equal(panel.props.players, roster);
  const panelUI = s.h.render(s.components.EventsPanel, panel.props);
  const options = nodes(nodes(panelUI, n => n.type === "select")[1], n => n.type === "option");
  assert.equal(options.length, roster.length + 1); assert.equal(text(options.at(-1)), "No number");
  panel.props.onClose(); s.update();
  s.h.media.currentTime = 27.43; s.buttons().onSelect("interception"); s.update();
  assert.equal(s.component("EventForm").props.players, roster);
  const fctx = s.h.context();
  let form = s.h.render(s.components.EventForm, s.component("EventForm").props, fctx);
  nodes(form, n => n.type === "button" && text(n) === "No number")[0].props.onClick();
  form = s.h.render(s.components.EventForm, s.component("EventForm").props, fctx);
  form.props.onSubmit({ preventDefault() {} }); s.update();
  const saved = s.component("SavedEventSummary");
  assert.equal(saved.props.players, roster); assert(text(s.h.render(s.components.SavedEventSummary, saved.props)).includes("No number"));
  assert.equal(JSON.stringify(saved.props.event), JSON.stringify({ type: "interception", id: 1, playerId: player.id, timestamp: 27.43 }));
  saved.props.onEdit(); s.update();
  const edit = s.h.render(s.components.EventForm, s.component("EventForm").props);
  assert(text(edit).includes("No number")); assert.equal(s.component("EventForm").props.initialEvent.playerId, player.id);
  s.press("Escape"); s.buttons().onOpenEvents(); s.update();
  s.component("EventsPanel").props.onEventTypeChange("interception"); s.component("EventsPanel").props.onPlayerChange(player.id); s.update();
  assert.equal(s.component("EventsPanel").props.events.length, 1);
  const listNode = nodes(s.h.render(s.components.EventsPanel, s.component("EventsPanel").props), n => n.type === s.components.EventList)[0];
  assert.equal(listNode.props.players, roster);
  const list = s.h.render(s.components.EventList, listNode.props); assert(text(list).includes("No number"));
  nodes(list, n => n.type === "button")[0].props.onClick(); s.update(); assert.equal(s.h.media.currentTime, 27.43);
  s.buttons().onOpenEvents(); s.update(); s.component("EventsPanel").props.onStartReview(); s.update();
  const review = s.component("ReviewControls"); assert.equal(review.props.players, roster);
  assert(text(s.h.render(s.components.ReviewControls, review.props)).includes("No number"));
  assert(Math.abs(s.h.media.currentTime - 24.43) < 1e-9); assert.equal(review.props.event.timestamp, 27.43);
  assert(!s.component("EventButtons")); assert(!s.component("PlayersPanel"));
  s.press("Escape"); s.open(); assert.equal(s.roster(), roster); s.dispose(); s.h.dispose(fctx);
});

test("Players is guarded during drafts/Edit/Delete, overlays exclude each other, and event shortcuts cannot run during roster entry", () => {
  const s = setup(); s.open(); const count = s.roster().length;
  assert.equal(s.add("   ", "18"), false); assert.equal(s.add("Name", "-1"), false); assert.equal(s.roster().length, count);
  s.press("e"); assert(!s.component("EventForm"));
  s.close(); s.buttons().onSelect("interception"); s.update();
  for (const stage of ["create", "edit", "delete"]) {
    const ui = s.h.render(s.components.EventButtons, s.buttons());
    assert(nodes(ui, n => n.type === "button" && text(n) === "Players")[0].props.disabled);
    s.buttons().onOpenPlayers(); s.update(); assert(!s.component("PlayersPanel"));
    if (stage === "create") {
      s.component("EventForm").props.onSave(1, { type: "interception" }); s.update();
      s.component("SavedEventSummary").props.onEdit(); s.update();
    } else if (stage === "edit") {
      s.press("Escape"); s.component("SavedEventSummary").props.onDelete(); s.update();
    } else s.press("Escape");
  }
  s.open(); s.buttons().onOpenEvents(); s.update(); assert(s.component("EventsPanel")); assert(!s.component("PlayersPanel"));
  s.open(); assert(!s.component("EventsPanel"));
  const before = s.h.media.currentTime; s.press("3", { code: "Digit3" }); assert.equal(s.h.media.currentTime, before + 1.5);
  s.press("Escape"); assert(!s.component("PlayersPanel")); s.dispose(); assert.equal(s.h.listeners.size, 0);
});

test("all display consumers retain Unknown player fallback against a runtime roster", () => {
  const h = createHarness();
  const event = { id: 1, type: "interception", playerId: 999, timestamp: 5 };
  for (const name of ["EventList", "SavedEventSummary", "ReviewControls"]) {
    const Component = h.load(`src/components/${name}.tsx`).default;
    assert(text(h.render(Component, { players: [], event, events: [event], index: 0, total: 1 })).includes("Unknown player"));
  }
});
