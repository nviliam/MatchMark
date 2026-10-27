export type BaseEvent = {
  id: number;
  playerId: number;
  timestamp: number;
};

export type ShotOutcome = "goal" | "on-target" | "off-target" | "blocked";
export type BodyPart = "foot" | "head" | "other";
export type ShotEvent = BaseEvent & { type: "shot"; outcome: ShotOutcome; bodyPart: BodyPart };
export type PassEvent = BaseEvent & { type: "pass"; outcome: "completed" | "incomplete" };
export type KeyPassEvent = BaseEvent & { type: "key-pass" };
export type DribbleEvent = BaseEvent & { type: "dribble"; outcome: "successful" | "unsuccessful" };
export type ProgressiveCarryEvent = BaseEvent & { type: "progressive-carry" };
export type TackleEvent = BaseEvent & { type: "tackle"; outcome: "won" | "lost" };
export type InterceptionEvent = BaseEvent & { type: "interception" };
export type BallRecoveryEvent = BaseEvent & { type: "ball-recovery" };
export type DuelEvent = BaseEvent & { type: "duel"; outcome: "won" | "lost" };
export type BallLossEvent = BaseEvent & { type: "ball-loss" };
export type CustomEvent = Omit<BaseEvent, "playerId"> & {
  type: "custom";
  description: string;
  playerId?: number;
};

export type MatchEvent =
  | ShotEvent | PassEvent | KeyPassEvent | DribbleEvent | ProgressiveCarryEvent
  | TackleEvent | InterceptionEvent | BallRecoveryEvent | DuelEvent | BallLossEvent | CustomEvent;

export type EventType = MatchEvent["type"];
// Distribute Omit over the union to preserve each event's required fields.
export type EventDetails = MatchEvent extends infer Event
  ? Event extends MatchEvent ? Omit<Event, keyof BaseEvent> : never
  : never;
export type PendingEvent = { type: EventType; timestamp: number };
