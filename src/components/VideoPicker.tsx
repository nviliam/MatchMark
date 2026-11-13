import type { ChangeEventHandler, Ref } from "react";
import type { MatchEvent } from "../types/event";
import type { MatchMarkSession, SessionVideoMetadata } from "../types/session";
import { VIDEO_FILE_ACCEPT } from "../utils/video";
import HowToUse from "./HowToUse";
import SessionImport from "./SessionImport";
import VideoReattachment from "./VideoReattachment";

type Props = {
  hasVideo: boolean;
  videoName: string;
  canResume: boolean;
  hasResumeTime: boolean;
  importedVideo: SessionVideoMetadata | null;
  events: readonly MatchEvent[];
  playerCount: number;
  exportError: string;
  resumeButtonRef: Ref<HTMLButtonElement>;
  onSelectVideo: ChangeEventHandler<HTMLInputElement>;
  onResume: () => void;
  onImportSession: (session: MatchMarkSession) => void;
  onReattachVideo: (file: File, metadata: SessionVideoMetadata) => void;
  onExportSession: () => void;
};

export default function VideoPicker({ hasVideo, videoName, canResume, hasResumeTime, importedVideo,
  events, playerCount, exportError, resumeButtonRef, onSelectVideo, onResume, onImportSession,
  onReattachVideo, onExportSession }: Props) {
  return (
    <>
      {!hasVideo && <div className="landing-help"><HowToUse /></div>}
      <div className={hasVideo ? "video-picker panel video-picker-compact" : "video-picker panel"}>
        <div className="video-picker-copy">
          <p className="eyebrow">{hasVideo ? "Match video" : ""}</p>
          <h2>{hasVideo ? videoName : importedVideo ? "Continue your imported analysis." : "Choose a local video file to start tagging."}</h2>
          <p>{hasVideo ? "Your video stays on your device." : ""}</p>
          <p className="privacy-note" id="video-format-hint">Recommended format: MP4 (H.264)</p>
        </div>
        <div className="video-picker-actions">
          {canResume && (
            <button ref={resumeButtonRef} className="button-primary" type="button" onClick={onResume}>
              Resume analysis
            </button>
          )}
          {!importedVideo && <label className={hasResumeTime ? "file-button" : "file-button button-primary"}>
            <span>{hasVideo ? "Change video" : "Select video"}</span>
            <input type="file" accept={VIDEO_FILE_ACCEPT} aria-describedby="video-format-hint"
              aria-label={hasVideo ? "Change video" : "Select video"} disabled={importedVideo !== null} onChange={onSelectVideo} />
          </label>}
          {!hasVideo && <SessionImport onImport={onImportSession} />}
        </div>
        {!hasVideo && <p className="privacy-note">Your video stays on your device. It is never uploaded to the cloud.</p>}
        {importedVideo && <div className="session-imported">
          <p>Session imported. Reattach the original video to continue the analysis.</p>
          <p>Expected video: {importedVideo.fileName}.</p>
          <p>{events.length} saved events · {playerCount} players</p>
          {!hasVideo ? <VideoReattachment expected={importedVideo} events={events} onAttach={onReattachVideo} />
            : <p role="status">Opening the attached video…</p>}
          <button type="button" onClick={onExportSession}>Export session</button>
          {exportError && <p className="error-message" role="alert">{exportError}</p>}
        </div>}
      </div>
    </>
  );
}
