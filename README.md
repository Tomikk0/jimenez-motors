# Jimenez Motors – MariaDB alapú verzió

Ez a kiadás a Supabase függőséget eltávolítja, és helyette egy saját, PHP alapú API-n keresztül kapcsolódik a MariaDB/MySQL adatbázishoz.

## Beállítás

1. **Adatbázis kapcsolat**
   - A `api/config.php` fájl tartalmazza az alapértelmezett kapcsolat paramétereit.
   - Állítsd be a `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` környezeti változókat, vagy módosítsd közvetlenül a konfigurációs fájlt.

2. **API telepítése**
   - Másold a projektet a webszerver gyökérkönyvtárába.
   - Győződj meg róla, hogy az `api/` mappában lévő PHP fájlok elérhetőek, és a szerver képes PDO-val csatlakozni a MariaDB-hez.
   - Nincs külön szolgáltatás, amit el kell indítani: az `api/index.php` fájl minden HTTP kérésre az Apache/PHP pároson keresztül fut le.

3. **Képfájlok**
   - A projekt a `uploads/` mappát használja lokális képfájlok kiszolgálására.
   - Amennyiben a képek bináris (base64) formában kerülnek az adatbázisba, nincs szükség külön fájlokra.

4. **Biztonság**
   - Állíts be megfelelő jogosultságokat az `api/` és az esetleges feltöltési mappákra.
   - Javasolt az API elérését hitelesítéssel, illetve IP szűréssel védeni, mivel minden adatbázis művelet HTTP-n keresztül érhető el.

## Frontend

A JavaScript kód a `js/databaseClient.js` fájlban definiált klienssel kommunikál az `api/index.php` végponttal. A hívások a korábbi Supabase szintaxisát követik (`supabase.from('tabla').select().eq()`), így a meglévő üzleti logika változtatás nélkül használható.

### Kapcsolódás ellenőrzése

1. Frissítsd a `js/config.js` fájlban az `apiBaseUrl` értékét, ha nem a webszerver gyökeréből szolgálod ki a projektet.
2. Egy terminálból futtatható `curl` hívással ellenőrizheted, hogy az API elérhető-e:

   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"table":"cars","action":"select","limit":1}' \
     https://sajat-doma.in/api/index.php
   ```

   Siker esetén JSON formátumban jelenik meg a lekérdezés eredménye. Ha hibát kapsz, ellenőrizd az adatbázis-hitelesítő adatokat és hogy a webszerver hozzáfér-e a MariaDB-hez.