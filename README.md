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
- `src/App.css`: a komponens stílusai.
- `src/index.css`: globális alapstílusok.
- `public/`: statikus fájlok helye.
- `index.html`: HTML belépési pont.
- `vite.config.ts`: Vite konfiguráció.
- `tsconfig*.json`: TypeScript konfigurációk.

Csak a Vite React–TypeScript sablon függőségeit használjuk.

## Videóesemények rögzítése

A videó betöltése után a „⚽ Lövés” gomb a videó aktuális időpontjával
rögzít egy `shot` eseményt. A videó alatt megjelenő lista `MM:SS` formátumban
mutatja az időpontokat. Egy sorra kattintva a videó az adott jelenethez ugrik.

Az eseményeket csak React state tárolja: oldalfrissítéskor vagy másik videó
kiválasztásakor törlődnek. A timestamp másodpercben, a tört részével együtt
marad meg; csak a kijelzés kerekít lefelé egész másodpercre.

A hosszú távú tervet az `utanpotlas_foci_video_tagging_app_terv.docx` tartalmazza.
