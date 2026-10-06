---
title: 'Antispam for Apple Mail'
description: 'An Apple Mail extension for macOS: it checks every new message in every account with TypeSafe Jev and moves spam and phishing to Junk.'
tags: ['Swift', 'macOS', 'MailKit']
period: 'since 2026'
kind: personal
links:
  - type: repo
    url: 'https://github.com/pravbeseda/antispam'
order: 7
---

## What it is

A spam filter built right into Apple Mail. Every new message — in any connected
account, whatever the mail provider — is sent for classification to **TypeSafe
Jev**, which answers with a category (spam, phishing, promo, legit) and a
confidence. A policy takes it from there: spam and phishing at or above the
threshold go to Junk; below it they get a yellow background and a gray flag but
stay in the Inbox; promo mail gets a purple flag. The threshold defaults to 0.9.

The main rule is **do no harm**: on any error — no key, no network, an
unexpected response — the message is left untouched. Only the key headers, up
to 8000 characters of text and the link domains go to the service, not the
whole message.

The host app keeps the API key and the threshold, tests the connection and shows
the latest 200 decisions; they also go to the system log. A separate
**watchdog** checks every half hour that filtering actually works: Mail can
reach the extension, the extension has not crashed, the latest Jev check
succeeded — and posts a notification when something is broken.

## Stack

**Swift 6** with strict concurrency checking, **MailKit**
(`MEMessageActionHandler`), **SwiftUI** for the host app, settings shared
through an App Group, sandbox and hardened runtime. The project is described
in **XcodeGen**, and all the logic lives in the dependency-free Swift package
`AntispamCore`, covered by tests that run with plain `swift test`, without Xcode
or Mail.

The package has its own **MIME parser**: it handles nested parts, charsets and
encoded words in headers, and caps the nesting depth and the amount of text so
that a huge message cannot stall the filter. When the plain-text part is empty,
the text is taken from the HTML — a common trick spammers use to slip past
text-only filters. The Jev client takes its transport from outside and is
tested without a network, and the model version is pinned: the thresholds are
calibrated for one specific model.

A debug build gets its own bundle ID and does not compete in Mail with the
installed extension. Installing is one script: it builds a Release copy into
`/Applications`, unregisters other copies of the extension (two registered
copies break Mail) and installs the watchdog as a LaunchAgent.

## My part

Entirely my own project, built for myself: the idea, the architecture, the
implementation.
