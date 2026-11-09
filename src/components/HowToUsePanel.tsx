import { useEffect, useRef } from "react";
import {
  howToUseScreenshots,
  type HowToUseScreenshotId,
} from "../assets/how-to-use/screenshots";

type Props = { onClose: () => void };

const steps: readonly {
  id: HowToUseScreenshotId;
  title: string;
  description: string;
  screenshotAlt: string;
}[] = [
  {
    id: "load-video",
    title: "1. Load a video",
    description:
      "Select a local match video from your device. For the most reliable playback, use MP4 (H.264).",
    screenshotAlt: "MatchMark start screen with the Select video button",
  },
  {
    id: "tag-events",
    title: "2. Tag match events",
    description:
      "Use the event buttons or their keyboard shortcuts while watching the match to create tagged events.",
    screenshotAlt:
      "MatchMark tagging workspace with the video and top, left and right event rails",
  },
  {
    id: "assign-details",
    title: "3. Assign players and details",
    description:
      "Add the relevant player and complete the event-specific details before saving the event.",
    screenshotAlt:
      "MatchMark event form with player selection and event-specific details",
  },
  {
    id: "review-events",
    title: "4. Review your events",
    description:
      "Filter your tagged events and open Review mode to move through them quickly on the video timeline.",
    screenshotAlt:
      "MatchMark Events panel with event and player filters and the Review events button",
  },
];

const quickSeek = [
  { key: "2", seconds: "1.2" },
  { key: "3", seconds: "1.5" },
  { key: "4", seconds: "2.0" },
] as const;

export default function HowToUsePanel({ onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Native modal behavior supplies focus containment and an inert background.
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  function closePanel() {
    // Close the native modal before returning focus to its launcher.
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      className="how-to-use-panel"
      id="how-to-use-panel"
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="how-to-use-title"
      aria-describedby="how-to-use-intro"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        closePanel();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="how-to-use-header">
        <div>
          <h2 id="how-to-use-title">How to use MatchMark</h2>
          <p id="how-to-use-intro">
            MatchMark lets you tag, filter and review football events directly
            from a local video.
          </p>
        </div>
        <button
          className="how-to-use-close"
          type="button"
          autoFocus
          onClick={closePanel}
        >
          Close
        </button>
      </header>
      <div
        className="how-to-use-content"
        role="region"
        aria-label="Usage guide"
        tabIndex={0}
      >
        {steps.map((step) => (
          <section
            className="how-to-use-step"
            key={step.id}
            aria-labelledby={`how-to-use-${step.id}`}
          >
            <div>
              <h3 id={`how-to-use-${step.id}`}>{step.title}</h3>
              <p>{step.description}</p>
            </div>
            <figure className="how-to-use-screenshot">
              {howToUseScreenshots[step.id] ? (
                <img
                  src={howToUseScreenshots[step.id]}
                  alt={step.screenshotAlt}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <figcaption className="how-to-use-screenshot-missing">
                  {step.screenshotAlt}
                  <span>Screenshot to be added.</span>
                </figcaption>
              )}
            </figure>
          </section>
        ))}
        <section
          className="how-to-use-shortcuts"
          aria-labelledby="how-to-use-shortcuts-title"
        >
          <h3 id="how-to-use-shortcuts-title">
            5. Keyboard shortcuts &amp; Quick Seek
          </h3>
          <p>
            Use keyboard shortcuts to reduce mouse movement and keep your focus
            on the video.
          </p>
          <p>
            Event shortcuts are displayed on the event buttons and can be
            customized in Settings.
          </p>
          <div className="how-to-use-shortcut-grid">
            {quickSeek.map(({ key, seconds }) => (
              <div className="how-to-use-seek-pair" key={key}>
                <div className="how-to-use-shortcut-row">
                  <span className="how-to-use-keys">
                    <kbd>{key}</kbd>
                  </span>
                  <span>Forward {seconds} s</span>
                </div>
                <div className="how-to-use-shortcut-row">
                  <span className="how-to-use-keys">
                    <kbd>Shift</kbd>
                    <span>+</span>
                    <kbd>{key}</kbd>
                  </span>
                  <span>Rewind {seconds} s</span>
                </div>
              </div>
            ))}
          </div>
          <div className="how-to-use-save-shortcuts">
            <strong>Save current event</strong>
            <div className="how-to-use-shortcut-row">
              <span className="how-to-use-keys">
                <kbd>Ctrl</kbd>
                <span>+</span>
                <kbd>Enter</kbd>
              </span>
              <span>Windows / Linux</span>
            </div>
            <div className="how-to-use-shortcut-row">
              <span className="how-to-use-keys">
                <kbd>Cmd</kbd>
                <span>+</span>
                <kbd>Enter</kbd>
              </span>
              <span>macOS</span>
            </div>
            <p>
              Available after completing the event details, when Save is
              enabled.
            </p>
          </div>
        </section>
        <section
          className="how-to-use-warning"
          aria-labelledby="how-to-use-warning-title"
        >
          <h3 id="how-to-use-warning-title">Important</h3>
          <p>
            Automatic saving is not available yet. Export a session to save your
            analysis locally. Import it later and reattach the original video to continue.
          </p>
          <p>
            Refreshing or closing the browser still clears unsaved runtime data.
          </p>
        </section>
      </div>
    </dialog>
  );
}
