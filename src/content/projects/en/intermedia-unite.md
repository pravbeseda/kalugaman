---
title: 'Intermedia Unite'
description: 'A business messenger: web on Angular, desktop on Electron.'
tags: ['Angular', 'Electron']
period: '2022 — now'
links:
  - type: website
    url: 'https://www.intermedia.com/products/unite'
order: 1
---

## What it is

**Unite** is a business messenger from Intermedia, a US cloud communications
provider: alongside chats, a single product bundles telephony, SMS chats, video
calls and file storage.

**Contact Center** is a tool for contact centers: agents handle requests from
voice, email and text queues, and statistics are collected. It runs both
standalone and embedded inside Unite.

## Stack

A web version on **Angular** (plus some legacy React) and a desktop app on
**Electron**.

## My part

Implemented a wide range of tasks aimed at extending functionality and improving
the app's stability, including:

- **Reworked the chat search system end to end**: decomposed monolithic code into
  lightweight services and small components — easier to maintain and test.
- Built a new version of the **Contact Center monitoring** section.
- Contributed to the development of **Unite Teams Integration** — a web app for
  Microsoft Teams — and **Unite Desktop Widget**, a separate app that keeps state
  and maintains the backend connection when the user leaves the Unite tab in MS
  Teams.
- Built a CI e2e testing system for Unite Teams Integration with **Playwright**:
  running the web app with an emulated MS Teams environment, the Unite desktop
  widget, and several Unite Desktop instances at once to test calls.
- Cover the code with unit tests and Cypress.
