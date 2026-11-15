import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function mountPanel(h, props = {}, modal = {
  open: false,
  showModal() { this.open = true; },
  close() { this.open = false; },
}) {
  const Panel = h.load("src/components/HowToUsePanel.tsx").default;
  const ctx = h.context();
  ctx.refs[0] = { current: modal };
  const tree = h.render(Panel, { onClose() {}, ...props }, ctx);
  return { tree, modal, ctx, Panel };
}

test("landing separates How to use from Select video and Import session, and omits help from analysis/Resume", () => {
  const h = createHarness(), ctx = h.context(true);
  const Video = h.load("src/components/VideoPlayer.tsx").default;
  const Help = h.load("src/components/HowToUse.tsx").default;
  const Buttons = h.load("src/components/EventButtons.tsx").default;
  const Import = h.load("src/components/SessionImport.tsx").default;
  const { DEFAULT_EVENT_SHORTCUTS } = h.load("src/config/eventShortcuts.ts");
  let active = false, tree;
  const update = () => tree = h.render(Video, { isAnalysisActive: active,
    onAnalysisActiveChange: value => active = value, eventShortcuts: DEFAULT_EVENT_SHORTCUTS }, ctx);
  update();
  const actions = nodes(tree, n => n.props?.className === "video-picker-actions")[0];
  const children = nodes(actions, n => n.type === "label" || n.type === Help || n.type === Import);
  assert.deepEqual(children.map(n => n.type), ["label", Import]);
  const helpPlacement = nodes(tree, n => n.props?.className === "landing-help")[0];
  assert.equal(nodes(helpPlacement, n => n.type === Help).length, 1);
  assert.equal(text(children[0]), "Select video");
  assert(children[0].props.className.includes("button-primary"));
  const input = nodes(tree, n => n.type === "input")[0];
  assert.equal(input.props.type, "file");
  assert.equal(input.props.accept, ".mp4,.webm,video/mp4,video/webm");
  assert.equal(input.props["aria-describedby"], "video-format-hint");
  assert(text(tree).includes("Choose a local video file to start tagging."));
  assert(text(tree).includes("Recommended format: MP4 (H.264)"));
  assert(text(tree).includes("Your video stays on your device. It is never uploaded to the cloud."));

  const helpCtx = h.context();
  let help = h.render(Help, {}, helpCtx);
  const launcher = nodes(help, n => n.type === "button")[0];
  assert.equal(text(launcher), "How to use");
  assert.equal(launcher.props.type, "button");
  assert.equal(launcher.props["aria-haspopup"], "dialog");
  launcher.props.onClick(); help = h.render(Help, {}, helpCtx);
  assert(!active); assert.equal(h.media.currentTime, 0);
  const Panel = h.load("src/components/HowToUsePanel.tsx").default;
  nodes(help, n => n.type === Panel)[0].props.onClose();
  help = h.render(Help, {}, helpCtx);
  assert.equal(nodes(help, n => n.type === Panel).length, 0);

  // Selecting a video still invokes the original upload/readiness handlers.
  input.props.onChange({ currentTarget: { value: "match.mp4", files: [{ name: "match.mp4", type: "video/mp4" }] } });
  update();
  nodes(tree, n => n.type === "video")[0].props.onLoadedMetadata(); update();
  assert(active); assert.equal(nodes(tree, n => n.type === Help).length, 0);
  nodes(tree, n => n.type === Buttons)[0].props.onExit(); update();
  assert(!active); assert.equal(nodes(tree, n => n.type === Help).length, 0);
  const resume = nodes(tree, n => n.type === "button" && text(n) === "Resume analysis")[0];
  assert(resume); resume.props.onClick(); update(); assert(active);
  h.dispose(helpCtx); h.dispose(ctx); assert.equal(h.listeners.size, 0);
});

