---
title: 'Sleepy Cocktail'
description: 'An Android app with sleep noises: six noises that can be mixed together. The sound is synthesised on the fly, with no audio files.'
tags: ['Kotlin', 'Android', 'AudioTrack', 'DSP']
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

An app for falling asleep to noise: **six noises** — brown, white, pink, grey,
green and surf. Each has its own switch and its own volume; they can be played on
their own or mixed in any proportion into your own "cocktail". A **sleep timer**
in half-hour steps, up to 10 hours, fades the sound out when it runs out. The
settings — volumes and enabled noises, the timer, the theme, the language — are
kept between launches.

The sound plays in a **foreground service**: it keeps going when you leave the
app or lock the screen, and the notification shows the countdown and a Stop
button. During a call the noise goes quiet and comes back afterwards; unplugging
headphones stops it instead of switching to the speaker. Start and stop fade in
and out over a second.

The key decision: the sound is not played back from files but **synthesised in
real time**. Hence the tiny app size, the absence of audible seams on looping,
and the ability to keep playing for as long as needed. The app is free, with no
ads.

## Stack

**Kotlin**, **Android SDK** (minSdk 26, targetSdk 36), UI on XML layouts with
**AppCompat**, no Compose. The sound runs on the low-level **AudioTrack** in
streaming mode (PCM 16-bit, 44.1 kHz, mono): a software mixer sums all noises
into a single stream, and a muted noise is not generated at all. Generation runs
on a separate `URGENT_AUDIO`-priority thread, and the engine is a state machine
on a `ReentrantLock`.

Each noise is its own DSP algorithm: brown is a one-pole low-pass over white,
pink is Paul Kellett's filter bank, grey is biquads fitted to the ISO 226
equal-loudness contour, green is a 250–1200 Hz band-pass, surf is two bands with
randomised wave envelopes. All sources share one level, so even all six at full
volume clip under 1% of samples.

Plus **Firebase** (Analytics, Crashlytics), a splash screen via
`core-splashscreen`, two themes (purple and dark), **6 interface languages**
including Arabic with full **RTL** support. Built with **Gradle** (Kotlin DSL,
version catalog), R8 in release builds.

## My part

Entirely my own project — from the idea and the sound synthesis to publishing on
Google Play.

- Designed the **audio engine**: the mixer, the foreground service, audio focus
  handling, smooth fades.
- Covered the DSP with **unit tests** — down to checking the noises' frequency
  response; an 80% coverage floor blocks the build.
- Built **CI/CD on GitHub Actions**: every merge ships an alpha build through
  Firebase App Distribution, releases go to Google Play through Gradle Play
  Publisher, and the store screenshots and listings in all 6 languages are
  generated and published automatically.
