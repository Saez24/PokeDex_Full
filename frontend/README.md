# Pokédex — Angular Frontend

A modern, futuristic Pokédex built with Angular 21 and Angular Material. Inspired by Apple's design language — pure black, glass morphism, and smooth animations.

![Angular](https://img.shields.io/badge/Angular-21-red?logo=angular)
![Material](https://img.shields.io/badge/Angular_Material-21-blue?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

---

## ✨ Features

- Browse all Pokémon with infinite scroll pagination (20 per page)
- Futuristic dark UI with per-type color theming and mouse-tracking glow effects
- Full multilingual support (🇩🇪 German / 🇬🇧 English) — names, types, abilities, moves
- Detail dialog with 3 tabs: **Stats**, **Evolution Chain**, **Moves**
- Lazy loading — Evolution and Moves only load when their tab is opened
- In-memory caching of types, abilities and moves to minimize API calls
- Seamlessly switchable between the official PokéAPI and the custom FastAPI backend

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── shared/
│   │   ├── api/
│   │   │   └── api.ts                    # Generic HTTP client (getResource)
│   │   ├── models/
│   │   │   ├── pokemon.model.ts          # Pokemon, PokemonType, PokemonStat …
│   │   │   ├── evolution.model.ts        # EvolutionStep, EvolutionChain
│   │   │   ├── move.model.ts             # MoveRow, MoveDetail
│   │   │   ├── api-list-response.model.ts
│   │   │   └── named-resource.model.ts
│   │   ├── services/
│   │   │   └── pokemon/
│   │   │       └── pokemon.ts            # PokemonService (pagination, i18n cache)
│   │   └── utils/
│   │       └── pokemon-types.util.ts     # Type colours, glow values, stat labels
│   └── features/
│       └── content/
│           ├── content.ts                # Main grid component
│           ├── content.html
│           ├── content.scss
│           └── pokemon-dialog/
│               ├── pokemon-dialog.ts     # Detail dialog (Stats / Evo / Moves)
│               ├── pokemon-dialog.html
│               └── pokemon-dialog.scss
```

### Key Design Decisions

| Topic            | Decision                      | Reason                                |
| ---------------- | ----------------------------- | ------------------------------------- |
| State            | Angular Signals               | Fine-grained reactivity, no Zone.js   |
| Change Detection | `OnPush` everywhere           | Maximum performance                   |
| HTTP             | RxJS `forkJoin` + `switchMap` | Parallel requests, cancellable        |
| i18n cache       | `Map<string, any>` in service | Avoid re-fetching same type/ability   |
| Lazy loading     | Tab-based (`onTabChange`)     | Evolution + Moves only load on demand |
| API switching    | Single `apiUrl` constant      | One line change to switch backends    |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Angular CLI 17+

```bash
npm install -g @angular/cli
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pokedex-frontend.git
cd pokedex-frontend

# Install dependencies
npm install

# Start development server
ng serve
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

---

## 🔌 API Configuration

The app can run against either the official PokéAPI or the custom FastAPI backend.

Open `src/app/shared/api/api.ts` and change the `apiUrl`:

```typescript
// Official PokéAPI (no setup required, slower)
private apiUrl = 'https://pokeapi.co/api/v2/';

// Custom FastAPI backend (requires backend setup, much faster)
private apiUrl = 'http://localhost:8000/api/v2/';
```

---

## 📜 Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `ng serve`         | Start dev server at `localhost:4200` |
| `ng build`         | Production build to `dist/`          |
| `ng build --watch` | Build and watch for changes          |
| `ng lint`          | Run ESLint                           |
| `ng test`          | Run unit tests with Vitest           |

---

## 🌍 Language Support

The app supports runtime language switching. Localized data is fetched from the PokéAPI and cached in memory.

Supported fields:

- Pokémon names (via `pokemon-species`)
- Type names (via `type`)
- Ability names (via `ability`)
- Move names (via `move`)
- Pokédex flavor text (via `pokemon-species`)
- Evolution step names (via `pokemon-species` per step)

To switch language programmatically:

```typescript
pokemonService.setLanguage('en'); // or 'de', 'fr', 'ja', etc.
```

---

## 🎨 Design System

| Token          | Value                   | Usage                  |
| -------------- | ----------------------- | ---------------------- |
| Background     | `#000000`               | App background         |
| Surface        | `rgba(255,255,255,.04)` | Cards                  |
| Surface hover  | `rgba(255,255,255,.07)` | Card hover state       |
| Border         | `rgba(255,255,255,.08)` | Subtle borders         |
| Accent         | `#2997ff`               | Buttons, active states |
| Text primary   | `#f5f5f7`               | Headings               |
| Text secondary | `rgba(245,245,247,.55)` | Body text              |

Type colours follow the official Pokémon colour coding and are defined in `pokemon-types.util.ts`.

---

## 📦 Dependencies

| Package             | Version | Purpose                               |
| ------------------- | ------- | ------------------------------------- |
| `@angular/core`     | 21      | Framework                             |
| `@angular/material` | 21      | UI components (Dialog, Tabs, Spinner) |
| `rxjs`              | 7       | HTTP, async data streams              |
