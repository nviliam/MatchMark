import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { EventDetails, EventType, MatchEvent, PendingEvent } from "../types/event";
import EventButtons from "./EventButtons";
import EventForm from "./EventForm";
import EventList from "./EventList";

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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
    if (!file.type.startsWith("video/")) {
      setError("Please select a video file.");
      event.currentTarget.value = "";
      return;
    }
    setError("");
    setEvents([]);
    setPending(null);
    setIsVideoReady(false);
    setVideoUrl(URL.createObjectURL(file));
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
      <label className="video-picker">
        Choose video
        <input type="file" accept="video/*" onChange={handleFileChange} />
      </label>
      <p>Your video stays on your device. It is never uploaded.</p>
      {error && <p role="alert">{error}</p>}
      {videoUrl && (
        <video key={videoUrl} ref={videoRef} src={videoUrl}
          onLoadedMetadata={() => setIsVideoReady(true)}
          onError={() => {
            setIsVideoReady(false);
            setError("This video could not be played. Please choose a supported video file.");
          }}
          controls playsInline preload="metadata" aria-label="Selected video">
          Your browser does not support video playback.
        </video>
      )}
      <EventButtons disabled={!isVideoReady || pending !== null} onSelect={handleEvent} />
      {pending && (
        <EventForm pending={pending} disabled={!isVideoReady}
          onSave={handleSave} onCancel={() => setPending(null)} />
      )}
      <EventList events={events} disabled={!isVideoReady} onSeek={seekToEvent} />
    </section>
  );
}

export default VideoPlayer;
