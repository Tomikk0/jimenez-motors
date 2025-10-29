# Jimenez Motors

A Jimenez Motors admin felület mostantól egy PHP + MariaDB alapú háttérrel működik. A front-end továbbra is a meglévő statikus fájlokat használja, de minden adatkezelési műveletet egy helyi PHP API végez, amely MariaDB adatbázishoz kapcsolódik.

## Futás helyi környezetben

1. Hozz létre egy MariaDB adatbázist, majd futtasd a `database/schema.sql` fájlt a szükséges táblák kialakításához.
2. Állítsd be az adatbázis elérhetőségét környezeti változókkal, vagy módosítsd az `api/config.php` fájlt:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
3. Indíts egy beépített PHP szervert a projekt gyökeréből:
   ```bash
   php -S 0.0.0.0:8000
   ```
4. Nyisd meg a böngészőben: <http://localhost:8000/index.html>

## Működés

- A front-end JavaScript továbbra is a `supabase` változóval dolgozik, de az most egy helyi kliens, amely az `api/query.php` végponttal kommunikál.
- Minden beszúrás, frissítés és lekérdezés a MariaDB adatbázison keresztül történik.
- A képek tárolása továbbra is base64 formátumban lehetséges, vagy tetszőlegesen bővíthető a `uploads/` mappával.

## Fontos fájlok

- `api/query.php` – általános SQL végrehajtó a front-end kéréseihez
- `api/common.php`, `api/Database.php`, `api/config.php` – infrastruktúra az adatbáziskapcsolathoz
- `js/apiClient.js` – Supabase-kompatibilis kliens, ami a PHP API-t éri el
- `database/schema.sql` – az alkalmazás sémája MariaDB-hez

A projektet innentől kezdve bármely PHP 8-at támogató környezetben futtathatod MariaDB szerverrel kombinálva.
