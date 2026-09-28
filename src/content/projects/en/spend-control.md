---
title: 'How Much Can I Spend?'
description: 'An Android app for personal expense control. Over 100,000 installs.'
tags: ['Kotlin', 'Android', 'Room']
period: 'since 2018'
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
spending limit and recalculates it after every entry. There are transfers between
wallets, a savings part that stays out of the limit calculation (negative savings
are a debt), statistics by day, month and year, multiple profiles, a home screen
widget, reminders and a daily automatic backup to a folder of your choice,
cloud storage included.

Published on Google Play in two variants, free and premium. The premium version
has **over 100,000 installs**, the free one another 50,000 — all of it with no
advertising budget. The interface is translated into more than **30 languages**,
many of the translations done by the users themselves.

## Stack

**Kotlin**, **Android SDK** (minSdk 24), UI on XML layouts, a data layer on
**Room** (7 entities, schema v23), **Coroutines + Flow**, ViewModel, Material
Components, MPAndroidChart for statistics, **Google Play Billing** for purchases,
Firebase (Analytics, Crashlytics), reminders on AlarmManager, automatic backup on
**WorkManager** and the Storage Access Framework. The architecture is **MVVM +
Repository** with a pure Kotlin/JVM `domain` module: 23 use cases with 100% test
coverage, manual DI through a composition root, and layer rules enforced by
architecture tests. Built with **Gradle** with free and premium flavors, R8 in
release builds.

## My part

Entirely my own project — from the idea to the store listing. I built it for
myself first of all, so the product grows along with real use.

- Came up with and implemented **the accounting model itself**: not "where the
  money went" but "how much is left for today" — which turned out to be the reason
  people stay with the app for years.
- Set up **crowdsourced localization**: the user community translated the
  interface into dozens of languages.
- Built **CI/CD on GitHub Actions**: every PR runs linters, detekt, Android
  Lint, a coverage floor, instrumented tests on API 24 and 36 emulators, a
  secret scan and SAST; every merge ships a signed build to testers through
  Firebase App Distribution; a release tag smoke-tests the R8 build and uploads
  both variants to Google Play with a staged rollout.
- Carried out a **refactoring toward clean architecture**: business logic moved
  into the Android-independent `domain` module, data flows through Flow, over
  350 unit tests. The module is ready to become the shared core for sync between
  devices and an iOS version on Kotlin Multiplatform — the next stages.
