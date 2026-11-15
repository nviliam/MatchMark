import { useEffect, useRef, useState } from "react";
import type { EventType } from "../types/event";
import {
  DEFAULT_EVENT_SHORTCUTS, EVENT_SHORTCUT_TYPES, findEventShortcut, formatShortcutKey,
  getShortcutKeyError, normalizeShortcutKey, type EventShortcuts,
} from "../config/eventShortcuts";
import { getEventLabel } from "../utils/events";
import PanelCloseIcon from "./PanelCloseIcon";

type Props = {
  shortcuts: EventShortcuts;
  onChange: (shortcuts: EventShortcuts) => void;
  onClose: () => void;
};

export default function ShortcutsPanel({ shortcuts, onChange, onClose }: Props) {
  const [waitingFor, setWaitingFor] = useState<EventType | null>(null);
  const [error, setError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  useEffect(() => {
    if (!waitingFor) return;
    const eventType = waitingFor;

    function captureKey(event: KeyboardEvent) {
      if (event.repeat || event.isComposing || event.defaultPrevented) return;
      if (event.ctrlKey || event.altKey || event.metaKey) {
        setError("Use a single key without Ctrl, Alt or Meta.");
        return;
      }
      // Tab still navigates the panel, but cannot become a shortcut.
      if (event.key === "Tab") {
        setError("Tab cannot be used as an event shortcut.");
        return;
      }
      // Capture before the existing window listeners: the key is configuration only.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        setWaitingFor(null);
        setError("");
        return;
      }

      const keyError = getShortcutKeyError(event.key, event.code);
      if (keyError) {
        setError(keyError);
        return;
      }
      const key = normalizeShortcutKey(event.key);
      const assignedTo = findEventShortcut(shortcuts, key);
      if (assignedTo && assignedTo !== eventType) {
        setError(`${formatShortcutKey(key)} is already assigned to ${getEventLabel(assignedTo)}.`);
        return;
      }
      onChange({ ...shortcuts, [eventType]: key });
      setWaitingFor(null);
      setError("");
    }

    window.addEventListener("keydown", captureKey, true);
    return () => window.removeEventListener("keydown", captureKey, true);
  }, [waitingFor, shortcuts, onChange]);

  function resetDefaults() {
    setWaitingFor(null);
    setError("");
    onChange({ ...DEFAULT_EVENT_SHORTCUTS });
  }

  return (
    <section className="shortcuts-panel" id="shortcuts-panel" role="dialog"
      aria-labelledby="shortcuts-panel-title" aria-describedby="shortcuts-panel-hint">
      <header className="shortcuts-panel-header">
        <h2 id="shortcuts-panel-title">Keyboard shortcuts</h2>
        <button className="panel-close-button" ref={closeButtonRef} type="button" aria-label="Close keyboard shortcuts" onClick={onClose}>
          <PanelCloseIcon />
        </button>
      </header>
      <p className="shortcuts-panel-hint" id="shortcuts-panel-hint">
        Select a shortcut, then press a key. Esc cancels key capture.
      </p>
      <div className="shortcuts-panel-content">
        <ul className="shortcuts-panel-list" aria-label="Event shortcuts">
          {EVENT_SHORTCUT_TYPES.map((type) => (
            <li key={type}>
              <span>{getEventLabel(type)}</span>
              <button type="button" aria-label={`Change ${getEventLabel(type)} shortcut`}
                aria-pressed={waitingFor === type} aria-describedby={waitingFor === type ? "shortcuts-panel-status" : undefined}
                onClick={() => { setWaitingFor(type); setError(""); }}>
                {waitingFor === type ? "Press a key…" : <kbd>{formatShortcutKey(shortcuts[type])}</kbd>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="shortcuts-panel-footer">
        <p id="shortcuts-panel-status" role="status" aria-live="polite">
          {error || (waitingFor ? `Waiting for a key for ${getEventLabel(waitingFor)}.` : "Changes apply immediately.")}
        </p>
        <button type="button" onClick={resetDefaults}>Reset to defaults</button>
      </div>
    </section>
  );
}
