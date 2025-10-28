# Jimenez Motors

Ez a projekt egy modernített Jimenez Motors admin felület, amely InfinityFree (vagy bármely PHP + MySQL tárhely) környezetben is futtatható. A korábbi Supabase és Node.js/Express megoldás helyett egy egyszerű PHP API szolgálja ki a MySQL adatbázist, így a kód gond nélkül használható a shared hosting szolgáltatóknál is.

## Projekt felépítése

- `index.html` – a fő felhasználói felület.
- `css/` – stílusok.
- `js/` – kliensoldali logika (a Supabase helyett egy MySQL kliens adaptert használ).
- `api/` – PHP végpontok az adatbázis műveletekhez (InfinityFree kompatibilis megoldás).

## Beállítás

1. **PHP konfiguráció létrehozása**
   - Lépj az `api/` mappába, és másold át a `config.sample.php` fájlt `config.php` néven.
   - Töltsd ki a saját InfinityFree adatbázis elérési adataiddal (`host`, `username`, `password`, `database`). InfinityFree esetén a vezérlőpultban találod meg a `sqlXXX.infinityfree.com` hostot és a felhasználóneveket.
   - Ha szeretnéd korlátozni, hogy mely domainekről érhető el az API, a `allowed_origins` mezőben add meg a jóváhagyott hostokat. Alapértelmezés szerint minden origin engedélyezett.

2. **Fájlok feltöltése InfinityFree-ra**
   - Töltsd fel a teljes projektet (beleértve az `api/` mappát is) az InfinityFree fájlkezelőjébe vagy FTP-n keresztül a webes gyökérkönyvtáradba (`htdocs`).
   - Győződj meg róla, hogy a `config.php` nem nyilvános verziókezelésben, hanem csak a szerveren szerepel, és tartalmazza a helyes adatokat.

3. **MySQL adatbázis előkészítése**
   - Hozd létre a szükséges adatbázist és táblákat az InfinityFree MySQL kezelőfelületén (phpMyAdmin).
   - A `mysql/schema.sql` fájl minta sémát tartalmaz; importálhatod közvetlenül phpMyAdminból, vagy a saját sémád szerint állíthatod be a táblákat.

4. **API működésének ellenőrzése**
   - Nyisd meg a böngészőben a `https://sajat-domainod.com/api/health.php` címet. A `{"status":"ok"}` válasz jelzi, hogy a PHP API sikeresen kapcsolódik az adatbázishoz.
   - Ha hibát látsz, ellenőrizd a `config.php`-ban megadott hitelesítő adatokat és az adatbázis jogosultságait.

5. **Kliens konfiguráció**
   - A `js/config.js` fájlban állítható az `apiBaseUrl` (alapból `window.location.origin + '/api'`). Amennyiben az API másik domainen fut, állítsd be a `window.__API_BASE_URL__` globális változót az `index.html`-ben.

6. **Távoli elérés tesztelése**
   - A kliens a Supabase-szerű hívásokat továbbra is támogatja; például a `supabase.from('cars').select('*')` hívás mostantól az `api/query.php` végpontra továbbítja a kérést.

## Lekérdezési API

A kliens egy `createMySQLClient` segédfüggvényt használ, amely a Supabase-hez hasonló láncolható API-t biztosít:

```javascript
const { data, error } = await supabase
  .from('cars')
  .select('*')
  .eq('sold', false)
  .order('created_at', { ascending: false });
```

A PHP szerver minden lekérdezést az `/api/query.php` végponton fogad JSON formátumban:

```json
{
  "table": "cars",
  "action": "select",
  "columns": "*",
  "filters": [{ "type": "eq", "column": "sold", "value": false }],
  "order": [{ "column": "created_at", "ascending": false }]
}
```

Támogatott műveletek: `select`, `insert`, `update`, `delete`. A `select` esetében a `single: true` mezővel kérhető egyetlen sor. Az `insert` művelet a `returning` mezővel adja vissza az új sorokat (`.insert([...]).select()` a kliens oldalon). Az InfinityFree-n futó MySQL is támogatja a visszaolvasást, feltéve hogy az `id` mezők AUTO_INCREMENT beállításúak.

## Korlátozások

- A MySQL séma létrehozása és migrációja manuális feladat, a repository nem tartalmaz komplett SQL migrációkat.
- A PHP API jelenleg `eq` típusú szűrést támogat; további feltételeket igény szerint bővíthetsz az `api/query.php` fájlban.
- Az `INSERT ... RETURNING` MySQL-ben továbbra sem érhető el, ezért a szerver a növekvő azonosítók alapján kérdezi vissza az új rekordokat. Ez feltételezi, hogy a táblák AUTO_INCREMENT `id` mezőt használnak.

## Fejlesztői tippek

- A kliensoldali kód a `supabase` változóval dolgozik; ez mostantól a PHP/MySQL API klienst jelöli.
- A képek URL-jeihez az opcionális `storageBaseUrl` globális változó használható (`window.__STORAGE_BASE_URL__`).
- Ha tesztelni szeretnéd a kapcsolatot lokálisan, indíts egy beépített PHP szervert (`php -S localhost:8000`) a projekt gyökeréből, majd használd a saját MySQL példányodhoz igazított `config.php`-t.

Jó munkát a további fejlesztéshez!
