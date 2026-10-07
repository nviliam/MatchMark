import "./App.css";
import { useState } from "react";

import VideoPlayer from "./components/VideoPlayer";

function App() {
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);

  return (
    <main className={isAnalysisActive ? "app app-analysis" : "app"}>
      {!isAnalysisActive && <header className="app-header">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div>
          <h1>MatchMark</h1>
          <p>Football video tagging for youth coaches</p>
        </div>
      </header>}
      <VideoPlayer isAnalysisActive={isAnalysisActive} onAnalysisActiveChange={setIsAnalysisActive} />
    </main>
  );
}

export default App;
