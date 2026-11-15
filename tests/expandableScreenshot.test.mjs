// Handler/state tests with dialog doubles. These do not emulate native modal
// stacking, focus containment or browser-generated Enter/Space/Escape events.
// Verify those separately in a browser with the real How to use dialog open.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function setup() {
  const h = createHarness(), ctx = h.context(), calls = [];
  const Component = h.load("src/components/ExpandableScreenshot.tsx").default;
  const props = { id: "players", src: "/players.png", alt: "Players panel", title: "Add or edit players" };
  const modal = { open: false,
    showModal() { this.open = true; calls.push("show preview"); },
    close() { this.open = false; calls.push("close preview"); },
  };
  ctx.refs[0] = { current: { focus() { assert(!modal.open); calls.push("focus thumbnail"); } } };
  ctx.refs[1] = { current: modal };
  let tree;
  const update = () => tree = h.render(Component, props, ctx);
  const launcher = () => nodes(tree, n => n.type === "button" && n.props["aria-haspopup"] === "dialog")[0];
  update();
  return { h, ctx, props, calls, modal, update, launcher, get tree() { return tree; } };
}

test("thumbnail is a named native button and its open handler renders the same image in a labelled modal", () => {
  const s = setup(), button = s.launcher();
  assert.equal(button.props.type, "button");
  assert.equal(button.props["aria-label"], "Open larger image: Add or edit players");
  assert.equal(button.props["aria-expanded"], false);
  assert.equal(nodes(s.tree, n => n.type === "dialog").length, 0);
  button.props.onClick(); s.update();
  const dialog = nodes(s.tree, n => n.type === "dialog")[0];
  assert.equal(dialog.props["aria-label"], "Larger image: Add or edit players");
  assert.equal(dialog.props["aria-modal"], "true");
  assert.equal(s.launcher().props["aria-controls"], dialog.props.id);
  assert.equal(s.launcher().props["aria-expanded"], true);
  const image = nodes(dialog, n => n.type === "img")[0];
  assert.equal(image.props.src, s.props.src); assert.equal(image.props.alt, s.props.alt);
  assert.equal(nodes(dialog, n => n.type === "button")[0].props.autoFocus, true);
  assert.deepEqual(s.calls, ["show preview"]);
  s.h.dispose(s.ctx);
});

for (const action of ["Close", "cancel"]) test(`preview ${action} handler closes before returning focus to its own thumbnail (simulated)`, () => {
  const s = setup(); s.launcher().props.onClick(); s.update();
  const dialog = nodes(s.tree, n => n.type === "dialog")[0];
  if (action === "Close") nodes(dialog, n => n.type === "button" && text(n) === "Close")[0].props.onClick();
  else {
    let prevented = false, stopped = false;
    dialog.props.onCancel({ preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
    assert(prevented); assert(stopped);
  }
  s.update();
  assert.equal(nodes(s.tree, n => n.type === "dialog").length, 0);
  assert.equal(s.launcher().props["aria-expanded"], false);
  assert.deepEqual(s.calls, ["show preview", "close preview", "focus thumbnail"]);
  s.h.dispose(s.ctx);
});

test("preview handlers stop keyboard/click propagation and cleanup closes without refocusing an unmounted thumbnail", () => {
  const s = setup(); s.launcher().props.onClick(); s.update();
  const dialog = nodes(s.tree, n => n.type === "dialog")[0];
  for (const handler of ["onKeyDown", "onClick"]) {
    let stopped = false;
    dialog.props[handler]({ key: "Escape", stopPropagation() { stopped = true; } });
    assert(stopped);
  }
  s.h.dispose(s.ctx);
  assert.deepEqual(s.calls, ["show preview", "close preview"]);
  assert.equal(s.h.listeners.size, 0);
});

test("all six help screenshots use ExpandableScreenshot with unique IDs, current sources and section labels", () => {
  const h = createHarness(), ctx = h.context();
  const Help = h.load("src/components/HowToUsePanel.tsx").default;
  const Screenshot = h.load("src/components/ExpandableScreenshot.tsx").default;
  const tree = h.render(Help, { onClose() {} }, ctx);
  const screenshots = nodes(tree, n => n.type === Screenshot);
  assert.deepEqual(screenshots.map(n => n.props.id), ["load-video", "tag-events", "assign-details", "review-events", "players", "session"]);
  assert.deepEqual(screenshots.map(n => n.props.title), ["Load a video", "Tag match events", "Assign players and details", "Review your events", "Add or edit players", "Save and restore a session"]);
  const { howToUseScreenshots } = h.load("src/assets/how-to-use/screenshots.ts");
  for (const screenshot of screenshots) {
    assert.equal(screenshot.props.src, howToUseScreenshots[screenshot.props.id]);
    assert(screenshot.props.alt);
  }
  assert.equal(nodes(tree, n => n.type === "img").length, 0);
  h.dispose(ctx);
});

test("missing screenshot retains its text fallback without an empty image button", () => {
  const h = createHarness(), ctx = h.context(), Component = h.load("src/components/ExpandableScreenshot.tsx").default;
  const tree = h.render(Component, { id: "missing", src: undefined, title: "Missing", alt: "Screen description" }, ctx);
  assert.equal(nodes(tree, n => n.type === "button" || n.type === "img" || n.type === "dialog").length, 0);
  assert.equal(nodes(tree, n => n.type === "figcaption").length, 1);
  assert(text(tree).includes("Screen description"));
  h.dispose(ctx);
});
