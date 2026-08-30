# Caddy front (replaces nginx + certbot)

Single source of truth: `Caddyfile`. This README is the runbook for
installing / cutting over / rolling back on the production VPS.

The cutover is split into **two strictly separated phases** so the prod
stack is touched once, briefly, with a clear rollback path at every
step.

---

## Phase A — Install Caddy + validator (no prod impact)

Done before touching anything that visitors hit.

### A.1 — Add the per-app video secrets to popquiz-tus env

The new `/_validate-secure-link` handler in `infra/tus-server/server.mjs`
needs the same secret each Next app uses to mint signed URLs. Copy
both values **from** `/home/tipote/tipote-app/.env` and
`/home/tipote/tiquiz/.env` (look for `POPQUIZ_VIDEO_SECRET=`) **to**
`/opt/popquiz-tus/.env`:

```
TIPOTE_VIDEO_SECRET=<value of POPQUIZ_VIDEO_SECRET in tipote-app/.env>
TIQUIZ_VIDEO_SECRET=<value of POPQUIZ_VIDEO_SECRET in tiquiz/.env>
```

(Existing keys in that file stay untouched — only append these two.)

### A.2 — Deploy the updated tus-server

```bash
sudo -u tipote cp /home/tipote/tiquiz/infra/tus-server/server.mjs /opt/popquiz-tus/server.mjs
sudo -u tipote pm2 restart popquiz-tus
sudo -u tipote pm2 logs popquiz-tus --lines 20 --nostream
```

Expect to see `[tus] listening on 127.0.0.1:1080`. If the warning
`No video secret configured` shows, the .env step above was missed.

Smoke-test the validator from the VPS itself (nginx is still in front
on :443, so we go straight to the local port):

```bash
# Should print 400 (no X-Forwarded-Uri header sent)
curl -i -X GET http://127.0.0.1:1080/_validate-secure-link 2>&1 | head -5

# Should print 403 (no signature)
curl -i -X GET -H "X-Forwarded-Uri: /tiquiz/raw/foo/bar/source.mp4" \
  http://127.0.0.1:1080/_validate-secure-link 2>&1 | head -5
```

### A.3 — Install Caddy (does not bind 80/443 yet)

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Caddy autostarts and tries to take :80/:443 — Nginx already owns
# them so Caddy fails. Stop + disable it; we'll re-enable manually at
# cutover.
sudo systemctl stop caddy
sudo systemctl disable caddy
caddy version  # sanity check
```

### A.4 — Drop in the Caddyfile + env file

```bash
# LA COPIE PASSE PAR LE CONTROLE, JAMAIS EN DIRECT.
#
# Le 29 aout 2026, un `cp` nu a efface les blocs de `tiquiz.fr` et
# `atelierduquiz.fr`, qui n'existaient que sur le serveur : les deux
# pages de vente sont tombees en erreur TLS, sans une ligne dans les
# journaux. `check:caddy` compare les HOTES SERVIS des deux fichiers et
# REFUSE la copie si le depot en perdrait un.
cd /home/tipote/tiquiz-app && npm run check:caddy && sudo cp infra/caddy/Caddyfile /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy

# Generate the Caddy ↔ Tiquiz shared secret (used by /api/internal/
# caddy-ask). Save it somewhere safe; it also needs to be added to
# Tiquiz's prod .env (CADDY_ASK_SECRET=…) at the same time.
sudo tee /etc/caddy/caddy.env > /dev/null <<EOF
CADDY_ASK_SECRET=$(openssl rand -hex 32)
EOF
sudo chmod 600 /etc/caddy/caddy.env
sudo cat /etc/caddy/caddy.env  # copy the value
```

Add the same `CADDY_ASK_SECRET=...` (plus `CUSTOM_DOMAINS_ENABLED=true`
later — not yet) to `/home/tipote/tiquiz/.env`. Don't `pm2 restart
tiquiz-prod` yet; the new env vars don't matter until Caddy is up.

Wire the env file into Caddy's systemd unit:

```bash
sudo systemctl edit caddy --force --full
# In the editor, find [Service] and add this line under ExecStart:
#   EnvironmentFile=-/etc/caddy/caddy.env
# Save + exit. systemd reloads the unit automatically.
```

Validate the config without starting anything live:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Expect `Valid configuration` (warnings about `on_demand_tls` rate
limits are fine — that block is intentionally permissive).

---

## Phase B — Cutover (~30 sec downtime, full rollback in 30 sec)

Do this at low traffic. Have two SSH sessions open so you can run the
rollback in one and watch logs in the other.

### B.1 — Stop nginx

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx   # optional, but keeps it from coming back on reboot
```

