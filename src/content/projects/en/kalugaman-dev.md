---
title: 'kalugaman.dev'
description: 'This site: a static bilingual portfolio and resume built with Astro, with almost no client-side JS and automated deploys to my own VPS.'
tags: ['Astro', 'TypeScript', 'Ansible']
period: 'since 2026'
kind: personal
links:
  - type: repo
    url: 'https://github.com/pravbeseda/kalugaman'
order: 5
---

## What it is

The site you are reading right now: a personal portfolio and resume in two
languages, English and Russian. Fully static, with **almost no client-side
JavaScript** — only the View Transitions router, the theme toggle, the mobile
menu, a couple of small navigation scripts and the Yandex.Metrica counter reach
the browser, with no UI framework at all. Light and dark themes, and a **PDF** version of the resume.

The guiding principle is that **content is separated from presentation**. Content
lives in Markdown and typed translation dictionaries, presentation in components,
styling in design tokens. Changing a theme never touches the texts; editing a
text never means going into the code.

## Stack

**Astro 7** builds static HTML at build time. Texts are **Content Collections**
with **zod** schemas: a typo in the frontmatter breaks the build instead of
quietly reaching production. Bilingual routing is done by hand through `[lang]`
routes, and interface strings live in typed dictionaries with a `t()` helper.

Styling is plain **CSS** and design tokens: a theme is a set of variable values
plus a `data-theme` attribute, and the markup does not change when it is
switched. The **Inter** font is self-hosted, subset to Latin and Cyrillic. Images
go through `astro:assets` (webp/avif, srcset, lazy), navigation through **View
Transitions** — no reloads and no flash on the dark theme. Plus a sitemap with
hreflang, Open Graph and JSON-LD; the social share image is generated at build
time from the resume data, one per language. The palette is defined in one place
and feeds the themes, that image and the contrast check alike.

Checks on every PR: **Prettier**, `astro check` (types and content schemas), a
language parity script (a document must exist in both languages) and
cross-language content checks at build time (the language versions of the resume and
projects must match in structure), a **WCAG**
contrast check, the build and a smoke check of `dist/`. On deploy there is also
the PDF resume render and **Playwright** e2e tests.

## My part

Architecture, markup, content and infrastructure.

- Built **CI/CD on GitHub Actions**: a push to `main` → checks → build → rsync
  deploy to my own **VPS**. The directory is swapped by renaming, and after the
  deploy the site is verified with a request and rolled back automatically if it
  fails.
- The server is described in **Ansible**: a separate unprivileged deploy user with
  its own directory, with nothing configured on the machine by hand.
- Built **project mini-sites** on `<name>.kalugaman.dev` subdomains: plain HTML
  in a `sites/<name>/` folder, a deploy workflow of their own and a single
  wildcard nginx host — a new site is a new folder, with no server or DNS change.
- The **PDF** resume is generated from the same data as the page — as a print
  version of the page in a headless browser, with no second source of truth.
