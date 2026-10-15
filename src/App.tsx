import "./App.css";
import { useEffect, useState } from "react";

import VideoPlayer from "./components/VideoPlayer";
import { loadEventShortcuts, persistEventShortcuts } from "./config/eventShortcuts";

function App() {
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);
  const [eventShortcuts, setEventShortcuts] = useState(loadEventShortcuts);

  useEffect(() => {
    // Also replace corrupt/old storage with a complete, validated configuration on startup.
    persistEventShortcuts(eventShortcuts);
  }, [eventShortcuts]);

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
        eventShortcuts={eventShortcuts} onEventShortcutsChange={setEventShortcuts} />
    </main>
  );
}

export default App;
