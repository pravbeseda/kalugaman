# Plan: CI/CD for kalugaman.ru

Goal: a push to `main` updates the live site, with no manual steps. Plus checks on
pull requests, so a broken build never reaches `main`.

Complements [`plan.md`](./plan.md) §8 and [`roadmap.md`](./roadmap.md).

## Decisions

| Question           | Decision                                                                          | Why                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Server             | The same VPS as drevo; directory `~/kalugaman.ru`, next to its `~/releases/`      | The machine exists and nginx is already there                                                                     |
| Swapping the build | rsync into `~/kalugaman.ru.new` → `mv` the live one to `.old` → `.new` into place | Effectively atomic, without symlinks or release dirs; `.old` is a one-step rollback                               |
| Deploy trigger     | Push to `main` + `workflow_dispatch` (a button)                                   | Single developer; the gate already exists on PRs                                                                  |
| Checks             | `astro check`, `prettier --check`, language parity, build + smoke                 | They catch exactly the failures that are real here                                                                |
| ESLint             | **Skipped**                                                                       | Almost no JS in the project; 5–6 dependencies for a couple of inline scripts                                      |
| Tests              | **None**                                                                          | No logic to test; types and schemas are covered by `astro check`. E2E later, together with Playwright for the PDF |

## What we build

### 1. Prettier

- `npm i -D prettier prettier-plugin-astro`
- `.prettierrc` (matching the existing style: 2 spaces, single quotes, width 100) and `.prettierignore` (`dist`, `.astro`, `node_modules`, `package-lock.json`).
- Scripts: `format` (writes) and `format:check` (verifies only — for CI).
- The one-off `npm run format` over the codebase goes in its own commit, so reformatting doesn't blend into substantive changes.
- Markdown under `src/content/` is **excluded**: Prettier rewraps prose and mangles hand-set line breaks.

### 2. Language parity script — `scripts/check-i18n-parity.mjs`

The rule from CLAUDE.md: every document exists in both `en/` and `ru/` under the same slug.

- Collections are discovered from the filesystem and locales come from `src/i18n/config.ts` — nothing is hardcoded, so a new collection or locale is checked from the day it appears. Two shapes are handled: `projects/{en,ru}/<slug>.md` (slug sets must match) and `resume/{en,ru}.md` (both files must exist).
- A missing language directory is reported as a parity failure, not an ENOENT crash — that is the most likely way parity breaks in the first place.
- On a mismatch it prints what is missing and exits 1 (an **error**, not a warning: a mismatch means LangSwitch links to a 404).
- Plain Node, no dependencies. Exposed as `npm run check:i18n`.

### 3. Build smoke check — `scripts/check-dist.mjs`

After `astro build`, confirm the build actually produced a site: the root page, every
top-level route in every locale, **every project detail page** (derived from
`src/content/projects/`, so a new project is covered automatically) and
`sitemap-index.xml` all exist and are non-empty, and `dist/_astro/` is not empty.
Otherwise exit 1.

Cheap, and it catches "the build was green but we shipped an empty directory".
Exposed as `npm run check:dist`.

Both scripts import `src/i18n/config.ts` directly, which relies on Node's native type
stripping (default since 22.18) — hence `engines.node: >=22.18.0`.

### 4. `.github/workflows/ci.yml`

Triggers: `pull_request` (into `main`) and `push` to `main`.

```
jobs.ci (ubuntu-latest):
  - actions/checkout@v5
  - actions/setup-node@v5   (node-version: 22, cache: npm)
  - npm ci
  - npm run format:check
  - npm run check           # astro check: types, content schemas, broken imports
  - npm run check:i18n
  - npm run build
  - npm run check:dist
```

`concurrency` keyed on `github.ref` with `cancel-in-progress: true` — a new push
cancels the previous run on the same branch.

Node is pinned to 22 explicitly rather than read from `package.json`: `engines` holds
a range (`>=22.18.0`), and setup-node would resolve that to the newest Node available,
silently drifting away from the local version.

### 5. `.github/workflows/deploy.yml`

Triggers: `push` to `main` and `workflow_dispatch`.
`concurrency: group: deploy, cancel-in-progress: false` — two deploys must never
overlap on the server.

The job is gated on `if: vars.DEPLOY_ENABLED == 'true'` — a repository variable, not a
secret. It lets the workflow land on `main` before the server exists (the job is skipped
rather than failing red), and afterwards it doubles as a kill switch for auto-deploy.

