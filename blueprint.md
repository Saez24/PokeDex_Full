# PokéDex Blueprint

> Letztes Update: April 2026

---

## Stack

| Schicht  | Technologie                                       |
| -------- | ------------------------------------------------- |
| Frontend | Angular 21, Zoneless, Signals, Material 3         |
| Backend  | FastAPI 0.135, SQLAlchemy 2.0, asyncpg            |
| Caching  | Redis (L1) → PostgreSQL JSONB (L2) → PokeAPI (L3) |
| Testing  | Vitest (Zoneless Mode)                            |

---

## Architektur

```
App (root, RouterOutlet)
└── Main
    ├── Header   – Logo, Sprache, Theme-Toggle
    ├── Content  – Hero, Filter-Bar, Gen-Chips, Pokémon-Grid, Load-More
    │   └── PokemonDialog  – Stats, Evolution, Moves (Modal)
    └── Footer   – Credits, PokeAPI-Link, GitHub
```

**Services**

| Service            | Pfad                                     | Verantwortung                                  |
| ------------------ | ---------------------------------------- | ---------------------------------------------- |
| `Api`              | `shared/services/api/api.ts`             | HTTP-Client (timeout 10 s, retry 2×)           |
| `PokemonService`   | `shared/services/pokemon/pokemon.ts`     | State (pokemon, filter, gen, offset), loadMore |
| `FavoritesService` | `shared/services/favorites/favorites.ts` | localStorage-Persistenz für Favoriten          |
| `Theme`            | `shared/services/theme/theme.ts`         | Dark/Light, localStorage, matchMedia           |

---

## Implementierter Featurestand

### Phase 1 – Qualität & Fertigstellung ✅

| Feature                                                    | Datei(en)                                 | Status    |
| ---------------------------------------------------------- | ----------------------------------------- | --------- |
| Footer mit Credits / Links                                 | `footer.html`, `footer.scss`, `footer.ts` | ✅ Fertig |
| HTTP-Fehlerbehandlung (timeout + retry)                    | `api.ts`                                  | ✅ Fertig |
| Fehler-Fallback in `loadMore`                              | `pokemon.ts`                              | ✅ Fertig |
| Shiny-Sprite-Toggle                                        | `pokemon-dialog.ts / .html`               | ✅ Fertig |
| Pokémon-Cry (Audio)                                        | `pokemon-dialog.ts`                       | ✅ Fertig |
| Ability-Beschreibungen im Stats-Tab                        | `pokemon-dialog.ts / .html / .scss`       | ✅ Fertig |
| Breeding-Infos (Ei-Gruppen, Schlupf, Geschlecht, Wachstum) | `pokemon-dialog.ts / .html / .scss`       | ✅ Fertig |
| Accessibility: ARIA-Labels auf Karten + Dialog             | `content.html`, `pokemon-dialog.html`     | ✅ Fertig |
| Keyboard-Navigation (Enter/Space auf Karten)               | `content.html`                            | ✅ Fertig |
| Focus-Ring auf Karten + Action-Buttons                     | `content.scss`, `pokemon-dialog.scss`     | ✅ Fertig |

### Phase 2 – Kernfeatures ✅

| Feature                                  | Datei(en)                                                 | Status    |
| ---------------------------------------- | --------------------------------------------------------- | --------- |
| Suche nach Name / ID (computed Signal)   | `pokemon.ts`, `content.ts / .html / .scss`                | ✅ Fertig |
| Typ-Filter Dropdown (18 Typen)           | `content.ts / .html / .scss`                              | ✅ Fertig |
| Generations-Filter Gen I–IX (Chips)      | `pokemon.ts`, `content.ts / .html / .scss`                | ✅ Fertig |
| Favoriten (localStorage, Signal, toggle) | `favorites.ts`, `content.ts / .html`, `pokemon-dialog.ts` | ✅ Fertig |
| "Keine Ergebnisse"-Zustand               | `content.html`                                            | ✅ Fertig |
| Kein Load-More bei aktiver Suche/Filter  | `content.html`                                            | ✅ Fertig |

---

## Offene Features (Backlog)

### Phase 2 – Ergänzungen ✅\n\n| Feature | Datei(en) | Status |\n| ----------------------------------------------- | --------------------------------------------------------------------- | --------- |\n| URL-Routing `/pokemon/:id` (Lazy-Load) | `app.routes.ts`, `pokemon-detail/pokemon-detail.ts/.html/.scss` | ✅ Fertig |\n| TM/HM + Ei-Attacken-Tabs im Dialog | `pokemon-dialog.ts/.html/.scss` (Segmented control, lazy load) | ✅ Fertig |\n| Pokémon-Formen (Alola, Galar, Mega …) im Dialog | `pokemon-dialog.ts/.html/.scss` (Form-Chips, `dp()` computed Signal) | ✅ Fertig |\n| „Open as Page"-Button im Dialog | `pokemon-dialog.ts/.html` | ✅ Fertig |\n| Vollständige Detail-Seite `/pokemon/:id` | `pokemon-detail/` (Stats, Evolution, Moves mit Tabs, Shiny, Cry, Fav) | ✅ Fertig |\n| Dark/Light-Mode Dialog + Detail-Page | `styles.scss` (CSS-Vars `--d-*`, globale Komponenten-Overrides) | ✅ Fertig |

