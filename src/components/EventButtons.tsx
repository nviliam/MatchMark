import type { EventType } from "../types/event";
import type { Ref } from "react";
import { formatShortcutKey, normalizeShortcutKey, type EventShortcuts } from "../config/eventShortcuts";
import { eventLabels } from "../utils/events";

const rails: { position: string; types: EventType[] }[] = [
  { position: "top", types: ["pass", "key-pass", "shot", "duel", "ball-loss"] },
  { position: "left", types: ["dribble", "progressive-carry"] },
  { position: "right", types: ["tackle", "interception", "ball-recovery"] },
];

type Props = {
  disabled: boolean;
  shortcuts: EventShortcuts;
  onSelect: (type: EventType) => void;
  onExit: () => void;
  onOpenEvents: () => void;
  eventsDisabled: boolean;
  isEventsOpen: boolean;
  eventsButtonRef: Ref<HTMLButtonElement>;
  onOpenSettings: () => void;
  isSettingsOpen: boolean;
  settingsButtonRef: Ref<HTMLButtonElement>;
};

export default function EventButtons({ disabled, shortcuts, onSelect, onExit,
  onOpenEvents, eventsDisabled, isEventsOpen, eventsButtonRef, onOpenSettings, isSettingsOpen, settingsButtonRef }: Props) {
  return (
    <>
      {rails.map((rail) => (
        <div className={`action-rail action-rail-${rail.position}`} role="group"
          aria-label={`${rail.position} actions`} key={rail.position}>
          {rail.types.map((type) => (
            <div className="action-slot" key={type}>
              <button className="event-action" type="button" disabled={disabled}
                aria-keyshortcuts={normalizeShortcutKey(shortcuts[type])} onClick={() => onSelect(type)}>
                <span className="event-action-label">{eventLabels[type]}</span>
                <kbd className="shortcut-badge" aria-hidden="true">{formatShortcutKey(shortcuts[type])}</kbd>
              </button>
            </div>
          ))}
          {rail.position === "top" && (
            <div className="analysis-controls">
              <button ref={eventsButtonRef} type="button" disabled={eventsDisabled}
                aria-expanded={isEventsOpen} aria-controls={isEventsOpen ? "events-panel" : undefined}
                aria-haspopup="dialog" onClick={onOpenEvents}>Events</button>
              <button ref={settingsButtonRef} type="button" disabled={eventsDisabled}
                aria-expanded={isSettingsOpen} aria-controls={isSettingsOpen ? "shortcut-settings" : undefined}
                aria-haspopup="dialog" onClick={onOpenSettings}>Settings</button>
              <button className="analysis-exit" type="button" onClick={onExit}>Exit</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
