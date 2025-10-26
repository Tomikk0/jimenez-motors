# Neon adatbázis integrációs útmutató

Ez a projekt eredetileg a Supabase szolgáltatását használta – ez Postgres adatbázist, beépített PostgREST API-t és fájltárat biztosít. A neon.tech-re való áttérésnél magát az adatbázist megkapod, viszont a REST API-t, az authentikációs logikát és a tárhelyet neked kell pótolni. Az alábbi útmutató abban segít, hogy a jelenlegi frontend (a `index.html` és az alá tartozó `js/` fájlok) továbbra is ugyanazokat az adatokat kapja Neon mögötti infrastruktúráról.

## 1. Adatáramlás áttekintése

A frontend közvetlenül a Supabase JavaScript kliensen keresztül kommunikált a PostgREST végponttal. A következő funkciók mind adatbázis-műveletekre épülnek:

- **Autók** (`cars` tábla): új autó felvitele, szerkesztése, eladottnak jelölése, galéria lista.
- **Tagok** (`members` tábla): tagok felvétele, rangmódosítás, kirúgási napló (`member_history`).
- **Felhasználók** (`app_users` tábla): bejelentkezés (jelenleg Base64-zel tárolt jelszó), jogosultság-módosítás.
- **Badge-ek** (`badges`), **tuning csomagok** (`tuning_options`), **modell lista** (`car_models`).
- **Képek**: Supabase Storage `car-images` bucket.

Neon esetén a nyers Postgres adatbázist kapod, ezért szükséged lesz egy API rétegre (pl. Node.js + Express) vagy PostgREST telepítésre, valamint egy külön tárhelyre (pl. S3 kompatibilis bucket) a képekhez.

## 2. Sémák felépítése Neon-ban

A Supabase-ben használt táblák Postgres sémái alább találhatók. A mezők az alkalmazás JavaScript kódja alapján lettek összegyűjtve; igény szerint bővítheted.

```sql
-- Felhasználók (bejelentkezéshez)
create table if not exists app_users (
    id serial primary key,
    username text not null unique,
    password_hash text not null,
    role text not null default 'user',
    member_name text not null,
    rank text,
    last_login timestamptz,
    created_at timestamptz not null default now()
);

-- Tagok listája
create table if not exists members (
    id serial primary key,
    name text not null unique,
    rank text,
    phone text,
    created_by text,
    created_at timestamptz not null default now()
);

-- Tag történelem (felvétel, kirúgás, rangváltás)
create table if not exists member_history (
    id serial primary key,
    member_name text not null,
    action text not null,
    reason text,
    performed_by text,
    created_at timestamptz not null default now()
);

-- Autók
create table if not exists cars (
    id serial primary key,
    model text not null,
    tuning text,
    purchase_price integer,
    desired_price integer,
    sale_price integer,
    base_price integer,
    net_sale_price integer,
    tax_amount integer,
    sale_type text,
    is_gallery boolean not null default false,
    sold boolean not null default false,
    sold_by text,
    sold_at timestamptz,
    added_by text,
    image_url text,
    image_data_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz
);

-- Tuning opciók
create table if not exists tuning_options (
    id serial primary key,
    name text not null unique,
    price integer,
    pp_price integer,
    created_by text,
    created_at timestamptz not null default now()
);

-- Badge-ek
create table if not exists badges (
    id serial primary key,
    name text not null,
    emoji text,
    color text,
    description text,
    created_at timestamptz not null default now()
);

-- Modell lista a keresőhöz
create table if not exists car_models (
    id serial primary key,
    brand text,
    model text not null,
    display_name text not null,
    base_price integer,
    created_at timestamptz not null default now()
);
```

Az `image_url` mezőt használhatod az új tárhely URL-jének mentésére. Ha korábban Base64 adatot (`image_data_url`) tároltál, azt megtarthatod vagy törölheted.

## 3. API réteg készítése

