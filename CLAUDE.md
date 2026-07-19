# CLAUDE.md — kalugaman.ru

Personal website of Alexander Ivanov (Senior Angular Developer). Static, bilingual
portfolio / resume. Repo: https://github.com/pravbeseda/kalugaman (public).

## Stack & architecture

- **Astro 7** (SSG, zero client JS by default). Requires Node >= 22.18. Markdown is
  rendered by Sätteri (Astro's native pipeline, not remark/rehype); `compressHTML`
  defaults to `'jsx'`, so whitespace between inline elements is stripped.
- **Content Collections (Content Layer) + zod 4** — all content is Markdown under
  `src/content/`, each collection has a `loader`; schemas in `src/content.config.ts`.
  A frontmatter typo is a build error. Use the zod 4 API (`z.url()`, not
  `z.string().url()`).
- **i18n** — English (default) and Russian, both prefixed: `/en/...`, `/ru/...`.
  Routing is manual via `src/pages/[lang]/...`; UI strings live in typed
  dictionaries `src/i18n/{en,ru}.ts` with a `t()` helper.
- **Themes** — light (warm sepia "reader" palette) and dark, driven entirely by
  design tokens (`src/styles/tokens.css` + `themes.css`) and a `data-theme`
  attribute. A theme = a set of token values; changing it never touches markup.
- **Images** — `astro:assets` `<Image>` (auto webp/avif, srcset, lazy). Source
  files in `src/assets/`.
- **View Transitions** — `<ClientRouter />` is enabled in `Base.astro` for instant,
  no-reload navigation (no flash on the dark theme). Currently no transition
  animations. Scripts must be lifecycle-aware: wire up on `astro:page-load`,
  re-apply theme on `astro:after-swap`.
- **SEO** — `@astrojs/sitemap` with i18n hreflang; canonical + Open Graph in
  `Base.astro`.

Core principle: **content is separated from presentation**. Content = Markdown +
i18n dictionaries. Presentation = `.astro` layouts/components. Styling = tokens.

## Conventions

- **Comments: minimal.** Only where the code does not explain itself. **Always in
  English**, regardless of chat language.
- All code, identifiers, and docs in the repo are in **English** (the repo is
  public). Chat with the user is in **Russian**.
- **Language parity**: every content document exists in both `en/` and `ru/` with
  the same slug. Never add content in one language only.
- Match the style of surrounding code; prefer vanilla CSS and design tokens over
  new dependencies.

## Workflow

- **Do not commit unless explicitly asked.** The user reviews changes first.
- Feature work goes on a branch, not directly on `main`. `main` is protected on
  GitHub (PR required, no force-push, no admin bypass), and `.githooks/` blocks
  commits and pushes to it locally. Enable the hooks once per clone:
  `git config core.hooksPath .githooks`.
- Verify with a **clean build**: do not run `astro build` while `astro dev` is
  running — concurrent access to the `.astro/` cache produces spurious
  "Duplicate id" warnings. Stop dev first (`rm -rf .astro dist` if unsure).

## Commands

```
npm run dev       # dev server at http://localhost:4321
npm run build     # static output to dist/
npm run preview   # serve the built site
```

## Key paths

```
src/content/           # all content (Markdown): projects/, resume/, pages/ — en & ru
src/content.config.ts  # zod schemas for the collections
src/i18n/              # locale config, dictionaries, t() helper
src/layouts/Base.astro # <head>, meta, hreflang, ClientRouter, header/footer
src/components/        # Header, Footer, ThemeToggle, LangSwitch, ProjectCard
src/styles/            # tokens.css, themes.css, global.css
src/pages/[lang]/      # routed pages (home, resume, projects, contacts)
docs/plan.md           # architecture plan
docs/roadmap.md        # development roadmap (POC → production + CI/CD)
```
