# Jimenez Motors

Ez a projekt egy modernizált Jimenez Motors admin felület, amely PHP-alapú backenddel kommunikál
MariaDB / MySQL adatbázissal. A kód gond nélkül futtatható saját VPS-en (Apache vagy Nginx + PHP
kiszolgálással), ahol az adatbázist tipikusan MariaDB biztosítja és phpMyAdminnal felügyelheted.

## Projekt felépítése

- `index.html` – a fő felhasználói felület.
- `css/` – stílusok.
- `js/` – kliensoldali logika (a Supabase helyett egy MySQL kliens adaptert használ).
- `api/` – PHP végpontok az adatbázis műveletekhez.
- `mysql/` – opcionális sémák és segédfájlok az adatbázis létrehozásához.

## Gyors beállítás VPS-en (MariaDB + phpMyAdmin)

1. **Szerverkörnyezet előkészítése**
   - Telepítsd a PHP 8.0 vagy újabb verzióját a szükséges kiterjesztésekkel (`pdo_mysql`, `mysqli`).
   - Gondoskodj róla, hogy a webszerver (Apache/Nginx) az alkalmazás könyvtárát szolgálja ki.

2. **Fájlok átmásolása**
   - Másold fel a repository tartalmát a webszerver gyökérkönyvtárába (pl. `/var/www/html/jimenez-motors`).
   - Ügyelj arra, hogy az `api/` mappa is a szerveren legyen, mivel ez szolgálja ki a MySQL műveleteket.

3. **Konfiguráció létrehozása**
   - Lépj az `api/` könyvtárba, és másold át a `config.sample.php` fájlt `config.php` néven.
   - Állítsd be benne a MariaDB elérési adatokat (`host`, `username`, `password`, `database`).
   - Ha a szerver unix sockettel kommunikál (pl. `/run/mysqld/mysqld.sock`), töltsd ki a `socket` mezőt;
     ellenkező esetben hagyd üresen, és a `host`/`port` párossal kapcsolódik a kliens.
   - Igény esetén add meg a `allowed_origins` listát a CORS korlátozásához.

4. **Adatbázis létrehozása és jogosultságok**
   - phpMyAdminban vagy a `mysql` kliensben hozz létre egy adatbázist (pl. `jimenez_motors`).
   - Adj megfelelő jogosultságokat a konfigurációban megadott felhasználónak:
     ```sql
     CREATE USER 'jimenez'@'localhost' IDENTIFIED BY 'erős_jelszó';
     GRANT ALL PRIVILEGES ON jimenez_motors.* TO 'jimenez'@'localhost';
     FLUSH PRIVILEGES;
     ```

5. **Séma importálása**
   - A `mysql/schema.sql` fájl mintatáblákat tartalmaz; phpMyAdminból vagy a CLI-ről importálhatod.
   - Természetesen használhatod a saját sémád is, ha eltérő adatszerkezetre van szükséged.

6. **API működésének ellenőrzése**
   - Böngészőben vagy `curl`-lal nyisd meg a `https://sajat-domainod.hu/api/health.php` címet.
   - A `{"status":"ok"}` válasz jelzi, hogy a PHP API sikeresen kapcsolódik a MariaDB adatbázishoz.
   - Hiba esetén ellenőrizd a `config.php`-ban szereplő hitelesítő adatokat és a jogosultságokat.

7. **Frontend konfiguráció**
   - A `js/config.js` fájlban az `apiBaseUrl` alapértelmezetten az aktuális domain `/api` útvonalára mutat.
   - Ha az API és a frontend külön domainen fut, állítsd be a `window.__API_BASE_URL__` globális változót az
     `index.html`-ben vagy a weboldalad sablonjában.

## InfinityFree vagy más megosztott tárhely

A kód továbbra is használható klasszikus shared hostingon. Ilyenkor is hozd létre a `config.php` fájlt,
majd töltsd ki a szolgáltató (pl. InfinityFree) által megadott host/port/felhasználó adatokkal. A működés
ugyanaz, mint VPS-en, csupán a hitelesítő adatok és az elérés módja tér el.

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

Támogatott műveletek: `select`, `insert`, `update`, `delete`. A `select` esetében a `single: true` mezővel
kérhető egyetlen sor. Az `insert` művelet a `returning` mezővel adja vissza az új sorokat (`.insert([...]).select()`
a kliens oldalon). A MariaDB auto-increment kulcsokra támaszkodva kérdezi vissza a frissen beszúrt rekordokat.

## Korlátozások

- A séma létrehozása és migrációja manuális feladat, a repository nem tartalmaz komplett SQL migrációkat.
- Az API jelenleg `eq` típusú szűrést támogat; további operátorokat igény szerint bővíthetsz az `api/query.php` fájlban.
- Az `INSERT ... RETURNING` továbbra sem érhető el MySQL/MariaDB rendszerekben, ezért a szerver a növekvő
  azonosítók alapján kérdezi vissza az új rekordokat. Ehhez az `id` mezőknek AUTO_INCREMENT attribútummal kell rendelkezniük.

## Fejlesztői tippek

- A kliensoldali kód a `supabase` változóra hivatkozik; ez mostantól a PHP/MySQL API klienst jelöli.
- A képek URL-jeihez az opcionális `storageBaseUrl` globális változó használható (`window.__STORAGE_BASE_URL__`).
- Lokális teszteléshez indíthatod a beépített PHP szervert (`php -S localhost:8000`) a projekt gyökeréből, majd használj
  helyi MariaDB példányt a `config.php`-ban megadott hitelesítő adatokkal.

Sok sikert a telepítéshez és a további fejlesztéshez!
