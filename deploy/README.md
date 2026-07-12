# Deployment setup

The site is deployed to the **mars** host, which is provisioned with Ansible. Nothing
here is meant to be applied by hand on the server: this file specifies the state the
playbook has to produce, plus the GitHub-side setup, which lives outside Ansible.

The pipeline itself: [`../docs/ci-cd.md`](../docs/ci-cd.md).

## Layout on the server

```
/home/kalugaman-deploy/          # deploy user's home: the ssh key, nothing else
└── .ssh/authorized_keys

/var/www/kalugaman.ru/           # site root, owned by kalugaman-deploy
├── public/                      # what nginx serves
├── public.new/                  # rsync target during a deploy, exists for seconds
└── public.old/                  # previous build — one rename away from a rollback
```

The content deliberately does **not** live in the deploy user's home: home directories
tend to be created `0700`/`0750`, which makes nginx return 403 on everything, and mixing
a service account's home with a document root muddles both backups and permissions.

`public.new` and `public.old` are created by the workflow; Ansible only needs to create
`/var/www/kalugaman.ru` itself. All three must sit on one filesystem — the swap relies on
`mv` being a rename, not a copy.

## What Ansible has to provision

**User.** `kalugaman-deploy`, unprivileged, no sudo, home `/home/kalugaman-deploy`
(`0755`), with `.ssh` at `0700` and `authorized_keys` at `0600` holding the public half of
the deploy key.

A user of its own, not the shared `github-deploy` that drevo uses: the private half lives
in a public repository's secrets, and it must not be able to write anywhere near another
project.

**Site root.** `/var/www/kalugaman.ru`, owner `kalugaman-deploy`, mode `0755`. The deploy
user needs write access to this directory itself (not just its contents) — the swap
renames directories inside it.

**nginx.** The vhost from [`nginx/kalugaman.ru.conf`](./nginx/kalugaman.ru.conf), with
`root /var/www/kalugaman.ru/public`. It carries the root language redirect, clean URLs,
immutable caching for `/_astro/`, no-cache HTML, gzip and the security headers.

nginx must be able to traverse every directory on the path (`/var`, `/var/www`,
`/var/www/kalugaman.ru`, `public`). With `/var/www` this is the default; worth verifying
once after the first deploy:

```bash
sudo -u www-data namei -l /var/www/kalugaman.ru/public/index.html
```

**TLS.** certbot for `kalugaman.ru` and `www.kalugaman.ru`; it adds the TLS block and the
80→443 redirect to the vhost. Renewal runs from certbot's systemd timer.

**DNS** (outside Ansible, at the registrar): `kalugaman.ru` A record → the mars IP;
`www` → CNAME to the apex.

## What is set up in GitHub

Settings → Secrets and variables → Actions.

| Secret            | Value                                              |
| ----------------- | -------------------------------------------------- |
| `SSH_HOST`        | `mars.kalugaman.ru`                                |
| `SSH_USER`        | `kalugaman-deploy`                                 |
| `SSH_PORT`        | `53812`                                            |
| `SSH_PRIVATE_KEY` | the private half of the deploy key, in full        |
| `SSH_KNOWN_HOSTS` | output of `ssh-keyscan -p 53812 mars.kalugaman.ru` |

The deploy key is a fresh pair, generated for this repository only:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/kalugaman_deploy -C "github-actions kalugaman" -N ""
```

The public half goes into the Ansible playbook (the user's `authorized_keys`), the private
half into `SSH_PRIVATE_KEY`.

Finally, the variable that arms the deploy job: **Variables** → `DEPLOY_ENABLED` = `true`.
Until it is set, the job is skipped, so the workflow can sit on `main` before the server is
ready. Removing it later is the kill switch for auto-deploy.

## First deploy

Actions → Deploy → **Run workflow**. Then:

```bash
ls /var/www/kalugaman.ru/public     # index.html, en/, ru/, _astro/, sitemap-index.xml
curl -I https://kalugaman.ru/en/
```

After that every push to `main` deploys on its own.

## Rollback

If the post-deploy check fails (the site does not answer 200 after three tries), the
workflow rolls back on its own: `public.old` goes back into place and the failed build is
kept as `public.bad`.

By hand:

```bash
mv /var/www/kalugaman.ru/public /var/www/kalugaman.ru/public.bad
mv /var/www/kalugaman.ru/public.old /var/www/kalugaman.ru/public
```

Or, more reproducibly, revert the commit on `main` — the deploy runs again.
