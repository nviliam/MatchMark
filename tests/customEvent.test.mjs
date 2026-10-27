import assert from "node:assert/strict";
import { test } from "node:test";
import { EVENT_DEFINITIONS, CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH } from "../src/config/eventDefinitions.ts";
import { createEventDetails, createMatchEvent, formatEventDetails, validateEventText } from "../src/utils/events.ts";
import { formatEventPlayer } from "../src/utils/players.ts";
import { getFilteredEvents } from "../src/utils/eventFiltering.ts";
import { getPlayerEventCount, removePlayer } from "../src/utils/roster.ts";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
const players = [{ id: 9, number: 9, name: "Player Nine" }];
const field = EVENT_DEFINITIONS.custom.fields[0];
const base = { id: 12, timestamp: 27.43 };

test("Custom is a stable, declarative text event with optional player on the existing left rail", () => {
  assert.equal(EVENT_DEFINITIONS.custom.id, "custom");
  assert.equal(EVENT_DEFINITIONS.custom.label, "Custom");
  assert.equal(EVENT_DEFINITIONS.custom.rail, "left");
  assert.equal(EVENT_DEFINITIONS.custom.playerRequired, false);
  assert.deepEqual(field, { id: "description", type: "text", label: "Description", required: true, maxLength: 160 });
  assert.equal(CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH, 160);
});

test("Description validation is shared by details and saved-event factories, trims and enforces 160 characters", () => {
  for (const description of ["", "   ", "\n\t", "x".repeat(161)]) {
    assert.equal(validateEventText(field, description).ok, false);
    assert.equal(createEventDetails("custom", "", null, description), null);
    assert.equal(createMatchEvent({ type: "custom", description }, base), null);
  }
  for (const [input, expected] of [["  Good counterpress  ", "Good counterpress"], ["x".repeat(160), "x".repeat(160)]]) {
    assert.deepEqual(validateEventText(field, input), { ok: true, value: expected });
    const details = createEventDetails("custom", "", null, input);
    assert.deepEqual(details, { type: "custom", description: expected });
    const event = createMatchEvent(details, base);
    assert.deepEqual(event, { ...base, type: "custom", description: expected });
    assert(!Object.hasOwn(event, "playerId"));
    assert.deepEqual(createMatchEvent(details, base, 9), { ...event, playerId: 9 });
  }
  for (const type of Object.keys(EVENT_DEFINITIONS).filter(type => type !== "custom")) {
    assert.equal(createMatchEvent({ type }, base), null, `${type} requires a player`);
  }
});

function formSetup({ initialEvent, roster = players } = {}) {
  const h = createHarness(), ctx = h.context(), Form = h.load("src/components/EventForm.tsx").default;
  const saved = [];
  let tree, cancelled = 0;
  const props = { players: roster, pending: { type: "custom", timestamp: base.timestamp }, initialEvent,
    disabled: false, onSave: (playerId, details) => saved.push({ playerId, details }), onCancel: () => cancelled++ };
  const render = () => tree = h.render(Form, props, ctx);
  const button = label => nodes(tree, n => n.type === "button" && text(n) === label)[0];
  const click = label => { assert(!button(label).props.disabled, label); button(label).props.onClick(); render(); };
  const textarea = () => nodes(tree, n => n.type === "textarea")[0];
  const change = value => { textarea().props.onChange({ currentTarget: { value } }); render(); };
  const submit = () => { tree.props.onSubmit({ preventDefault() {} }); render(); };
  render();
  return { h, ctx, props, render, button, click, textarea, change, submit, saved,
    get tree() { return tree; }, get cancelled() { return cancelled; } };
}

test("Custom create uses Description, optional Player, Review and explicit Save, including an empty roster", () => {
  for (const roster of [players, []]) {
    const f = formSetup({ roster });
    assert.equal(f.textarea().props.maxLength, 160);
    assert.equal(f.textarea().props.required, true);
    assert.equal(text(nodes(f.tree, n => n.type === "label")[0]), "Description");
    assert(f.textarea().props["aria-describedby"]);
    assert(f.button("Next").props.disabled);
    f.submit(); assert.equal(f.saved.length, 0);
    for (const invalid of ["   ", "x".repeat(161)]) {
      f.change(invalid); assert(f.button("Next").props.disabled);
      assert(f.textarea().props["aria-invalid"]);
      f.submit(); assert.equal(f.saved.length, 0);
    }
    f.change("  Good counterpress  "); f.click("Next");
    assert(text(f.tree).includes("Player (optional)"));
    assert(!text(f.tree).includes("Cancel this event"));
    f.click("No player"); assert.equal(f.saved.length, 0);
    assert(!f.button("Save").props.disabled);
    f.click("Back"); assert(f.button("No player").props["aria-pressed"]);
    f.click("Back"); assert.equal(f.textarea().props.value, "  Good counterpress  ");
    f.click("Next"); f.click("No player");
    f.props.disabled = true; f.render(); f.submit(); assert.equal(f.saved.length, 0);
    f.props.disabled = false; f.render(); f.submit();
    assert.deepEqual(plain(f.saved), [{ details: { type: "custom", description: "Good counterpress" } }]);
    assert(!text(f.tree).includes("Unknown player"));
    assert(text(f.tree).includes("00:27"));
    f.h.dispose(f.ctx);
  }
});

