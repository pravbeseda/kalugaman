---
title: 'Intermedia Unite'
description: 'A business messenger and contact center: web on Angular, desktop on Electron.'
tags: ['Angular', 'Electron']
period: '2022 — now'
links:
  - type: website
    url: 'https://www.intermedia.com/products/unite'
featured: true
order: 1
---

## What it is

**Unite** is a business messenger where a single product bundles chats together
with telephony, SMS chats, video calls and file storage.

**Contact Center** is a tool for contact centers: agents handle requests from
voice, email and text queues, and statistics are collected along the way. Contact
Center runs both standalone and embedded inside Unite.

## Platforms

A web version on **Angular** (plus some legacy React) and a desktop app on
**Electron**. Since 2023, the Unite Teams Integration plugin lets people use the
app directly inside Microsoft Teams.

## My part

- Started on chat support: **reworked the search system end to end**, decomposing
  monolithic code into lightweight services and small components — easier to
  maintain and test.
- Built a new version of the **Contact Center monitoring** section.
- Since summer 2024, worked on **Unite Teams Integration**: embedding the app into
  Microsoft Teams and developing the **Unite Desktop Widget** — a separate app that
  keeps state and maintains the backend connection when the user leaves the MS Teams
  app tab.
- Implemented a wide range of tasks aimed at extending functionality and improving
  the stability of the app.
- Cover the code with unit tests and Cypress.
- Built an e2e testing system for Unite Teams Integration with Playwright (it
  required running the web app with an emulated MS Teams environment, the Unite
  desktop widget, and several Unite desktop instances at once to test calls).
