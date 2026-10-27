import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { EventDetails, EventType, MatchEvent, PendingEvent } from "../types/event";
import { DEFAULT_EVENT_FILTERS, getFilteredEvents, type EventFilters } from "../utils/eventFiltering";
import { REVIEW_LEAD_IN_SECONDS } from "../config/review";
import { getReviewSeekTime } from "../utils/review";
import { DEFAULT_PLAYERS } from "../data/players";
import type { Player } from "../types/player";
import { appendPlayer, removePlayer, updatePlayer, validatePlayerInput } from "../utils/roster";
import PlayersPanel from "./PlayersPanel";
import EventButtons from "./EventButtons";
import EventForm from "./EventForm";
import EventsPanel from "./EventsPanel";
import ShortcutSettings from "./ShortcutSettings";
import SavedEventSummary from "./SavedEventSummary";
import DeleteEventConfirmation from "./DeleteEventConfirmation";
import ReviewControls from "./ReviewControls";
import { findEventShortcut, type EventShortcuts } from "../config/eventShortcuts";
import { createMatchEvent } from "../utils/events";

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
  const [overlay, setOverlay] = useState<"events" | "settings" | "players" | null>(null);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_EVENT_FILTERS);
  const filteredEvents = useMemo(() => getFilteredEvents(events, filters), [events, filters]);
  // Review owns an index only; the existing filtered list remains its source of truth.
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>(() => DEFAULT_PLAYERS.map((player) => ({ ...player })));
  // Session allocator: deleting players or changing videos must never reuse IDs.
  const nextPlayerId = useRef(DEFAULT_PLAYERS.reduce((highest, player) => Math.max(highest, player.id), 0) + 1);
  const isReviewMode = reviewIndex !== null;
  const currentReviewEvent = reviewIndex !== null ? filteredEvents[reviewIndex] : undefined;
  const isEventsOpen = overlay === "events";
  const isSettingsOpen = overlay === "settings";
  const isPlayersOpen = overlay === "players";
  const savedEvent = showSavedEvent ? events.at(-1) : undefined;
  const resumeButtonRef = useRef<HTMLButtonElement | null>(null);
  const eventsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const playersButtonRef = useRef<HTMLButtonElement | null>(null);
  const workflowDisabled = !videoUrl || !isVideoReady || !isAnalysisActive
    || pending !== null || pendingDeleteId !== null;
  // Guarded adjustment for external list/session changes: discard an invalid Review
  // before committing its UI, rather than scheduling a second render from an effect.
  if (reviewIndex !== null && (!currentReviewEvent || workflowDisabled)) {
    setReviewIndex(null);
  }
  const eventsDisabled = workflowDisabled || isReviewMode;
  const eventActionsDisabled = eventsDisabled || overlay !== null;

  const seekVideo = useCallback((timestamp: number) => {
    const video = videoRef.current;
    if (!video || workflowDisabled) return;
    video.currentTime = timestamp;
  }, [workflowDisabled]);

  const handleExitReview = useCallback(() => {
    setReviewIndex(null);
    videoRef.current?.focus();
  }, []);

  useEffect(() => {
    if (currentReviewEvent) seekVideo(getReviewSeekTime(currentReviewEvent.timestamp, REVIEW_LEAD_IN_SECONDS));
  }, [reviewIndex, currentReviewEvent, seekVideo]);

  function handleStartReview() {
    if (eventsDisabled || !isEventsOpen || filteredEvents.length === 0) return;
    setReviewIndex(0);
    setOverlay(null);
  }

  function handleReviewStep(direction: -1 | 1) {
    if (reviewIndex === null || workflowDisabled) return;
    const nextIndex = reviewIndex + direction;
    if (nextIndex < 0 || nextIndex >= filteredEvents.length) return;
    setReviewIndex(nextIndex);
  }

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

  function handleOpenPlayers() {
    if (eventsDisabled) return;
    setOverlay("players");
  }

  const handleClosePlayers = useCallback(() => {
    setOverlay(null);
    playersButtonRef.current?.focus();
  }, []);

  function handleAddPlayer(name: string, number: string): boolean {
    if (eventsDisabled || !isPlayersOpen) return false;
    const result = validatePlayerInput(name, number);
    if (!result.ok) return false;
    // Allocate outside the updater so React can replay the pure update safely.
    const id = nextPlayerId.current++;
    setPlayers((currentPlayers) => appendPlayer(currentPlayers, result.value, id));
    return true;
  }

  function handleUpdatePlayer(id: Player["id"], name: string, number: string): boolean {
    if (eventsDisabled || !isPlayersOpen || !players.some((player) => player.id === id)) return false;
    const result = validatePlayerInput(name, number);
    if (!result.ok) return false;
    setPlayers((currentPlayers) => updatePlayer(currentPlayers, id, result.value));
    return true;
  }

  function handleDeletePlayer(id: Player["id"]): boolean {
    if (eventsDisabled || !isPlayersOpen || !players.some((player) => player.id === id)) return false;
    setPlayers((currentPlayers) => removePlayer(currentPlayers, id));
    setFilters((current) => current.playerId === id ? { ...current, playerId: "all" } : current);
    return true;
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
    if ((!pending && pendingDeleteId === null && overlay === null && !isReviewMode) || !isAnalysisActive) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat || event.isComposing || event.defaultPrevented
        || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      // Shortcut capture consumes Escape in its capture listener before this handler.
      if (pending || pendingDeleteId !== null) handleCancel();
      else if (isReviewMode) handleExitReview();
      else if (isSettingsOpen) handleCloseSettings();
      else if (isPlayersOpen) handleClosePlayers();
      else handleCloseEvents();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [pending, pendingDeleteId, overlay, isSettingsOpen, isAnalysisActive, isReviewMode,
    handleCancel, handleCloseEvents, handleCloseSettings, handleExitReview, isPlayersOpen, handleClosePlayers]);

  function handleExit() {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;
    video.pause();
    setResumeTime(video.currentTime);
    setReviewIndex(null);
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

  function resetEventFilters() {
    setFilters(DEFAULT_EVENT_FILTERS);
    setReviewIndex(null);
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
    resetEventFilters();
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
    resetEventFilters();
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
      || pending || !isVideoReady || !isAnalysisActive || isReviewMode) return;
    setEvents((previousEvents) => previousEvents.filter((event) => event.id !== pendingDeleteId));
    setPendingDeleteId(null);
    videoRef.current?.focus();
  }

  function handleSave(playerId: number | undefined, details: EventDetails) {
    if (!pending || !isVideoReady || !isAnalysisActive || isReviewMode || pending.type !== details.type) return;
    if (playerId !== undefined && !players.some((player) => player.id === playerId)) return;
    const saved = createMatchEvent(details, {
      id: pending.mode === "edit" ? pending.original.id : events.length + 1,
      timestamp: pending.timestamp,
    }, playerId);
    if (!saved) return;
    if (pending.mode === "edit") {
      const editedId = pending.original.id;
      setEvents((previousEvents) => previousEvents.map((event) => event.id === editedId
        ? saved
        : event));
    } else {
      setEvents((previousEvents) => [
        ...previousEvents,
        saved,
      ]);
    }
    setShowSavedEvent(true);
    setPending(null);
    videoRef.current?.focus();
  }

  function seekToEvent(timestamp: number) {
    const video = videoRef.current;
    if (!video || eventsDisabled) return;
    seekVideo(timestamp);
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
          <div className={`tagging-workspace${isReviewMode ? " tagging-workspace-review" : ""}`} hidden={!isAnalysisActive}>
            {!isReviewMode && <EventButtons disabled={eventActionsDisabled} shortcuts={eventShortcuts}
              onSelect={handleEvent} onExit={handleExit} onOpenEvents={handleOpenEvents}
              eventsDisabled={eventsDisabled} isEventsOpen={isEventsOpen} eventsButtonRef={eventsButtonRef}
              onOpenSettings={handleOpenSettings} isSettingsOpen={isSettingsOpen} settingsButtonRef={settingsButtonRef}
              onOpenPlayers={handleOpenPlayers} isPlayersOpen={isPlayersOpen} playersButtonRef={playersButtonRef} />}
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
                  selectedEventType={filters.eventType}
                  onEventTypeChange={(eventType) => {
                    if (!eventsDisabled) setFilters((previous) => ({ ...previous, eventType }));
                  }}
                  players={players} selectedPlayerId={filters.playerId}
                  onPlayerChange={(playerId) => {
                    if (!eventsDisabled) setFilters((previous) => ({ ...previous, playerId }));
                  }}
                  onClose={handleCloseEvents} onSeek={seekToEvent} onStartReview={handleStartReview} />
              )}
              {isSettingsOpen && isAnalysisActive && (
                <ShortcutSettings shortcuts={eventShortcuts} onChange={onEventShortcutsChange} onClose={handleCloseSettings} />
              )}
              {isPlayersOpen && isAnalysisActive && (
                <PlayersPanel players={players} events={events} onAdd={handleAddPlayer} onUpdate={handleUpdatePlayer}
                  onDelete={handleDeletePlayer} onClose={handleClosePlayers} />
              )}
            </div>
            <div className="bottom-rail">
              {isReviewMode && currentReviewEvent && (
                <ReviewControls players={players} event={currentReviewEvent} index={reviewIndex} total={filteredEvents.length}
                  onPrevious={() => handleReviewStep(-1)} onNext={() => handleReviewStep(1)}
                  onExit={handleExitReview} />
              )}
              {!isReviewMode && !pending && savedEvent && (pendingDeleteId !== null ? (
                <DeleteEventConfirmation event={savedEvent} disabled={!isVideoReady || !isAnalysisActive}
                  onCancel={handleCancel} onConfirm={handleConfirmDelete} />
              ) : (
                <SavedEventSummary players={players} event={savedEvent} onEdit={handleEdit} onDelete={handleRequestDelete}
                  disabled={eventActionsDisabled} />
              ))}
              {pending && (
                <EventForm players={players} pending={pending} initialEvent={pending.mode === "edit" ? pending.original : undefined} disabled={!isVideoReady || !isAnalysisActive}
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
