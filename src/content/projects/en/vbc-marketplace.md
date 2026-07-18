---
title: 'VBC Marketplace'
description: 'A fintech aggregator of banking services with four workspaces.'
tags: ['Angular', 'RxJS', 'NgXS', 'TailwindCSS']
period: '2019 — 2022'
links:
  - type: website
    url: 'https://vbankcenter.ru'
featured: true
order: 2
---

## What it is

The All-Russian Business Center marketplace — a fintech app with four workspaces:
**client, operator, agent, bank**. Essentially a banking aggregator: a client
applies for banking services (a guarantee, a loan, etc.), the application passes
automatic scoring and reaches the banks whose terms it meets. Banks then work the
application by hand and form an offer; operators and agents guide their clients
through the forms.

## Stack and work

- Frontend on **Angular** (v12 and a bit of v1), **RxJS**, **NgXS**.
- Migrated features from a legacy app, maintained products, fixed business logic
  per analysts' notes, refactored.
- Built UI from **Figma** designs, integrated REST APIs via **Swagger**.

## Designing new versions

Moved from **Bootstrap** to **TailwindCSS**, built a UI kit with **Storybook.js**,
and adopted **Component-Driven Development**.
