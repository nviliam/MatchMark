export type BaseEvent = {
  id: number;
  playerId: number;
  timestamp: number;
};

export type ShotOutcome = "goal" | "on-target" | "off-target" | "blocked";
export type BodyPart = "foot" | "head" | "other";
export type ShotEvent = BaseEvent & { type: "shot"; outcome: ShotOutcome; bodyPart: BodyPart };
export type PassType = "regular" | "key-pass" | "long-ball";
export type GoalkeeperType = "save" | "catch";
export type PassOutcome = "completed" | "incomplete";
export type ControlOutcome = "successful" | "unsuccessful";
export type ContestOutcome = "won" | "lost";
export type PassEvent = BaseEvent & { type: "pass"; subtype: PassType; outcome: PassOutcome };
export type CrossEvent = BaseEvent & { type: "cross"; outcome: PassOutcome };
export type DribbleEvent = BaseEvent & { type: "dribble"; outcome: "successful" | "unsuccessful" };
export type BallControlEvent = BaseEvent & { type: "ball-control"; outcome: ControlOutcome };
export type GoalEvent = BaseEvent & { type: "goal" };
export type ChanceEvent = BaseEvent & { type: "chance" };
export type GoalkeeperEvent = BaseEvent & { type: "goalkeeper"; subtype: GoalkeeperType };
export type ClearanceEvent = BaseEvent & { type: "clearance" };
export type TackleEvent = BaseEvent & { type: "tackle"; outcome: "won" | "lost" };
export type InterceptionEvent = BaseEvent & { type: "interception" };
export type BallRecoveryEvent = BaseEvent & { type: "ball-recovery" };
export type AerialDuelEvent = BaseEvent & { type: "aerial-duel"; outcome: ContestOutcome };
export type BallLossEvent = BaseEvent & { type: "ball-loss" };
export type CustomEvent = Omit<BaseEvent, "playerId"> & {
  type: "custom";
  description: string;
  playerId?: number;
};

export type MatchEvent =
  | ShotEvent | PassEvent | CrossEvent | DribbleEvent | BallControlEvent
  | GoalEvent | ChanceEvent | GoalkeeperEvent | ClearanceEvent
  | TackleEvent | InterceptionEvent | BallRecoveryEvent | AerialDuelEvent | BallLossEvent | CustomEvent;

export type EventType = MatchEvent["type"];
// Distribute Omit over the union to preserve each event's required fields.
export type EventDetails = MatchEvent extends infer Event
  ? Event extends MatchEvent ? Omit<Event, keyof BaseEvent> : never
  : never;
export type PendingEvent = { type: EventType; timestamp: number };
