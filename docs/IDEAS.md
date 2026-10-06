# MatchMark – fejlesztési ötletek

A projekttel kapcsolatos, még kidolgozásra váró ötletek gyűjtőhelye.
Ha egy ötlet konkrét fejlesztési feladattá válik, GitHub issue készülhet belőle.

Az alábbi sorrend javasolt megvalósítási sorrend is: először az elemzői nézet
kerete, majd az eseményrögzítés folyamata készüljön el.

Állapotok: **elkészült**, **részben elkészült**, **ötlet**.
A kipipált részfeladatok már megvalósultak; az üres jelölők a hátralévő munkát jelzik.

## Magas prioritás

### 1. Fix, görgetésmentes elemzői nézet

**Állapot: elkészült (böngészős vizuális ellenőrzés még hátravan).**

- [x] A videó betöltése után a felület váltson fix elemzői nézetre, de csak a videó felület, az action gombok
  és az alsó specifikációs sáv férjenek el a rendelkezésre álló képernyőn. (A Matchmark és a change videos rész egyáltalán ne látszódjon). Csak a fentiek töltsék ki a képernyőt és ne lehesen görgetni
- [x] Ebben a nézetben ne lehessen görgetni az oldalt; a videó, az action gombok
  és az alsó specifikációs sáv férjenek el a rendelkezésre álló képernyőn.
- [x] A videó maradjon domináns. A vezérlők mérete szükség szerint csökkenthető,
  a kényelmes kattinthatóság megtartásával.
- [x] A bottom rail fix, 104 px-es területet kapjon; a form megnyitása ne változtassa meg a grid méreteit.
- [ ] Böngészőben ellenőrizni a megjelenést és a görgetésmentességet 1920×1080, 1366×768 és 1280×720 méreten.

Megvalósítás: `100dvh` magas analysis layout, csak ebben a nézetben tiltott
oldalgörgetéssel. Szűk helyen kizárólag a bottom rail belseje görgethető.

### 2. Letisztult elemzői nézet és Exit gomb

**Állapot: részben elkészült.** A kezdőoldali elemek elrejtése kész; az Exit/Resume még nincs megvalósítva.

- [x] Videóbetöltés után ne jelenjen meg a fájlnév és a formátumajánlás
  (például `g5898219-fullhd.mp4`, `Recommended format: MP4 (H.264)`).
- [x] A videóválasztó információs blokk ne jelenjen meg az elemzői nézetben
  (feltételes rendereléssel megvalósítva).
- [ ] A jobb felső sarokban legyen egy Exit gomb, amely visszavisz a kezdő,
  görgethető oldalra.
- [ ] Az Exit állítsa meg a videót, de őrizze meg a betöltött videót, a lejátszási
  pozíciót, a mentett eseményeket és a félkész esemény adatait.
- [ ] A kezdőnézetben egy Resume analysis gombbal lehessen folytatni az elemzést.
- A megőrzés első körben az aktuális munkamenetre vonatkozzon; az oldal
  újratöltése utáni visszaállítás külön későbbi fejlesztés.
- Függőség: a fix elemzői nézet kialakítása.

### 3. Lépésenkénti eseményspecifikálás az alsó sávban

**Állapot: részben elkészült.** A meglévő EventForm már a fix bottom railben jelenik meg;
a lépésenkénti folyamat még nincs megvalósítva, továbbra is külön Save gomb ment.

- [x] A videó körüli eseménygombok maradhatnak a jelenlegi elrendezésben.
- [x] Az alsó sávban csak esemény kiválasztása után jelenjen meg tartalom;
  az eddigi Recent Events lista helyét az aktuális esemény specifikálása vegye át.
- [x] Az esemény további adatait kizárólag az alsó sávban megjelenő
  lehetőségekkel lehessen kiválasztani.
- [x] Példa: Shot kiválasztása után jelenjen meg a Shot címke és mellette
  az Outcome lehetőségei: Goal, On Target, Off Target, Blocked.
- [ ] Egy specifikáció kiválasztása után jelenjen meg a következő lépés,
  és ez folytatódjon az adott esemény összes szükséges adatának megadásáig.
- [ ] A sorrend legyen: Event → Outcome → Body Part → Player. Csak az adott
  eseményhez szükséges lépések jelenjenek meg: Shotnál mind a négy,
  Interceptionnél például csak Event → Player.
- [ ] A Player kiválasztása legyen az utolsó lépés, amely elindítja az automatikus mentést.
- [x] Az alsó sávban legyen Cancel gomb, amely eldobja a félkész eseményt.
- [ ] A Back az előző lépésre vigyen, a már megadott értékek megtartásával.
- [ ] Az Esc billentyű is szakítsa meg a félkész eseményt, a Cancel működésével azonosan.
- [x] Az esemény kiválasztásakor rögzített timestamp a jelenlegi form kitöltése alatt maradjon változatlan.
- [ ] A timestamp a későbbi lépésenkénti folyamatban, visszalépéskor is maradjon változatlan.
- [ ] A teljes lépésenkénti folyamat férjen el a fix nézetben, görgetés nélkül.
- Függőség: a fix elemzői nézet kialakítása.

### 4. Automatikus mentés és visszajelzés

**Állapot: ötlet.**

- [ ] Ne legyen külön Save gomb: az utolsó lépésben a Player kiválasztása
  automatikusan mentse a minden szükséges adattal rendelkező eseményt.
- [ ] Az alsó sávban két másodpercig jelenjen meg zöld pipa és rövid összefoglaló,
  például `Saved · #9 Shot · On Target`. Ezután a sáv ürüljön ki.
- [ ] A visszajelzés alatt is lehessen új eseményt indítani; az új esemény
  specifikációs lépései azonnal váltsák fel a mentési visszajelzést.
- Függőség: a lépésenkénti specifikációs folyamat kialakítása.

### 5. Eseménytörténet és click-to-seek külön panelben

**Állapot: ötlet.** A History panel még nincs megvalósítva. A teljes mentett eseménylista
már React state-ben marad, és a click-to-seek kezelő is megvan; a korábbi Recent Events
megjelenítés rejtett, nem foglal helyet a layoutban.

- [ ] Az Exit mellett legyen History gomb, amely kompakt, bezárható panelt
  nyit meg a videó fölött, a videó egy részét továbbra is láthatóan hagyva.
- [ ] A panel eseménylistája saját területén belül legyen görgethető;
  az elemzői oldal továbbra is maradjon fix, görgetésmentes.
- [ ] A teljes mentett eseménytörténet legyen elérhető a panelben.
- [ ] Egy eseményre kattintva a videó ugorjon annak időpontjára, és a panel záródjon be.
- [ ] Félkész esemény rögzítése közben a History legyen letiltva, hogy ne szakítsa
  meg a specifikációs folyamatot.
- Függőség: a fix elemzői nézet és az alsó sáv új specifikációs folyamata.

## Közepes prioritás

### 6. Billentyűparancsok az eseményekhez

**Állapot: ötlet.** A meglévő Quick Seek videóugrásokat kezel, nem eseményrögzítést.

- Probléma: tagging közben sok egérmozgás szükséges.
- [ ] Mind a 10 eseményhez saját shortcut.
