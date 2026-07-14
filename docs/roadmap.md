# Roadmap: from POC to production with auto-deploy

Complements [`plan.md`](./plan.md) (architecture). This is the path from where the
project stands today to a live site on `kalugaman.ru` deployed automatically from
GitHub. CI/CD details live in [`ci-cd.md`](./ci-cd.md).

## Where we are

Done:

- [x] Astro skeleton (SSG), folder structure, tokens/themes/global CSS, `Base` layout
- [x] Upgrade to **Astro 7** (Node >= 22.12), zod 4 via `astro/zod`
- [x] Content model: Content Collections (Content Layer, `src/content.config.ts`) + zod schemas (`projects`, `resume`, `pages`)
- [x] i18n: `[lang]` routing en/ru, UI dictionaries + `t()`, language switch, `hreflang`/`x-default`, canonical, OG meta
- [x] Pages: home, resume, projects (list + detail), contacts — mobile-first
- [x] Themes: light (sepia/paper) + dark via tokens, inline script with no FOUC, `ThemeToggle`
- [x] Images through `astro:assets` (webp/srcset/lazy)
- [x] **Real content** in both languages: resume, 3 projects (Intermedia Unite, VBC Marketplace, Assad Video), home and contacts copy, real links (GitHub / Telegram / LinkedIn / email)
- [x] **View Transitions** (`<ClientRouter />`) — no-reload navigation; scripts hook into `astro:page-load` / `astro:after-swap`
- [x] **Sitemap** (`@astrojs/sitemap`) with i18n links; the root is kept out of the index

