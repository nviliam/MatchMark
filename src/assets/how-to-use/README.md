# How to use – valódi MatchMark screenshotok

Az útmutató a felhasználó által bemásolt hat valódi, lokális MatchMark screenshotot
használja. A `screenshots.ts` manifest importálja és rendeli őket a megfelelő lépéshez.
Nincs külső kép-URL vagy generált mockup.

Bekötött fájlok (a kis- és nagybetűk pontosan számítanak):

| Fájlnév | Manifest kulcs | Tartalom |
| --- | --- | --- |
| `load-video.png` | `load-video` | A kezdőképernyő a Select video és How to use gombbal. |
| `tag-events.png` | `tag-events` | Analysis/tagging: videó, top/left/right event railek és Pass type lépés. |
| `assign-details.png` | `assign-details` | Az alsó EventForm Player lépése. |
| `review-events.png` | `review-events` | Events panel: szűrők, mentett események és a Review indítógomb. |
| `players.png` | `players` | Players panel: Add player űrlap, roster és Edit/Delete gombok. |
| `session.png` | `session` | Session panel: Export session és Import session gombok. |

A negyedik kép a Review indítását mutatja, nem az aktív Broadcast Review módot.
Az alt szöveg is ezt írja le. Ha később aktív Review screenshot váltja fel,
a `HowToUsePanel.tsx` hozzá tartozó alt szövegét is igazítsuk hozzá.

Kizárólag a tényleges alkalmazásról készült képeket adjunk hozzá. A videó nem
kerül az útmutatóba: csak a kiválasztott statikus screenshotok.

A `screenshots.ts` importjai és manifestje:

```ts
import loadVideo from "./load-video.png";
import tagEvents from "./tag-events.png";
import assignDetails from "./assign-details.png";
import reviewEvents from "./review-events.png";
import players from "./players.png";
import session from "./session.png";

export type HowToUseScreenshotId = "load-video" | "tag-events" | "assign-details" | "review-events" | "players" | "session";

export const howToUseScreenshots: Partial<Record<HowToUseScreenshotId, string>> = {
  "load-video": loadVideo,
  "tag-events": tagEvents,
  "assign-details": assignDetails,
  "review-events": reviewEvents,
  players,
  session,
};
```

Csak már létező fájlt importáljunk; a manifest részlegesen is kitölthető. Később
ugyanilyen néven lecserélhető bármelyik kép. Egy manifestből kihagyott lépésnél
a panel szövegesen jelzi a hiányzó képet. A Vite a képeket a build részeként
kezeli, a help panel pedig lazy loadinggal, torzítás nélkül, eredeti képaránnyal
jeleníti meg őket.

Vizuális ellenőrzéskor nézzük meg a desktop kétoszlopos és a mobil egymás alatti
elrendezést, a modal belső görgetését és a screenshotok olvashatóságát.

Mind a hat képet az `ExpandableScreenshot` jeleníti meg. A thumbnail gombbal
nyitható, a nagy kép külön natív modális dialogban látható. A thumbnail helye és
mérete változatlan; a preview ugyanazt a képfájlt és alt szöveget használja.

A handler-tesztek nem helyettesítik az alábbi manuális böngészős ellenőrzést:

- Egérrel, Enterrel és Space-szel is megnyitható mind a hat screenshot.
- Az előnézetbe kerül a fókusz, a Tab/Shift+Tab nem lép ki az aktív modalból.
- A Close gomb és az Escape csak a képelőnézetet zárja; a help nyitva marad,
  és a fókusz ugyanarra a screenshot gombra tér vissza. Egy következő Escape
  a helpet zárja, és a How to use launcher kapja vissza a fókuszt.
- Desktopon és mobilon is arányos, viewporton belüli a kép; a szükséges görgetés
  a preview belsejében működik, és a Close végig elérhető marad.
