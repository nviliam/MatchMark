import { useRef, useState, type ChangeEvent } from "react";
import type { MatchEvent } from "../types/event";
import type { SessionVideoMetadata } from "../types/session";
import { compareVideoMetadata } from "../utils/videoReattachment";
import { VIDEO_FILE_ACCEPT } from "../utils/video";
import { useVideoSource } from "../hooks/useVideoSource";

type Props = {
  expected: SessionVideoMetadata;
  events: readonly MatchEvent[];
  onAttach: (file: File, metadata: SessionVideoMetadata) => void;
};

const describe = (value: number | null, unit = "") => value === null ? "unknown" : `${value}${unit}`;

export default function VideoReattachment({ expected, events, onAttach }: Props) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const source = useVideoSource();
  const { candidate } = source;

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const result = source.prepareReattachment(file);
    setError(result.ok ? "" : result.error);
  }

  function metadataFailed() {
    if (!candidate || !source.isCurrentCandidate(candidate.url)) return;
    source.discardCandidate();
    setError("Video metadata could not be read. Please choose another video. Your session has been kept.");
  }

  const metadata = candidate?.metadata;
  const comparison = metadata ? compareVideoMetadata(expected, metadata, events) : null;
  const allMatch = comparison && [comparison.fileName, comparison.fileSize, comparison.duration].every(value => value === "match");
  return <div className="video-reattachment">
    <input ref={inputRef} type="file" accept={VIDEO_FILE_ACCEPT} hidden aria-label="Reattach original video" onChange={selectFile} />
    {!candidate && <button className="button-primary" type="button" onClick={() => inputRef.current?.click()}>Reattach video</button>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {candidate && <>
      <video key={candidate.url} src={candidate.url} preload="metadata" hidden aria-label="Video metadata preview"
        onLoadedMetadata={(event) => {
          if (!source.isCurrentCandidate(candidate.url)) return;
          const duration = event.currentTarget.duration;
          if (!Number.isFinite(duration) || duration < 0) { metadataFailed(); return; }
          source.recordCandidateMetadata(candidate.url, duration);
        }} onError={metadataFailed} />
      {!comparison && <p role="status">Reading video metadata…</p>}
      {comparison && metadata && <section className={comparison.hasWarning ? "video-match-result video-match-warning" : "video-match-result"}
        aria-label="Video comparison" role="status">
        <h3>{comparison.hasWarning ? "This video may not match the imported session."
          : allMatch ? "Video matches the imported session metadata." : "Some video metadata could not be compared."}</h3>
        <p>Metadata is a matching hint and does not prove file identity.</p>
        <dl>
          <dt>File name: {comparison.fileName}</dt><dd>{expected.fileName || "unknown"} → {candidate.metadata?.fileName}</dd>
          <dt>File size: {comparison.fileSize}</dt><dd>{describe(expected.fileSize, " bytes")} → {describe(metadata.fileSize, " bytes")}</dd>
          <dt>Duration: {comparison.duration}</dt><dd>{describe(expected.duration, " s")} → {describe(metadata.duration, " s")}</dd>
        </dl>
        {comparison.eventTimestamps === "mismatch" && <p>This video is shorter than some imported event timestamps. Events will be kept unchanged.</p>}
      </section>}
      <div className="reattachment-actions">
        <button type="button" onClick={() => { source.discardCandidate(); setError(""); inputRef.current?.click(); }}>Choose another video</button>
        {comparison && <button className="button-primary" type="button" onClick={() => {
          if (candidate.metadata && source.isCurrentCandidate(candidate.url)) {
            onAttach(candidate.file, candidate.metadata);
          }
        }}>{comparison.hasWarning ? "Use this video anyway" : "Continue analysis"}</button>}
        <button type="button" onClick={() => { source.discardCandidate(); setError(""); }}>Cancel</button>
      </div>
    </>}
  </div>;
}
