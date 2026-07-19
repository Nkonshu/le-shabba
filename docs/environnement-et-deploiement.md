# Environnement de dev & déploiement

Ce document explique comment relancer le projet en local après un redémarrage du PC, comment
mettre la version en ligne à jour, et à quoi sert chacun des trois outils d'infrastructure
(Coolify, Tailscale, Cloudflare) dans la vie du projet.

## Constat de départ (important)

Au moment où ce document est écrit, **l'application Next.js n'a jamais été déployée en ligne** :
- Le VPS ne fait tourner que le stack Supabase self-hosted (Postgres, Auth, Storage, Realtime) et
  Meilisearch — tout géré par Coolify.
- Le dépôt GitHub (`Nkonshu/le-shabba`) est très en retard : quelques commits initiaux seulement,
  alors que la quasi-totalité du code actuel (Phases 0/1/2, migrations SQL, composants, pages)
  n'a jamais été commité ni poussé.

Concrètement : jusqu'ici, tout le développement et tous les tests ont eu lieu **en local**, contre
la base Supabase distante (`dev.le-shabba.fr`) qui elle, tourne déjà sur le VPS. Publier
l'application elle-même en ligne demandera une **première mise en place** (côté Coolify), pas
juste "pousser une mise à jour" — voir §2.

---

## 1. Relancer l'environnement de dev sur son PC

Aucune connexion au VPS n'est nécessaire pour du développement courant : le fichier `.env.local`
pointe déjà vers l'instance Supabase publique (`https://dev.le-shabba.fr`, exposée via Cloudflare),
donc l'application locale parle à la vraie base à travers l'internet public, comme n'importe quel
visiteur. Tailscale/SSH ne servent que pour des tâches d'administration (voir §3).

**Étapes, à chaque redémarrage du PC :**

1. Ouvrir un terminal dans le dossier du projet (`c:\Users\nkons\le-shabba`).
2. Vérifier que `.env.local` est bien présent à la racine (il est volontairement exclu de Git —
   `.gitignore` contient `.env*` — donc il ne se régénère jamais tout seul ; s'il manque, il faut
   le restaurer depuis une sauvegarde, il n'existe nulle part ailleurs).
3. Si `package.json` a changé depuis la dernière fois (nouvelle dépendance) : `npm install`.
   Sinon cette étape est inutile.
4. Lancer le serveur de dev :
   ```
   npm run dev
   ```
5. Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.
6. Pour arrêter : `Ctrl+C` dans le terminal.

**Piège connu :** si le port 3000 est déjà occupé (par exemple par un tunnel SSH vers Supabase
Studio ouvert dans une session précédente), lancer sur un autre port :
```
npm run dev -- -p 3010
```

**Vérifier que tout va bien** avant de coder une fonctionnalité :
```
npx tsc --noEmit   # typecheck
npx eslint src      # lint
npm run build       # build complet (Turbopack)
```

---

## 2. Mettre la version en ligne à jour

### 2.a Mise en place initiale (une seule fois, jamais faite à ce jour)

Cette partie se fait dans le **dashboard web de Coolify** (`http://<IP-Tailscale-du-VPS>:8000`,
voir §3) :

1. **New Resource → Application**, connecter le dépôt GitHub `Nkonshu/le-shabba`, branche `main`.
2. Build pack : laisser Coolify détecter automatiquement Next.js (Nixpacks) — pas besoin d'écrire
   un `Dockerfile` pour un premier déploiement simple.
3. Renseigner les variables d'environnement de production dans l'onglet "Environment Variables" du
   resource Coolify : les mêmes clés que dans `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `NEXT_PUBLIC_MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, etc.) — **jamais** en copiant le fichier
   dans le dépôt, seulement dans ce champ Coolify qui reste privé au VPS.
4. Domaine : associer un sous-domaine (ex. `www.le-shabba.fr` ou `le-shabba.fr`) au resource dans
   Coolify, puis créer l'enregistrement DNS correspondant côté Cloudflare (nuage orange activé pour
   profiter du proxy/HTTPS automatique).