test("Custom edit prefills description/player, Back preserves data, player can be removed or added, and Cancel never saves", () => {
  for (const playerId of [undefined, 9]) {
    const original = Object.freeze(createMatchEvent({ type: "custom", description: "Original" }, base, playerId));
    const snapshot = JSON.stringify(original);
    const f = formSetup({ initialEvent: original });
    assert(f.button("Save")); f.click("Back");
    assert(f.button(playerId === undefined ? "No player" : "#9 Player Nine").props["aria-pressed"]);
    f.click("Back"); assert.equal(f.textarea().props.value, "Original");
    f.change("  Edited  "); f.click("Next");
    f.click(playerId === undefined ? "#9 Player Nine" : "No player"); f.submit();
    assert.equal(f.saved[0].playerId, playerId === undefined ? 9 : undefined);
    assert.equal(f.saved[0].details.description, "Edited");
    const edited = createMatchEvent(plain(f.saved[0].details), base, f.saved[0].playerId);
    assert.equal(edited.id, original.id); assert.equal(edited.timestamp, original.timestamp);
    assert.equal(JSON.stringify(original), snapshot);
    f.h.dispose(f.ctx);
    const cancelled = formSetup({ initialEvent: original });
    cancelled.click("Back"); cancelled.click("Back"); cancelled.change("Unsaved"); cancelled.click("Cancel");
    assert.equal(cancelled.cancelled, 1); assert.equal(cancelled.saved.length, 0);
    assert.equal(JSON.stringify(original), snapshot); cancelled.h.dispose(cancelled.ctx);
  }
  const invalid = formSetup({ initialEvent: { ...base, type: "custom", description: "   " } });
  assert(invalid.button("Save").props.disabled); invalid.submit(); assert.equal(invalid.saved.length, 0);
  invalid.h.dispose(invalid.ctx);
});

test("all display consumers distinguish intentionally absent players from deleted references", () => {
  const noPlayer = createMatchEvent({ type: "custom", description: "Defensive line too deep" }, base);
  const assigned = { ...noPlayer, id: 13, playerId: 9 };
  const afterDelete = removePlayer(players, 9);
  assert.equal(getPlayerEventCount([noPlayer, assigned], 9), 1);
  assert.equal(formatEventPlayer(undefined, afterDelete), "");
  assert.equal(formatEventPlayer(9, afterDelete), "Unknown player");
  assert.equal(formatEventDetails(noPlayer), "Custom · Defensive line too deep");
  const h = createHarness();
  for (const name of ["EventList", "SavedEventSummary", "ReviewControls"]) {
    const Component = h.load(`src/components/${name}.tsx`).default;
    for (const [event, roster, expected] of [[noPlayer, [], ""], [assigned, players, "#9 Player Nine"], [assigned, afterDelete, "Unknown player"]]) {
      const tree = h.render(Component, { players: roster, event, events: [event], index: 0, total: 1 });
      assert(text(tree).includes("Custom · Defensive line too deep"));
      if (expected) assert(text(tree).includes(expected));
      else assert(!text(tree).includes("Unknown player"));
    }
  }
});

test("Custom filters combine type/player with AND, excluding unassigned events only for specific players", () => {
  const events = Object.freeze([
    { id: 1, type: "custom", timestamp: 20, description: "Unassigned" },
    { id: 2, type: "custom", timestamp: 10, description: "Assigned", playerId: 9 },
    { id: 3, type: "custom", timestamp: 30, description: "Other", playerId: 8 },
    { id: 4, type: "interception", timestamp: 5, playerId: 9 },
  ].map(Object.freeze));
  for (const [eventType, playerId, ids] of [["custom", "all", [2, 1, 3]], ["custom", 9, [2]], ["all", 9, [4, 2]], ["all", "all", [4, 2, 1, 3]]]) {
    assert.deepEqual(getFilteredEvents(events, { eventType, playerId }).map(event => event.id), ids);
  }
});

