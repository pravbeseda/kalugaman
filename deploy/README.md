# Deployment

The site is deployed to the **mars** host, which is provisioned with Ansible. Nothing
here is applied by hand on the server: this file records what the server has to provide
and what is configured on the GitHub side (which is outside Ansible).

The nginx vhost lives in the Ansible role, not in this repository — a second copy here
would only drift out of sync with the real one. What that vhost has to do is written
down below, so the requirement survives even though the config does not live here.

The pipeline itself: [`../docs/ci-cd.md`](../docs/ci-cd.md).

## Layout on the server

```
/home/kalugaman-deploy/          # deploy user's home: the ssh key, nothing else
└── .ssh/authorized_keys

/var/www/kalugaman.dev/          # site root, owned by kalugaman-deploy
├── public/                      # what nginx serves
├── public.new/                  # rsync target during a deploy, exists for seconds
└── public.old/                  # previous build — one rename away from a rollback
```

The content deliberately does **not** live in the deploy user's home: home directories
tend to be created `0700`/`0750`, which makes nginx return 403 on everything, and a
service account's home doubling as a document root muddles backups and permissions.

`public.new` and `public.old` are created by the workflow; Ansible only creates
`/var/www/kalugaman.dev`. All three must sit on one filesystem — the swap relies on `mv`
being a rename, not a copy.

The deploy user is `kalugaman-deploy`, an account of its own rather than the shared
`github-deploy` that drevo uses: the private key lives in the secrets of a _public_
repository, so it must not be able to write anywhere near another project. It is
unprivileged, has no sudo, and owns only the site root.

## What the nginx vhost has to do

Serve `/var/www/kalugaman.dev/public`, plus four things that are specific to this site:

**Language redirect on the root.** `/` is the only page without a language, so nginx
picks one from `Accept-Language`:

```nginx
map $http_accept_language $lang_redirect {
    default  /en/;
    ~*^ru    /ru/;
}
# in the server block:
location = / { return 302 $lang_redirect; }
```

Only a _leading_ `ru` wins. A rule matching `ru` anywhere would send the very common
`en-US,en;q=0.9,ru;q=0.8` — English preferred, Russian as a fallback — to the Russian
version, the opposite of what that visitor asked for.

**Caching by path, not by extension.** Only files under `/_astro/` carry a content hash
in their name, and only they may be cached forever. Everything else — the favicons, the
apple-touch-icon, the sitemap, and later the CV PDFs — keeps a stable filename and must
be revalidated, or a changed file stays stale in browsers for a year:

```nginx
map $uri $cache_control {
    default     "public, max-age=0, must-revalidate";
    ~^/_astro/  "public, max-age=31536000, immutable";
}
```

`must-revalidate` on HTML also matters for the deploy itself: a cached page pointing at
hashed assets that no longer exist renders without styles.

**All `add_header` directives on one level.** nginx drops every inherited `add_header`
as soon as a `location` declares one of its own — so putting `Cache-Control` inside a
location silently strips the security headers from those responses. Hence the `map`
above: `Cache-Control`, `X-Content-Type-Options` and `Referrer-Policy` are all declared
on the `server` level, with `always`.

**Clean URLs**: `try_files $uri $uri/index.html $uri.html =404;`

**The site's own 404 page.** The build produces `404.html`; without this line the `=404`
above falls back to nginx's built-in error page and the site's own is never served:

```nginx
error_page 404 /404.html;
```

The status stays 404 — `error_page` does not rewrite it unless asked to.

Verify after a change:

```bash
curl -sI -H 'Accept-Language: ru' https://kalugaman.dev/            # 302 → /ru/
curl -sI -H 'Accept-Language: en-US,en;q=0.9,ru;q=0.8' https://kalugaman.dev/  # 302 → /en/
curl -sI https://kalugaman.dev/en/            # must-revalidate + both security headers
curl -sI https://kalugaman.dev/favicon-32.png # must-revalidate — no hash in the name
curl -sI https://kalugaman.dev/_astro/<file>  # immutable
curl -si https://kalugaman.dev/nope | head -1              # HTTP/2 404
curl -s  https://kalugaman.dev/nope | grep -o '<title>[^<]*'  # the site's page, not nginx's
```

TLS is certbot (`kalugaman.dev` + `www`), with the 80→443 redirect. DNS: an A record for
the apex to the mars IP, `www` as a CNAME.

## GitHub side

Settings → Secrets and variables → Actions.

| Secret            | Value                                              |
| ----------------- | -------------------------------------------------- |
| `SSH_HOST`        | `mars.kalugaman.ru`                                |
| `SSH_USER`        | `kalugaman-deploy`                                 |
| `SSH_PORT`        | `53812`                                            |
| `SSH_PRIVATE_KEY` | the private half of the deploy key, in full        |
| `SSH_KNOWN_HOSTS` | output of `ssh-keyscan -p 53812 mars.kalugaman.ru` |

`SSH_HOST` stays in the `.ru` zone on purpose: it names the machine, not the site, and
mars serves both domains.

Plus the variable that arms the deploy job: **Variables** → `DEPLOY_ENABLED` = `true`.
Removing it is the kill switch for auto-deploy — the job is skipped, nothing else breaks.

## Rollback

If the post-deploy check fails (the site does not answer 200 after three tries), the
workflow rolls back on its own: `public.old` goes back into place and the failed build
is kept as `public.bad`.

By hand:

```bash
mv /var/www/kalugaman.dev/public /var/www/kalugaman.dev/public.bad
mv /var/www/kalugaman.dev/public.old /var/www/kalugaman.dev/public
```

Or, more reproducibly, revert the commit on `main` — the deploy runs again.
