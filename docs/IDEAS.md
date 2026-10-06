# MatchMark – fejlesztési ötletek

A projekttel kapcsolatos, még kidolgozásra váró ötletek gyűjtőhelye.
Ha egy ötlet konkrét fejlesztési feladattá válik, GitHub issue készülhet belőle.

Az alábbi sorrend javasolt megvalósítási sorrend is: először az elemzői nézet
kerete, majd az eseményrögzítés folyamata készüljön el. Minden tétel állapota: ötlet.

## Magas prioritás

### 1. Fix, görgetésmentes elemzői nézet

- A videó betöltése után a felület váltson fix elemzői nézetre, de csak a videó felület, az action gombok
  és az alsó specifikációs sáv férjenek el a rendelkezésre álló képernyőn. (A Matchmark és a change videos rész egyáltalán ne látszódjon). Csak a fentiek töltsék ki a képernyőt és ne lehesen görgetni
- Ebben a nézetben ne lehessen görgetni az oldalt; a videó, az action gombok
  és az alsó specifikációs sáv férjenek el a rendelkezésre álló képernyőn.
- A videó maradjon domináns. A vezérlők mérete szükség szerint csökkenthető,
  a kényelmes kattinthatóság megtartásával.

### 2. Letisztult elemzői nézet és Exit gomb

- Videóválasztás után ne jelenjen meg a fájlnév és a formátumajánlás
  (például `g5898219-fullhd.mp4`, `Recommended format: MP4 (H.264)`).
- A videóválasztó információs blokk ebben a nézetben elrejthető
  `display: none` használatával.
- A jobb felső sarokban legyen egy Exit gomb, amely visszavisz a kezdő,
  görgethető oldalra.
- Az Exit állítsa meg a videót, de őrizze meg a betöltött videót, a lejátszási
  pozíciót, a mentett eseményeket és a félkész esemény adatait.
- A kezdőnézetben egy Resume analysis gombbal lehessen folytatni az elemzést.
- A megőrzés első körben az aktuális munkamenetre vonatkozzon; az oldal
  újratöltése utáni visszaállítás külön későbbi fejlesztés.
- Függőség: a fix elemzői nézet kialakítása.

### 3. Lépésenkénti eseményspecifikálás az alsó sávban

- A videó körüli eseménygombok maradhatnak a jelenlegi elrendezésben.
- Az alsó sávban csak esemény kiválasztása után jelenjen meg tartalom;
  az eddigi Recent Events lista helyét az aktuális esemény specifikálása vegye át.
- Az esemény további adatait kizárólag az alsó sávban megjelenő
  lehetőségekkel lehessen kiválasztani.
- Példa: Shot kiválasztása után jelenjen meg a Shot címke és mellette
  az Outcome lehetőségei: Goal, On Target, Off Target, Blocked.
- Egy specifikáció kiválasztása után jelenjen meg a következő lépés,
  és ez folytatódjon az adott esemény összes szükséges adatának megadásáig.
- A sorrend legyen: Event → Outcome → Body Part → Player. Csak az adott
  eseményhez szükséges lépések jelenjenek meg: Shotnál mind a négy,
  Interceptionnél például csak Event → Player.
- A Player kiválasztása legyen az utolsó lépés, amely elindítja az automatikus mentést.
- Az alsó sávban legyen Back és Cancel gomb. A Back az előző lépésre vigyen,
  a már megadott értékek megtartásával; a Cancel dobja el a félkész eseményt.
- Az Esc billentyű is szakítsa meg a félkész eseményt, a Cancel működésével azonosan.
- Az esemény kiválasztásakor rögzített timestamp a teljes folyamat alatt,
  visszalépéskor is maradjon változatlan.
- A folyamat végig férjen el a fix nézetben, görgetés nélkül.
- Függőség: a fix elemzői nézet kialakítása.

### 4. Automatikus mentés és visszajelzés

- Ne legyen külön Save gomb: az utolsó lépésben a Player kiválasztása
  automatikusan mentse a minden szükséges adattal rendelkező eseményt.
- Az alsó sávban két másodpercig jelenjen meg zöld pipa és rövid összefoglaló,
  például `Saved · #9 Shot · On Target`. Ezután a sáv ürüljön ki.
- A visszajelzés alatt is lehessen új eseményt indítani; az új esemény
  specifikációs lépései azonnal váltsák fel a mentési visszajelzést.
- Függőség: a lépésenkénti specifikációs folyamat kialakítása.

### 5. Eseménytörténet és click-to-seek külön panelben

- Az Exit mellett legyen History gomb, amely kompakt, bezárható panelt
  nyit meg a videó fölött, a videó egy részét továbbra is láthatóan hagyva.
- A panel eseménylistája saját területén belül legyen görgethető;
  az elemzői oldal továbbra is maradjon fix, görgetésmentes.
- A teljes mentett eseménytörténet legyen elérhető a panelben.
- Egy eseményre kattintva a videó ugorjon annak időpontjára, és a panel záródjon be.
- Félkész esemény rögzítése közben a History legyen letiltva, hogy ne szakítsa
  meg a specifikációs folyamatot.
- Függőség: a fix elemzői nézet és az alsó sáv új specifikációs folyamata.

## Közepes prioritás

### 6. Billentyűparancsok az eseményekhez

- Probléma: tagging közben sok egérmozgás szükséges.
- Ötlet: mind a 10 eseményhez saját shortcut.
