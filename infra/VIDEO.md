# L'Atelier du Quiz : activer l'upload vidéo auto-hébergé

On réutilise ton pipeline popquiz du VPS : serveur tus (uploads) + Caddy
(lecture signée) + stockage `/srv/popquiz-videos`. L'Atelier du Quiz s'y ajoute
comme app `quizing`. Pas de transcodage : on lit le fichier mp4
directement via une URL signée (suffisant pour des vidéos de cours).

Le code app est déjà prêt. Il reste 3 choses à faire côté serveur. C'est
additif : ça ne change rien au comportement de Tiquiz/Tipote.

> ⚠️ **Le namespace serveur est "formaquiz", PAS "quizing" (drame 8
> juillet 2026)**. Tout le pipeline VPS a été provisionné AVANT le
> renommage de l'app : envs `FORMAQUIZ_*` des deux côtés, server.mjs de
> /opt/popquiz-tus qui connait l'app "formaquiz", stockage
> `/srv/popquiz-videos/formaquiz/`. Le renommage du code en "quizing"
> (18 juin) a cassé la chaîne en deux temps : 503 "pipeline non branché"
> (envs QUIZING_* introuvables) puis 401 "Unknown app" (claim JWT
> "quizing" inconnu du serveur). Décision Béné : on garde "formaquiz"
> partout côté serveur. Le code émet donc `app: "formaquiz"` (cf.
> lib/video/uploadToken.ts) et accepte les deux préfixes d'env. Le
> serveur en place n'a PAS besoin d'être touché ; le server.mjs de ce
> repo (qui accepte formaquiz ET quizing) ne sert que si tu dois
> re-provisionner un jour.

---

## 1. Génère 2 secrets (une fois)

Sur le VPS, génère deux chaînes aléatoires :
```bash
openssl rand -hex 32   # -> QUIZING_JWT_SECRET
openssl rand -hex 32   # -> QUIZING_VIDEO_SECRET
```
Garde-les, ils doivent être IDENTIQUES côté app et côté serveur tus.

## 2. Côté app L'Atelier du Quiz

Dans `/home/tipote/quizing/.env`, ajoute :
```
QUIZING_JWT_SECRET=<le 1er secret>
QUIZING_VIDEO_SECRET=<le 2e secret>
QUIZING_TUS_ENDPOINT=https://tus.tipote.com/files
QUIZING_VIDEO_PLAYBACK_BASE=https://videos.tipote.com
```
(Utilise les mêmes hôtes `tus.*` / `videos.*` que ceux déjà servis par ta
Caddy pour les popquiz. Si chez toi c'est `tus.quiz.tipote.com` /
`videos.quiz.tipote.com`, mets ceux-là.)

Puis rebuild + restart (ton process habituel) :
```bash
cd /home/tipote/quizing && git pull origin main && npm ci && npm run build && pm2 restart quizing-prod
```

## 3. Côté serveur tus (/opt/popquiz-tus)

```bash
# Sauvegarde d'abord (rollback en 1 commande si besoin)
cp /opt/popquiz-tus/server.mjs /opt/popquiz-tus/server.mjs.bak

# Remplace par la version qui connait "quizing"
cp /home/tipote/quizing/infra/tus-server/server.mjs /opt/popquiz-tus/server.mjs

# Ajoute les 2 MEMES secrets dans /opt/popquiz-tus/.env
#   QUIZING_JWT_SECRET=<le 1er secret>
#   QUIZING_VIDEO_SECRET=<le 2e secret>
nano /opt/popquiz-tus/.env

# Redémarre et vérifie
pm2 restart popquiz-tus
pm2 logs popquiz-tus --lines 20 --nostream   # doit afficher "[tus] listening on 127.0.0.1:1080"
```

Vérifie aussi que Tiquiz/Tipote vidéo marchent toujours (ouvre un popquiz
existant). Si quoi que ce soit cloche :
```bash
cp /opt/popquiz-tus/server.mjs.bak /opt/popquiz-tus/server.mjs && pm2 restart popquiz-tus
```

> Caddy : aucun changement. Le vhost `videos.*` sert déjà tout
> `/srv/popquiz-videos` (donc `/quizing/...`) et délègue la validation
> de signature au serveur tus, qui connait maintenant `quizing`.

---

## 4. Tester

1. `/admin` → un jour → "Uploader" une vidéo mp4. Attends 100%.
2. "Enregistrer le jour".
3. "Prévisualiser" : la vidéo se lit (URL signée, valable 6 h).

Si l'upload renvoie "pipeline non branché", c'est que `QUIZING_JWT_SECRET`
ou `QUIZING_TUS_ENDPOINT` manque côté app (étape 2), sous l'un OU l'autre
des deux préfixes acceptés (`QUIZING_*` / `FORMAQUIZ_*`). Si le token part
mais que l'upload échoue en 401 côté tus, c'est que /opt/popquiz-tus a un
`server.mjs` antérieur (qui ne connait pas l'app "quizing") ou que son
`.env` n'a pas le même secret que l'app : refais l'étape 3.

## Comment ça marche (résumé)

- L'admin demande un token d'upload (`/api/admin/video/upload-token`),
  signé avec `QUIZING_JWT_SECRET`.
- tus-js-client envoie le fichier à `tus.*/files` ; le serveur tus valide
  le token et range le fichier dans `/srv/popquiz-videos/quizing/raw/...`.
- La page du jour génère une URL de lecture signée
  (`md5` + `expires`, secret `QUIZING_VIDEO_SECRET`) que Caddy sert
  après validation. Un lien volé expire en 6 h.
