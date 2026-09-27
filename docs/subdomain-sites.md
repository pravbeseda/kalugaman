# Plan: project mini-sites on `<name>.kalugaman.dev`

Goal: adding a standalone site for a project is one folder and one PR. First site:
`home.kalugaman.dev` (the Home Chrome extension) with a public privacy policy and terms of
service.

## Decisions

| Question           | Decision                                                               | Why                                                                      |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Where sources live | This repo, `sites/<name>/`; the folder name is the subdomain           | Deploy user and secrets already exist                                    |
| Format             | Plain HTML/CSS, no build; each site has its own stylesheet             | Nothing to build for text pages; no link to the main site's Astro/tokens |
| Language (`home`)  | English only                                                           | One authoritative version of a legal text; Web Store reviewers read it   |
| Server             | One wildcard nginx vhost maps the subdomain to `/var/www/sites/<name>` | Set up once in Ansible; a new site needs no server change                |
| Deploy             | Own workflow, only on changes under `sites/**`                         | Mini-sites ship independently of the main site's full check suite        |

## What we build

### 1. `sites/home/`

```
sites/home/
├── index.html     # name, one-line description, links to the two documents
├── privacy.html   # served as /privacy
├── terms.html     # served as /terms
└── style.css
```

Privacy policy, written from the extension's code (`~/WebProjects/home`), to be re-checked
against it while writing:

- The developer collects nothing: no analytics, no telemetry, no servers of its own.
- Settings, layout and the monitor's URL/login/password stay in `chrome.storage.local`.
- Network access happens only at the user's request: the GitHub API with the token of the
  user's own `gh` login (via the local native host), and the monitor hub the user entered.
- Local data read by the native host (free disk space, Claude/Codex limit snapshots) never
  leaves the machine.
- One line per permission from `manifest.json` explaining why it is needed.
- Contact: `alex@kalugaman.dev`; effective date.

Terms of service: free, provided as is, no warranty, limitation of liability, the user is
responsible for the credentials they enter, terms may change (date on the page), contact.
No governing-law clause.

`<meta name="robots">` is not set — the pages must be reachable by the Web Store reviewer
and by search.

### 2. `.github/workflows/deploy-sites.yml`

Triggers: `push` to `main` with `paths: ['sites/**', '.github/workflows/deploy-sites.yml']`,
plus `workflow_dispatch`. Same `DEPLOY_ENABLED` gate and SSH secrets as `deploy.yml`; its own
`concurrency` group, since the two write to different directories.

```
- checkout
- ssh-key-action (SSH_PRIVATE_KEY, SSH_KNOWN_HOSTS)
- rsync -az --delete-delay --delay-updates sites/ user@host:/var/www/sites/
- for each sites/*/: curl -fsS https://<name>.kalugaman.dev/
```

`deploy.yml` gets `paths-ignore: ['sites/**']`, so a sites-only push does not rebuild the
main site. `--delay-updates` puts the changed files into place at the end of the transfer, which is
enough for static text pages; no `.new`/`.old` swap. `--delete` means removing a folder
removes the site. `sites/` is covered by the existing `format:check` in CI.

### 3. Server requirements (applied by the user in Ansible)

Documented in `deploy/README.md`, next to the main vhost's requirements:

- Directory `/var/www/sites`, owned by `kalugaman-deploy`.
- DNS: `home.kalugaman.dev` already resolves (a CNAME to the apex); a wildcard
  `*.kalugaman.dev` CNAME → `kalugaman.dev` makes later sites need no DNS change.
- A vhost for `~^(?<site>[a-z0-9-]+)\.kalugaman\.dev$` with `root /var/www/sites/$site`,
  the wildcard certificate, 80→443, `try_files $uri $uri.html $uri/index.html =404`,
  `Cache-Control: max-age=0, must-revalidate`, `X-Content-Type-Options`, `Referrer-Policy`.
  nginx picks the exact `kalugaman.dev`/`www` server names before the regex, so the main
  site is unaffected; an unknown subdomain gets a 404.
- Curl checks for the new vhost.

## Order of work

1. `sites/home/` — the three pages and the stylesheet; check locally by opening the files.
2. `deploy-sites.yml`.
3. `deploy/README.md` section, a README how-to and the `CLAUDE.md` key paths line.
4. User: Ansible + DNS, then `workflow_dispatch` of `deploy-sites.yml`, then the curl checks.
