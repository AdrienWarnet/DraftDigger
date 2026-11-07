# DraftDigger
WebApp mobile (PWA) d'aide à la décision pour League of Legends. Le joueur crée ses propres builds (runes, sorts, items, conditions d'usage) pour n'importe quel champion, directement dans l'app. À partir de la compo alliée et ennemie, l'app choisit le build le plus adapté et le premier item, puis recommande les items à acheter en cours de partie, avec explications.

**App en ligne : https://adrienwarnet.github.io/DraftDigger/**

Tout tourne en local sur le téléphone, sans serveur. Moteur de règles et calcul de stats, données Data Dragon.

Plus tard : recommandation de pick, données automatiques, backend.

## Utiliser l'app

### Installer l'app sur le téléphone

1. Sur le téléphone (Chrome Android), ouvrir **https://adrienwarnet.github.io/DraftDigger/**.
2. Touche **Installer l'app** en bas de l'écran ou dans **À propos** (le lien n'apparaît que quand Chrome permet l'installation). Sinon : menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
3. L'icône DraftDigger apparaît avec les autres applis. L'app marche ensuite hors ligne et se met à jour toute seule à l'ouverture suivante d'une nouvelle version.

### Avant la partie

1. **Draft** : choisis ton poste puis ton champion (case dorée « Toi »), ajoute tes alliés poste par poste et les ennemis dans n'importe quel ordre. L'app devine le poste des ennemis ; touche un ennemi pour corriger son poste. Ton vis-à-vis est entouré de rouge.
2. **Reco** : le build recommandé parmi les tiens pour ce champion à ce poste, son niveau de confiance (touche le badge pour l'explication), le premier item et le « Pourquoi ». « Autres builds possibles » permet d'en jouer un autre.
3. **Lancer la partie**.

**Saisie rapide** : touche la première case alliée vide, puis choisis les champions à la suite, le sélecteur passe tout seul au poste suivant. Même chose avec **Ajouter un ennemi**, qui reste ouvert jusqu'au 5e. Les champions récents sont proposés en tête ; sinon, tape 2 ou 3 lettres puis Entrée ou touche le champion surligné.

| Saisie (mesurée, T7.3)                                    | Taps à l'écran            |
| --------------------------------------------------------- | ------------------------- |
| Draft complète (4 alliés + 5 ennemis, ton champion gardé) | **11** (objectif ≤ 12)    |
| … avec la recherche au lieu des récents                   | 11 + 2 à 3 lettres par champion |
| Un item acheté (« + » puis l'item de ton build)           | **2**                     |

### Pendant la partie

- En haut : ta situation (**Devant** / **Égalité** / **En retard**).
- **Prochain item** : quoi acheter, pourquoi (touche la raison pour tout voir) et l'autre choix possible.
- **Mes items** : touche « + » à chaque achat (les items de ton build sont proposés en premier, recherche en français ou en anglais). Touche un item pour le changer ou le retirer s'il est vendu.
- **Quête** (à droite de « Mes items ») : coche-la quand ta quête de rôle est terminée. En Bot, tes bottes passent dans l’emplacement de quête (case dorée) et libèrent une place ; pour les autres postes, la récompense s’affiche sous tes items.
- **Équipe ennemie** (repliée) : corriger un ennemi ou un poste sans repasser par la draft.
- L'écran reste allumé tant que l'écran Partie est ouvert.

### Créer un build pour un nouveau champion

1. Onglet **Builds** → **Nouveau build**.
2. **Champion**, **Poste** et nom du build.
3. **Runes** (arbre principal, rune clé, runes principales, arbre secondaire et ses 2 runes, fragments) et 2 **sorts d'invocateur**.
4. **Premier item** : une ou plusieurs options ; pour chacune, **Choisir quand le proposer** (ex : « Vis-à-vis AP »).
5. **Ordre des items** : un item par emplacement ; sous un item, **Ajouter une alternative** et choisis quand la prendre (ex : « Compo majoritairement AP » → Sandales de Mercure).
6. **Quand jouer ce build** : les conditions qui le font recommander, avec leur poids (faible, moyen, fort).
7. **Enregistrer**. L'étoile marque ton build **favori** : à égalité, c'est lui qui est proposé.

Pour modifier un build : **Builds** → le build → **Modifier**. **Dupliquer** sert de point de départ pour une variante.

### Sauvegarder ses builds (export / import)

Les builds ne sont enregistrés que sur le téléphone. Dans l'onglet **Builds** :

- **Exporter** crée un fichier JSON (partage Android vers Drive, mail… ou téléchargement). Chaque fiche de build a aussi son bouton **Exporter**.
- **Importer** relit un fichier : aperçu, puis « Garder les deux » ou « Remplacer » si un build existe déjà.
- Un rappel s'affiche si des builds n'ont pas été exportés depuis 7 jours.

### Ajouter un preset de condition

Les conditions proposées dans l'éditeur sont dans [data/presets/conditions.json](data/presets/conditions.json). Ajouter une entrée à `presets`, par exemple :

```json
{
  "id": "enormement-cc",
  "label": "Énormément de contrôles",
  "condition": { "metric": "enemyCcCount", "op": ">=", "value": 8 },
  "explain": "Ils enchaînent les contrôles : la ténacité devient prioritaire."
}
```

Les métriques disponibles (`enemyAdShare`, `enemyApShare`, `enemyCcCount`, `enemyHealCount`, `enemyTankCount`, `enemyBurstCount`, `laneOpponentDamage`, `situation`…) sont décrites dans [docs/TICKETS.md](docs/TICKETS.md), section 3. Puis rebuild et redéploiement (merge sur `main`).

### Corriger les données du jeu (overrides)

Data Dragon ne dit pas tout (soins, anti-tank, répartition AD/AP de certains champions). Les corrections se font sans toucher au code :

- [data/overrides/champions.json](data/overrides/champions.json) : par id de champion, `damage`, `threats` (`cc`, `burst`, `engage`, `heal`, `tank` de 0 à 3), `tags`. Exemple : `"DrMundo": { "threats": { "heal": 3 }, "note": "Régénération massive." }`.
- [data/overrides/items.json](data/overrides/items.json) : par id d'item, `addCategories` / `removeCategories`. Exemple : `"3036": { "addCategories": ["antitank"] }`.
- [data/defaults/](data/defaults/) : règles par défaut (menaces par classe de champion, catégories d'items).

Le format est rappelé dans la clé `_format` de chaque fichier. Un id inconnu ou une valeur invalide produit un avertissement dans la console du navigateur, sans bloquer l'app.

### Mettre à jour les quêtes de rôle

Les récompenses des quêtes de rôle de chaque poste sont dans [data/role-quests.json](data/role-quests.json) (source : [wiki officiel](https://wiki.leagueoflegends.com/en-us/Role_Quests)). À chaque nouveau patch :

1. `npm run check-role-quests` : dit si le wiki a noté des changements depuis le patch du fichier.
2. Si oui : relire la page du wiki, mettre à jour `reward`, `points`, `effects` et le champ `patch`, puis merger sur `main`.

Seul l'effet `dedicatedSlot: "boots"` (Bot : 6 items + bottes) change les recommandations ; les autres récompenses sont affichées en texte (écran À propos).

## Développement

### Démarrer

Prérequis : Node.js 24+.

```bash
npm install
npm run dev
```

### Déploiement

`main` = prod. Chaque push sur `main` (merge d'une epic validée) déclenche GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) : lint, tests, build, puis publication du site construit dans la branche `gh-pages`, servie par GitHub Pages. Lancement manuel possible depuis l'onglet Actions (« Run workflow »).

Réglage GitHub (une seule fois) : Settings → Pages → Source : **Deploy from a branch** → `gh-pages` / `(root)`.

La branche `gh-pages` est générée par la CI : ne jamais la modifier à la main.

### Composants d'interface

En dev uniquement, `#/composants` affiche tous les composants de base (boutons, cartes, onglets, bandeau « Pourquoi »). Les couleurs, tailles et espacements sont dans [src/ui/theme/tokens.css](src/ui/theme/tokens.css).

### Tester sur le téléphone pendant le dev

`npm run dev:phone`, puis ouvrir sur le téléphone l'adresse « Network » affichée (même wifi que le PC). Pas d'installation ni de hors-ligne dans ce mode.

### Commandes

| Commande               | Rôle                                        |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | serveur de développement                    |
| `npm run dev:phone`    | serveur de dev accessible en wifi (téléphone) |
| `npm run build`        | vérification TypeScript + build de production (`dist/`) |
| `npm run preview`      | sert le build de production en local        |
| `npm test`             | tests Vitest (une passe)                    |
| `npm run test:watch`   | tests Vitest en continu                     |
| `npm run test:coverage` | tests + couverture du moteur (seuil 80 %) |
| `npm run lint`         | lint (oxlint)                               |
| `npm run format`       | formate le code (Prettier)                  |
| `npm run format:check` | vérifie le formatage                        |
| `npm run generate-icons` | régénère les icônes PWA depuis `public/logo.svg` |
| `npm run update-positions` | met à jour les taux de jeu par poste (postes ennemis devinés) |
| `npm run check-role-quests` | signale si les quêtes de rôle ont changé sur le wiki depuis `data/role-quests.json` |

### Structure

```
src/
  data/       # chargement Data Dragon, overrides, BuildRepository
  engine/     # moteur pur TypeScript, aucune dépendance React
  ui/         # composants et écrans
  store/      # état de la partie
data/
  builds/     # build d'exemple
  defaults/   # valeurs par défaut (menaces par classe de champion)
  presets/    # presets de conditions de l'éditeur
  overrides/  # corrections manuelles champions / items
  role-quests.json  # récompenses des quêtes de rôle par poste
docs/TICKETS.md   # tickets du MVP
```
