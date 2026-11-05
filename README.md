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

## Commandes

| Commande               | Rôle                                        |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | serveur de développement                    |
| `npm run build`        | vérification TypeScript + build de production (`dist/`) |
| `npm run preview`      | sert le build de production en local        |
| `npm test`             | tests Vitest (une passe)                    |
| `npm run test:watch`   | tests Vitest en continu                     |
| `npm run lint`         | lint (oxlint)                               |
| `npm run format`       | formate le code (Prettier)                  |
| `npm run format:check` | vérifie le formatage                        |

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
