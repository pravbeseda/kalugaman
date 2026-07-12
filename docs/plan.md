# Plan: kalugaman.ru — developer's personal site

## 1. Goals and requirements

A personal card site: resume, projects, contacts. Built for myself — no database, no admin panel.

Decisions made:

| Question       | Decision                                                                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack          | **Astro** (SSG, zero JS by default)                                                                                                                                                                             |
| Structure      | **Multi-page**: home, `/resume`, `/projects`, `/projects/<slug>`, `/contacts`                                                                                                                                   |
| Extra sections | Not now; the architecture allows adding them (blog, about, uses) without a rewrite                                                                                                                              |
| Content        | Markdown files + Content Collections (typed with zod), no database                                                                                                                                              |
| Multilingual   | EN (default) + RU, both prefixed: `/en/...`, `/ru/...`; the root `/` is a server-side redirect based on `Accept-Language`. Routing is manual (`src/pages/[lang]/...`), Astro's built-in i18n router is not used |
| Themes         | Light/dark via CSS tokens + `data-theme`; groundwork for arbitrary themes                                                                                                                                       |
| Styling        | Vanilla CSS, design tokens (custom properties), mobile-first                                                                                                                                                    |
| PDF resume     | Playwright print-to-PDF at build time, `cv-en.pdf` / `cv-ru.pdf`                                                                                                                                                |
| Hosting        | **Own VPS + nginx** (the same machine as drevo), deployed via GitHub Actions — see [`ci-cd.md`](./ci-cd.md)                                                                                                     |
| Navigation     | View Transitions (`<ClientRouter />`) — no-reload navigation; scripts hook into `astro:page-load` / `astro:after-swap`                                                                                          |

## 2. Architecture

### 2.1 Principle: content is separated from presentation

- **Content** — Markdown files in `src/content/` and UI string dictionaries in `src/i18n/`, nothing else.
- **Presentation** — `.astro` layouts and components that receive content as data.
- **Styling** — design tokens in one place; a theme is a set of token values.

Changing the design or theme never touches content; editing text never touches code.

### 2.2 Project structure

```
kalugaman/
├── docs/
│   ├── plan.md
│   ├── roadmap.md
│   └── ci-cd.md
├── deploy/                      # nginx config + one-time server setup guide
├── public/                      # static as-is (favicon, robots.txt)
│   └── cv/                      # cv-en.pdf, cv-ru.pdf (produced by the build)
├── src/
│   ├── content.config.ts        # zod schemas for the collections (Content Layer)
│   ├── content/                 # ALL content — Markdown only
│   │   ├── projects/
│   │   │   ├── en/<slug>.md
│   │   │   └── ru/<slug>.md
│   │   ├── resume/
│   │   │   ├── en.md            # + structured frontmatter (experience, skills)
│   │   │   └── ru.md
│   │   └── pages/               # home and contacts copy
│   │       ├── en/...
│   │       └── ru/...
│   ├── i18n/
│   │   ├── config.ts            # locales: ['en','ru'], default 'en'
│   │   ├── en.ts                # UI string dictionary (nav, buttons, labels)
│   │   └── ru.ts
│   ├── layouts/
│   │   ├── Base.astro           # <head>, meta, hreflang, theme script, header/footer
│   │   └── PrintResume.astro    # print layout for the PDF
│   ├── components/              # Header, Footer, ThemeToggle, LangSwitch, ProjectCard...
│   ├── styles/
│   │   ├── tokens.css           # design tokens: colors, fonts, spacing, radii
│   │   ├── themes.css           # [data-theme="dark"] / "light" overrides
│   │   └── global.css           # reset, base typography
│   └── pages/
│       ├── index.astro          # root: fallback redirect (nginx does the real one)
│       └── [lang]/
│           ├── index.astro      # home
│           ├── resume/
│           │   ├── index.astro
│           │   └── print.astro  # source for the PDF (noindex)
│           ├── projects/
│           │   ├── index.astro
│           │   └── [slug].astro
│           └── contacts.astro
├── scripts/
│   ├── check-i18n-parity.mjs    # en/ru parity across collections (CI)
│   ├── check-dist.mjs           # smoke check of the build output (CI)
│   └── generate-pdf.mjs         # Playwright: /[lang]/resume/print → dist/cv/*.pdf
├── .github/workflows/           # ci.yml, deploy.yml
└── astro.config.mjs
```

