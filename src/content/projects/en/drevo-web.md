---
title: '"Drevo" Encyclopedia'
description: 'The "Drevo" online encyclopedia: a modern Angular frontend on top of a legacy Yii backend.'
tags: ['Angular', 'Nx', 'Yii', 'PHP']
period: 'since 2005'
kind: personal
links:
  - type: website
    url: 'https://drevo-info.ru'
  - type: repo
    url: 'https://github.com/pravbeseda/drevo-web'
    label: 'Frontend on GitHub'
order: 2
---

## What it is

**Drevo** is an open Orthodox encyclopedia (wiki), an Orthodox counterpart to
Wikipedia with its own specifics: articles, news, a forum, illustrations, an Orthodox calendar,
mostly in Russian. Running since 2005.

The site has been through several generations of its engine: originally written
from scratch in bare **PHP**, then rewritten on **Yii**. A major refactoring is
now underway: a new **Angular** frontend — a separate app on `app.drevo-info.ru`
— takes over the legacy site's features section by section, while the old
**Yii** application serves as the backend and feeds data to the new frontend over
a REST API. For now the new frontend is open to signed-in users.

Already moved over: the article view with version history and diffs, the article
editor with drafts, illustrations with upload and moderation, edit
premoderation, search, the Orthodox calendar and the forum (read-only so far).
The new frontend's editor is embedded into the legacy site as well. The home page
and news are next.

## Stack

The legacy site — **Yii Framework 1.1** (**PHP 8.5+**); when it is touched, the
code is brought up to modern PHP standards: strict typing, PSR-4, **PHPUnit**,
**PHPStan** (a strict level for new code, a baseline for the old code that may
only shrink), PHP-CS-Fixer, versioned database migrations.

The new frontend — an **Nx** monorepo with an **Angular 22** app (zoneless) on
**TypeScript 6**: **RxJS**, **Angular Signals**, **Angular Material** (M3), a
**CodeMirror 6** editor, drafts in IndexedDB via Dexie, SSR on **Express 5** for
article pages, unit tests with **Jest + Spectator**, two **Playwright** suites —
an integration suite with a mocked API and e2e against the real backend —
monitoring via **Sentry**. Quality is held by ESLint with strict type-checked
rules, a type coverage floor of about 100% and a test coverage floor. Package
manager — **Yarn**.

## My part

Entirely my own project: I **came up with, built and administer** the site.

- Running the **migration from legacy Yii1 to Angular**: the legacy app serves as
  the backend for the new frontend.
- Set up the **Nx monorepo** — the `client` app and the `core`, `shared`, `ui`,
  `editor` libraries.
- Modernizing the **legacy Yii backend**: building the REST API for the new
  frontend, moving the code to modern PHP, covering it with PHPUnit tests,
  fixing vulnerabilities, and wrote a spam filter for the forum.
- Built **CI/CD on GitHub Actions**: for the frontend, a beta deploy on push to
  `main` and a release on tags; for the backend, tests, static analysis and a
  dependency audit on every PR.
