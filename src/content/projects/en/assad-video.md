---
title: 'ASSaD-Video'
description: 'Frontend of a browser-based video surveillance system.'
tags: ['JavaScript', 'jQuery', 'AngularJS']
period: '2013 — 2019'
order: 3
---

## What it is

The ASSaD-Video surveillance system. The client side runs **right in the browser**
— on workstations under **Astra Linux Special Edition** — and consists of three main
sections: **Video Grid Viewer**, **Video Archive** and **Surveillance Settings**.
A separate **Floor Plan Editor** app lets you place cameras on the site's floor
plans and quickly perform common actions with them.

## Stack

**JavaScript**, **jQuery**, **AngularJS**, **fabric.js**, **HTML5 video**,
**WebSockets**, **WebRTC**; server side and web apps in **Java** (**JSP**,
**Tomcat**).

## My part

Actively contributed to developing the project's GUI applications.

- Built the **Video Grid Viewer** and **Video Archive** sections from scratch, and
  made the **video grid editor** within Settings.
- **Designed and implemented the video grid concept**: not a plain table, but a set
  of video cells with "magnetic" edges — in the grid editor they can be dragged
  freely across the screen, resized and overlapped.
- Wrote the **Floor Plan Editor** in **AngularJS**.
- Implemented the player as a large set of **jQuery plugins** assembled into a
  single standalone bundle. This made it easy to swap the player engine and plug in
  analytics modules (face and license-plate recognition, line crossing, etc.).
  **fabric.js** was used to draw the analytics overlays on top of the video. The
  player supported fast zoom with the mouse wheel and could play **360°** streams.
- The frontend started out as Java web apps (JSP, Tomcat), but over time we moved
  away from Java code toward **JS/jQuery** and talking to the backend over **AJAX**.
- Over six years the player engine changed three times: a browser **VLC** plugin →
  **HTML5 video** and **Media Source Extensions** with the stream delivered over
  WebSockets → a grid of **WebRTC players**.