for (const action of ["Close", "Escape"]) test(`${action} closes the native help modal and returns focus without global Escape listeners`, () => {
  const h = createHarness(), Help = h.load("src/components/HowToUse.tsx").default;
  const launcherCtx = h.context();
  const events = [];
  const modal = {
    open: false,
    showModal() { this.open = true; events.push("showModal"); },
    close() { this.open = false; events.push("close"); },
  };
  launcherCtx.refs[0] = { current: { focus() { assert(!modal.open); events.push("focus launcher"); } } };
  let help = h.render(Help, {}, launcherCtx);
  assert.equal(nodes(help, n => n.type === "button")[0].props["aria-expanded"], false);
  nodes(help, n => n.type === "button")[0].props.onClick();
  help = h.render(Help, {}, launcherCtx);
  const Panel = h.load("src/components/HowToUsePanel.tsx").default;
  const panelProps = nodes(help, n => n.type === Panel)[0].props;
  const { tree, ctx } = mountPanel(h, panelProps, modal);
  assert(modal.open); assert.equal(tree.type, "dialog");
  assert.equal(tree.props["aria-modal"], "true");
  assert.equal(tree.props["aria-labelledby"], "how-to-use-title");
  assert.equal(tree.props["aria-describedby"], "how-to-use-intro");
  assert.equal(nodes(help, n => n.type === "button")[0].props["aria-controls"], tree.props.id);
  const close = nodes(tree, n => n.type === "button" && text(n) === "Close")[0];
  assert(close.props.autoFocus);
  assert.equal(nodes(tree, n => n.props?.className === "how-to-use-content")[0].props.tabIndex, 0);
  // Dialog clicks cannot bubble into the surrounding landing card.
  let stopped = false;
  tree.props.onClick({ stopPropagation() { stopped = true; } });
  assert(stopped); assert(modal.open);
  if (action === "Close") close.props.onClick();
  else {
    let prevented = false, cancelStopped = false;
    tree.props.onCancel({ preventDefault() { prevented = true; }, stopPropagation() { cancelStopped = true; } });
    assert(prevented); assert(cancelStopped);
  }
  help = h.render(Help, {}, launcherCtx);
  assert(!modal.open); assert.equal(nodes(help, n => n.type === Panel).length, 0);
  assert.equal(nodes(help, n => n.type === "button")[0].props["aria-expanded"], false);
  assert.deepEqual(events, ["showModal", "close", "focus launcher"]);
  h.dispose(ctx); h.dispose(launcherCtx);
  assert.equal(h.listeners.size, 0);
});

test("help contains seven ordered sections, exact Quick Seek pairs and platform Save shortcuts without a separate Important block", () => {
  const h = createHarness(), { tree, ctx } = mountPanel(h);
  assert.equal(text(nodes(tree, n => n.type === "h2")[0]), "How to use MatchMark");
  assert(text(tree).includes("MatchMark lets you tag, filter and review football events directly from a local video."));
  assert.deepEqual(nodes(tree, n => n.type === "h3").map(text), [
    "1. Load a video", "2. Tag match events", "3. Assign players and details", "4. Review your events",
    "5. Add or edit players", "6. Save and restore a session", "7. Keyboard shortcuts and Quick Seek",
  ]);
  assert(text(tree).includes("Event shortcuts are displayed on the event buttons and can be customized in Shortcuts."));
  const rows = nodes(tree, n => n.props?.className === "how-to-use-shortcut-row");
  assert.deepEqual(rows.map(text), [
    "2Forward 1.2 s", "Shift+2Rewind 1.2 s", "3Forward 1.5 s", "Shift+3Rewind 1.5 s",
    "4Forward 2.0 s", "Shift+4Rewind 2.0 s", "Ctrl+EnterWindows / Linux", "Cmd+EntermacOS",
  ]);
  assert(rows.every(row => nodes(row, n => n.type === "kbd").length > 0));
  assert(text(tree).includes("Save current event"));
  assert(text(tree).includes("Available after completing the event details, when Save is enabled."));
  assert.equal(nodes(tree, n => n.props?.className === "how-to-use-warning").length, 0);
  assert(!text(tree).includes("Important"));
  assert.equal(nodes(tree, n => n.type === "input" || n.type === "video").length, 0);
  h.dispose(ctx);
});

