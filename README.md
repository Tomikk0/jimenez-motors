# Jimenez Motors admin felület

Ez a projekt a Jimenez Motors adminisztrációs felületét tartalmazza, amely Supabase adatbázissal kommunikál az autók, eladások, tagok és tuning információk kezeléséhez. A felület magyar nyelvű munkafolyamatokra optimalizált navigációt, kártyákat és modális ablakokat biztosít.

## Főbb nézetek
- **Autók** – az aktuális készlet modern táblázaton jelenik meg, kiemelve a fotót, modell nevét, árakat és státusz mezőket. Admin joggal elérhető a frissítés és feltöltés funkció, amelyek a `js/cars.js` modulon keresztül beszélgetnek a Supabase API-val.
- **Eladott autók és statisztikák** – részletes profit kalkulációk és összesítések, amelyek a `js/soldcars.js` és `js/stats.js` logikát használják.
- **Tagok, tuning és galéria** – a közösség menedzsmentjét segítő kártyák és modális ablakok, amelyeket a `js/members.js`, `js/tuning.js` és `js/gallery.js` fájlok vezérelnek.

## Fejlesztés helyben
1. Telepíts minden szükséges függőséget, majd indíts egy statikus fejlesztői szervert (például `python3 -m http.server 8000`).
2. Nyisd meg a `http://127.0.0.1:8000/index.html` oldalt a böngészőben. A Supabase funkciókhoz add meg a `js/config.js` fájlban a környezeti kulcsokat.
3. A fő stílusokat a `css/style.css`, `css/components.css`, `css/pages.css`, `css/responsive.css`, `css/halloween.css`, `css/modern.css` és `css/dark-theme.css` fájlok foglalják össze.

További elrendezési részletek a [`docs/layout-overview.md`](docs/layout-overview.md) fájlban találhatók.