Production is now **down** for every domain. Caddy is next.

### B.2 — Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
sudo journalctl -u caddy -f
```

First-boot output: Caddy issues a fresh Let's Encrypt cert per domain
via HTTP-01. Takes 10-30 seconds per cert, all 6 named hosts in
parallel — so the full warm-up is under 1 minute. During that minute
each domain serves traffic as soon as ITS cert is ready.

Watch the journal for `certificate obtained successfully` lines. Once
you see them for all six hosts, prod is fully back on Caddy.

### B.3 — Smoke-test from your laptop

```bash
for host in app.tipote.com quiz.tipote.com \
            n8n.tipote.com tus.tipote.com tus.quiz.tipote.com \
            videos.tipote.com videos.quiz.tipote.com; do
  echo "=== $host ==="
  curl -sI "https://$host" | head -1
done
```

All should print `HTTP/2 200`, `HTTP/2 301` (the redirects), or
`HTTP/2 404` (n8n.tipote.com may 404 on `/`, that's fine — n8n editor
itself is on `/`). Anything else = investigate.

Quick functional check:
- Open `https://quiz.tipote.com/q/<some-active-slug>` in a browser.
- Open `https://app.tipote.com` and confirm the dashboard loads.
- Open `https://n8n.tipote.com` and confirm the editor loads.

### B.4 — Rollback (only if B.3 fails)

```bash
sudo systemctl stop caddy
sudo systemctl disable caddy
sudo systemctl enable nginx
sudo systemctl start nginx
```

Back on nginx in ~5 sec. Then come back here with the journalctl output
so we diagnose before retrying.

---

## Phase C — Enable custom domains feature (optional, do after Phase B is stable)

Only flip these flags once Phase B has been running cleanly for at
least a few hours.

```bash
# 1. Edit Tiquiz's .env (already had CADDY_ASK_SECRET set in A.4).
echo "CUSTOM_DOMAINS_ENABLED=true" | sudo -u tipote tee -a /home/tipote/tiquiz/.env

# 2. Restart Tiquiz to pick up the env change.
sudo -u tipote pm2 restart tiquiz-prod

# 3. Create the connect.tiquiz.com DNS record (Cloudflare):
#    Type:  A
#    Name:  connect.tiquiz.com
#    Value: 82.25.115.166
#    Proxy: off (gray cloud — Caddy needs to see the real Let's Encrypt traffic)
```

That's it. Creators can now add a custom domain in their Tiquiz
settings (UI ships in Step 5).

---

## Notes / gotchas

- **Caddy data**: certificates live in `/var/lib/caddy/.local/share/caddy/`.
  Back this directory up if you run a disaster-recovery drill — losing
  it means Caddy re-issues all certs on next start (within Let's
  Encrypt rate limits, so it works, but takes a few minutes).

- **Old letsencrypt store**: `/etc/letsencrypt/` is now unused. Keep
  it around for a month in case of a Phase B rollback, then delete.
  `certbot renew` cron jobs (if any) can be disabled — Caddy renews
  on its own.

- **Tiquiz binding to `*:3001`**: still a pre-existing issue (Tiquiz
  is reachable directly on `http://82.25.115.166:3001` bypassing
  Caddy). Independent of this cutover; fix is to set
  `HOSTNAME=127.0.0.1` in Tiquiz's `ecosystem.config.cjs` then
  `pm2 reload tiquiz-prod`. Do it any time after Phase B is stable.
