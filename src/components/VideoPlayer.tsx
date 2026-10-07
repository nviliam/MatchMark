import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { EventDetails, EventType, MatchEvent, PendingEvent } from "../types/event";
import EventButtons from "./EventButtons";
import EventForm from "./EventForm";
import EventList from "./EventList";

const seekShortcuts: Readonly<Record<string, number>> = {
  Digit2: 1.2,
  Digit3: 1.5,
  Digit4: 2,
};

type Props = {
  isAnalysisActive: boolean;
  onAnalysisActiveChange: (active: boolean) => void;
};

function VideoPlayer({ isAnalysisActive, onAnalysisActiveChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [pending, setPending] = useState<PendingEvent | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const resumeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (resumeTime === null) return;
    if (isAnalysisActive) videoRef.current?.focus();
    else resumeButtonRef.current?.focus();
  }, [isAnalysisActive, resumeTime]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!videoUrl || !isVideoReady || !isAnalysisActive) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.defaultPrevented || event.isComposing
        || event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target;
      if (target instanceof HTMLElement
        && (target.closest("input, textarea, select") || target.isContentEditable)) return;

      const jumpAmount = seekShortcuts[event.code];
      const video = videoRef.current;
      if (typeof jumpAmount !== "number" || !video || video.error
        || !Number.isFinite(video.duration)) return;

      event.preventDefault();
      const offset = event.shiftKey ? -jumpAmount : jumpAmount;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + offset));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videoUrl, isVideoReady, isAnalysisActive]);

  function handleExit() {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;
    video.pause();
    setResumeTime(video.currentTime);
    onAnalysisActiveChange(false);
  }

  function handleResume() {
    const video = videoRef.current;
    if (!video || !isVideoReady || resumeTime === null) return;
    video.pause();
    video.currentTime = resumeTime;
    setError("");
    onAnalysisActiveChange(true);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    // Allow selecting the same file again after a playback failure.
    event.currentTarget.value = "";
    const isSupportedContainer = file.type === "video/mp4" || file.type === "video/webm"
      || /\.(mp4|webm)$/i.test(file.name);
    if (!isSupportedContainer) {
      setError("Please select an MP4 or WebM video. Recommended format: MP4 (H.264).");
      return;
    }
    setError("");
    setEvents([]);
    setPending(null);
    setIsVideoReady(false);
    setResumeTime(null);
    onAnalysisActiveChange(false);
    setVideoName(file.name);
    setVideoUrl(URL.createObjectURL(file));
  }

  function handleVideoError() {
    setIsVideoReady(false);
    setResumeTime(null);
    onAnalysisActiveChange(false);
    setVideoUrl(null);
    setVideoName("");
    setEvents([]);
    setPending(null);
    setError("This video format or codec is not supported by your browser. For best compatibility, use an MP4 video encoded with H.264.");
  }

  function handleEvent(type: EventType) {
    const video = videoRef.current;
    if (!video || !isVideoReady || !isAnalysisActive || pending) return;
    setPending({ type, timestamp: video.currentTime });
  }

  function handleSave(playerId: number, details: EventDetails) {
    if (!pending || !isVideoReady || !isAnalysisActive || pending.type !== details.type) return;
    const timestamp = pending.timestamp;
    setEvents((previousEvents) => [
      ...previousEvents,
      { ...details, id: previousEvents.length + 1, playerId, timestamp },
    ]);
    setPending(null);
  }

  function seekToEvent(timestamp: number) {
    const video = videoRef.current;
    if (!video || !isVideoReady || !isAnalysisActive) return;
    video.currentTime = timestamp;
  }

  return (
    <section className="video-player" aria-label="Video player">
      {!isAnalysisActive && <div className={videoUrl ? "video-picker panel video-picker-compact" : "video-picker panel"}>
        <div className="video-picker-copy">
          <p className="eyebrow">{videoUrl ? "Match video" : "Start your analysis"}</p>
          <h2>{videoUrl ? videoName : "Select match video"}</h2>
          <p>{videoUrl ? "Your video stays on your device." : "Choose a local video file to start tagging."}</p>
          <p className="privacy-note" id="video-format-hint">Recommended format: MP4 (H.264)</p>
        </div>
        <div className="video-picker-actions">
          {videoUrl && isVideoReady && resumeTime !== null && (
            <button ref={resumeButtonRef} className="button-primary" type="button" onClick={handleResume}>
              Resume analysis
            </button>
          )}
          <label className={resumeTime !== null ? "file-button" : "file-button button-primary"}>
            <span>{videoUrl ? "Change video" : "Choose video"}</span>
            <input type="file" accept=".mp4,.webm,video/mp4,video/webm" aria-describedby="video-format-hint"
              aria-label={videoUrl ? "Change video" : "Choose video"} onChange={handleFileChange} />
          </label>
        </div>
        {!videoUrl && <p className="privacy-note">Your video stays on your device. It is never uploaded.</p>}
      </div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {videoUrl && (
        <>
          {/* Keep video and EventForm mounted while suspended so their state survives Exit. */}
          <div className="tagging-workspace" hidden={!isAnalysisActive}>
            <EventButtons disabled={!isVideoReady || !isAnalysisActive || pending !== null}
              onSelect={handleEvent} onExit={handleExit} />
            <div className="video-stage">
              <video key={videoUrl} ref={videoRef} src={videoUrl}
                onLoadedMetadata={() => {
                  if (!isVideoReady) {
                    setIsVideoReady(true);
                    onAnalysisActiveChange(true);
                  }
                }}
                onError={handleVideoError}
                onRateChange={(event) => {
                  if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1;
                }}
                controls playsInline preload="metadata" tabIndex={0} aria-label="Selected video">
                Your browser does not support video playback.
              </video>
            </div>
            <div className="bottom-rail">
              {pending && (
                <EventForm pending={pending} disabled={!isVideoReady || !isAnalysisActive}
                  onSave={handleSave} onCancel={() => setPending(null)} />
              )}
            </div>
          </div>
          {/* Preserve the existing seek binding without a visible history UI.
              The complete history remains in events, not this three-item view. */}
          <div hidden>
            <EventList events={events.slice(-3).reverse()} disabled={!isVideoReady || !isAnalysisActive} onSeek={seekToEvent} />
          </div>
        </>
      )}
    </section>
  );
}

export default VideoPlayer;
