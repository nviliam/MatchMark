import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { EventDetails, EventType, MatchEvent, PendingEvent } from "../types/event";
import { getFilteredEvents, type EventTypeFilter } from "../utils/eventFiltering";
import EventButtons from "./EventButtons";
import EventForm from "./EventForm";
import EventsPanel from "./EventsPanel";
import ShortcutSettings from "./ShortcutSettings";
import SavedEventSummary from "./SavedEventSummary";
import DeleteEventConfirmation from "./DeleteEventConfirmation";
import { findEventShortcut, type EventShortcuts } from "../config/eventShortcuts";

const seekShortcuts: Readonly<Record<string, number>> = {
  Digit2: 1.2,
  Digit3: 1.5,
  Digit4: 2,
};

type EventDraft = PendingEvent & (
  | { mode: "create" }
  | { mode: "edit"; original: MatchEvent }
);

type Props = {
  eventShortcuts: EventShortcuts;
  onEventShortcutsChange: (shortcuts: EventShortcuts) => void;
  isAnalysisActive: boolean;
  onAnalysisActiveChange: (active: boolean) => void;
};

function VideoPlayer({ isAnalysisActive, onAnalysisActiveChange, eventShortcuts, onEventShortcutsChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [pending, setPending] = useState<EventDraft | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showSavedEvent, setShowSavedEvent] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<"events" | "settings" | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventTypeFilter>("all");
  const filteredEvents = useMemo(() => getFilteredEvents(events, selectedEventType), [events, selectedEventType]);
  const isEventsOpen = overlay === "events";
  const isSettingsOpen = overlay === "settings";
  const savedEvent = showSavedEvent ? events.at(-1) : undefined;
  const resumeButtonRef = useRef<HTMLButtonElement | null>(null);
  const eventsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const eventsDisabled = !videoUrl || !isVideoReady || !isAnalysisActive
    || pending !== null || pendingDeleteId !== null;
  const eventActionsDisabled = eventsDisabled || overlay !== null;

  const handleCloseEvents = useCallback(() => {
    setOverlay(null);
    eventsButtonRef.current?.focus();
  }, []);

  function handleOpenEvents() {
    if (eventsDisabled) return;
    setOverlay("events");
  }

  const handleCloseSettings = useCallback(() => {
    setOverlay(null);
    settingsButtonRef.current?.focus();
  }, []);

  function handleOpenSettings() {
    if (eventsDisabled) return;
    setOverlay("settings");
  }

  const handleEvent = useCallback((type: EventType) => {
    const video = videoRef.current;
    if (!video || eventActionsDisabled) return;
    setShowSavedEvent(false);
    setPending({ mode: "create", type, timestamp: video.currentTime });
  }, [eventActionsDisabled]);

  useEffect(() => {
    if (eventActionsDisabled) return;

    function handleEventKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.defaultPrevented || event.isComposing
        || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement
        && (target.closest("input, textarea, select") || target.isContentEditable)) return;
      // Reserve the physical number keys for Quick Seek, including shifted variants.
      if (Object.hasOwn(seekShortcuts, event.code)) return;
      const type = findEventShortcut(eventShortcuts, event.key);
      if (!type) return;
      event.preventDefault();
      handleEvent(type);
    }

    window.addEventListener("keydown", handleEventKeyDown);
    return () => window.removeEventListener("keydown", handleEventKeyDown);
  }, [eventActionsDisabled, eventShortcuts, handleEvent]);

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

  const handleCancel = useCallback(() => {
    if (pendingDeleteId !== null) {
      setPendingDeleteId(null);
    } else {
      setShowSavedEvent(pending?.mode === "edit");
      setPending(null);
    }
    videoRef.current?.focus();
  }, [pending, pendingDeleteId]);

  useEffect(() => {
    if ((!pending && pendingDeleteId === null && overlay === null) || !isAnalysisActive) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat || event.isComposing || event.defaultPrevented
        || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      if (pending || pendingDeleteId !== null) handleCancel();
      else if (isSettingsOpen) handleCloseSettings();
      else handleCloseEvents();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [pending, pendingDeleteId, overlay, isSettingsOpen, isAnalysisActive, handleCancel, handleCloseEvents, handleCloseSettings]);

  function handleExit() {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;
    video.pause();
    setResumeTime(video.currentTime);
    setOverlay(null);
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
    setSelectedEventType("all");
    setOverlay(null);
    setPendingDeleteId(null);
    setShowSavedEvent(false);
    setPending(null);
    setIsVideoReady(false);
    setResumeTime(null);
    onAnalysisActiveChange(false);
    setVideoName(file.name);
    setVideoUrl(URL.createObjectURL(file));
  }

  function handleVideoError() {
    setSelectedEventType("all");
    setOverlay(null);
    setIsVideoReady(false);
    setResumeTime(null);
    onAnalysisActiveChange(false);
    setVideoUrl(null);
    setVideoName("");
    setEvents([]);
    setPendingDeleteId(null);
    setShowSavedEvent(false);
    setPending(null);
    setError("This video format or codec is not supported by your browser. For best compatibility, use an MP4 video encoded with H.264.");
  }

  function handleEdit() {
    if (!savedEvent || eventActionsDisabled) return;
    setPending({ mode: "edit", type: savedEvent.type, timestamp: savedEvent.timestamp, original: savedEvent });
    setShowSavedEvent(false);
  }

  function handleRequestDelete() {
    if (!savedEvent || eventActionsDisabled) return;
    setPendingDeleteId(savedEvent.id);
  }

  function handleConfirmDelete() {
    if (pendingDeleteId === null || savedEvent?.id !== pendingDeleteId
      || pending || !isVideoReady || !isAnalysisActive) return;
    setEvents((previousEvents) => previousEvents.filter((event) => event.id !== pendingDeleteId));
    setPendingDeleteId(null);
    videoRef.current?.focus();
  }

  function handleSave(playerId: number, details: EventDetails) {
    if (!pending || !isVideoReady || !isAnalysisActive || pending.type !== details.type) return;
    const timestamp = pending.timestamp;
    if (pending.mode === "edit") {
      const editedId = pending.original.id;
      setEvents((previousEvents) => previousEvents.map((event) => event.id === editedId
        ? { ...details, id: event.id, timestamp: event.timestamp, playerId }
        : event));
    } else {
      setEvents((previousEvents) => [
        ...previousEvents,
        { ...details, id: previousEvents.length + 1, playerId, timestamp },
      ]);
    }
    setShowSavedEvent(true);
    setPending(null);
    videoRef.current?.focus();
  }

  function seekToEvent(timestamp: number) {
    const video = videoRef.current;
    if (!video || eventsDisabled) return;
    video.currentTime = timestamp;
    setOverlay(null);
    video.focus();
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
            <EventButtons disabled={eventActionsDisabled} shortcuts={eventShortcuts}
              onSelect={handleEvent} onExit={handleExit} onOpenEvents={handleOpenEvents}
              eventsDisabled={eventsDisabled} isEventsOpen={isEventsOpen} eventsButtonRef={eventsButtonRef}
              onOpenSettings={handleOpenSettings} isSettingsOpen={isSettingsOpen} settingsButtonRef={settingsButtonRef} />
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
              {isEventsOpen && isAnalysisActive && (
                <EventsPanel events={filteredEvents} totalEventCount={events.length}
                  selectedEventType={selectedEventType} onEventTypeChange={setSelectedEventType}
                  onClose={handleCloseEvents} onSeek={seekToEvent} />
              )}
              {isSettingsOpen && isAnalysisActive && (
                <ShortcutSettings shortcuts={eventShortcuts} onChange={onEventShortcutsChange} onClose={handleCloseSettings} />
              )}
            </div>
            <div className="bottom-rail">
              {!pending && savedEvent && (pendingDeleteId !== null ? (
                <DeleteEventConfirmation event={savedEvent} disabled={!isVideoReady || !isAnalysisActive}
                  onCancel={handleCancel} onConfirm={handleConfirmDelete} />
              ) : (
                <SavedEventSummary event={savedEvent} onEdit={handleEdit} onDelete={handleRequestDelete}
                  disabled={eventActionsDisabled} />
              ))}
              {pending && (
                <EventForm pending={pending} initialEvent={pending.mode === "edit" ? pending.original : undefined} disabled={!isVideoReady || !isAnalysisActive}
                  onSave={handleSave} onCancel={handleCancel} />
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default VideoPlayer;
