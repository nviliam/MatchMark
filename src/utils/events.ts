import type { BodyPart, EventDetails, EventType } from "../types/event";

export const eventLabels: Record<EventType, string> = {
  shot: "Shot", pass: "Pass", "key-pass": "Key Pass", dribble: "Dribble",
  "progressive-carry": "Progressive Carry", tackle: "Tackle",
  interception: "Interception", "ball-recovery": "Ball Recovery",
  duel: "Duel", "ball-loss": "Ball Loss",
};

export const outcomeLabels = {
  goal: "Goal", "on-target": "On Target", "off-target": "Off Target", blocked: "Blocked",
  completed: "Completed", incomplete: "Incomplete", successful: "Successful",
  unsuccessful: "Unsuccessful", won: "Won", lost: "Lost",
};

export const bodyPartLabels: Record<BodyPart, string> = {
  foot: "Foot", head: "Head", other: "Other",
};

export const outcomeOptions: Record<EventType, (keyof typeof outcomeLabels)[]> = {
  shot: ["goal", "on-target", "off-target", "blocked"],
  pass: ["completed", "incomplete"],
  dribble: ["successful", "unsuccessful"],
  tackle: ["won", "lost"], duel: ["won", "lost"],
  "key-pass": [], "progressive-carry": [], interception: [], "ball-recovery": [], "ball-loss": [],
};

// Validate form values and return only the fields belonging to this event type.
export function createEventDetails(type: EventType, outcome: string, bodyPart: BodyPart | null): EventDetails | null {
  switch (type) {
    case "shot":
      if (bodyPart && (outcome === "goal" || outcome === "on-target" || outcome === "off-target" || outcome === "blocked")) {
        return { type, outcome, bodyPart };
      }
      return null;
    case "pass":
      return outcome === "completed" || outcome === "incomplete" ? { type, outcome } : null;
    case "dribble":
      return outcome === "successful" || outcome === "unsuccessful" ? { type, outcome } : null;
    case "tackle":
    case "duel":
      return outcome === "won" || outcome === "lost" ? { type, outcome } : null;
    case "key-pass":
    case "progressive-carry":
    case "interception":
    case "ball-recovery":
    case "ball-loss":
      return { type };
  }
}

export function formatTimestamp(timestamp: number) {
  const totalSeconds = Math.floor(timestamp);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
