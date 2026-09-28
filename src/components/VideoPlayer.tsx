import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { BodyPart, ShotEvent, ShotOutcome } from "../types/shot";

const outcomeLabels: Record<ShotOutcome, string> = {
  goal: "Gól",
  "on-target": "Kaput talál",
  "off-target": "Kaput elkerüli",
  blocked: "Blokkolt",
};

const bodyPartLabels: Record<BodyPart, string> = {
  foot: "Láb",
  head: "Fej",
  other: "Egyéb",
};

const outcomes: ShotOutcome[] = ["goal", "on-target", "off-target", "blocked"];
const bodyParts: BodyPart[] = ["foot", "head", "other"];

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
  const [events, setEvents] = useState<ShotEvent[]>([]);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<ShotOutcome | null>(null);
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
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
    resetShotForm();
    setIsVideoReady(false);
    setVideoUrl(URL.createObjectURL(file));
  }

  function handleShot() {
    const video = videoRef.current;
    if (!video || !isVideoReady || pendingTimestamp !== null) return;

    setPendingTimestamp(video.currentTime);
    setOutcome(null);
    setBodyPart(null);
  }

  function resetShotForm() {
    setPendingTimestamp(null);
    setOutcome(null);
    setBodyPart(null);
  }

  function handleSaveShot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingTimestamp === null || !outcome || !bodyPart || !isVideoReady) return;

    setEvents((previousEvents) => [
      ...previousEvents,
      {
        id: previousEvents.length + 1,
        type: "shot",
        timestamp: pendingTimestamp,
        outcome,
        bodyPart,
      },
    ]);
    resetShotForm();
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
        disabled={!isVideoReady || pendingTimestamp !== null}
      >
        ⚽ Lövés
      </button>
      {pendingTimestamp !== null && (
        <form className="shot-form" onSubmit={handleSaveShot}>
          <h2>Lövés – {formatTimestamp(pendingTimestamp)}</h2>
          <fieldset>
            <legend>A lövés kimenetele</legend>
            {outcomes.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="outcome"
                  checked={outcome === value}
                  onChange={() => setOutcome(value)}
                  required
                />
                {outcomeLabels[value]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Testrész</legend>
            {bodyParts.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="bodyPart"
                  checked={bodyPart === value}
                  onChange={() => setBodyPart(value)}
                  required
                />
                {bodyPartLabels[value]}
              </label>
            ))}
          </fieldset>
          <div className="shot-form-actions">
            <button type="submit" disabled={!outcome || !bodyPart || !isVideoReady}>
              Mentés
            </button>
            <button type="button" onClick={resetShotForm}>Mégse</button>
          </div>
        </form>
      )}
      {events.length > 0 && (
        <ul className="event-list" aria-label="Rögzített lövések">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => seekToEvent(event.timestamp)}
                disabled={!isVideoReady}
              >
                {formatTimestamp(event.timestamp)} – Lövés – {outcomeLabels[event.outcome]} – {bodyPartLabels[event.bodyPart]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default VideoPlayer;
