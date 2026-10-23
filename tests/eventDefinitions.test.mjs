import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { EVENT_DEFINITIONS, ORDERED_EVENT_TYPES, getEventDefinition } from "../src/config/eventDefinitions.ts";
import { createEventDetails, formatEventDetails } from "../src/utils/events.ts";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

// Independent snapshots of the pre-refactor UI, not derived expectations.
const outcomes = {
  shot: [["goal", "Goal"], ["on-target", "On Target"], ["off-target", "Off Target"], ["blocked", "Blocked"]],
  pass: [["completed", "Completed"], ["incomplete", "Incomplete"]],
  dribble: [["successful", "Successful"], ["unsuccessful", "Unsuccessful"]],
  contest: [["won", "Won"], ["lost", "Lost"]],
};
const bodyParts = [["foot", "Foot"], ["head", "Head"], ["other", "Other"]];
const outcome = options => ({ id: "outcome", label: "Outcome", required: true, options });
const expected = [
  { id: "pass", label: "Pass", rail: "top", order: 10, fields: [outcome(outcomes.pass)] },
  { id: "key-pass", label: "Key Pass", rail: "top", order: 20, fields: [] },
  { id: "shot", label: "Shot", rail: "top", order: 30, fields: [outcome(outcomes.shot), { id: "bodyPart", label: "Body Part", required: true, options: bodyParts }] },
  { id: "duel", label: "Duel", rail: "top", order: 40, fields: [outcome(outcomes.contest)] },
  { id: "ball-loss", label: "Ball Loss", rail: "top", order: 50, fields: [] },
  { id: "dribble", label: "Dribble", rail: "left", order: 60, fields: [outcome(outcomes.dribble)] },
  { id: "progressive-carry", label: "Progressive Carry", rail: "left", order: 70, fields: [] },
  { id: "tackle", label: "Tackle", rail: "right", order: 80, fields: [outcome(outcomes.contest)] },
  { id: "interception", label: "Interception", rail: "right", order: 90, fields: [] },
  { id: "ball-recovery", label: "Ball Recovery", rail: "right", order: 100, fields: [] },
];

test("definitions cover all ten stable IDs with the original labels, order, rails and field options", () => {
  const ids = expected.map(event => event.id);
  assert.deepEqual(Object.keys(EVENT_DEFINITIONS).sort(), [...ids].sort());
  assert.deepEqual(ORDERED_EVENT_TYPES, ids);
  assert.equal(new Set(Object.values(EVENT_DEFINITIONS).map(event => event.id)).size, 10);
  for (const event of expected) {
    assert.deepEqual(EVENT_DEFINITIONS[event.id], {
      ...event, playerRequired: true,
      category: ["tackle", "interception", "ball-recovery"].includes(event.id) ? "defending" : event.id === "duel" ? "contest" : "possession",
      fields: event.fields.map(field => ({ ...field, options: field.options.map(([id, label]) => ({ id, label })) })),
    });
    assert.equal(getEventDefinition(event.id), EVENT_DEFINITIONS[event.id]);
  }
});

test("factory preserves all option combinations, validation and exact domain-only event details", () => {
  for (const event of expected) {
    const field = event.fields.find(field => field.id === "outcome");
    const valid = field?.options.map(([id]) => id) ?? [""];
    for (const value of valid) {
      for (const bodyPart of [null, "foot", "head", "other"]) {
        const details = createEventDetails(event.id, value, bodyPart);
        if (event.id === "shot" && bodyPart === null) {
          assert.equal(details, null);
        } else {
          assert.deepEqual(details, {
            type: event.id, ...(field ? { outcome: value } : {}),
            ...(event.id === "shot" ? { bodyPart } : {}),
          });
        }
      }
    }
    for (const value of ["", "unknown", ...Object.values(outcomes).flat().map(([id]) => id)]) {
      if (field && !valid.includes(value)) assert.equal(createEventDetails(event.id, value, "foot"), null);
      if (!field) assert.deepEqual(createEventDetails(event.id, value, "head"), { type: event.id });
    }
  }
});

test("TypeScript rejects mismatched definition IDs, event-specific fields/options and incomplete domain events", () => {
  // Type-check an in-memory consumer; @ts-expect-error also fails if a constraint disappears.
  const filename = fileURLToPath(new URL("./__eventDefinitionContract.ts", import.meta.url)).replaceAll("\\", "/");
  const source = `
    import type { EventDefinition } from "../src/config/eventDefinitions";
    import type { EventDetails, MatchEvent } from "../src/types/event";
    type PassField = EventDefinition<"pass">["fields"][number];
    const validOption: PassField["options"][number] = { id: "completed", label: "Completed" };
    // @ts-expect-error Shot outcomes cannot be assigned to Pass.
    const wrongOption: PassField["options"][number] = { id: "goal", label: "Goal" };
    // @ts-expect-error Pass has no bodyPart field in the current domain.
    const wrongField: PassField = { id: "bodyPart", label: "Body Part", required: true, options: [] };
    // @ts-expect-error Stable definition ID must match the domain event.
    const wrongId: EventDefinition<"pass">["id"] = "shot";
    // @ts-expect-error Shot details require Body Part.
    const missingField: EventDetails = { type: "shot", outcome: "goal" };
    // @ts-expect-error Pass details cannot contain a Shot outcome.
    const wrongDetails: EventDetails = { type: "pass", outcome: "goal" };
    // @ts-expect-error Saved events still require the player relationship.
    const missingPlayer: MatchEvent = { id: 1, timestamp: 3, type: "interception" };
    // @ts-expect-error Definition-only metadata must not enter saved domain data.
    const metadata: MatchEvent = { id: 1, playerId: 1, timestamp: 3, type: "interception", label: "Interception" };
  `;
  const options = { noEmit: true, strict: true, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true, skipLibCheck: true, types: [] };
  const host = ts.createCompilerHost(options), read = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => file === filename
    ? ts.createSourceFile(file, source, ts.ScriptTarget.ES2023, true) : read(file, ...args);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host));
  assert.deepEqual(diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")), []);
});

