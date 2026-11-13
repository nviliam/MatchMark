import { useEffect, type RefObject } from "react";
import { findEventShortcut, type EventShortcuts } from "../config/eventShortcuts";
import type { EventType } from "../types/event";

const QUICK_SEEK_OFFSETS: Readonly<Record<string, number>> = {
  Digit2: 1.2,
  Digit3: 1.5,
  Digit4: 2,
};

type Options = {
  shortcuts: EventShortcuts;
  eventShortcutsEnabled: boolean;
  quickSeekEnabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onEventShortcut: (type: EventType) => void;
};

function shouldIgnoreKeyDown(event: KeyboardEvent): boolean {
  if (event.repeat || event.defaultPrevented || event.isComposing
    || event.ctrlKey || event.altKey || event.metaKey) return true;
  const target = event.target;
  return target instanceof HTMLElement
    && (target.closest("input, textarea, select") !== null || target.isContentEditable);
}

export function useAnalysisShortcuts({ shortcuts, eventShortcutsEnabled, quickSeekEnabled, videoRef, onEventShortcut }: Options): void {
  useEffect(() => {
    if (!eventShortcutsEnabled) return;
    function handleEventKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyDown(event)) return;
      // Reserve physical number keys for Quick Seek, including shifted variants.
      if (Object.hasOwn(QUICK_SEEK_OFFSETS, event.code)) return;
      const type = findEventShortcut(shortcuts, event.key);
      if (!type) return;
      event.preventDefault();
      onEventShortcut(type);
    }
    window.addEventListener("keydown", handleEventKeyDown);
    return () => window.removeEventListener("keydown", handleEventKeyDown);
  }, [eventShortcutsEnabled, shortcuts, onEventShortcut]);

  useEffect(() => {
    if (!quickSeekEnabled) return;
    function handleQuickSeekKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyDown(event)) return;
      const jumpAmount = QUICK_SEEK_OFFSETS[event.code];
      const video = videoRef.current;
      if (typeof jumpAmount !== "number" || !video || video.error
        || !Number.isFinite(video.duration)) return;
      event.preventDefault();
      const offset = event.shiftKey ? -jumpAmount : jumpAmount;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + offset));
    }
    window.addEventListener("keydown", handleQuickSeekKeyDown);
    return () => window.removeEventListener("keydown", handleQuickSeekKeyDown);
  }, [quickSeekEnabled, videoRef]);
}
