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
Wikipedia with its own specifics: articles, news, a forum and reference sections,
mostly in Russian. Running since 2005.

The site has been through several generations of its engine: originally written
from scratch in bare **PHP**, then rewritten on **Yii**. A major refactoring is
now underway: a new **Angular** frontend is gradually replacing the legacy site's
pages, while the old **Yii** application serves as the backend — feeding data to
the new frontend over an API.

## Stack

The legacy site — **Yii Framework 1.x** (**PHP 8.5+**); when it is touched, the
code is brought up to modern PHP standards (strict typing, PSR-4, PHPUnit).

The new frontend — an **Nx** monorepo with an **Angular 21** app: **RxJS**,
**Angular Signals**, **Angular Material** (M3), a **CodeMirror 6** editor, SSR on
**Express**, unit tests with **Jest + Spectator**, e2e with **Playwright**,
monitoring via **Sentry**. Package manager — **Yarn**.

## My part

Entirely my own project: I **came up with, built and administer** the site.

- Running the **migration from legacy Yii1 to Angular**: the legacy app serves as
  the backend for the new frontend.
- Set up the **Nx monorepo** — the `client` app and the `core`, `shared`, `ui`,
  `editor` libraries.
- Modernizing the **legacy Yii backend**: moving the code to modern PHP and
  covering it with PHPUnit tests.
- Built the **CI/CD on GitHub Actions** (beta deploy on push, release on tags),
  unit and e2e testing, monitoring via Sentry.
