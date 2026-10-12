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
- [x] A bottom rail fix, 56 px-es területet kapjon; a form megnyitása ne változtassa meg a grid méreteit.
- [x] Böngészőben ellenőrizni a megjelenést és a görgetésmentességet 1920×1080, 1366×768 és 1280×720 méreten.

Megvalósítás: `100dvh` magas analysis layout, csak ebben a nézetben tiltott
oldalgörgetéssel. A top rail 40 px magas, a két oldalsó rail 44 px széles.
Szűk helyen kizárólag a bottom rail belseje görgethető.

### 2. Letisztult elemzői nézet és Exit gomb

**Állapot: elkészült (valódi böngészős ellenőrzés még hátravan).**

- [x] Videóbetöltés után ne jelenjen meg a fájlnév és a formátumajánlás
      (például `g5898219-fullhd.mp4`, `Recommended format: MP4 (H.264)`).
- [x] A videóválasztó információs blokk ne jelenjen meg az elemzői nézetben
      (feltételes rendereléssel megvalósítva).
- [x] A jobb felső sarokban legyen egy Exit gomb, amely visszavisz a kezdő,
      görgethető oldalra.
- [x] Az Exit állítsa meg a videót, de őrizze meg a betöltött videót, a lejátszási
      pozíciót, a mentett eseményeket és a félkész esemény adatait.
- [x] A kezdőnézetben egy Resume analysis gombbal lehessen folytatni az elemzést.
- [x] Resume után a videó a mentett pozícióra térjen vissza, szüneteltetett állapotban.
- [x] A félkész esemény kitöltött mezői és az eredeti timestamp maradjanak meg.
- [x] Exit csak nézetváltás legyen; új videó kiválasztása továbbra is resetelje a munkamenetet.
- [x] A Quick Seek csak az aktív analysis nézetben működjön.
- [x] A megőrzés első körben az aktuális munkamenetre vonatkozzon; az oldal
      újratöltése utáni visszaállítás külön későbbi fejlesztés.
- [x] Böngészőben ellenőrizni az Exit/Resume működését: pozíció és paused állapot,
      mentett események, félkész form, valamint új videó választásakor reset.
- Függőség: a fix elemzői nézet kialakítása.

Megvalósítás: az analysis mód külön React state az `App` komponensben;
a mentett lejátszási pozíció a `VideoPlayer` state-jében marad. Exitkor a videó
és az `EventForm` csak rejtetté válik, nem kerül lecsatolásra. Nincs tartós tárolás.
Az A–D forgatókönyvek szimulált komponensellenőrzése, a lint és a build sikeres.

### 3. Lépésenkénti eseményspecifikálás az alsó sávban

**Állapot: elkészült.** A specifikáció lépésenként halad; a Player kiválasztása után
ellenőrző összefoglaló és külön Save gomb következik. Csak a Save ment eseményt.

- [x] A videó körüli eseménygombok maradjanak a jelenlegi elrendezésben.
- [x] Az alsó sáv kezdetben üres legyen. Esemény indításakor az aktuális draft,
      mentés után az utolsó mentett esemény összefoglalója jelenjen meg; Recent Events lista ne legyen látható.
- [x] Az esemény további adatait kizárólag az alsó sávban lehessen kiválasztani,
      egyszerre csak az aktuális lépés lehetőségeivel.
- [x] Shot kiválasztása után az Outcome lehetőségei legyenek: Goal, On Target, Off Target, Blocked.
- [x] Egy specifikáció kiválasztása automatikusan vigyen a következő szükséges lépésre; ne legyen Next gomb.
- [x] A sorrend legyen Event → Outcome → Body Part → Player → Save.
      Csak a szükséges lépések jelenjenek meg: Shotnál mindegyik,
      Pass/Dribble/Tackle/Duel esetén Outcome → Player → Save,
      a többi eseménynél Player → Save az action gomb megnyomása után.
- [x] A Player kiválasztása legyen az utolsó specifikációs lépés.
      Ezután jelenjen meg a Save gomb, és az esemény csak annak megnyomásakor mentődjön el.
- [x] Az addigi választások kompakt összefoglalóban legyenek láthatók; hiányos vagy hibás adatokat ne lehessen menteni.
- [x] A Back pontosan egy specifikációs lépéssel vigyen vissza, a választások megtartásával.
      A korábbi érték legyen vizuálisan kijelölve, és újra kiválasztható vagy módosítható.
- [x] Új esemény létrehozásakor a Cancel és az Escape dobja el a teljes draftot, mentés nélkül; az alsó sáv ürüljön ki.
      Az Escape csak aktív analysis nézetben, félkész eseménynél működjön, listener cleanuppal.
- [x] Az action gomb megnyomásakor rögzített timestamp maradjon változatlan
      kitöltés, Back, módosítás, várakozás és Save alatt is.
- [x] Mentés után az utolsó elmentett esemény összefoglalója maradjon látható
      az alsó sávban mindaddig, amíg a felhasználó új timestampelt eseményt, Edit szerkesztést vagy Delete megerősítést nem indít.
- [x] Új esemény indítása csak az összefoglalót cserélje draftra; a teljes mentett eseménylista maradjon meg.
- [x] Exit/Resume őrizze meg az aktuális lépést, választásokat és timestampet,
      valamint a már elmentett esemény összefoglalóját is. Új videó resetelje ezeket.
- [x] A workflow ugyanabban a fix, 56 px-es bottom railben jelenjen meg;
      lépésváltáskor ne változzon a grid méretezése. Szűk helyen csak a sáv belseje görgethető.
- [ ] Az új workflow összes lépését böngészőben is ellenőrizni 1920×1080,
      1366×768 és 1280×720 méreten: illeszkedés, stabil videóméret és oldalgörgetés hiánya.