**Takeaway:** content is separated from code and the base is extensible. The
infrastructure shipped (Phase E' — the site is live and deploys itself) and so did the
polish (Phase B — 404, robots, SEO, theme tokens, mobile menu, accessibility). What's
left: the PDF resume.

---

## Phase E' — CI/CD ✅

The site is live at **https://kalugaman.ru** and every push to `main` ships it.
Full write-up: [`ci-cd.md`](./ci-cd.md), server side: [`deploy/README.md`](../deploy/README.md).

- [x] Prettier + `prettier-plugin-astro`, `npm run format` / `format:check`
- [x] Language parity script (`scripts/check-i18n-parity.mjs`)
- [x] Smoke check of `dist/` after the build (`scripts/check-dist.mjs`)
- [x] `.github/workflows/ci.yml` — on PRs and pushes to `main`: format + check + parity + build + smoke
- [x] `.github/workflows/deploy.yml` — push to `main` (+ `workflow_dispatch`): build → rsync → swap `/var/www/kalugaman.ru/public` into place, with an automatic rollback if the site does not answer
- [x] Server (mars) provisioned by Ansible: `kalugaman-deploy` user, site root, nginx vhost, TLS, DNS
- [x] GitHub secrets + `DEPLOY_ENABLED`; first deploy done, live behaviour verified (language redirect, cache headers, security headers)
- [x] Rollback drill: verification pointed at a missing URL on purpose, the previous build was restored by rename (same inode), the bad one kept as `public.bad`, the site never stopped answering, and the run still went red

Open questions (not blocking):

- **Analytics**: do we want any? If so — privacy-friendly (self-hosted Plausible/Umami), no cookie banner.
- **More themes?** Two today (light/dark). Keep two, or plan for a "system / light / dark" selector.

---

## Phase B — Polish and missing pieces

Goal: make it look and behave like a product.

Grouped into three deliverables, one branch each: **B1 SEO**, **B2 theme tokens**,
**B3 navigation + accessibility**.

- [x] **404 page** (`src/pages/404.astro`) — bilingual, links home.
- [x] **B1 — SEO** ✅ (PR #10):
  - [x] `public/robots.txt` (+ a link to the sitemap)
  - [x] OG images — one card per language, drawn from the resume collection during the
        build (`src/lib/og-card.ts`, served by `src/pages/og-[lang].jpg.ts`), so it
        cannot drift from the role it quotes; `og:image` carries a hash of the bytes,
        because scrapers cache the URL for a long time. JPEG on purpose: the consumers
        are social scrapers, and LinkedIn is unreliable with webp. The text is drawn by
        resvg from the fonts in `src/assets/fonts/` with the system fonts off, so the
        card renders identically on any machine. A name or role too wide for the card
        fails the build rather than being drawn across the portrait.
  - [x] JSON-LD `Person` on home/resume (`sameAs` ties the site to GitHub /
        LinkedIn / Telegram), one entity per language. `SoftwareSourceCode` renders only
        for projects that declare `links.repo` — it is a claim about readable source, so
        the current (closed, commercial) three get no markup.
  - [x] Content invariants the markup relies on now fail the build instead of drifting:
        the current job is an explicit `current` flag on an `id`-keyed experience entry,
        and `src/lib/content-checks.ts` requires the languages to agree on which job
        that is and on the set of jobs itself.
- [x] **B3 — Mobile menu** — a burger below 560px, built on `<details>` rather than a
      button: the browser owns the open state, the keyboard and `aria-expanded`, and the
      menu still opens with JS off. The script adds only what the element lacks: Escape
      (restoring focus only if focus was still inside the panel — nothing traps it there),
      a click outside, a click on a link inside, and a viewport that grew past the
      breakpoint (listening on the CSS breakpoint itself, so no width matches neither).
      The link could have been left to the navigation, which swaps in a fresh, closed
      `<details>` — but that is a fact about the router, and closing the menu is the menu's
      own business.
- [x] **B2 — Theme tokens, contrast, typography**:
  - [x] `themes.css` deduplicated: every token is a `light-dark()` pair, so a theme is a
        `color-scheme` choice rather than a second set of overrides. The dark palette,
        previously written out twice (explicit toggle + `prefers-color-scheme`), now
        exists once. The dark theme therefore became an enhancement: a browser without
        `light-dark()` (2024 baseline; iOS 16 is the realistic case) gets the light theme
        even if its system prefers dark, and no toggle. A deliberate trade — the
        alternative is to write the dark palette a second time for a shrinking audience.
  - [x] Contrast: muted text was below WCAG AA in the light theme (4.10 on the page,
        4.48 on a card) and is now 4.95 / 5.41. Controls got their own border token —
        a secondary button was told apart from the page by a 1.21:1 outline, where
        WCAG 1.4.11 asks 3:1. `npm run check:contrast` (in CI) asserts every pair.
  - [x] Typography: self-hosted **Inter** (Astro's `fonts` API, local provider), cut to
        Latin + Cyrillic — ~35 KB a weight, three weights, body weight preloaded.
        Re-subset with `scripts/subset-fonts.sh`. Known limitation: Astro's
        metric-matched fallback does not reach weight 700 (the bold family sits behind a
        family that already covers 400/600, and font matching resolves a family before a
        weight), so headings shift slightly when Inter lands.
- [x] **B3 — Accessibility**:
  - [x] The skip link was hardcoded English and shipped that way on `/ru/`; it now comes
        from the dictionaries, as does the `aria-label` of the nav. On the 404 — built in
        one language and swapped on load — it rides the existing `data-i18n` mechanism.
  - [x] Focus: the ring is the accent, and a primary button is _filled_ with the accent, so
        the two read as one blob across the 2px gap. A band in the button's own label
        colour now parts them (recolouring the ring cannot work: nothing that contrasts
        with the accent fill also contrasts with the page the ring is drawn on).
        `check:contrast` asserts the band, as it already did the ring.
  - [x] The theme toggle is now a toggle button in the APG sense: it is _named_ after the
        dark theme, and `aria-pressed` says whether that theme is the one in force —
        "Toggle theme, pressed" would have announced a state without a meaning. The name is
        not swapped per state (a name describing the action plus `aria-pressed` is a
        contradiction), and it matches what the icon already showed the sighted reader: the
        theme in force, not the one a click would bring. Written by script, because at
        build time the theme is the visitor's system preference and any value served would
        be a guess. The button is also hidden without JS (`data-js`, set before the first
        paint) — it used to be visible and inert, promising a switch it could not perform.
  - [x] `prefers-reduced-motion`: no smooth scroll, no theme crossfade, and no lift under
        the cursor — on the project cards as well as the buttons, since it is the same
        gesture and must answer the setting the same way.

---

## Phase C — PDF resume

Goal: a downloadable, clean PDF built from the same source as the web resume (plan §6).

- [ ] `PrintResume.astro` — print layout: single column, `@page` margins, no navigation, `noindex`.
- [ ] Pages `/[lang]/resume/print` — the PDF source (content from the `resume` collection).
- [ ] `scripts/generate-pdf.mjs` — Playwright: `preview` → `page.pdf()` → `dist/cv/cv-en.pdf`, `cv-ru.pdf`.
- [ ] "Download PDF" buttons on `/resume` linking to `/cv/cv-<lang>.pdf`.
- [ ] Wire into the pipeline: a PDF step in `deploy.yml` (cache the Playwright browser).
- [ ] While Playwright is there anyway: 3–4 e2e smoke tests (page loads, theme toggles, LangSwitch goes where it should).

---

## Phase F — Launch and beyond

- [ ] **Lighthouse** ≥ 95 across the board (Perf/A11y/Best/SEO); optionally Lighthouse CI as a gate.
- [ ] Check **ATS parsing** of the PDF (text is extractable).
- [ ] Verify hreflang/canonical in Google Search Console; submit the sitemap.
- [ ] Monitoring: uptime ping (e.g. UptimeRobot), TLS expiry alert.
- [ ] Project README: how to add a project / language / theme.

---

## Order and dependencies

```
E' (CI/CD + VPS) ─> B (polish) ─> C (PDF) ─> F (launch)
```

Content (the former phase A) is done. CI/CD goes first, so every later change ships
automatically. B and C are independent — order between them is a matter of taste.

## Risk notes

- Major Astro upgrades occasionally touch Content Collections → upgrade deliberately (5 → 7 already done).
- Playwright in CI pulls chromium (~1 min) → cache the browser in Actions.
- Translation parity is easy to lose → the parity script in CI (phase E').
- A VPS needs maintenance → keep the surface minimal: nginx + static files, no runtimes.
- No tests, and none planned: there is no logic here, and `astro check` covers types and content schemas. No unit tests; e2e only alongside the Playwright work in phase C.
