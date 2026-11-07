import loadVideo from "./screenshot01.png";
import tagEvents from "./Screenshot02.png";
import assignDetails from "./Screenshot03.png";
import reviewEvents from "./Screenshot04.png";

export type HowToUseScreenshotId = "load-video" | "tag-events" | "assign-details" | "review-events";

// Preserve the supplied filenames, including case, for case-sensitive production builds.
export const howToUseScreenshots: Partial<Record<HowToUseScreenshotId, string>> = {
  "load-video": loadVideo,
  "tag-events": tagEvents,
  "assign-details": assignDetails,
  "review-events": reviewEvents,
};