### 2.3 Content model (Content Collections)

- `projects`: frontmatter — `title`, `description`, `tags[]`, `period`, `links{repo,demo}`, `featured`, `order`, `lang`; the Markdown body is the detailed write-up.
- `resume`: frontmatter — structured data (positions with dates, skills by group, education, languages); the body is a free-form summary. One source for both the web page **and** the PDF.
- Schemas live in `src/content.config.ts`, written with zod 4 (imported from `astro/zod`): a typo in frontmatter is a build error.

Language parity rule: every document exists in both `en/` and `ru/` under the same slug. Parity is enforced by a script in CI (an error, not a warning: a mismatch means a broken language link).

## 3. Multilingual

- Routing is manual: `src/pages/[lang]/...` + `getStaticPaths()` over the locales from `src/i18n/config.ts` → every page lives under `/en/` and `/ru/`. Astro's built-in i18n router is not used (an extra layer for just two locales).
- The root `/`: **nginx** reads `Accept-Language` and returns a 302 to `/en/` or `/ru/`. `src/pages/index.astro` holds a meta-refresh to `/en/` as a fallback (for opening the build locally, without nginx).
- The language switch in the header points at the same page in the other locale (mapped from the current pathname).
- `hreflang` (en, ru, x-default) is emitted for every page in `Base.astro`.
- UI strings are typed dictionaries in `src/i18n/{en,ru}.ts` with a `t(lang, key)` helper. Adding a language = a locale in the config + a dictionary + content folders.

## 4. Themes (light/dark)

1. Every visual value is a custom property in `tokens.css` (`--color-bg`, `--color-text`, `--color-accent`, ...).
2. `themes.css` holds `:root` (light) and `[data-theme="dark"]` blocks.
3. An inline script in `<head>` (before paint) reads `localStorage.theme`, falls back to `prefers-color-scheme`, and sets `data-theme` on `<html>` → no theme flash (FOUC).
4. `ThemeToggle` is a small vanilla-JS island: it flips the attribute and writes to localStorage.
5. A future theme = one more block of token values.

## 5. Responsiveness

- Mobile-first: base styles target ~360px, widened via `@media (min-width: ...)` (roughly 640/960/1200).
- Fluid typography: `clamp()` for headings.
- Navigation: compact on mobile (burger or bottom bar — to be decided at the design stage), a regular header on desktop.
- Project images go through `astro:assets` (automatic sizes, webp/avif, lazy).

## 6. PDF resume

Pipeline (build stage, `scripts/generate-pdf.mjs`):

1. `astro build` produces the site, including the print pages `/en/resume/print` and `/ru/resume/print` (same content from the `resume` collection, `PrintResume.astro` layout: single column, `@page` margins, no navigation, `noindex`).
2. The script serves the build (`astro preview` or `dist/` as static), Playwright opens the print pages and calls `page.pdf()` → `dist/cv/cv-en.pdf`, `dist/cv/cv-ru.pdf`.
3. The "Download PDF" buttons on `/resume` link to those files.

Result: a real text layer (selectable, parseable by ATS and crawlers), single-column semantic layout, standard fonts — a "clean" PDF. Single source of truth: editing `resume/en.md` updates both the page and the PDF.

The PDF is regenerated only on a CI build — normal for a static site, since content only changes through git.

## 7. SEO