test("session guide includes its screenshot and the only autosave warning alongside JSON export/import and reattachment instructions", () => {
  const h = createHarness(), { tree, ctx } = mountPanel(h);
  const session = nodes(tree, n => n.props?.["aria-labelledby"] === "how-to-use-session-title")[0];
  assert(session); assert.equal(session.type, "section");
  const heading = nodes(session, n => n.props?.id === session.props["aria-labelledby"])[0];
  assert.equal(heading.type, "h3"); assert.equal(text(heading), "6. Save and restore a session");
  assert(text(session).includes("Session → Export session to save your current analysis as a local JSON file."));
  assert(text(session).includes("Session → Import session to restore your events, player roster and session data."));
  assert(text(session).includes("Import session is also available on the start screen."));
  assert(text(session).includes("choose Reattach video and select the original local video"));
  assert(text(session).includes("The video itself is not stored in the session file."));
  assert(text(session).includes("The session file contains analysis data and video metadata only."));
  assert.equal(text(nodes(session, n => n.props?.["aria-label"] === "Session workflow")[0]),
    "Analyze → Export session → Close the browser → Import session later → Reattach the original video → Continue analysis");
  const screenshot = nodes(session, n => n.type === "img")[0];
  assert.equal(screenshot.props.src, "/src/assets/how-to-use/session.png");
  assert.equal(screenshot.props.alt, "MatchMark Session panel with Export session and Import session buttons");
  assert.equal(nodes(session, n => n.props?.className === "how-to-use-screenshot").length, 1);
  const warning = nodes(session, n => n.props?.className === "how-to-use-session-warning")[0];
  assert(warning); assert.equal(warning.type, "p");
  assert.equal(text(warning), "MatchMark does not save sessions automatically yet. Export your session before closing or refreshing the page.");
  assert.equal(nodes(tree, n => n.props?.className === "how-to-use-session-warning").length, 1);
  assert.equal(text(tree).split("does not save sessions automatically yet").length - 1, 1);
  assert(!text(tree).includes("Settings"));
  assert(!text(tree).includes("not saved permanently yet"));
  assert(text(tree).includes("customized in Shortcuts."));
  h.dispose(ctx);
});

test("Players guide explains roster editing and event assignment with the supplied Players screenshot", () => {
  const h = createHarness(), { tree, ctx } = mountPanel(h);
  const players = nodes(tree, n => n.props?.["aria-labelledby"] === "how-to-use-players")[0];
  assert(players); assert.equal(players.props.className, "how-to-use-step");
  assert.equal(text(nodes(players, n => n.type === "h3")[0]), "5. Add or edit players");
  assert(text(players).includes("Open the Players panel to add, edit or remove players from the current roster."));
  assert(text(players).includes("Players can then be assigned to tagged events during the analysis."));
  assert.equal(nodes(players, n => n.type === "img")[0].props.src, "/src/assets/how-to-use/players.png");
  assert.equal(nodes(players, n => n.props?.className === "how-to-use-screenshot").length, 1);
  h.dispose(ctx);
});

test("all six supplied screenshots render in workflow order using the exact local filenames", () => {
  const h = createHarness(), { tree, ctx } = mountPanel(h);
  const images = nodes(tree, n => n.type === "img");
  assert.deepEqual(images.map(image => image.props.src), [
    "/src/assets/how-to-use/load-video.png", "/src/assets/how-to-use/tag-events.png",
    "/src/assets/how-to-use/assign-details.png", "/src/assets/how-to-use/review-events.png",
    "/src/assets/how-to-use/players.png", "/src/assets/how-to-use/session.png",
  ]);
  assert.equal(nodes(tree, n => n.type === "figcaption").length, 0);
  assert(images.every(image => image.props.alt && image.props.loading === "lazy" && image.props.decoding === "async"));
  h.dispose(ctx);
});

test("missing screenshots render honest text slots without broken images or nonexistent imports", () => {
  const h = createHarness((source, filename) => filename.endsWith(path.join("how-to-use", "screenshots.ts"))
    ? "export const howToUseScreenshots = {};" : source);
  const { tree, ctx, modal } = mountPanel(h);
  assert.equal(nodes(tree, n => n.type === "figure").length, 6);
  assert.equal(nodes(tree, n => n.type === "img").length, 0);
  assert.equal(nodes(tree, n => n.type === "figcaption" && text(n).includes("Screenshot to be added.")).length, 6);
  assert(modal.open); h.dispose(ctx); assert(!modal.open);
  assert.equal(h.listeners.size, 0);
});

test("a partial local screenshot manifest renders supplied images with descriptive alt text and retains missing slots", () => {
  const supplied = { "load-video": "/assets/load-video-test.png", "review-events": "/assets/review-events-test.png" };
  const h = createHarness((source, filename) => filename.endsWith(path.join("how-to-use", "screenshots.ts"))
    ? `export const howToUseScreenshots = ${JSON.stringify(supplied)};` : source);
  const { tree, ctx } = mountPanel(h);
  const images = nodes(tree, n => n.type === "img");
  assert.deepEqual(images.map(image => image.props.src), Object.values(supplied));
  assert.deepEqual(images.map(image => image.props.alt), [
    "MatchMark start screen with the Select video button",
    "MatchMark Events panel with event and player filters and the Review events button",
  ]);
  assert(images.every(image => image.props.loading === "lazy" && image.props.decoding === "async"));
  assert.equal(nodes(tree, n => n.type === "figcaption").length, 4);
  h.dispose(ctx);
});
