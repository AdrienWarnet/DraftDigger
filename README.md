# DraftDigger
WebApp mobile (PWA) d'aide à la décision pour League of Legends. Le joueur crée ses propres builds (runes, sorts, items, conditions d'usage) pour n'importe quel champion, directement dans l'app. À partir de la compo alliée et ennemie, l'app choisit le build le plus adapté et le premier item, puis recommande les items à acheter en cours de partie, avec explications.

Tout tourne en local sur le téléphone, sans serveur. Moteur de règles et calcul de stats, données Data Dragon.

Plus tard : recommandation de pick, données automatiques, backend.

## Démarrer

Prérequis : Node.js 24+.

```bash
npm install
npm run dev
```

## En ligne

**https://adrienwarnet.github.io/DraftDigger/**

Sur le téléphone (Chrome Android) : ouvrir l'URL, puis menu ⋮ → « Installer l'application ». L'app fonctionne ensuite hors ligne et se met à jour automatiquement à l'ouverture suivante d'une nouvelle version.

### Déploiement

`main` = prod. Chaque push sur `main` (merge d'une epic validée) déclenche GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) : lint, tests, build, publication sur GitHub Pages. Lancement manuel possible depuis l'onglet Actions (« Run workflow »).

Réglage GitHub (une seule fois) : Settings → Pages → Source : **GitHub Actions**.

### Tester sur le téléphone pendant le dev

`npm run dev:phone`, puis ouvrir sur le téléphone l'adresse « Network » affichée (même wifi que le PC). Pas d'installation ni de hors-ligne dans ce mode.

## Commandes

| Commande               | Rôle                                        |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | serveur de développement                    |
| `npm run dev:phone`    | serveur de dev accessible en wifi (téléphone) |
| `npm run build`        | vérification TypeScript + build de production (`dist/`) |
| `npm run preview`      | sert le build de production en local        |
| `npm test`             | tests Vitest (une passe)                    |
| `npm run test:watch`   | tests Vitest en continu                     |
| `npm run lint`         | lint (oxlint)                               |
| `npm run format`       | formate le code (Prettier)                  |
| `npm run format:check` | vérifie le formatage                        |
| `npm run generate-icons` | régénère les icônes PWA depuis `public/logo.svg` |

## Structure

```
src/
  data/       # chargement Data Dragon, overrides, BuildRepository
  engine/     # moteur pur TypeScript, aucune dépendance React
  ui/         # composants et écrans
  store/      # état de la partie
data/
  builds/     # build d'exemple
  presets/    # presets de conditions de l'éditeur
  overrides/  # corrections manuelles champions / items
docs/TICKETS.md   # tickets du MVP
```
