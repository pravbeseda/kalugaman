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
`npx ali-agent-kit@latest install` — into every detected agent at once:
Claude Code, GitHub Copilot CLI, Codex CLI. A skill can limit itself to specific
agents, and then it is not installed into the others. Updating is the same
command; there are also `list`, `validate`, `uninstall` and `--dry-run`. The
package is published on npm and I use it every day.

The install is **atomic**: files are assembled in a staging directory and swapped
in by renaming, a failed swap restores the previous version, and whatever a
killed run left behind is recovered on the next one. Skills
removed from the package are removed from the consumer as well, and files that
are not ours are never touched — ours carry an ownership marker, and if an
unmanaged file turns up alongside them, the command exits with a separate code
instead of quietly overwriting it.

## Skills

The package now ships 11 skills, covering the way from a task to a merge.

- **Review.** `ali-review-branch` checks the local branch — uncommitted work
  included — and walks through the findings one at a time. `ali-review-pr` posts
  the findings as inline comments marked `blocking` / `suggestion`, the way a
  human reviewer does: questions and doubts only, no ready-made fixes — and ends
  with a ready-to-merge verdict. `ali-review-pr-duo` runs that review in Claude
  and in Codex in parallel.
- **Handling feedback.** `ali-process-pr-comments` takes the unresolved comments
  one by one: checks each against the code, applies the change and resolves the
  thread; obvious bot findings it settles on its own, contested ones it
  discusses. `ali-merge-pr` merges the pull request and refuses while any thread
  is open or a check has failed.
- **Decisions and documents.** `ali-one-by-one` goes over the open questions in
  a plan in turn — context, rated options, a recommendation — records the
  decision and then implements what was agreed. `ali-generate-pr-description`
  writes the pull request description in the repository's own template, leaving
  its checklists untouched.
- **Autopilot.** `ali-autopilot` implements a feature on its own: a plan, then a
  "step → independent review by subagents → fix" loop, ending with a branch and a
  pull request that lists the decisions it took for you.
- **Agent instructions.** `ali-instructions-global` and
  `ali-instructions-project` audit and tidy the instruction files: one master
  file is rendered for Claude Code, Codex and Copilot, and every write is backed
  up and approved first.
- **Crashlytics.** `ali-crashlytics-issues` turns Firebase Crashlytics crashes
  into GitHub issues, checking each against the code and never filing a
  duplicate.

## Stack

Plain **Node.js** (>= 18) with **zero dependencies** — the package is installed
as a CLI and has no business dragging someone else's tree along. Tests run on the
built-in `node:test`, in CI on Node 18, 20 and 22. They check the repository
itself too: the skills table in the README is verified against the skills the
package actually ships, blocks deliberately duplicated across skills must stay
identical, and all text must be in English.

Support for an agent is a one-file **adapter plugin**: an id, a label and a
function that returns the directories for a given environment. A new agent is
added without touching the core. The skill validator checks names, frontmatter
and duplicates, and runs in `prepublishOnly`, so a broken skill cannot be
published.

Releases are a **GitHub Actions** workflow with a manual trigger and a choice of
`patch` / `minor` / `major`: the version is read from the registry, bumped in the
working copy only and published with **provenance**, followed by a git tag and a GitHub Release. Nothing is committed to
`main` in the process — the branch stays protected, and every change reaches it
through a pull request.

## My part

The idea, the architecture, the implementation and the release.
