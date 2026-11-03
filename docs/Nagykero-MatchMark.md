Nagykeró × MatchMark landing page – koncepció
Cél
A Nagykeró WordPress-oldal és a MatchMark összekapcsolásának célja, hogy a Nagykeró legyen a tartalmi és bemutatkozó felület, míg a MatchMark külön, teljes képernyős webalkalmazásként fusson.

A javasolt felépítés:
- Nagykeró / WordPress: bemutatkozás, háttértörténet, funkciók, screenshotok, útmutató
- MatchMark: külön hosztolt React webapp
- A landing page fő CTA-ja egy Open MatchMark gomb, amely megnyitja az alkalmazást
A MatchMarkot nem érdemes közvetlenül a WordPress oldalba beágyazni. A teljes képernyős videóelemző felület külön oldalon jobban használható, és technikailag is tisztább marad.
Oldalstruktúra
1. Hero / nyitóblokk
A landing page első képernyője legyen vizuálisan erős, de letisztult.

Javasolt branding:

MatchMark by Nagykeró

Főcím:
MatchMark – egyszerű videóelemzés edzőknek
Alcím:

Jelöld a mérkőzés fontos eseményeit, rendeld játékosokhoz, majd nézd vissza őket néhány kattintással.

CTA-k:
- Open MatchMark
- How it works
A hero egyik oldalán legyen a szöveg és a CTA, a másikon egy screenshot a MatchMark elemzőfelületéről.
2. Miért készült?
Ez a rész kapcsolja össze a MatchMarkot a Nagykeróval.

Javasolt szöveg:
A Nagykerón évek óta foglalkozunk futballal, elemzéssel és játékosmegfigyeléssel. A MatchMark ebből a gondolkodásból született: egy egyszerű, gyors eszköz, amellyel egy mérkőzés videójából néhány perc alatt strukturált elemzés készíthető.

A cél itt nem egy hosszú történet, hanem a szakmai háttér és a projekt eredetének rövid bemutatása.
3. Mit tud jelenleg?
A funkciókat rövid feature cardokban érdemes megjeleníteni.
Video tagging
Események rögzítése közvetlenül a mérkőzés videójára.
Player tracking
Az események játékosokhoz rendelhetők.
15 event type
Támadó, védekező és egyéb eseménytípusok gyors rögzítése.
Keyboard shortcuts
Gyorsabb elemzési workflow billentyűparancsokkal.
Event filtering
Az események játékos és eseménytípus szerint szűrhetők.
Review mode
A rögzített események gyors visszanézése és léptetése.
4. Hogyan működik?
A használatot maximum négy egyszerű lépésben érdemes bemutatni.
1. Select video
Tölts be egy helyi meccsvideót.
2. Tag events
Rögzítsd a mérkőzés fontos eseményeit.
3. Assign players
Rendeld az eseményeket játékosokhoz.
4. Review
Szűrd és nézd vissza a korábban rögzített eseményeket.
5. Screenshot szekció
Három fő screenshot elegendő:
1. MatchMark kezdőképernyő
2. Tagging / analysis mode
3. Review mode
A képekhez csak rövid caption szükséges. A cél itt elsősorban a platform vizuális bemutatása.
6. Privacy / local processing
Ez a MatchMark egyik fontos üzenete, ezért külön blokkban is érdemes megjeleníteni.

Fő üzenet:
Your video stays on your device. It is never uploaded to the cloud.

Magyar magyarázat:

A MatchMark a videót helyben, a böngészőben használja. A videófájl nem kerül feltöltésre.

Ezt a szekciót érdemes vizuálisan is elkülöníteni.
7. Kinek szól?
A MatchMark elsődleges célcsoportjai:
- utánpótlásedzők
- videoelemzők
- scoutok
- kisebb klubok
- játékosfejlesztéssel foglalkozó szakemberek
A megfogalmazás legyen rövid és szakmai.
8. V1 / early public version
Érdemes egyértelműen jelezni, hogy a platform még fejlődik.

Javasolt cím:
MatchMark v1 – early public version
Javasolt szöveg:

A platform jelenleg aktív fejlesztés alatt áll. A visszajelzések alapján folyamatosan bővítjük és finomítjuk.

Ez segít megfelelő elvárást kialakítani a tesztelőknél és a korai felhasználóknál.
9. Záró CTA
A landing page végén ismét legyen egy egyszerű, erős CTA.

Főcím:
Ready to analyse a match?
Gomb:

Open MatchMark

Alatta:

No registration required.
Vizuális irány
A landing page vizuálisan kapcsolódjon egyszerre:
- a Nagykeróhoz
- a MatchMark jelenlegi dark premium designjához
Javasolt irány:
- sötét navy / charcoal háttér
- zöld MatchMark accent
- visszafogott stadium / football ambience
- nagy screenshotok
- kevés szöveg
- tiszta tipográfiai hierarchia
- elegáns, technikai, de nem „gamer” karakter
A Nagykeró branding maradjon látható, de a MatchMark legyen a fő fókusz.

Javasolt megnevezés:

MatchMark by Nagykeró
Egyszerű wireframe
NAGYKERÓ HEADER

------------------------------------------------
MatchMark by Nagykeró

MatchMark – egyszerű videóelemzés edzőknek

Jelöld a mérkőzés fontos eseményeit,
rendeld játékosokhoz, majd nézd vissza őket.

[ Open MatchMark ]   [ How it works ]

                    [ MatchMark screenshot ]
------------------------------------------------

MIÉRT KÉSZÜLT?

Rövid Nagykeró / elemzői háttér
------------------------------------------------

MIT TUD?

[ Video tagging ] [ Players ] [ Shortcuts ]
[ Filtering ]     [ Review ]  [ 15 events ]
------------------------------------------------

HOGYAN MŰKÖDIK?

1. Select video
2. Tag events
3. Assign players
4. Review
------------------------------------------------

SCREENSHOTS

[ Landing ] [ Tagging ] [ Review ]
------------------------------------------------

PRIVACY

Your video stays on your device.
It is never uploaded to the cloud.
------------------------------------------------

KINEK SZÓL?

Coaches / Analysts / Scouts / Youth football
------------------------------------------------

MatchMark v1 – early public version

[ Open MatchMark ]

No registration required.
------------------------------------------------
Javasolt technikai kapcsolat
A WordPress landing page ne tartalmazza magát a teljes React alkalmazást.

Ajánlott flow:
Nagykeró WordPress
        ↓
MatchMark landing page
        ↓
Open MatchMark
        ↓
külön hosztolt MatchMark webapp
Később egy saját domain esetén elegánsabb struktúra lehet például:
nagykero.hu
nagykero.hu/matchmark
app.nagykero.hu
vagy:
nagykero.hu
matchmark.nagykero.hu
Következő lépések
1. A landing page végleges magyar szövegének megírása
2. Hero screenshot kiválasztása
3. Tagging és Review screenshotok kiválasztása
4. WordPress layout megtervezése
5. Open MatchMark CTA bekötése
6. MatchMark v1 publikus URL véglegesítése
7. Korai tesztelői feedback gyűjtése