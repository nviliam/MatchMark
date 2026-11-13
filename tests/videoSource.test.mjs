import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness } from "./helpers/componentHarness.mjs";

const file = { name: "match.mp4", type: "video/mp4", size: 123 };
const metadata = { fileName: file.name, fileSize: file.size, duration: 100 };

function setup() {
  let source, serial = 0, fail = false;
  const released = [], allocated = [];
  const h = createHarness(undefined, { URL: {
    createObjectURL() {
      if (fail) throw new Error("Allocation failed");
      const url = `blob:source-${++serial}`;
      allocated.push(url);
      return url;
    },
    revokeObjectURL(url) { released.push(url); },
  } });
  const ctx = h.context(), { useVideoSource } = h.load("src/hooks/useVideoSource.ts");
  const update = () => source = h.render(useVideoSource, {}, ctx);
  update();
  return { update, released, allocated, fail: value => { fail = value; },
    dispose: () => h.dispose(ctx), get source() { return source; } };
}

test("active creation and readiness retain File and metadata; replacement releases only the old URL", () => {
  const s = setup(); let prepared = 0;
  assert(s.source.selectNewVideo(file, () => prepared++).ok); s.update();
  assert.equal(prepared, 1);
  assert.equal(s.source.active.file, file);
  assert.equal(s.source.active.url, "blob:source-1");
  assert.equal(s.source.active.ready, false);
  assert.equal(s.source.active.metadata.fileSize, 123);
  s.source.markActiveReady(100); s.update();
  assert.equal(s.source.active.ready, true);
  assert.equal(s.source.active.metadata.duration, 100);
  assert(s.source.selectNewVideo({ ...file, name: "next.mp4" }, () => prepared++).ok);
  assert.deepEqual(s.released, []);
  s.update();
  assert.deepEqual(s.released, ["blob:source-1"]);
  assert.equal(s.source.active.metadata.fileName, "next.mp4");
  s.dispose(); assert.deepEqual(s.released, s.allocated);
});

test("invalid files and failed URL allocation preserve active readiness, metadata and caller workflow", () => {
  const s = setup();
  s.source.selectNewVideo(file, () => {}); s.update();
  s.source.markActiveReady(100); s.update();
  const before = s.source.active; let resets = 0;
  assert.equal(s.source.selectNewVideo({ ...file, name: "bad.txt", type: "text/plain" }, () => resets++).ok, false);
  s.fail(true);
  const result = s.source.selectNewVideo(file, () => resets++); s.update();
  assert.equal(result.ok, false);
  assert(result.error.includes("Your current session has been kept"));
  assert.equal(resets, 0);
  assert.equal(s.source.active, before);
  assert.deepEqual(s.released, []);
  s.dispose(); assert.deepEqual(s.released, s.allocated);
});

test("candidate creation, replacement and discard release each probe exactly once and ignore stale metadata", () => {
  const s = setup();
  assert(s.source.prepareReattachment(file).ok); s.update();
  const first = s.source.candidate;
  assert.equal(first.file, file);
  assert.equal(first.metadata, null);
  s.source.recordCandidateMetadata(first.url, 100); s.update();
  assert.equal(s.source.candidate.metadata.duration, 100);
  s.source.prepareReattachment({ ...file, name: "other.mp4" }); s.update();
  const second = s.source.candidate;
  assert.deepEqual(s.released, [first.url]);
  s.source.recordCandidateMetadata(first.url, 1); s.update();
  assert.equal(s.source.candidate, second);
  s.source.discardCandidate(); s.update();
  assert.equal(s.source.candidate, null);
  assert.deepEqual(s.released, [first.url, second.url]);
  s.source.discardCandidate(); s.update(); s.dispose();
  assert.deepEqual(s.released, s.allocated);
});

