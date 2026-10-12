import type { EventType } from "../types/event";
import type { EventShortcuts } from "../config/eventShortcuts";
import { eventLabels } from "../utils/events";

const rails: { position: string; types: EventType[] }[] = [
  { position: "top", types: ["pass", "key-pass", "shot", "duel", "ball-loss"] },
  { position: "left", types: ["dribble", "progressive-carry"] },
  { position: "right", types: ["tackle", "interception", "ball-recovery"] },
];

type Props = { disabled: boolean; shortcuts: EventShortcuts; onSelect: (type: EventType) => void; onExit: () => void };

export default function EventButtons({ disabled, shortcuts, onSelect, onExit }: Props) {
  return (
    <>
      {rails.map((rail) => (
        <div className={`action-rail action-rail-${rail.position}`} role="group"
          aria-label={`${rail.position} actions`} key={rail.position}>
          {rail.types.map((type) => (
            <div className="action-slot" key={type}>
              <button className="event-action" type="button" disabled={disabled}
                aria-keyshortcuts={shortcuts[type]} onClick={() => onSelect(type)}>
                <span className="event-action-label">{eventLabels[type]}</span>
                <kbd className="shortcut-badge" aria-hidden="true">{shortcuts[type].toUpperCase()}</kbd>
              </button>
            </div>
          ))}
          {rail.position === "top" && (
            <button className="analysis-exit" type="button" onClick={onExit}>Exit</button>
          )}
        </div>
      ))}
    </>
  );
}
