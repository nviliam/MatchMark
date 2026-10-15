import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import {
  DEFAULT_EVENT_SHORTCUTS, EVENT_SHORTCUTS_STORAGE_KEY, EVENT_SHORTCUT_TYPES,
  findEventShortcut, formatShortcutKey, getShortcutKeyError, loadEventShortcuts,
  normalizeShortcutKey, persistEventShortcuts, validateEventShortcuts,
} from "../src/config/eventShortcuts.ts";

const originalWindow = globalThis.window;
let storage;
beforeEach(() => {
  storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  };
});
after(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test("defaults stay immutable and runtime configurations are separate objects", () => {
  assert(Object.isFrozen(DEFAULT_EVENT_SHORTCUTS));
  assert.equal(EVENT_SHORTCUT_TYPES.length, 10);
  const runtime = loadEventShortcuts();
  assert.deepEqual(runtime, DEFAULT_EVENT_SHORTCUTS);
  assert.notEqual(runtime, DEFAULT_EVENT_SHORTCUTS);
  runtime.shot = "s";
  assert.equal(DEFAULT_EVENT_SHORTCUTS.shot, "e");
});

test("normalization, lookup and badge formatting share case and Unicode rules", () => {
  assert.equal(normalizeShortcutKey("Q"), "q");
  assert.equal(findEventShortcut(DEFAULT_EVENT_SHORTCUTS, "Q"), "pass");
  const custom = { ...DEFAULT_EVENT_SHORTCUTS, shot: "é", pass: "." };
  assert.equal(findEventShortcut(custom, "E\u0301"), "shot");
  assert.equal(formatShortcutKey("e\u0301"), "É");
  assert.equal(findEventShortcut(custom, "."), "pass");
  assert.equal(findEventShortcut(custom, "E"), undefined);
});

test("Quick Seek numbers and their physical shifted keys are reserved", () => {
  for (const key of ["2", "3", "4"]) {
    assert.equal(getShortcutKeyError(key), `${key} is reserved for Quick Seek.`);
    assert.equal(getShortcutKeyError("#", `Digit${key}`), `${key} is reserved for Quick Seek.`);
  }
});

test("only single printable keys are accepted", () => {
  for (const key of ["Escape", "Enter", "Tab", "Backspace", "Shift", "Control", "Alt", "Meta", "Dead", "Unidentified", " ", "\n", "", "Ctrl+S"]) {
    assert(getShortcutKeyError(key), key);
  }
  for (const key of ["q", "Q", "é", ".", "1", "5"]) assert.equal(getShortcutKeyError(key), null);
});

test("a complete custom config is normalized and survives storage reload", () => {
  const custom = { ...DEFAULT_EVENT_SHORTCUTS, shot: "S", pass: "F" };
  const validated = validateEventShortcuts(custom);
  assert.equal(validated.shot, "s");
  assert.equal(validated.pass, "f");
  persistEventShortcuts(validated);
  assert.equal(storage.get(EVENT_SHORTCUTS_STORAGE_KEY), JSON.stringify(validated));
  const reloaded = loadEventShortcuts();
  assert.deepEqual(reloaded, validated);
  assert.equal(findEventShortcut(reloaded, "S"), "shot");
  assert.equal(findEventShortcut(reloaded, "F"), "pass");
  assert.equal(findEventShortcut(reloaded, "E"), undefined);
  assert.equal(findEventShortcut(reloaded, "Q"), undefined);
});

test("corrupt, incomplete, unknown, duplicate, reserved and wrong-type storage falls back", () => {
  const { shot: _shot, ...missing } = DEFAULT_EVENT_SHORTCUTS;
  for (const value of [
    null, [], "qwert", 42, missing,
    { ...DEFAULT_EVENT_SHORTCUTS, unknown: "s" },
    { ...missing, unknown: "s" },
    { ...DEFAULT_EVENT_SHORTCUTS, shot: "Q" },
    { ...DEFAULT_EVENT_SHORTCUTS, shot: "3" },
    { ...DEFAULT_EVENT_SHORTCUTS, shot: "Escape" },
    { ...DEFAULT_EVENT_SHORTCUTS, shot: 7 },
    { ...DEFAULT_EVENT_SHORTCUTS, shot: null },
  ]) {
    assert.equal(validateEventShortcuts(value), null);
    storage.set(EVENT_SHORTCUTS_STORAGE_KEY, JSON.stringify(value));
    assert.deepEqual(loadEventShortcuts(), DEFAULT_EVENT_SHORTCUTS);
  }
  storage.set(EVENT_SHORTCUTS_STORAGE_KEY, "{broken JSON");
  assert.deepEqual(loadEventShortcuts(), DEFAULT_EVENT_SHORTCUTS);
  persistEventShortcuts(loadEventShortcuts());
  assert.deepEqual(JSON.parse(storage.get(EVENT_SHORTCUTS_STORAGE_KEY)), DEFAULT_EVENT_SHORTCUTS);
});

test("reset mapping overwrites custom storage and remains the default after reload", () => {
  persistEventShortcuts({ ...DEFAULT_EVENT_SHORTCUTS, shot: "s", pass: "f" });
  persistEventShortcuts({ ...DEFAULT_EVENT_SHORTCUTS });
  assert.deepEqual(loadEventShortcuts(), DEFAULT_EVENT_SHORTCUTS);
});

test("denied reads/writes and unavailable storage never crash the app", () => {
  Object.defineProperty(window, "localStorage", { get() { throw new Error("Access denied"); } });
  assert.deepEqual(loadEventShortcuts(), DEFAULT_EVENT_SHORTCUTS);
  assert.doesNotThrow(() => persistEventShortcuts(DEFAULT_EVENT_SHORTCUTS));
  globalThis.window = { localStorage: { getItem: () => null, setItem() { throw new Error("Quota exceeded"); } } };
  assert.doesNotThrow(() => persistEventShortcuts(DEFAULT_EVENT_SHORTCUTS));
  delete globalThis.window;
  assert.deepEqual(loadEventShortcuts(), DEFAULT_EVENT_SHORTCUTS);
});
