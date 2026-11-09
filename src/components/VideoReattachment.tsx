import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { MatchEvent } from "../types/event";
import type { SessionVideoMetadata } from "../types/session";
import { compareVideoMetadata } from "../utils/videoReattachment";
import { VIDEO_FILE_ACCEPT, VIDEO_FORMAT_ERROR, isSupportedVideoFile } from "../utils/video";

type Candidate = { file: File; url: string; metadata: SessionVideoMetadata | null };
type Props = {
  expected: SessionVideoMetadata;
  events: readonly MatchEvent[];
  onAttach: (file: File, metadata: SessionVideoMetadata) => void;
};

const describe = (value: number | null, unit = "") => value === null ? "unknown" : `${value}${unit}`;

export default function VideoReattachment({ expected, events, onAttach }: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const liveUrl = useRef<string | null>(null);
  // This probe URL is separate from the active player's URL and is always released.
  useEffect(() => {
    const url = candidate?.url ?? null;
    liveUrl.current = url;
    return () => {
      if (liveUrl.current === url) liveUrl.current = null;
      if (url) URL.revokeObjectURL(url);
    };
  }, [candidate?.url]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError("");
    setCandidate(null);
    if (!isSupportedVideoFile(file)) { setError(VIDEO_FORMAT_ERROR); return; }
    try { setCandidate({ file, url: URL.createObjectURL(file), metadata: null }); }
    catch { setError("This video could not be opened. Please choose it again. Your session has been kept."); }
  }

  function metadataFailed() {
    if (!candidate || liveUrl.current !== candidate.url) return;
    liveUrl.current = null;
    setCandidate(null);
    setError("Video metadata could not be read. Please choose another video. Your session has been kept.");
  }

  const comparison = candidate?.metadata ? compareVideoMetadata(expected, candidate.metadata, events) : null;
  const allMatch = comparison && [comparison.fileName, comparison.fileSize, comparison.duration].every(value => value === "match");
  return <div className="video-reattachment">
    <input ref={inputRef} type="file" accept={VIDEO_FILE_ACCEPT} hidden aria-label="Reattach original video" onChange={selectFile} />
    {!candidate && <button className="button-primary" type="button" onClick={() => inputRef.current?.click()}>Reattach video</button>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {candidate && <>
      <video key={candidate.url} src={candidate.url} preload="metadata" hidden aria-label="Video metadata preview"
        onLoadedMetadata={(event) => {
          if (liveUrl.current !== candidate.url) return;
          const duration = event.currentTarget.duration;
          if (!Number.isFinite(duration) || duration < 0) { metadataFailed(); return; }
          const metadata = { fileName: candidate.file.name,
            fileSize: Number.isFinite(candidate.file.size) ? candidate.file.size : null, duration };
          setCandidate(current => current?.url === candidate.url ? { ...current, metadata } : current);
        }} onError={metadataFailed} />
      {!comparison && <p role="status">Reading video metadata…</p>}
      {comparison && <section className={comparison.hasWarning ? "video-match-result video-match-warning" : "video-match-result"}
        aria-label="Video comparison" role="status">
        <h3>{comparison.hasWarning ? "This video may not match the imported session."
          : allMatch ? "Video matches the imported session metadata." : "Some video metadata could not be compared."}</h3>
        <p>Metadata is a matching hint and does not prove file identity.</p>
        <dl>
          <dt>File name: {comparison.fileName}</dt><dd>{expected.fileName || "unknown"} → {candidate.metadata?.fileName}</dd>
          <dt>File size: {comparison.fileSize}</dt><dd>{describe(expected.fileSize, " bytes")} → {describe(candidate.metadata!.fileSize, " bytes")}</dd>
          <dt>Duration: {comparison.duration}</dt><dd>{describe(expected.duration, " s")} → {describe(candidate.metadata!.duration, " s")}</dd>
        </dl>
        {comparison.eventTimestamps === "mismatch" && <p>This video is shorter than some imported event timestamps. Events will be kept unchanged.</p>}
      </section>}
      <div className="reattachment-actions">
        <button type="button" onClick={() => { liveUrl.current = null; setCandidate(null); setError(""); inputRef.current?.click(); }}>Choose another video</button>
        {comparison && <button className="button-primary" type="button" onClick={() => {
          if (candidate.metadata && liveUrl.current === candidate.url) {
            onAttach(candidate.file, candidate.metadata);
          }
        }}>{comparison.hasWarning ? "Use this video anyway" : "Continue analysis"}</button>}
        <button type="button" onClick={() => { liveUrl.current = null; setCandidate(null); setError(""); }}>Cancel</button>
      </div>
    </>}
  </div>;
}