function workspaceSetup() {
  const h = createHarness(), ctx = h.context(true), components = {};
  for (const name of ["VideoPlayer", "EventButtons", "EventForm", "EventsPanel", "EventList", "SavedEventSummary", "ReviewControls", "DeleteEventConfirmation", "PlayersPanel", "ShortcutSettings"]) {
    components[name] = h.load(`src/components/${name}.tsx`).default;
  }
  const { DEFAULT_EVENT_SHORTCUTS } = h.load("src/config/eventShortcuts.ts");
  let active = false, tree, shortcuts = DEFAULT_EVENT_SHORTCUTS;
  const update = () => tree = h.render(components.VideoPlayer, { isAnalysisActive: active, onAnalysisActiveChange: value => active = value,
    eventShortcuts: shortcuts, onEventShortcutsChange: value => shortcuts = value }, ctx);
  const component = name => nodes(tree, n => n.type === components[name])[0];
  const buttons = () => component("EventButtons").props;
  const press = (key, extra) => { h.press(key, extra); update(); };
  const ready = () => {
    nodes(tree, n => n.type === "input" && n.props.type === "file")[0].props.onChange({ currentTarget: { files: [{ type: "video/mp4", name: "test.mp4" }] } });
    update(); nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update();
  };
  const open = () => { buttons().onOpenEvents(); update(); };
  const start = (timestamp, keyboard = true) => {
    h.media.currentTime = timestamp;
    if (keyboard) press(shortcuts.custom); else { buttons().onSelect("custom"); update(); }
  };
  const save = (description, playerId) => { component("EventForm").props.onSave(playerId, { type: "custom", description }); update(); };
  const resume = () => { nodes(tree, n => n.type === "button" && text(n) === "Resume analysis")[0].props.onClick(); update(); };
  update();
  return { h, ctx, components, component, buttons, press, ready, open, start, save, update, resume,
    get tree() { return tree; }, dispose: () => h.dispose(ctx) };
}

test("Custom keyboard/click share timestamp and workflow; guards, typing safety, Quick Seek and configurable badges stay in sync", () => {
  const s = workspaceSetup(); s.press("c"); assert(!s.component("EventForm")); s.ready();
  const ui = () => s.h.render(s.components.EventButtons, s.buttons());
  const customButton = () => nodes(ui(), n => n.type === "button" && n.props["aria-keyshortcuts"] === "c")[0];
  assert.equal(text(customButton()), "CustomC");
  assert.equal(nodes(customButton(), n => n.type === "kbd")[0].props["aria-hidden"], "true");
  const textareaTarget = new s.h.Element(); textareaTarget.closest = () => textareaTarget;
  s.h.media.currentTime = 27.43;
  for (const extra of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { target: textareaTarget }]) {
    s.press("c", extra); assert(!s.component("EventForm"));
  }
  s.press("3", { code: "Digit3", target: textareaTarget }); assert.equal(s.h.media.currentTime, 27.43);
  s.start(27.43); const pending = s.component("EventForm").props.pending;
  assert.equal(pending.type, "custom"); assert.equal(pending.timestamp, 27.43);
  s.press("C"); assert.equal(s.component("EventForm").props.pending, pending);
  s.press("3", { code: "Digit3", target: textareaTarget }); assert.equal(s.h.media.currentTime, 27.43);
  s.press("3", { code: "Digit3" }); assert.equal(s.h.media.currentTime, 28.93);
  s.press("3", { code: "Digit3", shiftKey: true }); assert.equal(s.h.media.currentTime, 27.43);
  s.press("Escape"); assert(!s.component("EventForm"));
  s.start(27.43, false); assert.equal(s.component("EventForm").props.pending.timestamp, pending.timestamp);
  s.save("Saved"); s.component("SavedEventSummary").props.onEdit(); s.update();
  const edit = s.component("EventForm").props.pending;
  s.press("c"); assert.equal(s.component("EventForm").props.pending, edit); s.press("Escape");
  s.component("SavedEventSummary").props.onDelete(); s.update(); s.press("c"); assert(!s.component("EventForm")); s.press("Escape");
  s.buttons().onOpenSettings(); s.update(); s.press("c"); assert(!s.component("EventForm"));
  const settingsProps = s.component("ShortcutSettings").props;
  assert(text(s.h.render(s.components.ShortcutSettings, settingsProps)).includes("Custom"));
  settingsProps.onChange({ ...settingsProps.shortcuts, custom: "." }); s.update();
  s.component("ShortcutSettings").props.onClose(); s.update();
  assert(nodes(ui(), n => n.type === "button" && n.props["aria-keyshortcuts"] === ".")[0]);
  s.press("c"); assert(!s.component("EventForm")); s.press("."); assert(s.component("EventForm"));
  s.press("Escape"); s.buttons().onExit(); s.update(); s.press("."); assert(!s.component("EventForm"));
  s.dispose(); assert.equal(s.h.listeners.size, 0);
});

