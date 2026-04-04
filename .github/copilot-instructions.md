# Angular Expert Agent Guide (v20+ Ultra-Lean)

## Project Philosophy

Build high-performance, accessible apps using **Zoneless Angular, Signals, and Apple Design**.
**Design Core:** Use Angular Material (M3) as the engine, but skin it strictly with the custom Apple-Style CSS.

---

## 1. Core Architecture Rules

- **100% Standalone:** No `NgModules`.
- **Zoneless:** No `zone.js`. Use `provideExperimentalZonelessChangeDetection()`.
- **Logic:** `ChangeDetectionStrategy.OnPush` and `inject()` function only.
- **Naming:** Ultra-lean: `name/name.ts`, `name.html`, `name.scss`, `name.spec.ts`. (No `.component` suffix).

## 2. State & Data Flow

- **Signals:** Use `signal()`, `computed()`, `model()`, and `resource()`.
- **Avoid:** RxJS in components. Use `rxResource` for data fetching if needed.

## 3. Visual Design & Modern Theming (Material 3)

Follow official **'material.angular.dev/guide/theming'** for M3:

- **M3 Theming:** Use `mat.define-theme` with `theme-type: light/dark`.
- **Apple Skin:** Use global CSS variables (`--bg`, `--bg-surface`, `--apple-blue`).
- **Dark Mode:** Support `[data-theme='dark']` and `.dark-theme`.
- **Materials:** Use `.frosted-glass` for navbars/modals (`backdrop-filter: blur(20px)`).
- **Geometry:** Buttons 12px, Cards 20px, Dialogs 20px radius.

## 4. Internationalization (i18n)

Follow **'angular.dev/guide/i18n'** strictly:

- **Templates:** Use the `i18n` attribute for all user-facing text: `<h1 i18n="@@id">Text</h1>`.
- **TS Code:** Use `$localize` for strings: `const msg = $localize \`:@@id:Text\`;`.
- **Localization:** Ensure all dates, numbers, and currencies are localized using Angular pipes.

## 5. Mandatory Accessibility (A11Y)

- **WCAG 2.2 AA:** Use semantic landmarks. 4.5:1 contrast ratio.
- **Focus:** Custom blue focus ring (`box-shadow`) from global styles.
- **Targets:** Minimum touch target **44x44px** (Apple Standard).

## 6. Sass & Styling Architecture

- **Modern Sass:** Use `@use '@angular/material' as mat;` once in `styles.scss`.
- **Component Styles:** Keep SCSS files lean. Use `:host` and global CSS variables.

## 7. Testing Strategy (Modern Angular v19/20)

Follow **'angular.dev/guide/testing'**:

- **Runner:** **Vitest** (Zoneless mode).
- **Zoneless:** Use `provideExperimentalZonelessChangeDetection()` in `TestBed`.
- **Signal Inputs:** Use `fixture.setInputs()` to update input values.
- **Manual CD:** Call `fixture.detectChanges()` manually (No Zone.js auto-check).

## 8. Backend & Database (Supabase)

- **Migrations:** Every database change must include a `.sql` file in `supabase/migrations`.
- **Typing:** Use `supabase gen types` patterns or define TypeScript interfaces that match the DB schema.
- **Service:** Use a central `SupabaseService` to inject the Supabase client.

## 9. Angular Material Usage (Standalone)

- **Direct Imports:** Import Material modules (e.g., `MatButtonModule`, `MatTableModule`) directly into the `imports: []` array of the standalone component.
- **Dumb Components:** Keep UI logic in `shared/` using Material as the base.
- **M3 Selection:** Prefer Material 3 (M3) components. Use `mat-unelevated-button` as the default button style for the Apple-look.
- **No Global Modules:** Never create a `MaterialModule` that exports everything. Import only what is needed per component to keep bundles small.

---

# Blueprint Protocol

After every task, update `blueprint.md`.
**Current Focus:** Ensuring all UI text is i18n-ready and Material M3 themes match the Apple aesthetic.
