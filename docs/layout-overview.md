# Elrendezés áttekintés

## Fejléc és navigáció
- A `header-with-image` blokk a logót és a "JIMENEZ MOTORS INC." feliratot jeleníti meg a nyitókép fölött.
- A `main-nav` gombsor hat fő admin oldalt kínál (Autók, Eladott autók, Tagok, Statisztika, Autó árak, Tuningok), valamint a jelszó és bejelentkezés funkciókat.

## Autólista munkafolyamat
- A `modern-form-card` keretben lévő táblázat (`modern-table`) sorolja fel az aktív autókat, a képpel, ármezőkkel és admin műveletekkel.
- Az admin sávban található `openCarUploadModal()` gomb nyitja meg a feltöltési modált, míg a `loadCars()` frissíti a listát.

## Modális dialógusok
- A `neo-modal` komponens tartalmazza az autófeltöltő űrlapot, amely magyar címkékkel és kereshető modell mezővel rendelkezik.
- További modális ablakokat a `js/modals.js` kezel az eladás, badge és jelszóváltó folyamatokhoz.

## Stílusok
- A globális kinézet a `css/style.css`, `css/components.css`, `css/pages.css`, `css/responsive.css`, `css/halloween.css`, `css/modern.css` és `css/dark-theme.css` fájlokból épül fel.
- A `modern-theme` osztály biztosítja a sötét háttérrel kombinált modern üveges kártya felületet.