test("Custom uses normal create/edit/Cancel/Delete, exact panel seek and filtered Review with lead-in and no autoplay", () => {
  const s = workspaceSetup(); s.ready();
  s.start(1.5); s.save("Early");
  s.start(27.43); s.save("  Original  ");
  const original = s.component("SavedEventSummary").props.event;
  assert.equal(original.description, "Original"); assert(!Object.hasOwn(original, "playerId"));
  s.component("SavedEventSummary").props.onEdit(); s.update(); s.press("Escape");
  assert.equal(s.component("SavedEventSummary").props.event, original);
  s.component("SavedEventSummary").props.onEdit(); s.update(); s.h.media.currentTime = 90;
  s.save("Changed", 1);
  const edited = s.component("SavedEventSummary").props.event;
  assert.equal(edited.id, original.id); assert.equal(edited.timestamp, original.timestamp); assert.equal(edited.playerId, 1);
  s.component("SavedEventSummary").props.onEdit(); s.update(); s.save("Changed");
  assert(!Object.hasOwn(s.component("SavedEventSummary").props.event, "playerId"));
  s.open(); s.component("EventsPanel").props.onEventTypeChange("custom"); s.update();
  assert.equal(s.component("EventsPanel").props.events.length, 2);
  const panel = s.h.render(s.components.EventsPanel, s.component("EventsPanel").props);
  assert.equal(text(nodes(panel, n => n.type === "option" && n.props.value === "custom")[0]), "Custom");
  const list = s.h.render(s.components.EventList, { ...s.component("EventsPanel").props, disabled: false });
  nodes(list, n => n.type === "button")[1].props.onClick(); s.update();
  assert.equal(s.h.media.currentTime, 27.43); assert(!s.component("EventsPanel")); assert(s.h.media.paused);
  s.open(); s.component("EventsPanel").props.onStartReview(); s.update();
  assert.equal(s.component("ReviewControls").props.total, 2); assert.equal(s.h.media.currentTime, 0);
  s.component("ReviewControls").props.onNext(); s.update();
  assert.equal(s.h.media.currentTime, 24.43); assert(s.h.media.paused);
  assert.equal(s.component("ReviewControls").props.event.description, "Changed");
  s.component("ReviewControls").props.onPrevious(); s.update(); assert.equal(s.h.media.currentTime, 0);
  s.press("Escape"); s.component("SavedEventSummary").props.onDelete(); s.update();
  s.component("DeleteEventConfirmation").props.onConfirm(); s.update();
  s.open(); assert.equal(s.component("EventsPanel").props.events.length, 1); s.dispose();
});

test("Custom saves with an empty runtime roster; assigned references survive roster deletion and drafts survive Exit/Resume", () => {
  const s = workspaceSetup(); s.ready();
  s.start(20); s.save("Assigned", 1);
  s.start(30); s.save("Unassigned");
  s.buttons().onOpenPlayers(); s.update();
  const roster = s.component("PlayersPanel").props.players;
  for (const player of roster) { s.component("PlayersPanel").props.onDelete(player.id); s.update(); }
  s.component("PlayersPanel").props.onClose(); s.update();
  s.open(); const events = s.component("EventsPanel").props.events;
  assert.equal(events[0].playerId, 1); assert(!Object.hasOwn(events[1], "playerId"));
  assert.equal(formatEventPlayer(events[0].playerId, []), "Unknown player");
  assert.equal(formatEventPlayer(events[1].playerId, []), "");
  s.component("EventsPanel").props.onClose(); s.update();
  s.start(42.5);
  const fctx = s.h.context(); let form;
  const renderForm = () => form = s.h.render(s.components.EventForm, s.component("EventForm").props, fctx);
  renderForm(); nodes(form, n => n.type === "textarea")[0].props.onChange({ currentTarget: { value: "Draft kept" } }); renderForm();
  s.buttons().onExit(); s.update(); renderForm(); s.resume(); renderForm();
  assert.equal(nodes(form, n => n.type === "textarea")[0].props.value, "Draft kept");
  assert.equal(s.component("EventForm").props.pending.timestamp, 42.5);
  assert(s.h.media.paused); assert.equal(s.h.media.currentTime, 42.5);
  nodes(form, n => n.type === "button" && text(n) === "Next")[0].props.onClick(); renderForm();
  nodes(form, n => n.type === "button" && text(n) === "No player")[0].props.onClick(); renderForm();
  form.props.onSubmit({ preventDefault() {} }); s.update();
  assert.equal(s.component("SavedEventSummary").props.event.description, "Draft kept");
  s.h.dispose(fctx); s.dispose();
});
