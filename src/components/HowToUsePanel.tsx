import { useEffect, useRef } from "react";
import ExpandableScreenshot from "./ExpandableScreenshot";
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
      "Select a local match video from your device. For the most reliable playback, use MP4 (H.264). The video stays on your device and is not uploaded.",
    screenshotAlt: "MatchMark start screen with the Select video button",
  },
  {
    id: "tag-events",
    title: "2. Tag match events",
    description:
      "Press an event button or its keyboard shortcut to capture the current video timestamp. Complete the details, then choose Save to keep the event.",
    screenshotAlt:
      "MatchMark tagging workspace with the video and top, left and right event rails",
  },
  {
    id: "assign-details",
    title: "3. Assign players and details",
    description:
      "Select a player and complete the event-specific options. Custom events need a description and can have no player. At the final step, choose Save or press Ctrl+Enter (Windows/Linux) or Cmd+Enter (macOS).",
    screenshotAlt:
      "MatchMark event form with player selection and event-specific details",
  },
  {
    id: "review-events",
    title: "4. Review your events",
    description:
      "Open Events to filter by event type and player. Start Review and use Previous / Next to move through the filtered events. Click an event in Events to jump to its timestamp.",
    screenshotAlt:
      "MatchMark Events panel with event and player filters and the Review events button",
  },
  {
    id: "players",
    title: "5. Add or edit players",
    description:
      "Open the Players panel to add, edit or remove players from the current roster. Players can then be assigned to tagged events during the analysis.",
    screenshotAlt:
      "MatchMark Players panel with the Add player form and roster Edit and Delete buttons",
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
            <ExpandableScreenshot id={step.id} src={howToUseScreenshots[step.id]}
              alt={step.screenshotAlt} title={step.title.replace(/^\d+\.\s*/, "")} />
          </section>
        ))}
        <section
          className="how-to-use-step how-to-use-session"
          aria-labelledby="how-to-use-session-title"
        >
          <div className="how-to-use-session-copy">
            <h3 id="how-to-use-session-title">6. Save and restore a session</h3>
            <p>
              Use Session → Export session to save your current analysis as a local JSON file.
            </p>
            <p>
              Later, use Session → Import session to restore your events, player roster
              and session data. Import session is also available on the start screen.
            </p>
            <p>
              After importing, choose Reattach video and select the original local video
              to continue the analysis.
            </p>
            <p>
              <strong>The video itself is not stored in the session file.</strong>{" "}
              The session file contains analysis data and video metadata only.
            </p>
            <p aria-label="Session workflow">
              Analyze → Export session → Close the browser → Import session later →
              Reattach the original video → Continue analysis
            </p>
            <p className="how-to-use-session-warning">
              <strong>MatchMark does not save sessions automatically yet.</strong>{" "}
              Export your session before closing or refreshing the page.
            </p>
          </div>
          <ExpandableScreenshot id="session" src={howToUseScreenshots.session}
            alt="MatchMark Session panel with Export session and Import session buttons"
            title="Save and restore a session" />
        </section>
        <section
          className="how-to-use-shortcuts"
          aria-labelledby="how-to-use-shortcuts-title"
        >
          <h3 id="how-to-use-shortcuts-title">
            7. Keyboard shortcuts and Quick Seek
          </h3>
          <p>
            Use keyboard shortcuts to reduce mouse movement and keep your focus
            on the video.
          </p>
          <p>
            Event shortcuts are displayed on the event buttons and can be
            customized in Shortcuts.
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
      </div>
    </dialog>
  );
}
