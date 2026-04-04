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

### Phase 2 – Ergänzungen ✅

| Feature                                         | Datei(en)                                                             | Status    |
| ----------------------------------------------- | --------------------------------------------------------------------- | --------- |
| URL-Routing `/pokemon/:id` (Lazy-Load)          | `app.routes.ts`, `pokemon-detail/pokemon-detail.ts/.html/.scss`       | ✅ Fertig |
| TM/HM + Ei-Attacken-Tabs im Dialog              | `pokemon-dialog.ts/.html/.scss` (Segmented control, lazy load)        | ✅ Fertig |
| Pokémon-Formen (Alola, Galar, Mega …) im Dialog | `pokemon-dialog.ts/.html/.scss` (Form-Chips, `dp()` computed Signal)  | ✅ Fertig |
| „Open as Page"-Button im Dialog                 | `pokemon-dialog.ts/.html`                                             | ✅ Fertig |
| Vollständige Detail-Seite `/pokemon/:id`        | `pokemon-detail/` (Stats, Evolution, Moves mit Tabs, Shiny, Cry, Fav) | ✅ Fertig |

### Phase 3 – Erweiterte Features

- [ ] **Vergleichsmodus** — Route `/compare`, 2–4 Pokémon nebeneinander, Radar-Chart
- [ ] **Team Builder** — Route `/team`, 6 Slots, Typ-Abdeckungs-Analyse, URL-Export
- [ ] **Typ-Effektivitäts-Chart** — Route `/type-chart`, 18×18-Schadensmatrix, interaktiv
- [ ] **Move-Enzyklopädie** — Route `/moves`, tabellarische Liste aller Moves mit Filter
- [ ] **Typ-Detailseiten** — Route `/type/:name`, alle Pokémon des Typs

### Phase 4 – Finish & PWA

- [ ] **PWA** — `@angular/pwa`, Service Worker, Offline-Betrieb
- [ ] **Virtual Scroll** — `CdkVirtualScrollViewport` statt Load-More (für 1000+ Pokémon)
- [ ] **SEO / SSR** — `@angular/ssr`, `Meta`-Service für og:title, og:image
- [ ] **i18n vollständig** — `ng extract-i18n` → `.xlf`-Bundles generieren, alle Strings extrahiert

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

| Ziel                   | Kriterium                                     |
| ---------------------- | --------------------------------------------- |
| Build                  | `ng build` ohne Fehler/Warnings               |
| Tests                  | `npm test` — alle Specs grün                  |
| Lighthouse A11Y        | Score ≥ 90                                    |
| Lighthouse Performance | Score ≥ 80                                    |
| Fokus-Ring             | Alle interaktiven Elemente via Tab erreichbar |
| Kontrast               | ≥ 4.5:1 (WCAG 2.2 AA)                         |
