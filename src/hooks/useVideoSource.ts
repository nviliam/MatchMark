import { useEffect, useRef, useState } from "react";
import type { SessionVideoMetadata } from "../types/session";
import { isSupportedVideoFile, VIDEO_FORMAT_ERROR } from "../utils/video";

type ActiveVideo = {
  file: File;
  url: string;
  metadata: SessionVideoMetadata;
  ready: boolean;
  reattachmentMetadata: SessionVideoMetadata | null;
};
type CandidateVideo = { file: File; url: string; metadata: SessionVideoMetadata | null };
type SourceResult = { ok: true } | { ok: false; error: string };

function fileMetadata(file: File, duration: number | null): SessionVideoMetadata {
  return { fileName: file.name, fileSize: Number.isFinite(file.size) ? file.size : null, duration };
}

// Each instance owns only its own URLs. The workspace and probe use separate instances,
// so accepting a probe creates a separate active URL rather than transferring ownership.
export function useVideoSource() {
  const [active, setActive] = useState<ActiveVideo | null>(null);
  const [candidate, setCandidate] = useState<CandidateVideo | null>(null);
  const [importedVideo, setImportedVideo] = useState<SessionVideoMetadata | null>(null);
  const ownedUrls = useRef(new Set<string>());
  const lifecycle = useRef<{ candidateUrl: string | null }>({ candidateUrl: null });

  useEffect(() => {
    // Release after the DOM has stopped using replaced/discarded sources. Tracking all
    // allocations also covers multiple selections batched before a render commits.
    for (const url of ownedUrls.current) {
      if (url !== active?.url && url !== candidate?.url) {
        URL.revokeObjectURL(url);
        ownedUrls.current.delete(url);
      }
    }
  });

  useEffect(() => {
    const urls = ownedUrls.current;
    const live = lifecycle.current;
    return () => {
      live.candidateUrl = null;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function createUrl(file: File): string {
    const url = URL.createObjectURL(file);
    ownedUrls.current.add(url);
    return url;
  }

  function selectNewVideo(file: File, beforeActivate: () => void): SourceResult {
    if (!isSupportedVideoFile(file)) return { ok: false, error: VIDEO_FORMAT_ERROR };
    let url: string;
    try { url = createUrl(file); }
    catch { return { ok: false, error: "This video could not be opened. Your current session has been kept. Please try again." }; }
    // The caller resets its workflow only after allocation succeeds, before activation.
    beforeActivate();
    setActive({ file, url, metadata: fileMetadata(file, null), ready: false, reattachmentMetadata: null });
    return { ok: true };
  }

  function acceptReattachment(file: File, metadata: SessionVideoMetadata): SourceResult {
    let url: string;
    try { url = createUrl(file); }
    catch { return { ok: false, error: "This video could not be attached. Your imported session has been kept. Please try again." }; }
    setActive({ file, url, metadata: { ...metadata }, ready: false, reattachmentMetadata: { ...metadata } });
    return { ok: true };
  }

  function markActiveReady(duration: number | null): void {
    setActive(current => current ? { ...current, ready: true, metadata: { ...current.metadata, duration } } : current);
    setImportedVideo(null);
  }

  function clearActiveVideo(): void {
    setActive(null);
  }

  function detachForImport(metadata: SessionVideoMetadata): void {
    clearActiveVideo();
    setImportedVideo({ ...metadata });
  }

  function handleActiveError(): boolean {
    // Retry against the accepted probe metadata, even if active playback reports a different duration.
    const restored = importedVideo ?? active?.reattachmentMetadata ?? null;
    if (restored) setImportedVideo(restored);
    clearActiveVideo();
    return restored !== null;
  }

  function discardCandidate(): void {
    lifecycle.current.candidateUrl = null;
    setCandidate(null);
  }

  function prepareReattachment(file: File): SourceResult {
    discardCandidate();
    if (!isSupportedVideoFile(file)) return { ok: false, error: VIDEO_FORMAT_ERROR };
    try {
      const url = createUrl(file);
      lifecycle.current.candidateUrl = url;
      setCandidate({ file, url, metadata: null });
      return { ok: true };
    } catch {
      return { ok: false, error: "This video could not be opened. Please choose it again. Your session has been kept." };
    }
  }

  function isCurrentCandidate(url: string): boolean {
    return lifecycle.current.candidateUrl === url;
  }

  function recordCandidateMetadata(url: string, duration: number): void {
    if (!isCurrentCandidate(url)) return;
    setCandidate(current => current?.url === url ? { ...current, metadata: fileMetadata(current.file, duration) } : current);
  }

  return {
    active, candidate, importedVideo, selectNewVideo, acceptReattachment, markActiveReady,
    clearActiveVideo, detachForImport, handleActiveError, prepareReattachment, discardCandidate,
    isCurrentCandidate, recordCandidateMetadata,
  };
}