5. Premier déploiement manuel (bouton "Deploy" dans Coolify) pour vérifier que le build passe.
6. Activer le déploiement automatique sur push (webhook GitHub → Coolify), pour que l'étape 2.b
   ci-dessous devienne suffisante seule.

### 2.b Mettre à jour la version en ligne (une fois 2.a fait, à répéter à chaque changement)

```
git add -A
git commit -m "..."
git push origin main
```

Si le webhook est actif, Coolify détecte le push et redéploie automatiquement (rebuild + restart
du conteneur). Sinon, ouvrir le dashboard Coolify et cliquer "Deploy" sur le resource de
l'application.

**Point auquel faire toujours attention :** un `git push` ne touche jamais la base de données.
Si des migrations SQL ont été ajoutées dans `supabase/migrations/`, il faut les appliquer
séparément sur le VPS (elles s'appliquent au même Postgres self-hosted que celui déjà en place,
pas de "prod" séparée pour l'instant) :
```
cat supabase/migrations/00XX_nom.sql | ssh ubuntu@91.134.142.241 \
  "sudo docker exec -i supabase-db-tdbqvmsghpps0g4g0hv9goqu psql -U postgres -d postgres -v ON_ERROR_STOP=1"
```

---

## 3. Coolify / Tailscale / Cloudflare : qui fait quoi

Les trois coexistent mais n'ont aucun rôle en commun — schéma du trajet d'une requête publique :

```
Visiteur → Cloudflare (DNS + proxy + HTTPS) → IP publique du VPS → Traefik (fourni par Coolify)
         → conteneur applicatif concerné (Next.js, Supabase Kong, Meilisearch...)
```

Et pour l'administration/le développement (jamais emprunté par un visiteur) :
```
Ton PC → Tailscale (tunnel privé) → VPS (IP 100.x.x.x) → SSH / dashboard Coolify / Postgres direct
```

| Outil | Rôle réel ici | Quand s'en servir | Comment y accéder |
|---|---|---|---|
| **Cloudflare** | DNS de `le-shabba.fr` + reverse-proxy public devant tout ce qui est exposé (`dev.le-shabba.fr`, `meilisearch.le-shabba.fr`, et demain le domaine de l'appli) — HTTPS, cache, protection DDoS | Ajouter/modifier un sous-domaine, un enregistrement DNS, ou une règle de sécurité (rate-limit, pare-feu applicatif) | [dash.cloudflare.com](https://dash.cloudflare.com), compte du domaine |
| **Coolify** | PaaS qui tourne *sur* le VPS et orchestre tous les conteneurs (Supabase, Meilisearch, et bientôt l'appli Next.js) — déploiements, variables d'environnement, logs, redémarrages | Déployer/mettre à jour un service, changer une variable d'environnement de prod, consulter les logs d'un conteneur, redémarrer un service après une panne | `http://<IP-Tailscale-VPS>:8000` (ou l'IP publique du VPS, même port — voir note sécurité ci-dessous) |
| **Tailscale** | VPN privé maillé entre ton PC et le VPS (les deux apparaissent comme pairs du même tailnet) — jamais emprunté par le trafic public | SSH vers le VPS, accès direct à Postgres sans passer par `docker exec`, ouvrir le dashboard Coolify sans l'exposer publiquement | Application Tailscale installée sur le PC (déjà active) ; IP du VPS sur le tailnet : `100.64.219.10` |

**Note sécurité (à corriger quand tu auras un moment) :** le port 8000 de Coolify est actuellement
ouvert sur l'IP publique du VPS en plus de l'IP Tailscale (aucun pare-feu actif, `ufw` est
`inactive`). Pas urgent, mais idéalement restreindre ce port à l'IP Tailscale uniquement une fois
que l'accès via Tailscale est devenu une habitude.