Neon önmagában nem nyújt REST API-t, ezért a repóban létrehoztunk egy általános Express alapú szervert az `api/server.js` fájlban. A szolgáltatás a [@neondatabase/serverless](https://github.com/neondatabase/serverless) csomagot használja, és a Supabase stílusú hívásokkal kompatibilis végpontokat biztosít.

```bash
cd api
npm install
cp .env.example .env # töltsd ki a DATABASE_URL értékét
npm run dev
```

A szerver minden táblához ugyanazt az útvonalat használja: `GET/POST/PATCH/DELETE /api/<tabla>`. A szűrésekhez ugyanazokat az `eq()` feltételeket használhatod, amelyeket a frontend is küld:

- `GET /api/cars?eq_is_gallery=false&eq_sold=false&order=created_at.desc`
- `PATCH /api/cars?eq_id=42` – kérés törzsében a módosítandó mezők
- `DELETE /api/members?eq_name=John%20Doe`
- `POST /api/member_history` – kérés törzsében a naplóbejegyzés objektumai

Minden módosító végpont `RETURNING *`-tel dolgozik, így ha a kliens `.select()`-et hív egy `insert` vagy `update` után, megkapja a módosított sorokat.

> **Megjegyzés:** A beépített példaszerver Base64 formátumban kezeli a jelszavakat, hogy kompatibilis maradjon a meglévő front enddel. Ajánlott később biztonságosabb hash-elésre (pl. bcrypt) migrálni.


## 4. Frontend módosítása

Miután az API készen áll, nincs szükség a JavaScript modulok átírására: a `js/api.js` egy kompatibilis kliensréteget ad, amely a `supabase.from('...')` hívásokat HTTP kérésekké alakítja. A `js/config.js` tetején állíthatod be az API elérési útját:

```js
// js/config.js
const API_BASE_URL = (window.API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '');
const supabase = window.createApiClient(API_BASE_URL);
```

Ha más környezetben fut az API (pl. Render, Railway, Vercel), állítsd be a `window.API_BASE_URL` változót az `index.html`-ben vagy módosítsd a fenti konstans értékét.


## 5. Képek kezelése

Supabase Storage helyett válassz egy külső tárhelyet:

- **Amazon S3 / Cloudflare R2 / Backblaze B2** – bármely S3 kompatibilis bucket jó választás.
- **Cloudinary / ImageKit** – ha szükség van képméretezésre.

A `js/utils.js` `getImageUrl` függvényében frissítsd az URL összeállítását, hogy az új tárhelyed publikus URL-jét használja.

## 6. Adatbetöltés migrálása

Ha Supabase-ből szeretnéd áthozni a meglévő adatokat:

1. A Supabase felületén exportáld a táblákat CSV-be (`Table editor → Export data`).
2. Neon-ban futtasd a `\copy` parancsot vagy használj bármely import eszközt (pl. `psql`). Ha nem definiáltál környezeti változót,
   a teljes kapcsolati karakterláncot is megadhatod közvetlenül:
   ```bash
   psql "postgresql://neondb_owner:npg_Zbe2AV9KsBXS@ep-shy-paper-ag8cmxvh-pooler.c-2.eu-central-1.aws.neon.tech/Jimenez-motors?sslmode=require&channel_binding=require" \
     -c "\\copy cars from 'cars.csv' with csv header"
   ```
3. Ellenőrizd, hogy az ID-k ütközés nélkül átjöttek. Szükség esetén állítsd be a sorozatokat:
   ```sql
   select setval('cars_id_seq', (select max(id) from cars));
   ```

## 7. Összefoglalás

- A Neon biztosítja a Postgres adatbázist, de API-t és tárhelyet neked kell hozzáadni.
- A fenti sémák lefedik a jelenlegi frontend által használt mezőket.
- Egy könnyű Express + Neon REST API elegendő a frontend kiszolgálásához.
- Gondoskodj róla, hogy a jelszavak biztonságosan legyenek tárolva (bcrypt ajánlott).
- A képekhez válassz külső tárhelyet, és frissítsd a `getImageUrl` logikát.

Az átállás után érdemes a frontend hívásait fokozatosan refaktorálni, hogy ne láncolt Supabase hívásokra, hanem saját szolgáltatás függvényekre épüljenek – így a jövőben könnyebb lesz más szolgáltatásokra váltani.