for (const event of expected) test(`${event.id}: create/Edit preserve steps, Back, explicit Save, prefill and Cancel`, () => {
  const h = createHarness(), Form = h.load("src/components/EventForm.tsx").default;
  const { DEFAULT_PLAYERS: players } = h.load("src/data/players.ts");
  const ctx = h.context(), pending = Object.freeze({ type: event.id, timestamp: 42.375 });
  const saved = [];
  let cancelled = 0, tree;
  const props = { players, pending, disabled: false, onSave: (playerId, details) => saved.push({ playerId, details }), onCancel: () => cancelled++ };
  const render = () => tree = h.render(Form, props, ctx);
  const group = () => nodes(tree, n => n.props?.className === "workflow-step")[0];
  const buttons = () => nodes(group(), n => n.type === "button");
  const button = label => nodes(tree, n => n.type === "button" && text(n) === label)[0];
  const click = label => { button(label).props.onClick(); render(); };
  const submit = () => { tree.props.onSubmit({ preventDefault() {} }); render(); };
  const timestamp = () => assert.equal(text(nodes(tree, n => n.props?.className === "timestamp")[0]), "00:42");
  const values = {};
  render();
  for (const field of event.fields) {
    assert.equal(group().props["aria-label"], field.label);
    assert.deepEqual(buttons().map(text), field.options.map(([, label]) => label));
    assert(buttons().every(n => !n.props["aria-pressed"]));
    submit(); assert.equal(saved.length, 0); assert(!button("Save"));
    click(field.options.at(-1)[1]); timestamp();
    // Back restores the selected option; a replacement advances the same one step.
    click("Back");
    assert.equal(group().props["aria-label"], field.label);
    assert.equal(text(buttons().find(n => n.props["aria-pressed"])), field.options.at(-1)[1]);
    click(field.options[0][1]);
    values[field.id] = field.options[0][0];
  }
  assert.equal(group().props["aria-label"], "Player");
  assert.equal(buttons().length, players.length);
  submit(); assert.equal(saved.length, 0);
  buttons()[0].props.onClick(); render();
  assert.equal(group().props["aria-label"], "Review event");
  assert.equal(saved.length, 0); assert(!button("Save").props.disabled);
  click("Back"); assert(buttons()[0].props["aria-pressed"]);
  buttons()[0].props.onClick(); render();
  props.disabled = true; render(); submit(); assert.equal(saved.length, 0);
  assert(button("Save").props.disabled);
  props.disabled = false; render(); submit();
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), [{ playerId: players[0].id, details: { type: event.id, ...values } }]);
  timestamp();
  click("Cancel"); assert.equal(cancelled, 1); assert.equal(saved.length, 1);

  // Editing starts at Save, with all original choices prefilled and a stable timestamp.
  const initialEvent = Object.freeze({ id: 87, playerId: players[0].id, timestamp: pending.timestamp, type: event.id, ...values });
  const original = JSON.stringify(initialEvent), editCtx = h.context();
  let edited;
  const editProps = { ...props, initialEvent, onSave: (playerId, details) => edited = { playerId, details } };
  const editRender = () => tree = h.render(Form, editProps, editCtx);
  editRender(); assert(text(tree).includes("Editing")); assert(!button("Save").props.disabled);
  for (const label of ["Player", ...event.fields.map(field => field.label).reverse()]) {
    button("Back").props.onClick(); editRender();
    assert.equal(group().props["aria-label"], label);
    assert.equal(buttons().filter(n => n.props["aria-pressed"]).length, 1);
    timestamp();
  }
  const editValues = {};
  for (const field of event.fields) {
    buttons().at(-1).props.onClick(); editRender();
    editValues[field.id] = field.options.at(-1)[0];
  }
  buttons().at(-1).props.onClick(); editRender();
  tree.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(edited)), { playerId: players.at(-1).id, details: { type: event.id, ...editValues } });
  assert.equal(JSON.stringify(initialEvent), original);
  button("Cancel").props.onClick(); assert.equal(cancelled, 2);
  h.dispose(ctx); h.dispose(editCtx);
});

