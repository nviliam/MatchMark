import "./App.css";
import { useState } from "react";

import VideoPlayer from "./components/VideoPlayer";

function App() {
  const [isVideoReady, setIsVideoReady] = useState(false);

  return (
    <main className={isVideoReady ? "app app-analysis" : "app"}>
      {!isVideoReady && <header className="app-header">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div>
          <h1>MatchMark</h1>
          <p>Football video tagging for youth coaches</p>
        </div>
      </header>}
      <VideoPlayer isVideoReady={isVideoReady} onVideoReadyChange={setIsVideoReady} />
    </main>
  );
}

export default App;
