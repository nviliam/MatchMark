export type ShotOutcome = 'goal' | 'on-target' | 'off-target' | 'blocked';

export type BodyPart = 'foot' | 'head' | 'other';

export type ShotEvent = {
  id: number;
  type: 'shot';
  timestamp: number;
  outcome: ShotOutcome;
  bodyPart: BodyPart;
};
