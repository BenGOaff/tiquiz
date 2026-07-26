# L'Atelier du Quiz : journal de bord

## Où on en est (15 juin 2026, au soir)

**L'Atelier du Quiz est EN LIGNE : https://quizing.tipote.com** 🎉
Le socle (espace élève + back-office admin) tourne en prod.

### Infra en place
- **Supabase** : projet `mkdnnrapmeajogbwmybp`. Migration
  `0001_quizing_initial.sql` + seed `day1.sql` appliqués.
- **Cloudflare** : sous-domaine `quizing.tipote.com` créé (DNS vers le VPS).
- **VPS** : dossier `/home/tipote/quizing`, app sur le **port 3002**,
  process pm2 **`quizing-prod`**.
- **Caddy** : bloc `quizing.tipote.com` ajouté, certificat HTTPS OK.

### 3 réglages à retenir (galères déjà résolues, ne pas refaire)
1. Dans `.env`, l'URL Supabase DOIT commencer par `https://`
   (sans guillemets, sans `/` final).
2. `next start` ne lit PAS le `PORT` du `.env`. Il faut lancer pm2 avec
   le port dans l'environnement (voir mémo redéploiement).
3. Dans le Caddyfile, `transport http { ... }` doit être sur plusieurs
   lignes (le `{` en fin de ligne), jamais en une seule ligne.

### Mémo : redéployer une mise à jour
```bash
# 1. Sur ton PC : amener ma branche de travail dans main
cd C:\Users\hello\Desktop\quizing
git fetch origin
git checkout main && git pull origin main
git checkout origin/claude/laughing-gauss-qh8sua -- .
git add . && git commit -m "maj quizing" && git push origin main

# 2. Sur le VPS (ATTENTION : bien viser quizing, pas tiquiz)
cd /home/tipote/quizing
git pull origin main
npm ci
npm run build
pm2 restart quizing-prod      # le port 3002 est fige dans le start script

# Si jamais le process doit etre recree :
#   pm2 delete quizing-prod
#   pm2 start npm --name quizing-prod -- start
#   pm2 save
```

> Piege a eviter : ne JAMAIS lancer `pm2 restart tiquiz-prod` depuis le
> dossier quizing (c'est une commande du memo Tiquiz). Et pas besoin de
> `--update-env` : le port est dans le start script, les autres vars sont
> lues depuis .env au demarrage.

---

## À reprendre demain (court, pour valider en vrai)

1. **Tester le parcours élève** : se connecter sur `/login`, puis
   s'accorder l'accès (Supabase SQL Editor) :
   ```sql
   insert into enrollments (user_id, status, source)
   select id, 'active', 'manual' from auth.users where email = 'blagardette@gmail.com'
   on conflict (user_id) do update set status = 'active', revoked_at = null;
   ```
   Recharger : le Jour 1 doit apparaître. Faire le quiz de bout en bout.
2. **Back-office** : aller sur `/admin`, charger la vraie vidéo du Jour 1
   (coller une URL YouTube pour commencer), ajuster le contenu.
3. **Récupérer le correctif de build** au prochain déploiement : le commit
   qui rend l'instanciation Supabase paresseuse est sur la branche de
   travail, pas encore dans `main`. Le `git checkout ... -- .` du mémo
   l'amènera. (Non urgent, le build marche déjà.)
4. **Webhook Systeme.io** : à configurer quand la page de vente est prête
   (remplir `SYSTEME_IO_WEBHOOK_SECRET` dans `.env`, voir `infra/DEPLOY.md`).

## Sprints suivants (à décider ensemble)
- Coach IA en bulle (contexte du jour + garde-fous anti-hallucination).
- Décliner les 14 jours depuis `contenu/parcours/`.
- Finaliser la vidéo uploadée : lecture HLS signée (le dernier maillon du
  pipeline, voir `infra/DEPLOY.md` et `SETUP.md`).
