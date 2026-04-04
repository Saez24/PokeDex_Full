# PokéDex Blueprint

> Letztes Update: April 2026

---

## Stack

| Schicht  | Technologie                                                          |
| -------- | -------------------------------------------------------------------- |
| Frontend | Angular 21, Zoneless, Signals, Material 3                            |
| Backend  | FastAPI 0.135, SQLAlchemy 2.0, asyncpg                               |
| Caching  | Redis (L1) → PostgreSQL JSONB (L2) → PokeAPI (L3)                    |
| Testing  | Vitest (Frontend, Zoneless Mode) · pytest + pytest-asyncio (Backend) |
| Deploy   | GHCR (Docker Images) · GitHub Actions CI/CD · Unraid (Runtime)       |

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

| Feature               | Endpoint                                      | Schwierigkeit | Status    |
| --------------------- | --------------------------------------------- | ------------- | --------- |
| Filter-Suche          | `GET /api/v2/pokemon?type=water&generation=1` | ⭐⭐          | ✅ Fertig |
| Stats-Aggregation     | `GET /api/v2/stats`                           | ⭐            | ✅ Fertig |
| Vergleich             | `GET /api/v2/pokemon/compare?ids=1,4,7`       | ⭐            | ✅ Fertig |
| Generationen-Endpoint | `GET /api/v2/generation/{id}`                 | ⭐⭐          | ✅ Fertig |
| Item-Endpunkte        | `GET /api/v2/item/{name}`                     | ⭐⭐⭐        | ✅ Fertig |

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

## Phase 5 – Backend Tests ✅

| Datei                         | Inhalt                                                                                | Tests |
| ----------------------------- | ------------------------------------------------------------------------------------- | ----- |
| `backend/tests/test_redis.py` | Alle Key-Builder-Funktionen (`key_pokemon_detail`, `key_filter`, `key_item` …)        | 16    |
| `backend/tests/test_cache.py` | `get_pokemon`, `filter_pokemon`, `get_generation`, `get_item`, `get_stats`            | 13    |
| `backend/tests/test_api.py`   | ListPokemon, GetPokemon, Compare, Stats, Generation, Item (End-to-End via TestClient) | 17    |

**Muster:** `DATABASE_URL` env-Var wird in `conftest.py` gesetzt, _bevor_ die App importiert wird (SQLAlchemy liest beim Import). DB-Dependency wird mit `AsyncMock` überschrieben, Redis mit `patch.object`.

---

## Phase 6 – Deployment ✅

### Kombinierter Container (Frontend + Backend in einem Image)

```
nginx (Port 80)
├── /api/*  →  proxy_pass  →  gunicorn (127.0.0.1:8000)  →  FastAPI
└── /*      →  Angular SPA (try_files → index.html)
```

| Datei                               | Zweck                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile` (root, 3-stufig)       | stage 1: `node:22-alpine` (ng build) · stage 2: `python:3.13-slim` (pip + `update-deps.sh`) · stage 3: Runtime (nginx + supervisor + gunicorn) |
| `nginx-combined.conf`               | `/api/` → gunicorn, statische Assets (1y-Cache), SPA-Fallback                                                                                  |
| `supervisord.conf`                  | Startet nginx (prio 10) + gunicorn (prio 20) als Kindprozesse                                                                                  |
| `entrypoint-combined.sh`            | DB-Readiness-Check → `alembic upgrade head` → `supervisord`                                                                                    |
| `.github/workflows/publish-app.yml` | pytest (46 Tests) → `docker buildx` → Push `ghcr.io/saez24/pokedex-app:latest`                                                                 |

**Wichtige Änderungen:**

- `frontend/src/app/shared/services/api/api.ts`: `apiUrl` von `https://pokeapi.co/api/v2/` auf `/api/v2/` (relativ – nginx proxiert intern)
- `update-deps.sh` (`pip-review --auto`) wird im Builder-Stage bei _jedem_ Docker-Build ausgeführt
- Separate `publish-backend.yml` + `publish-frontend.yml` gelöscht – komplett durch `publish-app.yml` ersetzt

**Umgebungsvariablen (Runtime):**

| Variable        | Beispiel                                           | Pflicht |
| --------------- | -------------------------------------------------- | ------- |
| `DATABASE_URL`  | `postgresql+asyncpg://user:pass@host:5432/pokedex` | ✅      |
| `REDIS_URL`     | `redis://host:6379`                                | ✅      |
| `ALLOWED_HOSTS` | `http://192.168.1.10`                              | ✅      |
| `ADMIN_SECRET`  | `super-secret-token`                               | ✅      |

---

## Qualitätsziele

| Ziel                   | Kriterium                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Build                  | `ng build` ohne Fehler/Warnings ✅                                                                                                        |
| Tests                  | `npm test` — alle Specs grün (15/15) ✅ · `python3 -m pytest` — 46/46 Backend-Tests grün ✅                                               |
| Lighthouse A11Y        | `role="tablist/tab"` + `aria-selected` auf Move-Tabs, `width`/`height` auf alle Sprites (CLS=0), `decoding="async"`, `<main>` Landmark ✅ |
| Lighthouse Performance | Initial Bundle 672kB raw / **160kB gzipped**, Lazy-Chunks für alle 6 Route-Features ✅                                                    |
| Fokus-Ring             | Alle interaktiven Elemente via Tab erreichbar                                                                                             |
| Kontrast               | ≥ 4.5:1 (WCAG 2.2 AA)                                                                                                                     |