### Phase 3 – Erweiterte Features

- [x] **Typ-Effektivitäts-Chart** — Route `/type-chart`, 18×18-Schadensmatrix, interaktiv, Angreifer/Verteidiger-Auswahl, Highlights (`type-chart/type-chart.ts/.html/.scss`)
- [x] **Team Builder** — Route `/team`, 6 Slots, Typ-Abdeckungs-Analyse, URL-Export (`team-builder/team-builder.ts/.html/.scss`)
- [x] **Vergleichsmodus** — Route `/compare`, bis zu 4 Pokémon, Stat-Bars, Vergleichstabelle mit Winner-Highlight (`compare/compare.ts/.html/.scss`)
- [x] **Move-Enzyklopädie** — Route `/moves`, paginierte Tabelle aller Moves, Filter nach Typ/Klasse/Name, Detail-Slide-In-Panel (`moves/moves.ts/.html/.scss`)
- [x] **Typ-Detailseiten** — Route `/type/:name`, Matchup-Karten (defensiv + offensiv), alle primären Pokémon paginiert, verlinkbar vom Type-Chart (`type-detail/type-detail.ts/.html/.scss`)

### Phase 4 – Finish & PWA

- [x] **PWA** — `@angular/service-worker` installiert, `ngsw-config.json` (App-Shell + API-Cache 7d + Sprite-Cache 30d), `manifest.webmanifest`, `provideServiceWorker` in `app.config.ts`, Meta-Tags in `index.html`
- [x] **Virtual Scroll** — `CdkVirtualScrollViewport` (row-basiert, 4 Spalten responsive 2/3/4, `ITEM_SIZE=270px`, `pokemonRows` computed signal, Auto-Load via `scrolledIndexChange`, `trackRow` TrackBy)
- [x] **SEO / Meta-Service** — `SeoService` (`Title` + `Meta` aus `@angular/platform-browser`), injiziert in alle 7 Page-Komponenten (Content, PokemonDetail, Compare, TeamBuilder, Moves, TypeChart, TypeDetail), OG-Tags + Twitter-Card für Pokémon-Detailseiten
- [x] **i18n** — `ng extract-i18n` (182 Units → `src/i18n/messages.xlf`), `messages.de.xlf` mit 125 deutschen Übersetzungen, `angular.json` i18n-Konfiguration (`sourceLocale: en-US`, `locales.de`), `ng build --localize` erfolgreich

---

## Backend-Erweiterungen (Backlog)

| Feature               | Endpoint                                      | Schwierigkeit |
| --------------------- | --------------------------------------------- | ------------- |
| Filter-Suche          | `GET /api/v2/pokemon?type=water&generation=1` | ⭐⭐          |
| Stats-Aggregation     | `GET /api/v2/stats`                           | ⭐            |
| Vergleich             | `GET /api/v2/pokemon/compare?ids=1,4,7`       | ⭐            |
| Generationen-Endpoint | `GET /api/v2/generation/{id}`                 | ⭐⭐          |
| Item-Endpunkte        | `GET /api/v2/item/{name}`                     | ⭐⭐⭐        |

---

## Design-System (CSS-Variablen)

```scss
// Global (styles.scss)
--app-background      // Hintergrund
--app-surface         // Karten / Oberflächen
--app-text-primary    // Primärer Text
--app-text-secondary  // Sekundärer Text / Labels
--app-border          // Rahmen
--box-shadow          // Standard Card-Shadow
--hero-title-gradient // Gradient-Text im Hero

// Pokémon-Typ (pro Karte/Dialog)
--card-glow           // Typ-Glühen (glow)
--card-color          // Primärfarbe des Typs
--primary             // Dialog-Primärfarbe
--glow                // Dialog-Glühen
```

---

## Qualitätsziele

| Ziel                   | Kriterium                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Build                  | `ng build` ohne Fehler/Warnings                                                                                                           |
| Tests                  | `npm test` — alle Specs grün (15/15) ✅                                                                                                   |
| Lighthouse A11Y        | `role="tablist/tab"` + `aria-selected` auf Move-Tabs, `width`/`height` auf alle Sprites (CLS=0), `decoding="async"`, `<main>` Landmark ✅ |
| Lighthouse Performance | Initial Bundle 672kB raw / **160kB gzipped**, Lazy-Chunks für alle 6 Route-Features ✅                                                    |
| Fokus-Ring             | Alle interaktiven Elemente via Tab erreichbar                                                                                             |
| Kontrast               | ≥ 4.5:1 (WCAG 2.2 AA)                                                                                                                     |
