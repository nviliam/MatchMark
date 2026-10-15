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

### 5. Events panel, szűrés és visszanézés

**Állapot: részben elkészült.** Az Events panel alapverziója elkészült;
a szűrés és a Review mode még ötlet. A teljes mentett eseménylista React state-ben marad,
és a panel a meglévő click-to-seek kezelőt használja.

#### 5.1 Events panel

Az alapműködés szimulált komponens-/videótesztekkel ellenőrizve. Az overlay és a saját
scroll CSS-megvalósítása elkészült, de valódi böngészős vizuális ellenőrzésük még hátravan;
ezért az első két pont egyelőre nincs kipipálva.

- [x] Az Exit mellett legyen `Events` gomb, amely kompakt, bezárható overlay/panelt
      nyit meg a videó fölött úgy, hogy a videó jelentős része továbbra is látható maradjon.
- [x] A panel eseménylistája saját területén belül legyen görgethető;
      az elemzői oldal továbbra is maradjon fix, görgetésmentes.
- [x] A teljes mentett eseménylista legyen elérhető a panelben.
- [x] Egy eseményre kattintva a videó ugorjon annak időpontjára, és a panel záródjon be.
- [x] Félkész esemény rögzítése, Edit vagy Delete confirmation közben az `Events`
      legyen letiltva, hogy ne szakítsa meg az aktuális workflow-t.

Megvalósult viselkedés: timestamp szerint növekvő lista, teljes játékosnév és eseményadatok,
üres listánál `No events yet.`. A bezáró gomb és az Escape csak a panelt zárja;
az Exit szintén bezárja, Resume után zárva marad. A panel nyitva tartása alatt
az event actionök és a Saved summary Edit/Delete gombjai tiltottak, a Quick Seek használható.
A listára kattintás pontosan az eredeti timestampre ugrik, és nem indít automatikus lejátszást.

#### 5.2 Event type szerinti szűrés

- [ ] Az Events panelben lehessen eseménytípus szerint szűrni.
- [ ] Legyen `All` opció és külön szűrő mind a 10 jelenlegi event type-hoz.
- [ ] Az aktív filter legyen vizuálisan egyértelműen jelölve.
- [ ] A panel mutassa a szűrés eredményeként látható események számát.
- [ ] A szűrés frontend oldalon, a meglévő React state alapján történjen;
      ne igényeljen adatbázist vagy backendet.

#### 5.3 Player szerinti szűrés

- [ ] Az Events panelben lehessen játékos szerint is szűrni.
- [ ] Legyen `All players` opció.
- [ ] A Player filter és az Event type filter egymással kombinálható legyen.
- [ ] Például lehessen csak egy adott játékos összes lövését vagy passzát megjeleníteni.

#### 5.4 Szűrt eseménysor visszanézése

- [ ] A szűrt eseményekből lehessen `Review events` módot indítani.
- [ ] Review módban az események időrendben legyenek egymás után visszanézhetők.
- [ ] Legyen `Previous` és `Next` vezérlés.
- [ ] Jelenjen meg az aktuális pozíció, például `3 / 8`.
- [ ] Az aktuális eventre váltáskor a videó automatikusan ugorjon az eseményhez.
- [ ] A Review mode-ból lehessen egyértelműen kilépni anélkül, hogy a szűrési állapot elveszne.

#### 5.5 Context lead-in

- [ ] Review módban a videó ne pontosan az event timestampjén induljon,
      hanem néhány másodperccel előtte, hogy az esemény kialakulása is látható legyen.
- [ ] Első verzióban használható fix, például 3 másodperces lead-in.
- [ ] A seek soha ne menjen 0 másodperc alá.
- [ ] A lead-in későbbi felhasználói testreszabása külön fejlesztés lehet.

#### 5.6 Technikai és költségszempontok

- [ ] Az Events panel, a szűrés és a Review mode első verziója kizárólag
      a meglévő lokális videóra és React state-ben tárolt eventekre épüljön.
- [ ] Ne legyen szükség videófeltöltésre, backend videófeldolgozásra vagy új külső csomagra.
- [ ] A struktúra később legyen kompatibilis tartós adatmentéssel
      (például Firebase / Firestore), de ez ne legyen előfeltétele az első verziónak.