- Függőség: a fix elemzői nézet kialakítása.

Ellenőrzés: mind a 10 eseménytípus, a Save előtti validáció, Back/módosítás,
Cancel/Escape, timestamp-invariancia, a megmaradó Saved összefoglaló,
Quick Seek, Exit/Resume a Player és Save lépésnél, valamint a videócsere/hiba miatti reset
szimulált komponensellenőrzése sikeres. A valódi böngészős ellenőrzés még hátravan.

### 4. Kézi mentés és megmaradó visszajelzés

**Állapot: elkészült.** Az új termékdöntés szerint az automatikus mentés és az
időzített visszajelzés nem cél; az alábbi működés a 3. feladattal elkészült.

- [x] A Player kiválasztása után külön Save gomb mentse a validált eseményt.
- [x] Sikeres mentés után Saved felirat, timestamp, játékos és eseményspecifikáció maradjon a sávban.
- [x] Az összefoglaló ne tűnjön el időzítővel; lejátszás és Quick Seek közben is maradjon látható.
- [x] Új action gomb indítson új draftot, és azonnal váltsa le a Saved összefoglalót.
- [x] A Saved összefoglalón ne legyen Cancel; a megjelenítés a teljes events state fölötti UI-referencia legyen.
- [x] Az utoljára elmentett esemény mellett legyen Edit gomb.
      Az Edit ugyanazt a lépésenkénti workflow-t nyissa meg a mentett adatokkal előtöltve,
      a Save lépésen. Backkel minden korábbi specifikációs lépés elérhető legyen.
      Save esetén a meglévő esemény frissüljön azonos id-val, timestamp-pel és helyen,
      duplikáció nélkül; Cancel/Escape esetén az eredeti esemény és Saved összefoglaló térjen vissza.
- [x] Aktív Edit közben új action ne indíthasson eseményt; előbb Save vagy Cancel szükséges.
- [x] Exit/Resume őrizze meg az Edit lépését és módosított draft értékeit;
      a saved state Save előtt maradjon változatlan.

Ellenőrzés: mind a 10 eseménytípus create/edit folyamata, előtöltés és Back,
id/timestamp/sorrend/elemszám megőrzése, Cancel/Escape, action tiltás és Exit/Resume
szimulált komponensellenőrzése sikeres. Az új Edit UI valódi böngészős ellenőrzése még hátravan.

- [x] Az utoljára elmentett, látható esemény mellett legyen Delete gomb.
      A törlés külön megerősítést kérjen ugyanabban a fix bottom railben, modal nélkül.
      Megerősítéskor az esemény id alapján kerüljön ki a saved events state-ből;
      a többi esemény adatai és sorrendje maradjon változatlan.
      Ha van korábbi event, annak összefoglalója jelenjen meg; különben a sáv ürüljön ki.
- [x] A Delete megerősítés Cancel/Escape művelete változtatás nélkül állítsa vissza a Saved összefoglalót.
- [x] Delete megerősítés alatt az új action gombok és az Edit ne legyenek elérhetők;
      aktív Edit közben Delete ne legyen elérhető.
- [x] Exit/Resume őrizze meg a Delete megerősítést ugyanarra az event id-ra.
      Videócsere vagy lejátszási hiba törölje a megerősítési állapotot a munkamenet resetjével együtt.
- [x] A Delete ne módosítsa a videó currentTime értékét és ne indítson draftot.

Ellenőrzés: megerősített törlés, Cancel/Escape, előző összefoglaló visszaállítása,
az utolsó esemény törlése, lista- és videóállapot-integritás, Edit és Exit/Resume,
valamint create/Quick Seek/reset regressziók szimulált ellenőrzése sikeres.
A Delete UI valódi böngészős ellenőrzése még hátravan.

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

**Állapot: részben elkészült.** Mind a 10 esemény indítható billentyűvel;
a felhasználói testreszabás még későbbi feladat.

- [x] Az alapértelmezett kiosztás követi a jelenlegi action rail sorrendjét:
  - Felül: `Q` → Pass, `W` → Key Pass, `E` → Shot, `R` → Duel, `T` → Ball Loss.
  - Balra: `A` → Dribble, `Y` → Progressive Carry.
  - Jobbra: `Z` → Tackle, `H` → Interception, `N` → Ball Recovery.
- [x] Minden event action gombon külön, kompakt shortcut badge jelenik meg.
- [x] A működés és a badge ugyanabból a központi konfigurációból származik
      (`src/config/eventShortcuts.ts`), az aktuális mappinget az App React state-ben tartja.
- [x] A kattintás és a shortcut ugyanazt az eseményindító handlert használja,
      azonos timestamp-rögzítéssel és specifikációs folyamattal.
- [x] A shortcut csak betöltött videónál, analysis mode-ban és engedélyezett
      action gombok mellett működik; draft, edit és delete confirmation alatt tiltott.
- [x] A billentyűismétlés, a formmezőben vagy contenteditable elemben gépelés,
      valamint a Ctrl / Alt / Meta kombináció nem indít eseményt.
- [x] A kis- és nagybetűk egységes kezelése mellett az `é` és a `.` is használható
      konfigurált billentyűként; a meglévő Quick Seek változatlanul működik.
- [x] A későbbi testreszabás architekturálisan elő van készítve: a mapping
      state-ből, propsokon keresztül jut a handlerhez és a gombokhoz.
- [ ] Felhasználó által módosítható shortcutok és shortcut-settings felület.
- [ ] A felhasználói shortcut-beállítások megőrzése oldalfrissítés után (persistence).

További ötlet:
- [ ] Legyen egy custom/egyéb gomb, ahová a felhasználó a timestamphez egy egyéni
      leírást írhat egyedi, a fix kategóriákkal meg nem határozható eseményhez.
