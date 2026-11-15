import { useEffect, useRef } from "react";
import type { MatchMarkSession } from "../types/session";
import PanelCloseIcon from "./PanelCloseIcon";
import SessionImport from "./SessionImport";

type Props = {
  onExportSession: () => void;
  onImportSession: (session: MatchMarkSession) => void;
  exportError: string;
  onClose: () => void;
};

export default function SessionPanel({ onExportSession, onImportSession, exportError, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  return <section className="session-panel" id="session-panel" role="dialog"
    aria-labelledby="session-panel-title" aria-describedby="session-panel-hint">
    <header className="session-panel-header">
      <h2 id="session-panel-title">Session</h2>
      <button className="panel-close-button" ref={closeButtonRef} type="button" aria-label="Close session" onClick={onClose}>
        <PanelCloseIcon />
      </button>
    </header>
    <p className="session-panel-hint" id="session-panel-hint">
      Export your analysis to a local JSON file or import a previously saved session.
    </p>
    <div className="session-panel-content">
      <div className="session-export">
        <button type="button" onClick={onExportSession}>Export session</button>
        {exportError && <p className="error-message" role="alert">{exportError}</p>}
      </div>
      <SessionImport onImport={onImportSession} />
    </div>
  </section>;
}
