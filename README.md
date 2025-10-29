# Jimenez Motors

A Jimenez Motors admin felület mostantól egy PHP + MariaDB alapú háttérrel működik. A front-end továbbra is a meglévő statikus fájlokat használja, de minden adatkezelési műveletet egy helyi PHP API végez, amely MariaDB adatbázishoz kapcsolódik.

## Futás helyi környezetben

1. Hozz létre egy MariaDB adatbázist, majd futtasd a `database/schema.sql` fájlt a szükséges táblák kialakításához.
2. Állítsd be az adatbázis elérhetőségét környezeti változókkal, vagy módosítsd az `api/config.php` fájlt:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
3. Indítsd el a mellékelt segédszkriptet, ami háttérfolyamatként futtatja a beépített PHP szervert az alapértelmezett (80-as) HTTP porton:
   ```bash
   sudo bash scripts/php_server.sh start
   ```
   > **Megjegyzés:** A 80-as port root jogosultságot igényel, ezért szükséges a `sudo`. Ha más portot szeretnél, állítsd be a `PORT` környezeti változót a parancs előtt (pl. `PORT=8080 bash scripts/php_server.sh start`).

   Több tárhelyszolgáltató a `/var/www` könyvtárat „noexec” opcióval csatolja, ami megakadályozza a `./php_server.sh` formájú futtatást. Ilyenkor bármikor hívhatod közvetlenül a `bash` értelmezőt:

   ```bash
   cd scripts
   sudo bash php_server.sh start
   ```
   Így a szkript akkor is működik, ha a fájlra nincs végrehajtási jog, vagy a fájlrendszer tiltja a közvetlen futtatást.
4. Nyisd meg a böngészőben: <http://localhost/index.html>

5. Ha szeretnéd leállítani a szervert, futtasd:
   ```bash
   sudo bash scripts/php_server.sh stop
   ```

## Első felhasználó létrehozása

Ha még nincs admin felhasználód, hozz létre egyet a mellékelt CLI-szkripttel:

```bash
php scripts/create_user.php --username=felhasznalonev --password=valami --member="IG név" --role=admin --rank="Owner"
```

- A jelszó base64-ben kerül eltárolásra, a script ezt automatikusan intézi.
- Ha a tag még nem létezik a `members` táblában, a script létrehozza.
- A `--role` opció hagyható, alapértelmezés szerint `user`-t hoz létre.
- A `--phone` opcióval telefonszám is megadható.

## Működés

- A front-end JavaScript továbbra is a `supabase` változóval dolgozik, de az most egy helyi kliens, amely az `api/query.php` végponttal kommunikál.
- A Supabase felhős adatbázis teljesen kiváltásra került; minden adat most a MariaDB szerveren tárolódik.
- Minden beszúrás, frissítés és lekérdezés a MariaDB adatbázison keresztül történik.
- A képek tárolása továbbra is base64 formátumban lehetséges, vagy tetszőlegesen bővíthető a `uploads/` mappával.

## Fontos fájlok

- `api/query.php` – általános SQL végrehajtó a front-end kéréseihez
- `api/common.php`, `api/Database.php`, `api/config.php` – infrastruktúra az adatbáziskapcsolathoz
- `js/apiClient.js` – Supabase-kompatibilis kliens, ami a PHP API-t éri el
- `database/schema.sql` – az alkalmazás sémája MariaDB-hez

A projektet innentől kezdve bármely PHP 8-at támogató környezetben futtathatod MariaDB szerverrel kombinálva.
