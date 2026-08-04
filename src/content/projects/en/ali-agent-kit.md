---
title: 'ali-agent-kit'
description: 'An npm package that installs a shared set of agent skills into Claude Code, GitHub Copilot CLI and Codex CLI with a single command.'
tags: ['Node.js', 'CLI', 'npm']
period: 'since 2026'
kind: personal
links:
  - type: website
    url: 'https://www.npmjs.com/package/ali-agent-kit'
    label: 'npm'
  - type: repo
    url: 'https://github.com/pravbeseda/ali-agent-kit'
order: 6
---

## What it is

A tool for people who use several AI agents at once. A skill is a written-down
procedure an agent follows: how to review a branch, how to work through the
comments on a pull request, how to go over the open questions in a plan one at a
time. The problem is that every agent keeps its skills to itself, and the copies
on different machines and in different agents inevitably drift apart.

`ali-agent-kit` turns them into an **npm package**: the skills live in one
repository, are published to the registry and installed with a single command —
`npx ali-agent-kit@latest install` — into **every** detected agent at once:
Claude Code, GitHub Copilot CLI, Codex CLI. Updating is the same command. The
package is published on npm and I use it every day.

The install is **atomic**: files are assembled in a staging directory and swapped
in by renaming, so an interrupted run never leaves half a skill behind. Skills
removed from the package are removed from the consumer as well, and files that
are not ours are never touched — ours carry an ownership marker, and if an
unmanaged file turns up alongside them, the command exits with a separate code
instead of quietly overwriting it.

## Skills

- `ali-review-branch` — compares the current branch against the base one and
  walks through the findings one at a time instead of dumping the whole list.
- `ali-review-pr` — posts the findings as inline comments on the lines of code
  through `gh api`, the way a human reviewer does: questions and doubts only, no
  ready-made fixes.
- `ali-process-pr-comments` — takes the unresolved review comments one by one:
  checks whether each one is fair, agrees on the decision, applies the change and
  resolves the thread.
- `ali-one-by-one` — goes over the open questions in a plan in turn — context,
  rated options, a recommendation — and writes the decision back into the plan
  file.
- `ali-generate-pr-description-uc` — turns the branch diff into a ready pull
  request description in the corporate template, along with the mandatory
  checklists.

## Stack

Plain **Node.js** (>= 18) with **zero dependencies** — the package is installed
as a CLI and has no business dragging someone else's tree along. Tests run on the
built-in `node:test` and include a check of the README itself: the command
examples in the documentation are verified against the real CLI, so the docs
cannot drift away from the code.

Support for an agent is a one-file **adapter plugin**: an id, a label and a
function that returns the directories for a given environment. A new agent is
added without touching the core. The skill validator checks names, frontmatter
and duplicates, and runs in `prepublishOnly`, so a broken skill cannot be
published.

Releases are a **GitHub Actions** workflow with a manual trigger and a choice of
`patch` / `minor` / `major`: the version is read from the registry, bumped in the
working copy only and published with **provenance**. Nothing is committed to
`main` in the process — the branch stays protected, and every change reaches it
through a pull request.

## My part

The idea, the architecture, the implementation and the release.
