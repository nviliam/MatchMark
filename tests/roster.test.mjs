import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PLAYERS } from "../src/data/players.ts";
import { appendPlayer, updatePlayer, PLAYER_NAME_MAX_LENGTH, validatePlayerInput } from "../src/utils/roster.ts";
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

test("player updates preserve stable IDs and untouched objects, permit duplicates and remove optional numbers without mutating the seed", () => {
  const before = JSON.stringify(DEFAULT_PLAYERS), original = DEFAULT_PLAYERS[0];
  const updated = updatePlayer(DEFAULT_PLAYERS, original.id, { name: "Renamed", number: 14 });
  assert.notEqual(updated, DEFAULT_PLAYERS); assert.notEqual(updated[0], original);
  assert.equal(updated[0].id, original.id); assert.equal(updated[0].name, "Renamed"); assert.equal(updated[0].number, 14);
  assert.equal(updated[1], DEFAULT_PLAYERS[1]);
  const withoutNumber = updatePlayer(updated, original.id, { name: "Renamed" });
  assert(!Object.hasOwn(withoutNumber[0], "number"));
  const duplicate = updatePlayer(withoutNumber, original.id, { name: updated[1].name, number: updated[1].number });
  assert.equal(duplicate[0].id, original.id); assert.equal(duplicate[0].name, duplicate[1].name);
  assert.equal(JSON.stringify(DEFAULT_PLAYERS), before);
});

// Mount the panel with its own hook lifecycle alongside the workspace. This lets
// capture-phase Edit cancellation and bubble-phase panel closing run together.
function mountPlayers(s) {
  let ctx = s.h.context(), tree;
  const update = () => { s.update(); tree = s.h.render(s.components.PlayersPanel, s.component("PlayersPanel").props, ctx); };
  const input = name => nodes(tree, n => n.type === "input" && n.props.name === name)[0];
  const edits = () => nodes(tree, n => n.type === "button" && n.props.className === "player-edit-button");
  const click = label => { nodes(tree, n => n.type === "button" && text(n) === label)[0].props.onClick(); update(); };
  const change = (name, value) => { input(name).props.onChange({ currentTarget: { value } }); update(); };
  const submit = () => { nodes(tree, n => n.type === "form")[0].props.onSubmit({ preventDefault() {} }); update(); };
  update();
  return { update, input, edits, click, change, submit,
    edit(index = 0) { edits()[index].props.onClick(); update(); },
    get tree() { return tree; },
    dispose() { s.h.dispose(ctx); },
    remount() { s.h.dispose(ctx); ctx = s.h.context(); update(); },
  };
}

test("Edit prefills one shared form, blocks parallel editing, saves trimmed names and supports removing or adding a shirt number", () => {
  const s = setup(); s.open(); s.add("No number"); const p = mountPlayers(s);
  const original = s.roster()[0], initialLength = s.roster().length;
  p.edit(); assert.equal(p.input("playerName").props.value, original.name);
  assert.equal(p.input("shirtNumber").props.value, String(original.number));
  assert.equal(nodes(p.tree, n => n.type === "form").length, 1);
  assert.equal(nodes(p.tree, n => n.type === "form")[0].props["aria-label"], "Edit player");
  assert.equal(nodes(p.tree, n => n.type === "button" && text(n) === "Add player").length, 0);
  assert(p.edits().every(button => button.props.disabled));
  p.edit(1); assert.equal(p.input("playerName").props.value, original.name);
  p.change("playerName", "  Kov\u00e1cs P.  "); p.change("shirtNumber", "14"); p.submit();
  assert.equal(s.roster().length, initialLength); assert.equal(s.roster()[0].id, original.id);
  assert.equal(s.roster()[0].name, "Kov\u00e1cs P."); assert.equal(s.roster()[0].number, 14);
  assert.equal(p.input("playerName").props.value, ""); assert(p.edits().every(button => !button.props.disabled));
  p.edit(); p.change("shirtNumber", ""); p.submit(); assert(!Object.hasOwn(s.roster()[0], "number"));
  p.edit(initialLength - 1); assert.equal(p.input("shirtNumber").props.value, "");
  p.change("shirtNumber", "0"); p.submit(); assert.equal(s.roster().at(-1).number, 0);
  p.edit(); p.change("playerName", s.roster()[1].name); p.change("shirtNumber", String(s.roster()[1].number)); p.submit();
  assert.equal(s.roster()[0].name, s.roster()[1].name); assert.notEqual(s.roster()[0].id, s.roster()[1].id);
  p.dispose(); s.dispose();
});

test("Edit reuses Add validation in the form and state owner and Cancel discards changes", () => {
  const s = setup(); s.open(); const p = mountPlayers(s), original = s.roster(); p.edit();
  for (const name of ["", "  ", "A".repeat(81)]) {
    p.change("playerName", name); p.submit(); assert.equal(s.roster(), original);
    assert(nodes(p.tree, n => n.props?.role === "alert").length);
  }
  p.change("playerName", "Valid");
  for (const number of ["-1", "3.5", "100"]) {
    p.change("shirtNumber", number); p.submit(); assert.equal(s.roster(), original);
    assert(text(nodes(p.tree, n => n.props?.role === "alert")[0]).includes("whole number"));
    assert.equal(s.component("PlayersPanel").props.onUpdate(original[0].id, "Valid", number), false);
  }
  assert.equal(s.component("PlayersPanel").props.onUpdate(original[0].id, "  ", "1"), false);
  assert.equal(s.component("PlayersPanel").props.onUpdate(999, "Valid", "1"), false);
  p.click("Cancel"); assert.equal(s.roster(), original);
  assert.equal(p.input("playerName").props.value, ""); assert.equal(p.input("shirtNumber").props.value, "");
  assert.equal(nodes(p.tree, n => n.props?.role === "alert").length, 0);
  p.dispose(); s.dispose();
});

