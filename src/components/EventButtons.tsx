import type { EventType } from "../types/event";
import { eventLabels } from "../utils/events";

const rails: { position: string; types: EventType[] }[] = [
  { position: "top", types: ["pass", "key-pass", "shot", "duel", "ball-loss"] },
  { position: "left", types: ["dribble", "progressive-carry"] },
  { position: "right", types: ["tackle", "interception", "ball-recovery"] },
];

type Props = { disabled: boolean; onSelect: (type: EventType) => void; onExit: () => void };

export default function EventButtons({ disabled, onSelect, onExit }: Props) {
  return (
    <>
      {rails.map((rail) => (
        <div className={`action-rail action-rail-${rail.position}`} role="group"
          aria-label={`${rail.position} actions`} key={rail.position}>
          {rail.types.map((type) => (
            <div className="action-slot" key={type}>
              <button type="button" disabled={disabled} onClick={() => onSelect(type)}>
                {eventLabels[type]}
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
