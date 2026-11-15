import loadVideo from "./load-video.png";
import tagEvents from "./tag-events.png";
import assignDetails from "./assign-details.png";
import reviewEvents from "./review-events.png";
import players from "./players.png";
import session from "./session.png";

export type HowToUseScreenshotId = "load-video" | "tag-events" | "assign-details" | "review-events" | "players" | "session";

// Release asset names match the workflow steps and remain local to this build.
export const howToUseScreenshots: Partial<Record<HowToUseScreenshotId, string>> = {
  "load-video": loadVideo,
  "tag-events": tagEvents,
  "assign-details": assignDetails,
  "review-events": reviewEvents,
  players,
  session,
};
