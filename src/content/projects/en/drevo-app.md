---
title: 'Drevo for Android'
description: 'The "Drevo" encyclopedia mobile app for Android. Over 50k installs.'
tags: ['Android', 'Java', 'Kotlin']
period: 'since 2012'
kind: personal
links:
  - type: website
    url: 'https://play.google.com/store/apps/details?id=ru.drevoinfo'
    label: 'Google Play'
order: 3
---

## What it is

An **Android** mobile app for the **Drevo** encyclopedia, published on Google
Play. It gives **offline access** to the whole encyclopedia — over 32,000
articles and 20,000 illustrations. The database ships as a separate package via
**APK Expansion** and is updated monthly with a delta patch: the patch holds only
the changes to the article texts, applied on top of the base package.

Articles open in a built-in reader with navigation along internal links and its
own history. There is a word-list search filtered by topic, bookmarks with export
and import, three themes (light, dark, black), adjustable font size and a
two-pane layout for tablets.

## Stack

**Android SDK** (minSdk 24, targetSdk 36), code in **Java** and **Kotlin** — all
new code is written in Kotlin. UI on XML layouts (AppCompat and Material
widgets), with articles rendered in a **WebView**. **Google Play Billing** for
donations, **Firebase** (Analytics, App Distribution), an offline database via
**APK Expansion** (downloader library and Play Licensing), delta patches on
javaxdelta. Built with **Gradle**, R8 in release builds.

## My part

Entirely my own project — from development to publishing and support on Google
Play.

- Ship **monthly database updates**: building the patch and the release is
  automated with a script.
- Brought the legacy app's **code quality** into shape: CI on **GitHub Actions**
  with the build, unit tests, Android Lint, **detekt**, **Error Prone** and
  **NullAway** with warnings as errors, Spotless and a secret scan; every push to
  `main` ships a signed QA build through Firebase App Distribution.
- Pulling logic out of the legacy classes so it can be covered by **unit
  tests**, and writing new code test-first.
