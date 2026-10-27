// Runs component handlers with simulated hooks/media, not a DOM or browser renderer.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";

const root = fileURLToPath(new URL("../../", import.meta.url));
export function createHarness(transformSource = source => source) {
  const cache = new Map(), listeners = new Set(), capturePhase = new Map();
  let current;
  const media = { currentTime: 0, duration: 1000, paused: true, error: null, pause() { this.paused = true; }, focus() {} };
  class Element { closest() { return null; } }
  const hooks = {
    useState(initial) {
      const ctx = current, index = ctx.s++;
      if (!(index in ctx.states)) ctx.states[index] = typeof initial === "function" ? initial() : initial;
      return [ctx.states[index], value => { ctx.states[index] = typeof value === "function" ? value(ctx.states[index]) : value; }];
    },
    useRef(initial) { const ctx = current, index = ctx.r++; return ctx.refs[index] ??= { current: ctx.video && index === 0 ? media : initial ?? { focus() {} } }; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useMemo(fn, deps) {
      const ctx = current, index = ctx.m++, old = ctx.memos[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) ctx.memos[index] = { deps, value: fn() };
      return ctx.memos[index].value;
    },
    useEffect(fn, deps) {
      const ctx = current, index = ctx.e++, old = ctx.effects[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        ctx.jobs.push(() => { old?.cleanup?.(); ctx.effects[index] = { deps, cleanup: fn() }; });
      }
    },
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const source = transformSource(fs.readFileSync(filename, "utf8"), filename);
    const code = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    const require = name => {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return jsx;
      const stem = path.resolve(path.dirname(filename), name);
      return load([stem, stem + ".ts", stem + ".tsx"].find(file => fs.existsSync(file)));
    };
    vm.runInNewContext(code, {
      exports: module.exports, require, HTMLElement: Element,
      window: {
        addEventListener: (_, fn, capture = false) => { listeners.add(fn); capturePhase.set(fn, capture); },
        removeEventListener: (_, fn) => { listeners.delete(fn); capturePhase.delete(fn); },
      },
      URL: { createObjectURL: () => "blob:video", revokeObjectURL() {} },
    }, { filename });
    return module.exports;
  }
  const context = (video = false) => ({ video, states: [], refs: [], effects: [], memos: [] });
  function render(Component, props, ctx = context()) {
    current = ctx; ctx.s = ctx.r = ctx.e = ctx.m = 0; ctx.jobs = [];
    const result = Component(props); ctx.jobs.forEach(job => job()); return result;
  }
  function press(key, extra = {}) {
    const event = { key, code: `Key${key.toUpperCase()}`, target: new Element(), defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.propagationStopped = true; }, ...extra };
    for (const listener of [...listeners].sort((a, b) => Number(capturePhase.get(b)) - Number(capturePhase.get(a)))) {
      listener(event);
      if (event.propagationStopped) break;
    }
  }
  function dispose(ctx) { ctx.effects.forEach(effect => effect.cleanup?.()); }
  return { load, render, context, media, press, dispose, listeners, Element };
}

export function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(node => nodes(node, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
export function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return Array.isArray(tree) ? tree.map(text).join("") : text(tree.props?.children);
}
