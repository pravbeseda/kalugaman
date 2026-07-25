---
title: 'Sleep Noise'
description: 'An Android app with white and brown noise for sleep. The sound is synthesised on the fly, with no audio files.'
tags: ['Kotlin', 'Android', 'AudioTrack']
period: 'since 2025'
kind: personal
links:
  - type: website
    url: 'https://play.google.com/store/apps/details?id=ru.pravbeseda.sleepnoise'
    label: 'Google Play'
  - type: repo
    url: 'https://github.com/pravbeseda/sleep-noise'
order: 4
---

## What it is

An app for falling asleep to noise: **white** and **brown** noise with
independent volume controls — they can be played on their own or mixed in any
proportion. There is a **sleep timer** in half-hour steps that switches the sound
off when it runs out. The settings — the volume of each noise, the timer value,
the theme — are kept between launches.

The key decision: the sound is not played back from files but **synthesised in
real time**. Hence the tiny app size, the absence of audible seams on looping,
and the ability to keep playing for as long as needed. The app is free, with no
ads.

## Stack

**Kotlin**, **Android SDK** (minSdk 24, targetSdk 36), UI on XML layouts with
**Material Components**. The sound runs on the low-level **AudioTrack** in
streaming mode (PCM 16-bit, 44.1 kHz, mono): the generator fills the buffer with
samples on a separate max-priority thread, with playback state synchronised
through `AtomicBoolean`. White noise is a uniform random signal, brown noise is
integrated white with the amplitude clamped. Plus **Firebase** (Analytics,
Crashlytics), a splash screen via `core-splashscreen`, three themes (light, dark,
system), **6 interface languages** including Arabic with full **RTL** support.
Built with **Gradle** (Kotlin DSL, version catalog).

## My part

Entirely my own project — from the idea and the sound synthesis to publishing on
Google Play.