```
jobs.deploy (ubuntu-latest, environment: production):
  - checkout / setup-node / npm ci
  - format:check + astro check + check:i18n   # same gate as ci.yml, see below
  - npm run build
  - npm run check:dist                        # never ship an empty build
  - shimataro/ssh-key-action@v2               # SSH_PRIVATE_KEY + SSH_KNOWN_HOSTS
  - rsync -az --delete dist/ user@host:kalugaman.ru.new/
  - ssh: swap into place (below)
  - curl https://kalugaman.ru/en/             # the site answers 200
  - on failed verification: roll back
```

Deploy re-runs the full check suite rather than trusting `ci.yml`: both workflows fire on
`push` to `main` and run in parallel, so nothing would stop a commit that lands outside a
green PR from shipping while CI goes red next to it. The three duplicated steps cost about
ten seconds and make the deploy its own gate; a `workflow_run` dependency would cost more
plumbing than it saves here.

The swap, in one ssh command under `set -euo pipefail`:

```bash
test -f ~/kalugaman.ru.new/index.html
rm -rf ~/kalugaman.ru.old
if [ -d ~/kalugaman.ru ]; then
  mv ~/kalugaman.ru ~/kalugaman.ru.old
fi
mv ~/kalugaman.ru.new ~/kalugaman.ru
test -f ~/kalugaman.ru/en/index.html
```

Two `mv`s within one filesystem are inode renames — milliseconds. There is
effectively no window where the site is in a mixed state.

The final step verifies the site answers 200 (`curl --retry 3`, so a transient blip on
the VPS does not fail an otherwise-good deploy). If it does not, the workflow rolls back
by itself: `.old` goes back into place, the failed build is kept as `~/kalugaman.ru.bad`.
The rollback step is gated on the swap step having succeeded — otherwise a failure
_before_ the swap would restore an older build over the live one.

Note: rsync into `.new` runs with `--delete` so leftovers from an aborted previous
run cannot survive into the next deploy.

### 6. Secrets and the deploy key

Repository settings → Secrets → Actions:

- `SSH_HOST`, `SSH_USER`, `SSH_PORT` — the same VPS as drevo.
- `SSH_PRIVATE_KEY` — a **fresh** key pair created for this repository. We do not reuse drevo's key: compromising one repo must not hand over access on behalf of the other. The public half goes into the deploy user's `~/.ssh/authorized_keys`.
- `SSH_KNOWN_HOSTS` — the output of `ssh-keyscan -p <port> <host>`.

GitHub secrets are not shared between repositories — they have to be created here even
though the host/user values match drevo.

Step-by-step server setup: [`../deploy/README.md`](../deploy/README.md).

### 7. nginx on the server

Config: [`../deploy/nginx/kalugaman.ru.conf`](../deploy/nginx/kalugaman.ru.conf), with
`root /home/<deploy-user>/kalugaman.ru;` — root language redirect via `Accept-Language`,
clean URLs, immutable caching for `/_astro/`, `must-revalidate` for HTML, gzip, security
headers. TLS via certbot, with 80→443 and www→apex redirects. DNS `kalugaman.ru` (A) → the VPS IP.

Important: nginx must be able to traverse the deploy user's home directory
(`chmod o+x ~`), otherwise every request is a 403.

## Order of work

1. Prettier + config + the one-off reformat (its own commit).
2. `scripts/check-i18n-parity.mjs` + `scripts/check-dist.mjs` + npm scripts.
3. `ci.yml` — open a PR and confirm the checks are green.
4. Server side: deploy key, site directory, nginx config, DNS, certbot.
5. Secrets in GitHub.
6. `deploy.yml` — first run it via `workflow_dispatch`, confirm the files landed and
   the site answers; then let the `push to main` trigger do its job.
7. Rehearse the rollback: restore `.old` by hand and confirm the site is back.

Steps 1–3 need no server and are done first. Step 4 is the only manual one, on the VPS.

## Deliberately out of scope

- **Versions, tags, GitHub Releases, changelog** (as in drevo) — ceremony without a consumer for a personal site.
- **A staging/beta environment** — a single version, as requested.
- **Caching `node_modules` separately from setup-node** — `cache: npm` already covers it.
- **Lighthouse CI, broken-link checker** — worthwhile, but later (roadmap phase F), to keep the first pass small.