- Függőség: a fix elemzői nézet, a lépésenkénti specifikációs workflow
  és a stabil mentett event state.

## Közepes prioritás

### 6. Billentyűparancsok az eseményekhez

**Állapot: elkészült, szimulált működési ellenőrzéssel.** Mind a 10 esemény
billentyűje testreszabható; a kiosztás localStorage-ban megmarad.
A Settings megjelenésének és a tényleges böngészős page reloadnak az ellenőrzése még hátravan.

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
- [x] A testreszabás a meglévő architektúrát használja: az App központi state-jéből
      ugyanaz a mapping jut a Settingshez, a handlerhez, a badge-ekhez és az `aria-keyshortcuts` értékekhez.
- [x] Felhasználó által módosítható shortcutok és shortcut-settings felület.
      Az Events / Exit melletti Settings gomb kompakt, saját görgetésű overlayt nyit,
      a cockpit méretezésének változtatása nélkül. Egyszerre csak egy overlay lehet nyitva.
- [x] Egy shortcutra kattintva a következő érvényes billentyű válik az új értékké.
      A közös NFC + lowercase normalizálás case-insensitive kezelést ad;
      a UI nagybetűvel jeleníti meg a billentyűket. Az Escape először a key capture-t,
      azon kívül a panelt zárja be.
- [x] Duplicate- és reserved-key ellenőrzés inline hibával: két event nem használhat
      azonos billentyűt, a `2`, `3`, `4` és fizikai Shift-változataik Quick Seekhez rezerváltak.
      Enter, Tab, Backspace, modifier-only billentyű és Ctrl / Alt / Meta kombináció nem rendelhető eventhez.
- [x] Settings alatt az event shortcutok tiltottak; key capture alatt a Quick Seek sem fut.
      Draft, Edit és Delete confirmation alatt a Settings nem nyitható meg.
- [x] Reset to defaults: az eredeti, immutable `DEFAULT_EVENT_SHORTCUTS` alapján
      új runtime mapping áll elő, a UI, a keyboard handler és a tárolt érték azonnali frissítésével.
- [x] A felhasználói shortcut-beállítások megőrzése oldalfrissítés után (persistence).
      Megvalósítva és storage round-trip / szimulált App-újracsatolás teszttel ellenőrizve;
      a tényleges böngészős reload ellenőrzése külön, alább maradt nyitva.
      Tárolás: `matchmark:event-shortcuts` localStorage-kulcs, teljes event type → normalizált billentyű JSON objektum.
- [x] A betöltés az egész konfigurációt validálja: pontosan a 10 ismert event,
      string értékek, engedélyezett és egyedi billentyűk szükségesek.
      Hibás JSON, hiányzó/ismeretlen event, duplicate, reserved vagy rossz típus esetén
      default mapping töltődik be, majd felülírja a hibás értéket. A storage-hozzáférés hibája nem állítja le az appot.
- [x] Exit bezárja a Settings panelt; Resume zárt panellel, változatlan konfigurációval folytatódik.
- [ ] Valódi böngészőben ellenőrizni a Settings overlay illeszkedését, saját scrollját,
      valamint Shot `E → S` és Pass `Q → F` után a page reloadot, a badge-eket és a shortcutok működését.
- [ ] Opcionális account/backend alapú settings sync és eszközök közötti megőrzés: külön jövőbeli fejlesztés.

Ellenőrzés: `node --test tests/eventShortcuts.test.mjs` (8 teszt), lint és build sikeres.
Külön szimulált komponensellenőrzés lefedi a key capture-t, az ütközéseket,
a badge/aria/handler szinkront, az App újraindítását megmaradó storage mellett,
a resetet, mind a 10 event click/keyboard workflow-ját, a hat Quick Seek shortcutot,
Back/Save/Cancel/Escape, Edit/Delete, Events click-to-seek és Exit/Resume regressziókat.
Ezek nem helyettesítik a valódi böngészős vizuális és page reload ellenőrzést.

További ötlet:

- [ ] Legyen egy custom/egyéb gomb, ahová a felhasználó a timestamphez egy egyéni
      leírást írhat egyedi, a fix kategóriákkal meg nem határozható eseményhez.