test("explicit candidate acceptance allocates an independent active URL without premature probe revocation", () => {
  const s = setup();
  s.source.prepareReattachment(file); s.update();
  s.source.recordCandidateMetadata(s.source.candidate.url, 100); s.update();
  const candidate = s.source.candidate;
  assert.equal(s.source.active, null);
  assert(s.source.acceptReattachment(candidate.file, candidate.metadata).ok); s.update();
  const active = s.source.active;
  assert.notEqual(active.url, candidate.url);
  assert.deepEqual(s.released, []);
  s.source.discardCandidate(); s.update();
  assert.equal(s.source.active, active);
  assert.deepEqual(s.released, [candidate.url]);
  s.source.markActiveReady(100); s.update();
  assert.equal(s.source.active.ready, true);
  s.dispose(); assert.deepEqual(s.released, s.allocated);
});

test("failed reattachment acceptance preserves the active source and prepared candidate for retry", () => {
  const s = setup();
  s.source.selectNewVideo(file, () => {}); s.update();
  s.source.prepareReattachment(file); s.update();
  const active = s.source.active, candidate = s.source.candidate;
  s.fail(true);
  assert.equal(s.source.acceptReattachment(file, metadata).ok, false); s.update();
  assert.equal(s.source.active, active);
  assert.equal(s.source.candidate, candidate);
  assert.deepEqual(s.released, []);
  s.dispose(); assert.deepEqual(s.released, s.allocated);
});

test("import detaches active source and retains expected metadata; restored playback failure allows retry", () => {
  const s = setup();
  s.source.selectNewVideo(file, () => {}); s.update();
  s.source.detachForImport(metadata); s.update();
  assert.equal(s.source.active, null);
  assert.deepEqual(s.released, ["blob:source-1"]);
  assert.equal(JSON.stringify(s.source.importedVideo), JSON.stringify(metadata));
  s.source.acceptReattachment(file, metadata); s.update();
  assert.deepEqual(s.released, ["blob:source-1"]);
  s.source.markActiveReady(101); s.update();
  assert.equal(s.source.importedVideo, null);
  assert.equal(s.source.handleActiveError(), true); s.update();
  assert.equal(s.source.active, null);
  assert.equal(s.source.importedVideo.duration, 100);
  s.dispose(); assert.deepEqual(s.released, s.allocated);
});

test("unmount releases both live sources once and rejects late probe callbacks", () => {
  const s = setup();
  s.source.selectNewVideo(file, () => {});
  s.source.prepareReattachment(file); s.update();
  const candidate = s.source.candidate;
  s.dispose();
  assert.deepEqual(s.released, s.allocated);
  assert.equal(s.source.isCurrentCandidate(candidate.url), false);
  s.source.recordCandidateMetadata(candidate.url, 100);
  s.dispose(); assert.deepEqual(s.released, s.allocated);
});

test("batched replacements and uncommitted allocations are still released exactly once", () => {
  const s = setup();
  s.source.selectNewVideo(file, () => {});
  s.source.selectNewVideo(file, () => {});
  s.source.prepareReattachment(file);
  s.source.prepareReattachment(file); s.update();
  assert.deepEqual(s.released, ["blob:source-1", "blob:source-3"]);
  s.source.discardCandidate(); s.update();
  s.source.prepareReattachment(file);
  s.source.discardCandidate(); s.update();
  assert(s.released.includes("blob:source-5"));
  s.source.prepareReattachment(file);
  s.dispose();
  assert.equal(new Set(s.released).size, s.allocated.length);
  assert.equal(s.released.length, s.allocated.length);
});

test("probe allocation failure discards the old candidate without affecting active video", () => {
  const s = setup();
  s.source.selectNewVideo(file, () => {}); s.update();
  s.source.prepareReattachment(file); s.update();
  const active = s.source.active;
  s.fail(true);
  assert.equal(s.source.prepareReattachment(file).ok, false); s.update();
  assert.equal(s.source.candidate, null);
  assert.equal(s.source.active, active);
  assert.deepEqual(s.released, ["blob:source-2"]);
  s.dispose();
  assert.equal(s.released.length, s.allocated.length);
});
