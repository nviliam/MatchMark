# MatchMark – fejlesztési ötletek

A projekttel kapcsolatos, még kidolgozásra váró ötletek gyűjtőhelye.
Ha egy ötlet konkrét fejlesztési feladattá válik, GitHub issue készülhet belőle.

Az alábbi sorrend javasolt megvalósítási sorrend is: először az elemzői nézet
kerete, majd az eseményrögzítés folyamata készüljön el.

Állapotok: **elkészült**, **részben elkészült**, **tervezett**, **ötlet**.
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

**Állapot: részben elkészült.** Az Events panel, a kombinált Event type + Player szűrés
és a Review mode fix context lead-innel elkészült; a lead-in testreszabása későbbi feladat.
A teljes mentett eseménylista React state-ben marad,
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

**Állapot: elkészült, automatizált működési ellenőrzéssel.** A kompakt `Event type`
select az aktív értéket mutatja; a valódi böngészős vizuális ellenőrzés még hátravan.

- [x] Az Events panelben lehessen eseménytípus szerint szűrni.
- [x] Legyen `All` opció és külön szűrő mind a központi konfigurációban szereplő event type-hoz.
- [ ] Az aktív filter legyen vizuálisan egyértelműen jelölve.
      A select aktuális értékének működése tesztelt; a vizuális ellenőrzés még hátravan.
- [x] A panel mutassa a szűrés eredményeként látható események számát.
- [x] A szűrés frontend oldalon, a meglévő React state alapján történjen;
      ne igényeljen adatbázist vagy backendet.

Megvalósult felépítés:

- A `src/config/eventDefinitions.ts` a UI label, a megjelenítési sorrend és a rail-elhelyezés
  közös konfigurációja. A filter, az action gombok és a Shortcut Settings ebből kapják
  a típuslistát/sorrendet és a labelt; ismeretlen ID megjelenítése: `Unknown event`.
- A mentett event továbbra is stabil `type` ID-t tartalmaz (például `shot`),
  eventenként tárolt UI label nélkül. Az adatmodell és a korábbi ID-k nem változtak.
  A label későbbi átnevezése nem igényli a mentett adatok átírását; ez előkészíti
  az eventtípusok módosítását és a későbbi persistence/backend integrációt.
- A filter a VideoPlayer session-szintű, közös `filters` React state-jének része; alapértéke `All`.
  Bezárás, újranyitás, Settingsre váltás és Exit/Resume alatt megmarad;
  videócsere vagy videóhiba esetén `All`-ra áll vissza. Nincs filter persistence.
- A `getFilteredEvents` helper szűrt, timestamp szerint rendezett listát ad vissza;
  nem módosítja az eredeti eseménylistát vagy az event objektumokat. A VideoPlayer
  `useMemo`-val számolja a `filteredEvents` értékét, a count ennek a hosszából származik.
  Az 5.3-mal már a Player filtert is figyelembe veszi, és később a Review számára is átadható.
- Üres munkamenet: `No events yet.`; találat nélküli kombináció: `No events match these filters.`.
  A click-to-seek továbbra is az eredeti timestampet és a meglévő handlert használja.
- Ellenőrzés: `npm test` (szűrés, immutabilitás, dinamikus metadata, szimulált panel-lifecycle
  és seek, shortcut/persistence regressziók), lint és build sikeres.

#### 5.3 Player szerinti szűrés

**Állapot: elkészült, automatizált működési ellenőrzéssel.** A valódi böngészős
vizuális ellenőrzés még hátravan.

- [x] Az Events panelben lehessen játékos szerint is szűrni.
- [x] Legyen `All players` opció.
- [x] A Player filter és az Event type filter egymással kombinálható legyen.
- [x] Például lehessen csak egy adott játékos összes lövését vagy passzát megjeleníteni.
- [x] Böngészőben ellenőrizni a két kompakt select illeszkedését, az aktív értékek
      olvashatóságát és a panel saját görgetését a fix analysis layoutban.

Megvalósult felépítés:

- A játékoslista központi forrása továbbra is `src/data/players.ts`. A VideoPlayer
  ezt adja át az EventsPanelnek; a select opciói dinamikusan készülnek belőle.
  A filter nem feltételez fix játékosszámot vagy konkrét neveket/mezszámokat.
- A filter stabil `playerId` alapján működik: a jelenlegi numerikus ID-k és a domain
  típusok változatlanok. A név és a mezszám kizárólag display adat; az event struktúra
  továbbra is csak a `playerId` kapcsolatot tárolja, player label nélkül.
- A közös `formatPlayerLabel` helper (`src/utils/players.ts`) a filterben, az event
  listában, a specifikációs workflow-ban és a Saved összefoglalóban is használatos.
  Ismert játékos: `#9 Kovács Péter`; mezszám nélkül csak a név;
  nem feloldható playerId esetén `Unknown player` jelenik meg.
- A VideoPlayer lokális `filters` state-je `{ eventType, playerId }` formájú.
  A külön `PlayerFilter` típus `Player["id"] | "all"`; az `all` kizárólag UI-érték,
  nem mesterséges domain player. Nincs globális filter state vagy localStorage persistence.
- A `getFilteredEvents(events, filters)` mindkét feltételt AND logikával alkalmazza,
  és timestamp szerint növekvő listát ad vissza. A `filteredEvents` továbbra is
  `useMemo`-val képzett adat, az `events` és a teljes `filters` objektum függvényében;
  nincs külön lista- vagy count state. A találatszám `filteredEvents.length`.
