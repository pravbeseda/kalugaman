---
title: 'How Much Can I Spend?'
description: 'An Android app for personal expense control. Over 100,000 installs.'
tags: ['Kotlin', 'Android', 'Room']
period: '2018 — now'
kind: personal
links:
  - type: website
    url: 'https://play.google.com/store/apps/details?id=pravbeseda.spendcontrol.premium'
    label: 'Google Play — premium'
  - type: website
    url: 'https://play.google.com/store/apps/details?id=pravbeseda.spendcontrol'
    label: 'Google Play — free version'
order: 1
---

## What it is

An app for personal expense control that answers a single question: **how much
can I spend today and still make it to payday**. The user sets up wallets — cards,
accounts, cash — and the date of the next income; the app works out the daily
spending limit and recalculates it after every entry. There is a savings part that
stays out of the limit calculation, statistics by day, month and year, multiple
profiles and a home screen widget.

Published on Google Play in two variants, free and premium. The premium version
has **over 100,000 installs**, the free one another 50,000 — all of it with no
advertising budget. The interface is translated into more than **30 languages**,
many of the translations done by the users themselves.

## Stack

**Kotlin**, **Android SDK** (minSdk 24), UI on XML layouts, a data layer on
**Room** (7 entities, over 20 migrations), Coroutines, LiveData/ViewModel,
Material Components, MPAndroidChart for statistics, **Google Play Billing** for
purchases, Firebase (Analytics, Crashlytics), a widget, reminders and backups on
AlarmManager and the Storage Access Framework. The architecture is **MVVM +
Repository**; business logic is gradually moving into `domain`, an
Android-independent Kotlin/JVM module. Built with **Gradle** across two flavor
dimensions (free/paid).

## My part

Entirely my own project — from the idea to the store listing. I built it for
myself first of all, so the product grows along with real use.

- Came up with and implemented **the accounting model itself**: not "where the
  money went" but "how much is left for today" — which turned out to be the reason
  people stay with the app for years.
- Set up **crowdsourced localization**: the user community translated the
  interface into dozens of languages.
- Built the **CI/CD pipeline**: tests, signed builds, delivery to testers and
  upload to Google Play.
- Currently running a **refactoring toward clean architecture** — to unblock unit
  tests, an iOS version on a shared codebase, and sync between devices.