- Plain HTML with no JS rendering — crawlers see the content immediately.
- `@astrojs/sitemap` with i18n links; `robots.txt`.
- Meta: title/description per page from frontmatter; Open Graph + Twitter cards.
- `hreflang` en/ru/x-default (see §3).
- JSON-LD: `Person` on home/resume, `CreativeWork`/`SoftwareSourceCode` on projects — optional, cheap.
- Canonical URLs; print pages and the root redirect are `noindex`.

## 8. Hosting and CI/CD

Details and the step-by-step plan live in [`ci-cd.md`](./ci-cd.md). The gist:

### 8.1 VPS + nginx

- The site is static files in the deploy user's home directory: `~/kalugaman.ru` (on the same VPS as drevo, next to its `releases/`). No symlinks, no release directories: the build is small, and swapping it in is a rename of a staging directory.
- HTTPS: certbot (Let's Encrypt) with auto-renewal; 80→443 and www→apex redirects.
- Root language redirect:

```nginx
map $http_accept_language $lang_redirect {
    default  /en/;
    ~*^ru    /ru/;
}

server {
    server_name kalugaman.ru;
    root /home/<deploy-user>/kalugaman.ru;

    location = / {
        return 302 $lang_redirect;
    }

    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    # caching: Astro's hashed assets forever, HTML short
    location /_astro/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

- gzip/brotli and security headers (CSP, X-Content-Type-Options) are configured on the server. The working config lives in [`../deploy/nginx/kalugaman.ru.conf`](../deploy/nginx/kalugaman.ru.conf).

### 8.2 GitHub Actions

Two workflows:

- **`ci.yml`** — on pull requests and pushes to `main`: `prettier --check`, `astro check` (types, content schemas, broken imports), the language parity script, `astro build` plus a smoke check of `dist/`.
- **`deploy.yml`** — on pushes to `main` and on demand (`workflow_dispatch`): build → `rsync` to `~/kalugaman.ru.new` on the VPS → swap the live directory into place (`mv` the old one to `.old`, `.new` to `kalugaman.ru`). Rollback = put `.old` back.

GitHub secrets: `SSH_HOST`, `SSH_USER`, `SSH_PORT`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS` (a deploy key scoped to this repo).

The PDF resume (§6) becomes an extra step in `deploy.yml` once phase C is done.

## 9. Stages

Live checklists and current status: [`roadmap.md`](./roadmap.md).

- [x] **0. Skeleton**: Astro project, git repository, folder structure, tokens/global CSS, Base layout
- [x] **1. Content model**: Content Collections + zod schemas; real content (resume en/ru, 3 projects en/ru, home and contacts copy)
- [x] **2. i18n**: locale config, UI dictionaries, `[lang]` routing, language switch, hreflang
- [x] **3. Pages**: home, resume, projects (list + detail), contacts — mobile-first
- [x] **4. Themes**: themes.css, inline script, ThemeToggle
- [x] **5. SEO baseline**: sitemap with i18n, canonical, OG/meta
- [ ] **6. CI/CD + VPS**: checks on PRs, auto-deploy to `~/kalugaman.ru`, nginx, certbot, DNS ← _we are here_
- [ ] **7. Polish**: mobile menu, 404, robots.txt, a11y, token debt
- [ ] **8. PDF**: PrintResume layout, print page, Playwright script, download buttons
- [ ] **9. Launch**: Lighthouse 95+, ATS parsing of the PDF, Search Console, monitoring

The order is a "progressive JPEG": the site is already showable, and each stage adds a layer.

## 10. Risks and notes

- **Major Astro upgrades** occasionally change the Content Collections API → upgrade deliberately (5 → 7 is already done).
- **Playwright in CI** pulls chromium (~1 min to install) → cache the browser in Actions.
- **Translation parity** is easy to lose → the parity script in CI (§2.3).
- **A VPS needs maintenance** (updates, certbot) → keep the surface minimal: nginx + static files, no runtimes.
- Possible future sections (blog, about, uses) = a new collection + a page; the architecture is ready.
