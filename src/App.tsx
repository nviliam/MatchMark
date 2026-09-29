import "./App.css";

import VideoPlayer from "./components/VideoPlayer";

function App() {
  return (
    <main className="app">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div>
          <h1>MatchMark</h1>
          <p>Football video tagging for youth coaches</p>
        </div>
      </header>
      <VideoPlayer />
    </main>
  );
}

export default App;
