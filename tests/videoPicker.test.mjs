import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness, nodes, text } from "./helpers/componentHarness.mjs";

function setup(overrides = {}) {
  const h = createHarness();
  const Picker = h.load("src/components/VideoPicker.tsx").default;
  const Import = h.load("src/components/SessionImport.tsx").default;
  const Reattach = h.load("src/components/VideoReattachment.tsx").default;
  const Help = h.load("src/components/HowToUse.tsx").default;
  const calls = [];
  const props = {
    hasVideo: false, videoName: "", canResume: false, hasResumeTime: false,
    importedVideo: null, events: [], playerCount: 3, exportError: "",
    resumeButtonRef: { current: null },
    onSelectVideo: event => calls.push(["select", event]),
    onResume: () => calls.push(["resume"]),
    onImportSession: session => calls.push(["import", session]),
    onReattachVideo: (file, metadata) => calls.push(["reattach", file, metadata]),
    onExportSession: () => calls.push(["export"]),
    ...overrides,
  };
  const tree = h.render(Picker, props);
  return { tree, props, calls, Import, Reattach, Help };
}

test("default picker preserves landing copy, help placement, file attributes and Select/Import callbacks", () => {
  const s = setup();
  const picker = nodes(s.tree, node => node.props?.className === "video-picker panel")[0];
  assert(picker);
  assert(text(s.tree).includes("Choose a local video file to start tagging."));
  assert(text(s.tree).includes("Recommended format: MP4 (H.264)"));
  assert(text(s.tree).includes("Your video stays on your device. It is never uploaded to the cloud."));
  const help = nodes(s.tree, node => node.props?.className === "landing-help")[0];
  assert.equal(nodes(help, node => node.type === s.Help).length, 1);
  const actions = nodes(picker, node => node.props?.className === "video-picker-actions")[0];
  const choices = nodes(actions, node => node.type === "label" || node.type === s.Import);
  assert.equal(choices[0].type, "label");
  assert.equal(text(choices[0]), "Select video");
  assert.equal(choices[0].props.className, "file-button button-primary");
  assert.equal(choices[1].type, s.Import);
  const input = nodes(choices[0], node => node.type === "input")[0];
  assert.equal(input.props.accept, ".mp4,.webm,video/mp4,video/webm");
  assert.equal(input.props["aria-describedby"], "video-format-hint");
  const event = { currentTarget: { files: [{ name: "match.mp4" }], value: "match.mp4" } };
  input.props.onChange(event);
  assert.equal(s.calls[0][1], event);
  assert.equal(event.currentTarget.value, "match.mp4");
  const imported = { schemaVersion: 1 };
  choices[1].props.onImport(imported);
  assert.deepEqual(s.calls[1], ["import", imported]);
  assert.equal(nodes(s.tree, node => node.type === s.Reattach).length, 0);
});

test("Resume picker preserves compact layout, button order, callback and exact parent ref", () => {
  const s = setup({ hasVideo: true, videoName: "match.mp4", canResume: true, hasResumeTime: true });
  assert(nodes(s.tree, node => node.props?.className === "video-picker panel video-picker-compact")[0]);
  assert(text(s.tree).includes("match.mp4"));
  assert.equal(nodes(s.tree, node => node.type === s.Help || node.type === s.Import).length, 0);
  const actions = nodes(s.tree, node => node.props?.className === "video-picker-actions")[0];
  const choices = nodes(actions, node => node.type === "button" || node.type === "label");
  assert.equal(text(choices[0]), "Resume analysis");
  assert.equal(text(choices[1]), "Change video");
  assert.equal(choices[1].props.className, "file-button");
  assert.equal(choices[0].props.ref, s.props.resumeButtonRef);
  choices[0].props.onClick(); assert.deepEqual(s.calls, [["resume"]]);
});

test("imported picker renders expected video, counts, reattachment and export errors without processing data", () => {
  const importedVideo = { fileName: "original.mp4", fileSize: 123, duration: 100 };
  const events = [{ id: 1, type: "goal", playerId: 4, timestamp: 10 }];
  const s = setup({ importedVideo, events, playerCount: 2, exportError: "Export failed" });
  assert(text(s.tree).includes("Continue your imported analysis."));
  assert(text(s.tree).includes("Session imported. Reattach the original video to continue the analysis."));
  assert(text(s.tree).includes("Expected video: original.mp4."));
  assert(text(s.tree).includes("1 saved events · 2 players"));
  assert.equal(nodes(s.tree, node => node.type === "input").length, 0);
  const reattach = nodes(s.tree, node => node.type === s.Reattach)[0];
  assert.equal(reattach.props.expected, importedVideo);
  assert.equal(reattach.props.events, events);
  const file = { name: "selected.mp4" }, selectedMetadata = { ...importedVideo, fileName: file.name };
  reattach.props.onAttach(file, selectedMetadata);
  assert.deepEqual(s.calls[0], ["reattach", file, selectedMetadata]);
  nodes(s.tree, node => node.type === "button" && text(node) === "Export session")[0].props.onClick();
  assert.deepEqual(s.calls[1], ["export"]);
  assert.equal(text(nodes(s.tree, node => node.props?.role === "alert")[0]), "Export failed");
});

test("opening an accepted reattachment shows status and keeps the probe unmounted", () => {
  const s = setup({ hasVideo: true, videoName: "selected.mp4",
    importedVideo: { fileName: "original.mp4", fileSize: 123, duration: 100 } });
  assert.equal(text(nodes(s.tree, node => node.props?.role === "status")[0]), "Opening the attached video…");
  assert.equal(nodes(s.tree, node => node.type === s.Reattach || node.type === s.Import || node.type === s.Help).length, 0);
  assert.equal(nodes(s.tree, node => node.type === "input").length, 0);
  assert.equal(nodes(s.tree, node => node.type === "button" && text(node) === "Resume analysis").length, 0);
  assert.equal(nodes(s.tree, node => node.props?.role === "alert").length, 0);
});
