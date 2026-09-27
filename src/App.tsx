import "./App.css";

import VideoPlayer from "./components/VideoPlayer";

function App() {
  return (
    <main className="app">
      <h1>MatchMark</h1>
      <p>Az ingyenes utánpótlás videó vágó program UP edzőknek</p>
      <VideoPlayer />
    </main>
  );
}

export default App;
