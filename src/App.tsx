import "./App.css";
import { useState } from "react";

import VideoPlayer from "./components/VideoPlayer";
import { DEFAULT_EVENT_SHORTCUTS, type EventShortcuts } from "./config/eventShortcuts";

function App() {
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);
  // A future settings UI can update this session configuration via its state setter.
  const [eventShortcuts] = useState<EventShortcuts>(() => ({ ...DEFAULT_EVENT_SHORTCUTS }));

  return (
    <main className={isAnalysisActive ? "app app-analysis" : "app"}>
      {!isAnalysisActive && <header className="app-header">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div>
          <h1>MatchMark</h1>
          <p>Football video tagging for youth coaches</p>
        </div>
      </header>}
      <VideoPlayer isAnalysisActive={isAnalysisActive} onAnalysisActiveChange={setIsAnalysisActive}
        eventShortcuts={eventShortcuts} />
    </main>
  );
}

export default App;