- Mindkét filter megmarad panelbezárás/újranyitás, Settingsre váltás és Exit/Resume
  alatt. Új videó vagy videóhiba ugyanazzal a `resetEventFilters` helperrel állítja
  vissza őket `All` / `All players` értékre. Page reload után nem maradnak meg.
- A szűrés nem módosítja az eredeti event arrayt, az event objektumokat vagy a rostert.
  A click-to-seek továbbra is az eredeti timestampet és a meglévő `seekToEvent` handlert
  használja; a kattintás bezárja a panelt, automatikus lejátszás nélkül.
- Ez az egyetlen közös `filteredEvents` lista az 5.4 Review mode bemenete is;
  roster-szerkesztés és backend továbbra sem készült.

Ellenőrzés: `npm test` (19 teszt), lint és build sikeres. A tesztek lefedik az
All/All, csak típus, csak játékos és kombinált szűrést (például Shot + #9, Pass + #7),
a találat nélküli állapotot, a countot, a filterváltásokat, az immutabilitást,
a 18 játékosos dinamikus opciólistát, az azonos nevű/mezszámú játékosok külön ID-it
és a hiányzó mezszám / ismeretlen player fallbacket. A panel-lifecycle, a kombinált
click-to-seek, a Settings és Exit/Resume alatti megőrzés, a videócsere/hiba miatti
közös reset és a workflow/shortcut regressziók szimulált komponensellenőrzéssel futottak;
ez nem helyettesíti a valódi böngészős vizuális ellenőrzést.

#### 5.4 Szűrt eseménysor visszanézése

**Állapot: elkészült, szimulált komponens-/videóellenőrzéssel.** A valódi böngészős
vizuális ellenőrzés még hátravan.

- [x] A szűrt eseményekből lehessen `Review events` módot indítani.
- [x] Review módban az események időrendben legyenek egymás után visszanézhetők.
- [x] Legyen `Previous` és `Next` vezérlés.
- [x] Jelenjen meg az aktuális pozíció, például `3 / 8`.
- [x] Az aktuális eventre váltáskor a videó automatikusan ugorjon az eseményhez.
- [x] A Review mode-ból lehessen egyértelműen kilépni anélkül, hogy a szűrési állapot elveszne.
- [x] Valódi böngészőben ellenőrizni a Review indítógombot, a panel saját scrollját,
      az alsó navigáció illeszkedését, a Review alatt megnövelt videóterületet,
      a normál layout visszaállását és az oldalgörgetés hiányát.

Megvalósult felépítés:

- Az Events panel `Review N events` gombja az aktuális Event type + Player filterekből
  származó egyetlen `filteredEvents` listát használja. Üres listánál disabled;
  egyetlen találatnál is indítható. Indításkor a panel bezár, az index 0-ra kerül.
- A Review state a VideoPlayer lokális `reviewIndex: number | null` állapota:
  `null` jelenti a kikapcsolt Review-t. Nincs külön `reviewEvents`, event- vagy
  timestamp-másolat; az aktuális esemény mindig `filteredEvents[reviewIndex]`.
- A külön `ReviewControls` komponens a meglévő, fix 56 px-es bottom rail tartalmát
  váltja fel: Previous, 1-től induló pozíció, Next, közös utilitykkel formázott
  eseményösszefoglaló és Exit Review. Review alatt nincs külön app Exit gomb;
  Exit Review után a normál analysis nézetben, a felső railen ismét elérhető.
- A `tagging-workspace-review` class kizárólag a Review state-ből származik.
  Review alatt az `EventButtons` nem renderelődik, így a top/left/right event action
  rail és a shortcut badge-ek sincsenek jelen. A Grid egyetlen rugalmas oszlopra
  és két sorra vált: `minmax(0, 1fr)` videó + változatlan, 56 px-es alsó rail.
  A felső és oldalsó trackek helyét a videó kapja, `object-fit: contain` mellett.
  Az analysis nézet továbbra is `100dvh`, oldalgörgetés nélkül; szűk helyen csak
  az alsó sáv belseje görgethető. Review-n kívül a normál analysis layout változatlan.
- Exit Review, Escape, app Exit, videócsere vagy videóhiba után a normál action
  railek és badge-ek automatikusan visszatérnek. Nincs külön rail-visibility state,
  és a layout-finomítás nem módosítja az indexet, a szűrést vagy a navigációs/seek logikát.
- Az index vagy az aktuális esemény változását figyelő effect a közös `seekVideo`
  helperen át seekel; az 5.5-től kizárólag Review alatt 3 másodperces lead-innel.
  A normál Events click-to-seek ugyanazt az alacsony szintű helpert használja,
  de továbbra is pontosan az eredeti timestampre ugrik. Nincs autoplay vagy automatikus léptetés;
  a natív HTML5 play/pause vezérlés továbbra is használható.
- Az első eseménynél Previous, az utolsónál Next disabled; nincs körbefordulás.
  Egyetlen eseménynél `1 / 1` látszik, mindkét navigációs gomb tiltott.
- Review alatt Events, Settings és minden event action / event shortcut tiltott;
  a Saved Edit/Delete felület helyét a ReviewControls veszi át. Így a felhasználó
  nem módosíthatja a filtereket vagy az eseménylistát navigáció közben.
- Nincs deep copy snapshot. Ha külső frissítés mégis megváltoztatja a listát,
  az aktuális index az új listából számítódik; az új aktuális eseményhez új seek tartozik.
  Ha az index már nem érvényes vagy a lista kiürül, a Review biztonságosan bezárul.
- A hat Quick Seek shortcut Review alatt is működik; nem változtatja az indexet,
  és egy közönséges újrarenderelés nem seekel vissza az eventhez. Previous/Next
  számára most nem készült új keyboard shortcut.
- Exit Review és Escape bezárja a Review-t, változatlan eventekkel és filterekkel;
  visszatér az előző Saved összefoglaló, ha volt ilyen. Az Escape prioritása:
  a shortcut capture előbb elfogyasztja a saját Escape-jét; a közös handlerben
  draft/edit/delete megszakítás, Review kilépés, majd overlay-bezárás következik.
  Ezek a workflow-k a UI-ban kölcsönösen kizárják egymást.
- Az alkalmazás Exit handlere változatlan; a gomb Review-n kívül érhető el. Resume után a filterek
  és a videópozíció megmaradnak, de a Review zárva marad. Videócsere vagy videóhiba
  a meglévő közös resetben a filtereket és a Review indexet is visszaállítja.
- A Review nem persistent, az event adatmodell változatlan; a navigáció nem módosítja
  az `events`, `filteredEvents` vagy `players` tartalmát. Backend nem készült.

Ellenőrzés: `npm test` (26 teszt), lint és build sikeres. Az új tesztek lefedik a
kombináltan szűrt 4 esemény időrendi bejárását, a pontos seeket, a boundaryket,
az üres/egyelemű listát, az adat- és referencia-integritást, a Quick Seeket,
a Review alatti tiltásokat, az Escape prioritásait, az Exit/Resume-ot, a videócsere/hiba
miatti resetet és a külső listafrissítések defenzív kezelését. A teszthelper most
megőrzi a memo/callback referenciákat, és szimulálja a key-capture prioritását is.
A layout-tesztek ellenőrzik az event csoportok és badge-ek eltűnését/visszatérését,
a Review layout class váltását, a bottom rail megmaradását, a videóforrás megőrzését
és az Exit Review utáni normál app Exit / Resume működését. A videó tényleges pixelmérete és a responsive
megjelenés böngészőben még nincs ellenőrizve.
A szimulált ellenőrzés nem helyettesíti a valódi böngészős vizuális tesztet.

#### 5.5 Context lead-in

**Állapot: elkészült, automatizált helper- és szimulált komponens-/videóellenőrzéssel.**

- [x] Review módban a videó ne pontosan az event timestampjén induljon,
      hanem néhány másodperccel előtte, hogy az esemény kialakulása is látható legyen.
- [x] Első verzióban fix, 3 másodperces lead-in legyen.
- [x] A seek soha ne menjen 0 másodperc alá.
- [x] A lead-in későbbi felhasználói testreszabása külön fejlesztés legyen:
      a paraméterezhető helper és ennek dokumentálása elkészült, settings UI nem készült.
- [ ] A későbbi lead-in settings UI megvalósítása külön feladat.

Megvalósult felépítés:

- A `REVIEW_LEAD_IN_SECONDS = 3` konstans egyetlen központi helye a
  `src/config/review.ts`. A `src/utils/review.ts` tiszta
  `getReviewSeekTime(timestamp, leadIn)` helpere számolja a célt:
  `Math.max(0, timestamp - leadIn)`, fölösleges kerekítés és duration-clamp nélkül.
- A helper negatív/nem véges timestampnél 0-ra esik vissza; negatív vagy nem véges
  lead-in esetén 0 másodperces offsetet használ, így hibás lead-in sem seekel előre.
- Kizárólag a Review aktuális eseményét figyelő effect használja a lead-int.
  Start, Previous és Next ugyanazon az útvonalon jut a meglévő `seekVideo` helperhez;
  nincs külön lead-in logika az egyes navigációs gombokhoz.
- A normál Events panel click-to-seekje változatlan: pontosan `event.timestamp`.
  A Quick Seek szintén változatlan, mindig az aktuális `video.currentTime` értékéhez
  képest mozog; a lead-in helperhez nincs bekötve. Autoplay továbbra sincs.
- A ReviewControls az eredeti event timestampet mutatja. A mentett adatmodell,
  az event objektumok, az index, a kombinált filterek, a count és a boundaryk
  változatlanok; nem tárolunk `leadIn`, `reviewSeekTime` vagy `contextStart` mezőt.
- Exit Review megtartja az aktuális videópozíciót és a filtereket; újraindításkor
  ismét az első szűrt esemény lead-in pontjára ugrik. A helper explicit `leadIn`
  paramétere később más értékeket is fogadhat; most nincs settings UI, persistence
  vagy felhasználónkénti beállítás.

Ellenőrzés: `npm test` (31 teszt), lint és build sikeres. Az új tesztek lefedik a
0 / 1.5 / 1.8 / 3 / 3.1 másodperces edge case-eket, a törtértékeket approximate
assertionnel, az eltérő lead-in paramétereket, a hibás inputokat, a Review start / Next /
Previous útvonalat, a 0-ra clampet, az exact Events click-to-seek regressziót,
az eredeti summary timestampet, az eventek változatlanságát, az Exit / újraindítást
és a relatív Quick Seeket. Az új lead-in valódi böngészős lejátszási ellenőrzése
nem történt meg; a komponensellenőrzések szimulált videóelemmel futottak.

#### 5.6 Technikai és költségszempontok

- [ ] Az Events panel, a szűrés és a Review mode első verziója kizárólag
      a meglévő lokális videóra és React state-ben tárolt eventekre épüljön.
- [ ] Ne legyen szükség videófeltöltésre, backend videófeldolgozásra vagy új külső csomagra.
- [ ] A struktúra később legyen kompatibilis tartós adatmentéssel
      (például Firebase / Firestore), de ez ne legyen előfeltétele az első verziónak.

- Függőség: a fix elemzői nézet, a lépésenkénti specifikációs workflow
  és a stabil mentett event state.

## Közepes prioritás

### 6. Event rendszer továbbfejlesztése és testreszabhatósága

#### 6.1 Event model refactor és konfigurációvezérelt event rendszer

**Állapot: részben elkészült; a jelenlegi működést megőrző metadata/workflow-refaktor
elkészült.** A jelenlegi eventkészlet továbbra sem végleges. A
`src/config/eventDefinitions.ts` a UI- és workflow-metadata központi forrása;
az eventtípusok funkcionális újratervezése, a migration és a backend előtti
véglegesítés későbbi feladat.

- [x] Minden event type-nak legyen stabil belső ID-ja és külön display labelje.
- [x] Az event action gombok a központi event-definíciókból generálódjanak.
- [x] A filterek automatikusan a központi event-definíciókból készüljenek.
- [x] A keyboard shortcut rendszer ugyanazokat a stabil event ID-kat használja.
- [x] A Review mode ne függjön konkrét eventtípusoktól.
- [x] Event label átnevezése ne igényelje a korábban mentett eventek módosítását.
- [x] Az eventhez tartozó mezők és opciók ne legyenek több komponensben
      szétszórtan hardcode-olva.
- [x] A jelenlegi event-specifikus mezők deklaratív konfigurációból legyenek
      leírhatók: Outcome és Body Part. Új mező vagy subtype nem került be.
- [ ] Új event type hozzáadása lehetőleg csak a központi konfiguráció és a hozzá
      tartozó domain-típus módosítását igényelje.
      A UI már a definíciókból dolgozik, de új domain eseménynél a típusbiztos
      factory és a default shortcut mapping bővítése is szükséges.
- [ ] Meglévő event type megszüntetésére vagy átalakítására később legyen
      migration stratégia.
- [x] A refaktor során a rendszer maradjon TypeScript-szinten típusbiztos;
      ne általános `Record<string, unknown>` alapú eventmodellre épüljön.
- [ ] A backend/persistence bevezetése előtt az eventmodell legyen kellően stabil.

Megvalósult felépítés:

- Az `EventDefinition` stabil `id`, külön `label`, `category`, `rail`, `order`,
  `playerRequired` és rendezett `fields` metadatát tartalmaz. A kulcs és az ID
  egyezését, valamint az eventhez megengedett mezőket/opció-ID-kat a TypeScript
  a meglévő domain union alapján ellenőrzi. A kategória leíró metadata:
  `possession`, `defending` vagy `contest`; nem vezet be új UI-csoportosítást
  vagy workflow-elágazást, és nem kerül a mentett eseménybe.
- Az `EventFieldDefinition` az `outcome` / `bodyPart` ID szerint típusozott union;
  mezőnként label, required flag és típusos `{ id, label }` opciólista tartozik hozzá.
  Minden jelenlegi mező kötelező. A Shot Outcome → Body Part, a Pass / Dribble /
  Tackle / Duel Outcome mezőt kap, a többi event `fields: []` definíciót használ.
  A Tackle és Duel közös Won/Lost opciólistája egyszer szerepel a konfigurációban.
- Az `EventForm` lépéssorrendje a `fields` listából, majd a `playerRequired`
  alapján külön Player lépésből és a változatlan Save előtti Review event lépésből áll.
  A mezőcímkék, opciógombok és választásjelölések a definíciót használják;
  nincs eventtípushoz kötött Shot-ág a formban. A Back, Save, Cancel, Edit prefill
  és az eredeti timestamp megőrzése változatlan.
- Az action gombok railje/sorrendje/labelje, az Events filter és a Shortcut Settings
  eventlistája/labelje ugyanebből a konfigurációból készül. A default billentyűk
  továbbra is az `eventShortcuts.ts` stabil EventType → key mappingjében vannak;
  a shortcut storage és a Quick Seek nem változott.
- A közös `formatEventDetails` a definíciók mezősorrendjével és option labeljeivel
  formázza az Events listát, a Saved összefoglalót, a ReviewControls tartalmát és
  az edit/create workflow összefoglalóját. A játékosmegjelenítés továbbra is a
  közös `formatPlayerLabel` helpert használja. Ismeretlen runtime ID-nál a lookup
  biztonságosan tér vissza; az `Unknown event` fallback megmaradt.
- A `MatchEvent` discriminated union és a mentett event struktúrája változatlan.
  A `createEventDetails` domain factory `switch`-e megmaradt: ez hozza létre az
  eventtípushoz illő objektumot `as MatchEvent` cast nélkül. Az outcome-validáció
  már a közös meződefiníciók opcióit ellenőrzi; metadata nem kerül a mentett adatba.
  Minden jelenlegi event továbbra is kötelező `playerId` kapcsolatot tárol;
  későbbi opcionális játékoshoz a domain és a factory módosítása is szükséges.
- Migration és Custom event nem készült. Új mezőfajtához a domain típusok és
  a típusos field-kezelés bővítése is kell; nem készült általános form builder
  vagy felhasználó által definiálható eventséma.

Audit: a mezősorrend és Shot-specifikus lépés az `EventForm`-ban, az opciók és
labelek a `utils/events.ts`-ben és a formban, az eseményrészletek formázása pedig
az EventList / SavedEventSummary / ReviewControls komponensekben volt ismételve.
Ezeket a központi field metadata és a közös formatter váltotta fel. A domain union,
a típusbiztos factory elágazásai és a default shortcut mapping szándékosan maradtak.
A konkrét eventekre épülő tesztadatok továbbra is regressziós referenciák;
a dinamikus metadata teszt fixture-ja az új definícióalakhoz igazodott.

Ellenőrzés: `npm test` (47 teszt), lint és build sikeres. A 16 új teszt lefedi
a tíz definíció teljességét, egyedi ID-it, az eredeti label/sorrend/rail/opció
kiosztást, minden event create/edit workflow-ját, a Backet, prefillt, kézi Save-et,
Cancelt, a required mezők és a Player validációját, a domain-only factory-outputot,
a közös formázást és az ismeretlen runtime event fallbackjét. Tesztbeli
metadata-módosítás ellenőrzi a mezősorrend és labelek átvezetését a fogyasztókhoz;
egy fordítási teszt hibás ID/field/opció és hiányos domain objektum esetén is
ellenőrzi a TypeScript-korlátokat. A meglévő filter-, shortcut-, Review lead-in-,
seek-, Escape-, Exit/Resume- és reset-regressziók is zöldek. A komponensellenőrzések
szimulált hookokkal/videóval futottak; valódi böngészős vizuális teszt nem történt.

Adatfolyam:

```text
Event definitions
      ↓
Action buttons → Specification workflow → Saved event
                                             ↓
                                  Events list → Filters → Review

Event definitions → Shortcuts → Action buttons
```

#### 6.2 Custom / Other event

**Állapot: ötlet.** Legyen lehetőség olyan esemény rögzítésére is, amely nem fér bele
egyik előre definiált event type-ba sem.

- [ ] Legyen külön Custom / Other event type stabil belső ID-val.
- [ ] Custom event mentésekor a felhasználó adhasson egy rövid egyéni leírást.
- [ ] A leírás legyen kötelező.
- [ ] A leírás hossza legyen korlátozott, hogy ne váljon általános jegyzetmezővé
      (például 120–200 karakter).
- [ ] Játékos hozzárendelése legyen opcionális.
- [ ] A custom event ugyanúgy kerüljön be az Events listába.
- [ ] A custom event legyen használható Review mode-ban.
- [ ] Lehessen Custom eventre szűrni.
- [ ] A mentett adat stabil event type ID-t és a felhasználó által megadott
      `description` mezőt tartalmazzon.
- [ ] A custom event UI labelje ne legyen redundánsan minden eventben eltárolva.
- [ ] A Custom event később exportnál vagy backend persistence-nél is kezelhető legyen.
- Függőség: a 6.1 konfigurációvezérelt eventmodell és a 7. rosterkezelés;
  az opcionális játékos-hozzárendelést ezekkel összhangban kell kialakítani.

### 7. Player / roster management

**Állapot: részben elkészült.** A 7.1 Add Player / editable roster foundation,
7.2 Edit Player és 7.3 Delete Player elkészült, szimulált működési ellenőrzéssel.
A runtime roster egyetlen React state-ben él; a tartós mentés és az
active/inactive modell későbbi feladat.

- [x] A felhasználó vehessen fel új játékost.
- [x] Új játékosnál legalább név legyen megadható.
- [x] A mezszám legyen opcionális.
- [x] Meglévő játékos neve és mezszáma szerkeszthető legyen.
- [x] Szerkesztéskor a játékos stabil `playerId` értéke ne változzon.
- [x] Játékos törölhető legyen.
- [x] Törlés előtt legyen megerősítés.
- [x] Törlés előtt jelenjen meg, hány event hivatkozik az adott játékosra.
- [x] Már eventekben használt játékos törlése ne történjen észrevétlenül.
- [x] A rendszer rosterkezelés közben is kezelje biztonságosan azt az esetet,
      ha egy event `playerId` értéke már nem található az aktuális rosterben.
- [x] Az `Unknown player` fallback továbbra is működjön.
- [x] A Player filter automatikusan az aktuális, szerkeszthető rosterből dolgozzon.
- [x] Az event-specifikációs workflow automatikusan az aktuális rosterből dolgozzon.
- [x] A Review mode player-megjelenítése automatikusan az aktuális rosterből dolgozzon.
- [x] A rosterkezelés se építsen fix játékosszámra vagy konkrét nevekre.
- [ ] A roster struktúrája később backendből is betölthető legyen az UI jelentős
      átírása nélkül.
- [ ] Később megfontolható active/inactive player státusz a hard delete helyett.
- [ ] A runtime roster maradjon meg oldalfrissítés után (külön persistence-fejlesztés).

#### 7.1 Add Player / editable roster foundation

- A `src/data/players.ts` kizárólag immutable default/demo seedet exportál
  `DEFAULT_PLAYERS` néven. A tömb és elemei fagyasztottak; a VideoPlayer saját
  tömböt és saját Player objektumokat másol a kezdeti `players` React state-be.
  Futás közben egyetlen roster van; a form csak a mezőértékeket és a hibát tárolja.
- A `PlayersPanel` az Events/Settings melletti Players gombbal nyitható overlay,
  közös panelstílussal és saját belső scrollal. A teljes rostert a meglévő
  `formatPlayerLabel` formázza, üres állapotban `No players yet.` jelenik meg.
  A sorok Edit actionje a 7.2-ben, Delete actionje és megerősítése a 7.3-ban készült el.
- A Name kötelező, trimelt, legfeljebb 80 karakteres; szóköz, ékezet, kötőjel és
  aposztróf megengedett. A Shirt number opcionális; ha kitöltött, 0–99 közötti
  egész szám szükséges. Üres mezszámnál a `number` mező kimarad. A Player típusa
  `number?: number` lett; a numerikus `id` változatlan.
- A `src/utils/roster.ts` közös validációját a form és a state-owner is használja.
  A kezdeti max(roster ID) + 1 algoritmust a 7.3 session-szintű, monoton
  `nextPlayerId` számlálóra cserélte, hogy törlés után se lehessen ID-t újra kiosztani.
  Azonos név és mezszám is megengedett.
  Hozzáadáskor új tömb és új Player jön létre, a korábbi objektumok és a seed nem mutálódnak.
- Sikeres Add után a form kiürül, a fókusz a Name mezőre kerül, és az új játékos
  azonnal megjelenik a listában. A Player filter, az EventForm create/edit lépése,
  az Events listája, a Saved summary és a ReviewControls ugyanazt az aktuális
  rostert kapja propsként; a statikus seedet csak a VideoPlayer importálja.
- Create/Edit draft, event Delete confirmation és Review alatt Players nem nyitható.
  A közös overlay state biztosítja, hogy Events/Settings/Players közül csak egy
  legyen nyitva. Players alatt az event shortcutok tiltottak; inputmezőn kívül
  a meglévő Quick Seek továbbra is használható.
- Add módban Close és Escape csak a panelt zárja, a roster megmarad; a félkész Add form
  eldobódik. Bezáráskor a fókusz visszakerül a Players gombra.
  Exit bezárja a panelt, Resume zárva hagyja, a roster ugyanazon React sessionben megmarad.
  Új videó és video error sem reseteli a rostert; a meglévő event/filter/review reset változatlan.
- Page reload után ismét a default roster indul. Nincs roster localStorage,
  IndexedDB, backend vagy Firebase. Az event adatmodell nem változott:
  csak a stabil `playerId` kapcsolatot tárolja, név/mezszám/label másolata nélkül.
  A tiszta `Player[]` state és a props-alapú fogyasztók később persistence-szel bővíthetők.

Ellenőrzés: `npm test` (56 sikeres teszt, ebből 9 új roster-teszt), lint és build sikeres.
A tesztek lefedik a validációt, a trimet, opcionális mezszámot, duplikált adatokat,
ID-képzést, seed-immutabilitást, form-resetet, dinamikus filter/workflow/display integrációt,
unknown-player fallbacket, overlay/shortcut tiltásokat, Exit/Resume, videócsere és videóhiba
alatti megőrzést, valamint az új React session default rosterét. A korábbi 47 regressziós
teszt is sikeres; a fogyasztók tesztjei explicit rostert kapnak.
Valódi böngésző hiányában a Players panel vizuális illeszkedésének és scrolljának ellenőrzése
még hátravan; a komponensvizsgálatok szimulált hookokkal/videóval futottak.

#### 7.2 Edit Player

- Minden játékossor kompakt Edit gombot kapott. Az Edit a Players panelen belül,
  ugyanabban az űrlapban váltja fel az Add módot; nincs külön overlay vagy második roster.
  A lokális `editingPlayerId` csak az aktív játékos numerikus ID-ját tárolja.
  Egyszerre egy játékos szerkeszthető; a sorok Edit gombjai addig tiltottak.
- Indításkor a Name és Shirt number mező a jelenlegi rosterből töltődik fel;
  hiányzó mezszámnál üres input jelenik meg. A Save changes ugyanazt a
  `validatePlayerInput` helpert használja, mint az Add, a formban és a state-ownernél is.
  A név trimelt, kötelező, legfeljebb 80 karakter; a mezszám opcionális, 0–99 közötti
  egész. A mezszám törölhető, azonos név és mezszám továbbra is megengedett.
- A VideoPlayer funkcionális state-frissítése a `src/utils/roster.ts` `updatePlayer`
  helperével új tömböt és a szerkesztett játékoshoz új objektumot készít.
  A numerikus ID változatlan, a többi játékos objektuma és az immutable demo seed érintetlen.
  A Player és MatchEvent domain modell nem változott; nincs player snapshot vagy event migration.
- A meglévő event objektumok és `playerId` kapcsolataik változatlanok. A közös rosterből
  történő lookup miatt az Events, Saved summary, Review és create/edit workflow
  azonnal az új labelt használja. Az aktív Player filter ugyanazt az ID-t tartja meg;
  csak az option label frissül. Az Unknown player fallback továbbra is működik.
- Sikeres Save után az Edit bezárul és az Add form kiürül. Cancel mentés nélkül resetel.
  Az első Escape csak az Editet szakítja meg: a capture listener elfogyasztja az eseményt,
  ezért a workspace panelbezáró handlere ugyanarra a lenyomásra nem reagál.
  A következő külön Escape bezárja a panelt. A listenert az Edit vége/unmount eltávolítja.
- Az X, másik overlay megnyitása és az app Exit eldobja a nem mentett szerkesztést.
  Resume zárt panellel folytatódik; csak a mentett roster-módosítások maradnak meg.
  Új videó és video error sem reseteli a mentett rostert. Create/Edit event draft,
  event Delete confirmation és Review alatt a Players panel továbbra is tiltott.
- A Delete Player és reference count külön, a 7.3-ban készült el.
  Nincs active/inactive állapot vagy persistence; oldalfrissítés után
  továbbra is a default/demo roster töltődik be.

Ellenőrzés: `npm test` (62 sikeres teszt, ebből 6 új Edit Player teszt), lint és build sikeres.
Az új tesztek lefedik a prefillt, közös Add/Edit formot és validációt, stabil ID-t,
mezszám törlését, duplikált adatokat, immutable update-et, Cancelt, kétszeri Escape-et,
listener cleanupot, a változatlan event objektumokat, aktív filtert és frissülő megjelenítéseket,
valamint a mentett/unsaved Edit viselkedését panelbezárás, Exit/Resume, videócsere és hiba esetén.
A tesztek szimulált hookokkal/videóval futottak; a Players panel valódi böngészős
vizuális és scroll-ellenőrzése elérhető böngésző hiányában továbbra is hátravan.

#### 7.3 Delete Player

- Minden játékossor Edit mellett kompakt, piros Delete gombot kapott. Ez csak
  megerősítést nyit a Players panelen belül; nincs natív confirm vagy új modal.
  A lokális `deletingPlayerId` átmeneti UI-state, nem külön roster vagy player-másolat.
- A `getPlayerEventCount(events, playerId)` helper mindig a teljes, aktuális mentett
  eseménylistából számolja a hivatkozásokat; a count nincs state-ben és nem függ
  az Events panel aktív szűrőitől. Nulla hivatkozásnál ezt külön szöveg jelzi;
  egy vagy több hivatkozásnál a szám és az Unknown player megjelenésre figyelmeztetés látszik.
  A szöveg minden esetben egyértelművé teszi, hogy a mentett eventek megmaradnak.
- Csak a végső Delete player gomb hívja a VideoPlayer `handleDeletePlayer` handlerét.
  A `removePlayer` helper immutable `filter` művelettel eltávolítja a játékost a
  runtime rosterből. A seed, az events tömb, az event objektumok és `playerId`
  értékeik változatlanok; nincs cascade delete, snapshot vagy migration.
- A régi események az Events, Saved és Review nézetben a meglévő `formatPlayerLabel`
  Unknown player fallbackjét használják. Az EventForm összefoglalója is ezt mutatja,
  ha egy szerkesztett event játékosa már hiányzik; Save csak létező játékossal lehetséges.
  A Review seek és a 3 másodperces lead-in változatlanul működik.
- Ha a törölt ID az aktív Player filter, csak `filters.playerId` áll vissza `all`-ra.
  Az Event type filter és másik játékos aktív filtere megmarad. All players alatt
  a fel nem oldható playerId-jú eventek is szerepelnek; a szűrés nem dobja el őket.
- Az új ID-t a VideoPlayer `nextPlayerId` refje osztja ki. Kezdőértéke a demo roster
  legnagyobb ID-ja + 1; minden érvényes Add eggyel növeli, a React state-updateren kívül.
  Az `appendPlayer` már explicit kiosztott ID-t kap, és tiszta frissítés marad.
  Delete és Edit nem csökkenti/reseteli a számlálót, üres roster, Exit/Resume,
  videócsere és videóhiba után is folytatódik. Új React sessionben újrainicializálódik.
  Így egy új játékos nem örökölheti egy törölt játékos régi eseményeit.
- Edit és Delete confirmation kölcsönösen kizárják egymást; megerősítés alatt az
  Add/Edit form helyét a confirmation foglalja el, a sorok Edit/Delete actionjei tiltottak.
  Megnyitáskor a Cancel kap fókuszt; a figyelmeztetés szöveges, a gombok billentyűzhetők.
- Cancel vagy az első Escape csak a megerősítést dobja el; a panel nyitva marad.
  Edit és Delete ugyanazt a capture-phase Escape handlert használja, amely megakadályozza
  az azonnali panelbezárást. A következő külön Escape zárhatja a panelt.
  X, másik overlay, Exit, videócsere vagy hiba eldobja a nem megerősített törlést.
  Resume zárt panellel folytatódik. A végrehajtott törlés ugyanazon sessionben megmarad,
  új videó és video error sem tölti vissza a demo játékosokat.
- Az összes játékos törölhető. Üres rosternél No players yet. és működő Add form
  látható; az event Player lépésben külön üzenet kéri a Cancel utáni játékosfelvételt.
  Törölt játékos nem szerepel a választási lehetőségek között, játékos nélküli Save tiltott.
- A Player és MatchEvent domain modell változatlan. Nincs persistence, backend,
  active/inactive mező, restore vagy undo; page reload után a demo roster visszatér.
  A backend-kompatibilitás, active/inactive és reload-persistence roadmap-pontok nyitva maradnak.

Ellenőrzés: `npm test` (70 sikeres teszt, ebből 8 új Delete Player teszt), lint és build sikeres.
Az új tesztek lefedik a 0/1/7 hivatkozást és a count újraszámolását, immutable törlést,
confirmation/Cancel/Escape/exkluzivitást, változatlan event objektumokat és ID-kat,
Unknown player megjelenítést, célzott filter-resetet, üres rostert és workflow-t,
Review/click-to-seek/Quick Seek működést, a kritikus delete 3 → add 4 esetet,
valamint az ID-k és törlések session-élettartamát. A tesztharness a numerikus refek
kezdeti értékét is megőrzi, így a tényleges allocator működését vizsgálja.
A komponens- és videóellenőrzések szimuláltak; elérhető böngésző hiányában valódi
vizuális és billentyűfókusz-ellenőrzés nem történt.

Megvalósult kapcsolat:

```text
Roster / Players
      ↓
stable playerId
      ↓
Saved events
      ↓
Filters / Review / Display
```

### 8. Keyboard shortcuts továbbfejlesztése

**Állapot: részben elkészült.** Az event shortcutok már módosíthatók és
localStorage-ban megmaradnak. A következő cél a videóvezérlési shortcutok
beemelése ugyanebbe a rendszerbe.

Az alábbi blokk az elkészült event shortcutok működését dokumentálja;
a 8.1–8.4 pontok a tervezett bővítéseket tartalmazzák.

**Meglévő event shortcutok**

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
- [x] Valódi böngészőben ellenőrizni a Settings overlay illeszkedését, saját scrollját,
      valamint Shot `E → S` és Pass `Q → F` után a page reloadot, a badge-eket és a shortcutok működését.

Ellenőrzés: `node --test tests/eventShortcuts.test.mjs` (8 teszt), lint és build sikeres.
Külön szimulált komponensellenőrzés lefedi a key capture-t, az ütközéseket,
a badge/aria/handler szinkront, az App újraindítását megmaradó storage mellett,
a resetet, mind a 10 event click/keyboard workflow-ját, a hat Quick Seek shortcutot,
Back/Save/Cancel/Escape, Edit/Delete, Events click-to-seek és Exit/Resume regressziókat.
Ezek nem helyettesítik a valódi böngészős vizuális és page reload ellenőrzést.

#### 8.1 Video control shortcutok megjelenítése

- [ ] A Shortcut Settings az event shortcutok mellett jelenítse meg a Quick Seek
      vezérléseket is.
- [ ] A Settings legyen legalább két logikai csoportra bontva:
      `EVENT SHORTCUTS` és `VIDEO CONTROLS`.
- [ ] A felhasználó egyértelműen lássa, hogy a Quick Seek funkciók léteznek.
- [ ] A beállítási felület bevezetésekor a jelenlegi defaultok maradjanak:

| Időlépés | Előre | Hátra |
| --- | --- | --- |
| 1.2 s | `2` → +1.2 s | `Shift+2` → -1.2 s |
| 1.5 s | `3` → +1.5 s | `Shift+3` → -1.5 s |
| 2.0 s | `4` → +2.0 s | `Shift+4` → -2.0 s |

#### 8.2 Video control shortcutok testreszabása

- [ ] A forward és backward seek shortcutok is legyenek módosíthatók.
- [ ] Az összes shortcut közös collision detectiont használjon.
- [ ] Egy billentyű vagy kombináció egyszerre csak egy actionhöz tartozhasson.
- [ ] Az event shortcut és video control shortcut se ütközhessen egymással.
- [ ] A jelenlegi key capture és normalizálási logika legyen újrahasznosítva.
- [ ] A shortcutok továbbra is localStorage-ban maradjanak meg oldalfrissítés után.
- [ ] Legyen `Reset all shortcuts to defaults` az összes actionre.
- [ ] Később opcionálisan lehessen külön csak az Event vagy csak a Video Controls
      csoportot resetelni.

A jelenlegi fix Quick Seek reserved-key ellenőrzést a közös ütközésvizsgálatnak
kell felváltania; az alapértelmezett kiosztás ettől még változatlan marad.

#### 8.3 Egységes shortcut action modell

- [ ] A shortcut rendszer ne kizárólag EventType → key mappingre épüljön.
- [ ] Legyen stabil, általános action-azonosítás, például:

```text
event.pass
event.shot
event.tackle

seek.forward.small
seek.forward.medium
seek.forward.large

seek.backward.small
seek.backward.medium
seek.backward.large
```

- [ ] A Settings, keyboard handler, collision detection és persistence ugyanazokat
      az action ID-kat használja.
- [ ] Új shortcut action később újabb párhuzamos rendszer létrehozása nélkül
      hozzáadható legyen.

#### 8.4 Későbbi video control testreszabás

- [ ] A seek időlépések (1.2 / 1.5 / 2.0 s) testreszabhatósága külön későbbi
      fejlesztés legyen.
- [ ] Első körben csak a billentyűk legyenek módosíthatók.
- [ ] Backend/account alapú shortcut sync és eszközök közötti megőrzés külön
      későbbi fejlesztés maradjon.

## Következő fejlesztések javasolt sorrendje

1. Event model / event definitions refactor (6.1).
2. Player / roster management (7.).
3. Custom / Other event (6.2).
4. Keyboard shortcut rendszer bővítése (8.1–8.3, közös action modellre építve).
5. Backend / persistence; a későbbi opcionális beállítások külön ütemezhetők.

Az eventtípusok és a roster még változni fognak. Ezeket célszerű a tartós
adatmentés bevezetése előtt stabilizálni, hogy később ne kelljen nagy
adatmigrációkat és kompatibilitási javításokat végezni.
