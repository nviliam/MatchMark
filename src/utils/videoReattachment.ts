import type { MatchEvent } from "../types/event";
import type { SessionVideoMetadata } from "../types/session";

export const VIDEO_DURATION_TOLERANCE_SECONDS = 0.5;
export type MetadataMatch = "match" | "mismatch" | "unknown";
export type VideoComparison = {
  fileName: MetadataMatch;
  fileSize: MetadataMatch;
  duration: MetadataMatch;
  eventTimestamps: MetadataMatch;
  maxEventTimestamp: number;
  hasWarning: boolean;
};

const validNumber = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;

export function getMaxEventTimestamp(events: readonly MatchEvent[]): number {
  return events.reduce((highest, event) => Math.max(highest, event.timestamp), 0);
}

export function compareVideoMetadata(expected: SessionVideoMetadata, selected: SessionVideoMetadata, events: readonly MatchEvent[]): VideoComparison {
  const fileName: MetadataMatch = !expected.fileName || !selected.fileName ? "unknown"
    : expected.fileName === selected.fileName ? "match" : "mismatch";
  const fileSize: MetadataMatch = !validNumber(expected.fileSize) || !validNumber(selected.fileSize) ? "unknown"
    : expected.fileSize === selected.fileSize ? "match" : "mismatch";
  const duration: MetadataMatch = !validNumber(expected.duration) || !validNumber(selected.duration) ? "unknown"
    : Math.abs(expected.duration - selected.duration) <= VIDEO_DURATION_TOLERANCE_SECONDS ? "match" : "mismatch";
  const maxEventTimestamp = getMaxEventTimestamp(events);
  const eventTimestamps: MetadataMatch = !validNumber(selected.duration) ? "unknown"
    : selected.duration + VIDEO_DURATION_TOLERANCE_SECONDS >= maxEventTimestamp ? "match" : "mismatch";
  return { fileName, fileSize, duration, eventTimestamps, maxEventTimestamp,
    hasWarning: [fileName, fileSize, duration, eventTimestamps].includes("mismatch") };
}
