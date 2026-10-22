export function getReviewSeekTime(timestamp: number, leadIn: number): number {
  if (!Number.isFinite(timestamp)) return 0;
  const safeLeadIn = Number.isFinite(leadIn) ? Math.max(0, leadIn) : 0;
  return Math.max(0, timestamp - safeLeadIn);
}
