export const VIDEO_FILE_ACCEPT = ".mp4,.webm,video/mp4,video/webm";
export const VIDEO_FORMAT_ERROR = "Please select an MP4 or WebM video. Recommended format: MP4 (H.264).";

export function isSupportedVideoFile(file: Pick<File, "name" | "type">): boolean {
  return file.type === "video/mp4" || file.type === "video/webm" || /\.(mp4|webm)$/i.test(file.name);
}
