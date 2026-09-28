import type { EventType } from "../types/event";
import { eventLabels } from "../utils/events";

const groups: { label: string; types: EventType[] }[] = [
  { label: "Attacking", types: ["pass", "key-pass", "dribble", "progressive-carry", "shot"] },
  { label: "Defending", types: ["tackle", "interception", "ball-recovery", "duel"] },
  { label: "Other", types: ["ball-loss"] },
];

type Props = { disabled: boolean; onSelect: (type: EventType) => void };

export default function EventButtons({ disabled, onSelect }: Props) {
  return (
    <div className="event-groups">
      {groups.map((group) => (
        <fieldset key={group.label} disabled={disabled}>
          <legend>{group.label}</legend>
          <div className="event-buttons">
            {group.types.map((type) => (
              <button key={type} type="button" onClick={() => onSelect(type)}>
                {eventLabels[type]}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
