# Server setup (one-time, manual)

Deploys go to the same VPS that hosts drevo. This is what has to be done once before
`deploy.yml` can work. The full plan: [`../docs/ci-cd.md`](../docs/ci-cd.md).

Below, `DEPLOY_USER` is the server user the deploy runs as, `HOST` is the VPS address
and `PORT` is the SSH port.

## 1. Deploy key (on the local machine)

A dedicated key pair for this repository — drevo's key is not reused: compromising a
public repo must not grant access on behalf of another project.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/kalugaman_deploy -C "github-actions kalugaman" -N ""
ssh-copy-id -i ~/.ssh/kalugaman_deploy.pub -p PORT DEPLOY_USER@HOST
ssh-keyscan -p PORT HOST            # needed for SSH_KNOWN_HOSTS
```

Confirm the key works: `ssh -i ~/.ssh/kalugaman_deploy -p PORT DEPLOY_USER@HOST 'echo ok'`.

## 2. Secrets in GitHub

Settings → Secrets and variables → Actions → New repository secret.
Secrets are not inherited from other repositories — they must be created here, even
where the values match drevo.

| Secret            | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| `SSH_HOST`        | `HOST`                                                                |
| `SSH_USER`        | `DEPLOY_USER`                                                         |
| `SSH_PORT`        | `PORT` (can be omitted if it is 22)                                   |
| `SSH_PRIVATE_KEY` | the contents of `~/.ssh/kalugaman_deploy` (the private half, in full) |
| `SSH_KNOWN_HOSTS` | the output of `ssh-keyscan -p PORT HOST`                              |

`deploy.yml` uses `environment: production` — if that environment does not exist yet,
GitHub creates it on the first run; a manual approval gate can be attached to it later.

Then enable the deploy itself: Settings → Secrets and variables → Actions → Variables →
`DEPLOY_ENABLED` = `true`. Until that variable is set, the deploy job is skipped, so the
workflow can live on `main` before the server is ready. Removing the variable later is
also the kill switch for auto-deploy.

## 3. Site directory (on the server)

```bash
mkdir -p ~/kalugaman.ru
chmod o+x ~                 # otherwise nginx cannot traverse the home directory → 403
chmod -R o+rX ~/kalugaman.ru
```

Nothing else to create: `.new` and `.old` appear on their own during the first deploy.

## 4. nginx

```bash
sudo cp kalugaman.ru.conf /etc/nginx/sites-available/kalugaman.ru
sudo sed -i "s/DEPLOY_USER/$(whoami)/" /etc/nginx/sites-available/kalugaman.ru
sudo ln -s /etc/nginx/sites-available/kalugaman.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The config — [`nginx/kalugaman.ru.conf`](./nginx/kalugaman.ru.conf): root redirect by
`Accept-Language`, clean URLs, immutable caching for `/_astro/`, no-cache HTML, gzip.

## 5. DNS and TLS

- DNS: `kalugaman.ru` (A record) → the VPS IP; `www` → CNAME to the apex.
- Wait for propagation (`dig +short kalugaman.ru`), then:

```bash
sudo certbot --nginx -d kalugaman.ru -d www.kalugaman.ru
```

certbot adds the TLS block and the 80→443 redirect itself. Renewal runs from certbot's
systemd timer — verify with `systemctl list-timers | grep certbot`.

## 6. First deploy

In GitHub: Actions → Deploy → **Run workflow**. Afterwards:

```bash
ls ~/kalugaman.ru            # index.html, en/, ru/, _astro/, sitemap-index.xml
curl -I https://kalugaman.ru/en/
```

From then on every push to `main` deploys on its own.

**Note:** the workflow's last step (`curl https://kalugaman.ru/en/`) will fail until DNS
and TLS are in place. That is expected — the files are already deployed by that point —
but the simplest path is to run the first deploy after step 5.

## Rollback

The previous build sits right next to the live one, in `~/kalugaman.ru.old`:

```bash
mv ~/kalugaman.ru ~/kalugaman.ru.bad
mv ~/kalugaman.ru.old ~/kalugaman.ru
```

Or, more reproducibly, revert the commit on `main` — the deploy runs again.