test("summaries preserve original text and safely display unknown runtime event IDs", () => {
  for (const event of expected) {
    const values = Object.fromEntries(event.fields.map(field => [field.id, field.options[0][0]]));
    const saved = Object.freeze({ id: 1, type: event.id, playerId: 1, timestamp: 12.375, ...values });
    assert.equal(formatEventDetails(saved), [event.label, ...event.fields.map(field => field.options[0][1])].join(" · "));
    assert.equal(formatEventDetails({ type: event.id }), event.label);
  }
  const h = createHarness();
  for (const type of ["legacy-event", "__proto__", "constructor", "toString", ""]) {
    assert.equal(getEventDefinition(type), undefined);
    const event = Object.freeze({ id: 1, type, timestamp: 5, playerId: 9999 });
    assert.equal(formatEventDetails(event), "Unknown event");
    for (const name of ["EventList", "SavedEventSummary", "ReviewControls"]) {
      const Component = h.load(`src/components/${name}.tsx`).default;
      const tree = h.render(Component, { players: [], event, events: [event], index: 0, total: 1 });
      assert(text(tree).includes("Unknown event"));
      assert(text(tree).includes("Unknown player"));
    }
  }
});

test("incomplete or invalid Edit data cannot bypass required fields or player validation", () => {
  const h = createHarness(), Form = h.load("src/components/EventForm.tsx").default;
  const { DEFAULT_PLAYERS: players } = h.load("src/data/players.ts");
  for (const event of expected) {
    const values = Object.fromEntries(event.fields.map(field => [field.id, field.options[0][0]]));
    const valid = { id: 1, type: event.id, timestamp: 4, playerId: players[0].id, ...values };
    const invalid = [{ ...valid, playerId: -1 }];
    for (const field of event.fields) invalid.push({ ...valid, [field.id]: field.id === "bodyPart" ? null : "invalid" });
    for (const initialEvent of invalid) {
      let saved = false;
      const ctx = h.context();
      const tree = h.render(Form, { players, pending: { type: event.id, timestamp: 4 }, initialEvent,
        disabled: false, onSave: () => saved = true }, ctx);
      assert(nodes(tree, n => n.type === "button" && text(n) === "Save")[0].props.disabled);
      tree.props.onSubmit({ preventDefault() {} });
      assert(!saved); h.dispose(ctx);
    }
  }
});

test("one definition edit updates workflow ordering/options, all summaries, filters and shortcut labels", () => {
  const h = createHarness((source, filename) => filename.endsWith("eventDefinitions.ts") ? source
    .replace('label: "Shot"', 'label: "Attempt"')
    .replace('label: "Goal"', 'label: "Net"')
    .replace('fields: [shotOutcome, bodyPart]', 'fields: [bodyPart, shotOutcome]') : source);
  const Form = h.load("src/components/EventForm.tsx").default;
  const ctx = h.context(), props = { players: h.load("src/data/players.ts").DEFAULT_PLAYERS, pending: { type: "shot", timestamp: 8 }, disabled: false };
  let tree = h.render(Form, props, ctx);
  const group = () => nodes(tree, n => n.props?.className === "workflow-step")[0];
  assert.equal(group().props["aria-label"], "Body Part");
  nodes(group(), n => n.type === "button")[0].props.onClick(); tree = h.render(Form, props, ctx);
  assert.equal(group().props["aria-label"], "Outcome");
  assert.equal(text(nodes(group(), n => n.type === "button")[0]), "Net");
  nodes(group(), n => n.type === "button")[0].props.onClick(); tree = h.render(Form, props, ctx);
  assert(text(tree).includes("Attempt · Foot · Net"));
  const event = Object.freeze({ id: 1, type: "shot", timestamp: 8, playerId: 1, outcome: "goal", bodyPart: "foot" });
  for (const name of ["EventList", "SavedEventSummary", "ReviewControls"]) {
    const Component = h.load(`src/components/${name}.tsx`).default;
    assert(text(h.render(Component, { players: [], event, events: [event], index: 0, total: 1 })).includes("Attempt · Foot · Net"));
  }
  const { createEventDetails } = h.load("src/utils/events.ts");
  assert.deepEqual(JSON.parse(JSON.stringify(createEventDetails("shot", "goal", "foot"))), { type: "shot", outcome: "goal", bodyPart: "foot" });
  const { DEFAULT_EVENT_SHORTCUTS } = h.load("src/config/eventShortcuts.ts");
  const Settings = h.load("src/components/ShortcutSettings.tsx").default;
  const settings = h.render(Settings, { shortcuts: DEFAULT_EVENT_SHORTCUTS });
  assert.equal(nodes(settings, n => n.props?.["aria-label"] === "Change Attempt shortcut").length, 1);
  const Panel = h.load("src/components/EventsPanel.tsx").default;
  const panel = h.render(Panel, { events: [], totalEventCount: 0, players: [], selectedEventType: "shot", selectedPlayerId: "all" });
  const select = nodes(panel, n => n.type === "select")[0];
  assert.equal(text(nodes(select, n => n.type === "option" && n.props.value === "shot")[0]), "Attempt");
  h.dispose(ctx);
});
