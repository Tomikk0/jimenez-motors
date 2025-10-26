# Jimenez Motors

Ez a repó a Jimenez Motors értékesítési felületének statikus verzióját tartalmazza. A frontendet egyszerűen egy statikus webszolgálón vagy a GitHub Pages-en is ki tudod szolgálni: csak másold ki a gyökérben lévő `index.html`-t a hozzá tartozó `css/` és `js/` mappákkal együtt.

## Fejlesztői gyorsindító

1. Nyisd meg a projektet egy statikus kiszolgálóval (pl. `npx serve`, `python -m http.server`).
2. A böngészőben látni fogod a teljes értékesítési és admin felületet.
3. Az adatkezeléshez jelenleg Supabase kliens hívások vannak bekötve – ezek a `js/` könyvtárban találhatók modulonként bontva (`cars.js`, `members.js`, `tuning.js`, stb.).

## Adatbázis háttér

Az eredeti verzió Supabase-t használt (Postgres + PostgREST + Storage). Ha áttértél a neon.tech szolgáltatásra, akkor az adatkezeléshez szükséged lesz egy saját API rétegre és fájltárra. Készítettünk egy részletes útmutatót a migrációhoz:

- [Neon adatbázis integrációs útmutató](docs/neon-migration.md)

Az útmutatóban megtalálod a szükséges táblák SQL definícióit, egy Express + Neon REST API példát, valamint tippeket a képek kezelésére és az adat importálására.

### API beállítás

- A frontend a `js/api.js` fájlban definiált vékony klienssel kommunikál, amely ugyanazt a `supabase.from('...')` szintaxist biztosítja, de HTTP kéréseket küld egy saját API-hoz.
- Alapértelmezés szerint az API URL-je `http://localhost:8787/api`. Ezt felülírhatod úgy, hogy az oldal betöltése előtt beállítasz egy `window.API_BASE_URL` globális változót, vagy módosítod a `js/config.js` fájl tetején lévő `API_BASE_URL` konstans értékét.
- A statikus oldal a `supabase` változót továbbra is használja, így a többi JavaScript fájlt nem kell módosítanod.

### Backend API futtatása

1. Lépj be az új `api/` mappába, és másold le az `.env` sablont:
   ```bash
   cd api
   cp .env.example .env
   ```
2. Az `.env` fájlban töltsd ki a Neon kapcsolatot (`DATABASE_URL`). A példát a Neon felületéről másolhatod.
3. Telepítsd a függőségeket és indítsd el a szervert:
   ```bash
   npm install
   npm run dev
   ```
4. A REST API alapból a `8787`-es porton indul, az endpointok pedig a `/api/<tabla>` útvonalon érhetők el.
5. Amennyiben máshová deployolod az API-t, add meg az új URL-t a `API_BASE_URL` értékében.

## Mappa struktúra

- `index.html` – a teljes alkalmazás belépési pontja és a script/link tagek
- `css/` – stíluslapok
- `js/` – modulokra bontott frontend logika (autók, tuning, tagok, statisztika, stb.)
- `docs/` – kiegészítő dokumentációk (pl. Neon migráció)

## Licenc

A projekt eredeti szerzője nem jelölt meg licencet. Ha publikálod vagy módosítod, egyeztess a csapatoddal a felhasználási feltételekről.
