# Jimenez Motors

Ez a projekt egy modernített Jimenez Motors admin felület, amely immár MySQL alapú háttérszolgáltatással működik. A korábbi Supabase kapcsolódás helyett egy saját Node.js/Express szerver kommunikál a MySQL adatbázissal.

## Projekt felépítése

- `index.html` – a fő felhasználói felület.
- `css/` – stílusok.
- `js/` – kliensoldali logika (a Supabase helyett egy MySQL kliens adaptert használ).
- `server/` – Node.js alapú API, amely kezeli az adatbázis műveleteket.
- `.env.example` – minta környezeti változók a MySQL kapcsolathoz.
- `package.json` – a szerver futtatásához szükséges Node.js függőségek.

## Beállítás

1. **Környezeti változók**
   - Másold át az `.env.example` fájlt `.env` néven, és töltsd ki a MySQL eléréshez szükséges értékeket (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

2. **Függőségek telepítése**
   - A szerver az `express`, `mysql2`, `cors` és `dotenv` csomagokat használja.
   - Telepítés: `npm install`

3. **MySQL adatbázis**
   - Hozz létre egy adatbázist (pl. `jimenez_motors`).
   - Készítsd el a szükséges táblákat (`cars`, `members`, `member_history`, `app_users`, `tuning_options`, stb.) a korábbi Supabase séma alapján.

4. **Szerver indítása**
   - `npm run dev`
   - Alapértelmezés szerint a szerver a `3000`-es porton indul, és a `public` fájlokat kiszolgálja, valamint a `/api/query` végponton várja a kliens oldali lekérdezéseket.

5. **Kliens konfiguráció**
   - A `js/config.js` fájlban állítható az `apiBaseUrl` (alapból `window.location.origin + '/api'`).
   - Opcionálisan definiálható `window.__API_BASE_URL__` globális változó a HTML-ben, ha másik szervert használsz.

## Lekérdezési API

A kliens egy `createMySQLClient` segédfüggvényt használ, amely a Supabase-hez hasonló láncolható API-t biztosít:

```javascript
const { data, error } = await supabase
  .from('cars')
  .select('*')
  .eq('sold', false)
  .order('created_at', { ascending: false });
```

A szerver minden lekérdezést az `/api/query` végponton fogad JSON formátumban:

```json
{
  "table": "cars",
  "action": "select",
  "columns": "*",
  "filters": [{ "type": "eq", "column": "sold", "value": false }],
  "order": [{ "column": "created_at", "ascending": false }]
}
```

Támogatott műveletek: `select`, `insert`, `update`, `delete`. A `select` esetében a `single: true` mezővel kérhető egyetlen sor. Az `insert` művelet a `returning` mezővel adja vissza az új sorokat (`.insert([...]).select()` a kliens oldalon).

## Korlátozások

- A MySQL séma létrehozása és migrációja manuális feladat, a repository nem tartalmaz komplett SQL migrációkat.
- A `npm install` parancs hálózati korlátozások miatt nem futtatható az automata környezetben; éles környezetben futtasd le lokálisan.
- Az `INSERT ... RETURNING` MySQL-ben nem érhető el, ezért a szerver a növekvő azonosítók alapján kérdezi vissza az új rekordokat. Ez feltételezi, hogy a táblák AUTO_INCREMENT `id` mezőt használnak.

## Fejlesztői tippek

- A kliensoldali kód a `supabase` változóval dolgozik; ez mostantól a MySQL API klienst jelöli.
- A képek URL-jeihez az opcionális `storageBaseUrl` globális változó használható (`window.__STORAGE_BASE_URL__`).

Jó munkát a további fejlesztéshez!