test("Escape cancels Edit once before closing Players, with repeat/modifier guards and listener cleanup", () => {
  const s = setup(); s.open(); const p = mountPlayers(s), original = s.roster();
  p.edit(); p.change("playerName", "Unsaved");
  for (const extra of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }]) {
    s.press("Escape", extra); p.update(); assert.equal(p.input("playerName").props.value, "Unsaved");
  }
  s.press("e"); p.update(); assert(!s.component("EventForm"));
  s.press("Escape"); assert(s.component("PlayersPanel")); p.update();
  assert.equal(p.input("playerName").props.value, ""); assert.equal(s.roster(), original);
  s.press("Escape"); assert(!s.component("PlayersPanel"));
  p.dispose(); s.dispose(); assert.equal(s.h.listeners.size, 0);
});

test("editing display data updates existing event views, active player filter and new workflows without changing events", () => {
  const s = setup();
  s.h.media.currentTime = 27.43; s.buttons().onSelect("interception"); s.update();
  s.component("EventForm").props.onSave(1, { type: "interception" }); s.update();
  const event = s.component("SavedEventSummary").props.event, snapshot = JSON.stringify(event);
  s.buttons().onOpenEvents(); s.update(); s.component("EventsPanel").props.onPlayerChange(1); s.update();
  s.component("EventsPanel").props.onEventTypeChange("interception"); s.update();
  s.open(); const p = mountPlayers(s); p.edit();
  p.change("playerName", "Updated Player"); p.change("shirtNumber", "14"); p.submit();
  const roster = s.roster(), label = "#14 Updated Player";
  p.dispose(); s.close();
  const saved = s.component("SavedEventSummary");
  assert.equal(saved.props.event, event); assert(text(s.h.render(s.components.SavedEventSummary, saved.props)).includes(label));
  s.buttons().onOpenEvents(); s.update();
  const panel = s.component("EventsPanel"); assert.equal(panel.props.selectedPlayerId, 1);
  assert.equal(panel.props.events.length, 1); assert.equal(panel.props.events[0], event);
  const panelUI = s.h.render(s.components.EventsPanel, panel.props);
  const select = nodes(panelUI, n => n.type === "select")[1];
  assert.equal(select.props.value, 1);
  assert(nodes(select, n => n.type === "option" && n.props.value === 1).some(n => text(n) === label));
  const list = nodes(panelUI, n => n.type === s.components.EventList)[0];
  assert(text(s.h.render(s.components.EventList, list.props)).includes(label));
  panel.props.onStartReview(); s.update();
  const review = s.component("ReviewControls"); assert.equal(review.props.event, event);
  assert(text(s.h.render(s.components.ReviewControls, review.props)).includes(label));
  s.press("Escape"); s.component("SavedEventSummary").props.onEdit(); s.update();
  assert(text(s.h.render(s.components.EventForm, s.component("EventForm").props)).includes(label));
  s.press("Escape"); s.buttons().onSelect("interception"); s.update();
  const fctx = s.h.context(); let form = s.h.render(s.components.EventForm, s.component("EventForm").props, fctx);
  assert.equal(s.component("EventForm").props.players, roster);
  nodes(form, n => n.type === "button" && text(n) === label)[0].props.onClick();
  form = s.h.render(s.components.EventForm, s.component("EventForm").props, fctx);
  assert(text(form).includes(label)); assert.equal(JSON.stringify(event), snapshot);
  s.h.dispose(fctx); s.dispose();
});

test("saved edits survive Exit/Resume, new video and errors while unsaved edits are discarded on panel unmount", () => {
  const s = setup(); s.open(); const p = mountPlayers(s); p.edit();
  p.change("playerName", "Saved name"); p.submit(); const savedRoster = s.roster();
  for (const close of [() => s.close(), () => { s.buttons().onExit(); s.update(); s.resume(); },
    () => { s.buttons().onOpenSettings(); s.update(); }]) {
    p.edit(); p.change("playerName", "Unsaved"); close(); p.dispose();
    assert(!s.component("PlayersPanel")); s.open(); p.remount();
    assert.equal(s.roster(), savedRoster); assert.equal(p.input("playerName").props.value, "");
    p.edit(); assert.equal(p.input("playerName").props.value, "Saved name"); p.click("Cancel");
  }
  p.dispose(); s.buttons().onExit(); s.update(); s.upload(); s.ready(); s.open();
  assert.equal(s.roster(), savedRoster);
  nodes(s.tree, n => n.type === "video")[0].props.onError(); s.update();
  s.upload(); s.ready(); s.open(); assert.equal(s.roster(), savedRoster);
  const fresh = setup(); fresh.open(); assert.equal(JSON.stringify(fresh.roster()), JSON.stringify(DEFAULT_PLAYERS));
  fresh.dispose(); s.dispose();
});
