# MatchMark

Egyszerű futballvideó-taggelő alkalmazás utánpótlásedzők, szülők számára.
A React + TypeScript + Vite alkalmazásban már kiválasztható és lejátszható
egy helyi videófájl a böngésző alapértelmezett vezérlőivel, szerverre feltöltés nélkül.

## Futtatás

Node.js 22.12+ (vagy 24 LTS) és npm szükséges.

```sh
npm install
npm run dev
```

Windows PowerShellben, ha a végrehajtási házirend blokkolja az npm.ps1 fájlt,
használd az `npm.cmd` parancsot az `npm` helyett.
A fejlesztői szerver a terminálban kiírt címen érhető el.

## Ellenőrzés

```sh
npm run lint
npm run build
npm run preview
```

## Projektstruktúra

- `src/main.tsx`: a React alkalmazás belépési pontja.
- `src/App.tsx`: az alkalmazás alapkomponense.
- `src/components/VideoPlayer.tsx`: helyi videó kiválasztása és lejátszása.
- `src/types/shot.ts`: a lövésesemény, a kimenetel és a testrész típusai.
- `src/App.css`: a komponens stílusai.
- `src/index.css`: globális alapstílusok.
- `public/`: statikus fájlok helye.
- `index.html`: HTML belépési pont.
- `vite.config.ts`: Vite konfiguráció.
- `tsconfig*.json`: TypeScript konfigurációk.

Csak a Vite React–TypeScript sablon függőségeit használjuk.

## Videóesemények rögzítése

A videó betöltése után a „⚽ Lövés” gomb megőrzi a videó aktuális időpontját,
és megnyitja a lövés adatlapját. A kimenetel (Gól / Kaput talál / Kaput elkerüli /
Blokkolt) és a testrész (Láb / Fej / Egyéb) kiválasztása után a Mentés gomb
rögzíti a `ShotEvent` eseményt. A Mégse mentés nélkül bezárja az adatlapot.
A videó közben tovább játszható: mindig a Lövés gomb megnyomásának időpontját mentjük.

Az esemény mezői: `id`, `type: 'shot'`, `timestamp`, `outcome`, `bodyPart`.
A lista például `12:34 – Lövés – Kaput talál – Láb` formában jelenik meg.
Egy sorra kattintva a videó az adott jelenethez ugrik.

Az eseményeket csak React state tárolja: oldalfrissítéskor vagy másik videó
kiválasztásakor törlődnek. A timestamp másodpercben, a tört részével együtt
marad meg; csak a kijelzés kerekít lefelé egész másodpercre.

A hosszú távú tervet az `utanpotlas_foci_video_tagging_app_terv.docx` tartalmazza.
