import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { EventDetails, EventType, MatchEvent, PendingEvent } from "../types/event";
import EventButtons from "./EventButtons";
import EventForm from "./EventForm";
import EventList from "./EventList";

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [pending, setPending] = useState<PendingEvent | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

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
    setVideoName(file.name);
    setVideoUrl(URL.createObjectURL(file));
  }

  function handleVideoError() {
    setIsVideoReady(false);
    setVideoUrl(null);
    setVideoName("");
    setEvents([]);
    setPending(null);
    setError("This video format or codec is not supported by your browser. For best compatibility, use an MP4 video encoded with H.264.");
  }

  function handleEvent(type: EventType) {
    const video = videoRef.current;
    if (!video || !isVideoReady || pending) return;
    setPending({ type, timestamp: video.currentTime });
  }

  function handleSave(playerId: number, details: EventDetails) {
    if (!pending || !isVideoReady || pending.type !== details.type) return;
    const timestamp = pending.timestamp;
    setEvents((previousEvents) => [
      ...previousEvents,
      { ...details, id: previousEvents.length + 1, playerId, timestamp },
    ]);
    setPending(null);
  }

  function seekToEvent(timestamp: number) {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;
    video.currentTime = timestamp;
  }

  return (
    <section className="video-player" aria-label="Video player">
      <div className={videoUrl ? "video-picker panel video-picker-compact" : "video-picker panel"}>
        <div className="video-picker-copy">
          <p className="eyebrow">{videoUrl ? "Match video" : "Start your analysis"}</p>
          <h2>{videoUrl ? videoName : "Select match video"}</h2>
          <p>{videoUrl ? "Your video stays on your device." : "Choose a local video file to start tagging."}</p>
          <p className="privacy-note" id="video-format-hint">Recommended format: MP4 (H.264)</p>
        </div>
        <label className="file-button button-primary">
          <span>{videoUrl ? "Change video" : "Choose video"}</span>
          <input type="file" accept=".mp4,.webm,video/mp4,video/webm" aria-describedby="video-format-hint"
            aria-label={videoUrl ? "Change video" : "Choose video"} onChange={handleFileChange} />
        </label>
        {!videoUrl && <p className="privacy-note">Your video stays on your device. It is never uploaded.</p>}
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {videoUrl && (
        <video key={videoUrl} ref={videoRef} src={videoUrl}
          onLoadedMetadata={() => setIsVideoReady(true)}
          onError={handleVideoError}
          controls playsInline preload="metadata" aria-label="Selected video">
          Your browser does not support video playback.
        </video>
      )}
      {videoUrl && (
        <div className="tagging-workspace">
          <div className="tagging-controls">
            <section className="panel" aria-labelledby="tagging-title">
              <div className="panel-heading">
                <h2 id="tagging-title">Tag an event</h2>
                <p>Select an action to mark its moment in the match.</p>
              </div>
              <EventButtons disabled={!isVideoReady || pending !== null} onSelect={handleEvent} />
            </section>
            {pending && (
              <EventForm pending={pending} disabled={!isVideoReady}
                onSave={handleSave} onCancel={() => setPending(null)} />
            )}
          </div>
          <section className="panel history-panel" aria-labelledby="history-title">
            <div className="history-heading">
              <h2 id="history-title">Event history</h2>
              <span className="event-count" aria-label={`${events.length} recorded events`}>{events.length}</span>
            </div>
            {events.length === 0 ? (
              <p className="history-empty">No events yet. Tag an action and save its details to build your match history.</p>
            ) : (
              <>
                <p className="history-hint">Select an event to return to that moment.</p>
                <EventList events={events} disabled={!isVideoReady} onSeek={seekToEvent} />
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export default VideoPlayer;
