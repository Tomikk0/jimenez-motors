# Jimenez Motors

Ez a projekt a Jimenez Motors kereskedés adminisztrációs felülete. A korábbi Supabase kapcsolódás helyett mostantól egy MariaDB adatbázissal kommunikáló Node.js backend szolgálja ki a kéréseket.

## Követelmények

- Node.js 18+
- MariaDB 10.5+ adatbázis

## Fejlesztői környezet beállítása

1. **Függőségek telepítése**

   ```bash
   npm install
   ```

2. **Adatbázis konfigurálása**

   - Hozz létre egy MariaDB adatbázist (pl. `jimenez_motors`).
   - Hozd létre a szükséges táblákat (cars, members, app_users, member_history, badges, tuning_options, car_models).
   - A képek tárolásához a rendszer továbbra is az adatbázisban tárolt base64 mezőket használja (`image_data_url`).

3. **Konfiguráció**

   - Másold az `.env.example` fájlt `.env` néven.
   - Állítsd be az adatbázis eléréséhez szükséges változókat.

4. **Szerver indítása**

   ```bash
   npm run start
   ```

   A szerver alapértelmezés szerint a `3000`-es porton indul el, kiszolgálja a statikus fájlokat és az `/api/query` végpontot.

5. **Fejlesztői mód**

   ```bash
   npm run dev
   ```

   A `nodemon` automatikusan újraindítja a szervert fájlmódosítás esetén.

## Frontend konfiguráció

- A kliens kód a `js/config.js` fájlban definiált `apiBaseUrl` változón keresztül éri el a szervert. Alapértelmezett értéke `/api`, így a frontend és a backend ugyanarról a domainről kiszolgálva működik a legjobban.
- Ha eltérő domainről szolgálod ki a frontendet, állítsd be a `window.APP_CONFIG.apiBaseUrl` értékét a HTML-ben betöltés előtt.

## API működés

Az új `MariaDBClient` segédosztály a korábbi Supabase hívásokhoz hasonló metódusokat biztosít (`select`, `insert`, `update`, `delete`, `eq`, `order`, `single`). A hívások a Node.js szerveren keresztül futnak, amely validálja a kéréseket és a megengedett táblákon hajtja végre a műveleteket.

## Build és deploy

A projekt jelenleg egy egyszerű Node.js szerverből és statikus frontendből áll. Deploy során győződj meg róla, hogy a MariaDB adatbázis elérhető a szerver számára, és a `.env` fájl tartalmazza a megfelelő hitelesítési adatokat.
