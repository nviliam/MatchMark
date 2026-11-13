import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { EventDetails, EventType, MatchEvent, PendingEvent } from "../types/event";
import { DEFAULT_EVENT_FILTERS, getFilteredEvents, type EventFilters } from "../utils/eventFiltering";
import { REVIEW_LEAD_IN_SECONDS } from "../config/review";
import { getReviewSeekTime } from "../utils/review";
import type { Player } from "../types/player";
import { useMatchSession } from "../hooks/useMatchSession";
import { useVideoSource } from "../hooks/useVideoSource";
import { useAnalysisShortcuts } from "../hooks/useAnalysisShortcuts";
import PlayersPanel from "./PlayersPanel";
import EventButtons from "./EventButtons";
import EventForm from "./EventForm";
import EventsPanel from "./EventsPanel";
import ShortcutSettings from "./ShortcutSettings";
import SavedEventSummary from "./SavedEventSummary";
import DeleteEventConfirmation from "./DeleteEventConfirmation";
import ReviewControls from "./ReviewControls";
import type { EventShortcuts } from "../config/eventShortcuts";
import VideoPicker from "./VideoPicker";
import { createSessionSnapshot, downloadSession } from "../utils/session";
import type { MatchMarkSession, SessionVideoMetadata } from "../types/session";

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
  const session = useMatchSession();
  const { events, players } = session;
  const source = useVideoSource();
  const { importedVideo } = source;
  const videoUrl = source.active?.url ?? null;
  const videoName = source.active?.metadata.fileName ?? "";
  const isVideoReady = source.active?.ready ?? false;
  const [error, setError] = useState("");
  const [pending, setPending] = useState<EventDraft | null>(null);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showSavedEvent, setShowSavedEvent] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<"events" | "settings" | "players" | null>(null);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_EVENT_FILTERS);
  const filteredEvents = useMemo(() => getFilteredEvents(events, filters), [events, filters]);
  // Review owns an index only; the existing filtered list remains its source of truth.
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [exportError, setExportError] = useState("");
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
    setExportError("");
    setOverlay("settings");
  }

  function handleExportSession() {
    if (!importedVideo && (eventsDisabled || !isSettingsOpen)) return;
    try {
      downloadSession(createSessionSnapshot({
        ...session.getSessionData(), exportedAt: new Date().toISOString(),
        video: importedVideo ?? { fileName: videoName, fileSize: source.active?.metadata.fileSize ?? null, duration: videoRef.current?.duration ?? null },
      }));
      setExportError("");
    } catch {
      setExportError("Session export failed. Please try again. Your current work is unchanged.");
    }
  }

  function handleImportSession(importedSession: MatchMarkSession) {
    if (pending || pendingDeleteId !== null || isReviewMode) return;
    videoRef.current?.pause();
    source.detachForImport(importedSession.video);
    session.applyImportedSession(importedSession);
    setFilters(DEFAULT_EVENT_FILTERS);
    setReviewIndex(null);
    setOverlay(null);
    setPending(null);
    setPendingDeleteId(null);
    setShowSavedEvent(false);
    setResumeTime(null);
    setError("");
    setExportError("");
    onAnalysisActiveChange(false);
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
    return session.addPlayer(name, number);
  }

  function handleUpdatePlayer(id: Player["id"], name: string, number: string): boolean {
    if (eventsDisabled || !isPlayersOpen) return false;
    return session.updatePlayer(id, name, number);
  }

  function handleDeletePlayer(id: Player["id"]): boolean {
    if (eventsDisabled || !isPlayersOpen || !session.deletePlayer(id)) return false;
    setFilters((current) => current.playerId === id ? { ...current, playerId: "all" } : current);
    return true;
  }

  const handleEvent = useCallback((type: EventType) => {
    const video = videoRef.current;
    if (!video || eventActionsDisabled) return;
    setShowSavedEvent(false);
    setPending({ mode: "create", type, timestamp: video.currentTime });
  }, [eventActionsDisabled]);

  useAnalysisShortcuts({
    shortcuts: eventShortcuts,
    eventShortcutsEnabled: !eventActionsDisabled,
    quickSeekEnabled: Boolean(videoUrl && isVideoReady && isAnalysisActive),
    videoRef,
    onEventShortcut: handleEvent,
  });

  useEffect(() => {
    if (resumeTime === null) return;
    if (isAnalysisActive) videoRef.current?.focus();
    else resumeButtonRef.current?.focus();
  }, [isAnalysisActive, resumeTime]);

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
    if (importedVideo) {
      event.currentTarget.value = "";
      setError("Use Reattach video to continue your imported session. Your session has been kept.");
      return;
    }
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    // Allow selecting the same file again after a playback failure.
    event.currentTarget.value = "";
    const result = source.selectNewVideo(file, () => {
      session.resetAnalysisSession(new Date().toISOString());
      resetEventFilters();
      setOverlay(null);
      setPendingDeleteId(null);
      setShowSavedEvent(false);
      setPending(null);
      setResumeTime(null);
      onAnalysisActiveChange(false);
    });
    setError(result.ok ? "" : result.error);
  }

  function handleAttachVideo(file: File, metadata: SessionVideoMetadata) {
    if (!importedVideo || videoUrl) return;
    // Deliberately separate from handleFileChange: no analysis data or allocator resets.
    const result = source.acceptReattachment(file, metadata);
    setError(result.ok ? "" : result.error);
  }

  function handleVideoError() {
    if (source.handleActiveError()) {
      // A failed restored video must never run the normal session-clearing error path.
      setResumeTime(null);
      setOverlay(null);
      setReviewIndex(null);
      onAnalysisActiveChange(false);
      setError("This video could not be played. Your session has been kept. Please reattach a supported video.");
      return;
    }
    resetEventFilters();
    setOverlay(null);
    setResumeTime(null);
    onAnalysisActiveChange(false);
    session.clearEvents();
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
    session.deleteEvent(pendingDeleteId);
    setPendingDeleteId(null);
    videoRef.current?.focus();
  }

  function handleSave(playerId: number | undefined, details: EventDetails) {
    if (!pending || !isVideoReady || !isAnalysisActive || isReviewMode || pending.type !== details.type) return;
    const saved = pending.mode === "edit"
      ? session.updateEvent(pending.original, playerId, details)
      : session.saveEvent(pending.timestamp, playerId, details);
    if (!saved) return;
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
      {!isAnalysisActive && <VideoPicker hasVideo={videoUrl !== null} videoName={videoName}
        canResume={videoUrl !== null && isVideoReady && resumeTime !== null} hasResumeTime={resumeTime !== null}
        importedVideo={importedVideo} events={events} playerCount={players.length} exportError={exportError}
        resumeButtonRef={resumeButtonRef} onSelectVideo={handleFileChange} onResume={handleResume}
        onImportSession={handleImportSession} onReattachVideo={handleAttachVideo} onExportSession={handleExportSession} />}
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
                    if (importedVideo) {
                      if (videoRef.current) {
                        videoRef.current.pause();
                        videoRef.current.currentTime = 0;
                      }
                    }
                    source.markActiveReady(videoRef.current?.duration ?? null);
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
                <ShortcutSettings shortcuts={eventShortcuts} onChange={onEventShortcutsChange} onClose={handleCloseSettings}
                  onExportSession={handleExportSession} exportError={exportError} onImportSession={handleImportSession} />
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
