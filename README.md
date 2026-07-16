# kalugaman.ru

Personal website of Alexander Ivanov: a static, bilingual
(English / Russian) portfolio and resume. Live at **https://kalugaman.ru**.

Static site built with **Astro** (SSG, zero client JS by default). Content is Markdown in
Content Collections; presentation is `.astro` components; styling is design tokens. The three
are kept separate: changing the design never touches content, editing text never touches code.

Architecture and history: [`docs/plan.md`](docs/plan.md), [`docs/roadmap.md`](docs/roadmap.md).
Deploy: [`docs/ci-cd.md`](docs/ci-cd.md), [`deploy/README.md`](deploy/README.md).

## Local development

Requires **Node >= 22.18**.

```
npm install
git config core.hooksPath .githooks   # once per clone: blocks commits/pushes to main
npm run dev                            # http://localhost:4321
```

| Command              | What it does                                           |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Dev server                                             |
| `npm run build`      | Static output to `dist/`                               |
| `npm run preview`    | Serve the built site                                   |
| `npm run build:pdf`  | Render `dist/cv/cv-{en,ru}.pdf` (needs a browser)      |
| `npm run check`      | `astro check` — types and content schemas              |
| `npm run check:i18n` | en/ru content parity                                   |
| `npm run check:dist` | Smoke check of `dist/` (`-- --pdf` also checks the CV) |
| `npm run test:e2e`   | Playwright smoke tests (needs a prior `npm run build`) |
| `npm run format`     | Prettier                                               |

CI runs `format:check`, `check`, `check:i18n`, `check:contrast`, `build`, `check:dist` on every
PR. Deploy additionally renders the PDF and runs `test:e2e` before shipping.

## Adding content

**Language parity is enforced** (`check:i18n`, in CI): every document exists in both `en/` and
`ru/` under the same slug. Never add content in one language only.

### A project

Create the Markdown in both languages with the same slug, e.g. `my-project`:

- `src/content/projects/en/my-project.md`
- `src/content/projects/ru/my-project.md`

Frontmatter (schema in [`src/content.config.ts`](src/content.config.ts) — a typo is a build
error):

```yaml
---
title: 'My Project'
description: 'One line, shown on the card and the detail page.'
tags: ['Angular', 'RxJS']
period: '2023 — 2024'
featured: false # true → also shown on the home page
order: 0 # lower sorts first
links: # optional
  repo: https://github.com/...
  demo: https://...
---
The Markdown body is the detailed write-up on /en/projects/my-project (routes are
locale-prefixed; there is no unprefixed /projects path).
```

`featured: true` surfaces the project on the home page (as an `h3` under the "Featured" `h2`);
the projects index lists all of them (as `h2` under the page `h1`). The detail route is
generated automatically.

### A language

More than a config edit: a few places still assume exactly the two locales, so plan on code
changes, not just content. The `[lang]` routes and their `hreflang` do come from the config;
the rest below does not.

1. Add the locale to [`src/i18n/config.ts`](src/i18n/config.ts) (`locales`, and `ogLocales`
   with a territory-qualified tag like `de_DE`).
2. Add a dictionary `src/i18n/<lang>.ts` — a full translation of `src/i18n/en.ts` (it is the
   typed source of truth; a missing key is a type error).
3. Wire the dictionary in [`src/i18n/utils.ts`](src/i18n/utils.ts): add it to the `dictionaries`
   map, and widen the `switchLocalePath` regex (`/^\/(en|ru)/`) to match the new prefix —
   otherwise `npm run check` fails and locale-swapping links break.
4. Add the locale to the sitemap `i18n.locales` map in
   [`astro.config.mjs`](astro.config.mjs), so its pages get `hreflang` alternates.
5. Rework [`src/components/LangSwitch.astro`](src/components/LangSwitch.astro): it currently
   toggles between exactly two locales (`lang === 'en' ? 'ru' : 'en'`). Three or more need a
   real switcher (a menu, or one link per other locale), not a binary toggle.
6. Add content folders for every collection: `projects/<lang>/`, `pages/<lang>/`, and
   `resume/<lang>.md`, mirroring the existing slugs.

### A theme

A theme is a set of design-token values. Today the tokens in
[`src/styles/themes.css`](src/styles/themes.css) are `light-dark()` pairs, so light and dark
are one `color-scheme` choice rather than two token sets, and the print variant is a third set
of values in [`src/styles/global.css`](src/styles/global.css) under `@media print`. Retuning a
theme means editing those token values; nothing in the markup changes. Adding a _third_
selectable theme is more than a token block — it needs an explicit `[data-theme="…"]` override
set and an extra state in `ThemeToggle` — so weigh it against the two-theme simplification
documented in the roadmap (phase B2) first.

## License

Personal site; content and branding are not open for reuse. Code is public for reference.
