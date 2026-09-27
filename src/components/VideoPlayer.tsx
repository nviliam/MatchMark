import { useEffect, useRef, useState, type ChangeEvent } from "react";

type MatchEvent = {
  id: number;
  type: "shot";
  timestamp: number;
};

function formatTimestamp(timestamp: number) {
  const totalSeconds = Math.floor(timestamp);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<MatchEvent[]>([]);
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
      setError("Kérlek, videófájlt válassz ki!");
      event.currentTarget.value = "";
      return;
    }

    setError("");
    setEvents([]);
    setIsVideoReady(false);
    setVideoUrl(URL.createObjectURL(file));
  }

  function handleShot() {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;

    const timestamp = video.currentTime;
    setEvents((previousEvents) => [
      ...previousEvents,
      { id: previousEvents.length + 1, type: "shot", timestamp },
    ]);
  }

  function seekToEvent(timestamp: number) {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;

    video.currentTime = timestamp;
  }

  return (
    <section className="video-player" aria-label="Videólejátszó">
      <label className="video-picker">
        File feltöltés
        <input type="file" accept="video/*" onChange={handleFileChange} />
      </label>
      <p>A videó a saját gépeden marad, nem töltjük fel szerverre.</p>
      {error && <p role="alert">{error}</p>}
      {videoUrl && (
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={() => setIsVideoReady(true)}
          onError={() => setIsVideoReady(false)}
          controls
          playsInline
          preload="metadata"
          aria-label="Kiválasztott videó"
        >
          A böngésződ nem támogatja a videólejátszást.
        </video>
      )}
      <button
        className="shot-button"
        type="button"
        onClick={handleShot}
        disabled={!isVideoReady}
      >
        ⚽ Lövés
      </button>
      {events.length > 0 && (
        <ul className="event-list" aria-label="Rögzített lövések">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => seekToEvent(event.timestamp)}
                disabled={!isVideoReady}
              >
                {formatTimestamp(event.timestamp)} – Lövés
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default VideoPlayer;
