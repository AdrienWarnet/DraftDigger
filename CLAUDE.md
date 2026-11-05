# DraftDigger – Assistant de build League of Legends

## Le projet
WebApp mobile-first (PWA) pour League of Legends. Le joueur crée ses propres builds (runes + sorts + items + conditions d'usage) **dans l'app**, pour n'importe quel champion, et les enregistre sur son téléphone.

- **Avant la game** : il choisit son champion, saisit la compo alliée et ennemie (+ son vis-à-vis de lane). L'app recommande l'un de ses builds pour ce champion et le premier item, avec une explication.
- **Pendant la game** : il saisit ses items achetés et sa situation (devant / égalité / en retard). L'app propose les prochains items avec une explication.

Le moteur est **générique** : aucun code spécifique à un champion. L'app démarre avec un build d'exemple (Yorick) pour pouvoir tester tout de suite.

## Périmètre actuel : MVP uniquement
Tickets des epics 0 à 7. Tout tourne sur le téléphone : aucun serveur.
Ne PAS faire : backend, comptes, lecture de partie en direct, recommandation de pick, données automatiques (stats de builds), éditeur avancé de conditions.
Un backend viendra probablement plus tard (calculs plus lourds, synchro) : l'accès aux builds passe par une interface `BuildRepository` pour pouvoir changer d'implémentation sans toucher au moteur ni à l'UI.

## Stack
- Vite + React + TypeScript (mode strict)
- Vitest pour les tests
- vite-plugin-pwa
- Zod (validation des builds), Zustand (état + persistance)
- Aucun backend : tout dans le navigateur, stockage `localStorage`
- Interface en français
- Données Riot : Data Dragon (gratuit, sans clé)

## Structure
```
src/
  data/       # chargement Data Dragon, overrides, BuildRepository
  engine/     # moteur pur TypeScript, aucune dépendance React
  ui/         # composants et écrans
  store/      # état de la partie
data/
  builds/example.json        # build d'exemple chargé au 1er lancement
  presets/conditions.json    # presets de conditions de l'éditeur
  overrides/champions.json
  overrides/items.json
docs/TICKETS.md
```

## Règles de travail
- Les tickets, formats de données et règles de calcul sont dans `docs/TICKETS.md`. Lis-le avant de commencer, travaille les tickets dans l'ordre conseillé en fin de document.
- Un ticket à la fois. Arrête-toi après chaque ticket pour validation.
- Aucune logique métier dans les composants React : tout passe par `src/engine`, qui doit rester testable sans navigateur.
- L'UI et le moteur n'accèdent jamais directement au `localStorage` pour les builds : toujours via `BuildRepository`.
- Tout ce qui est configurable vit dans des fichiers JSON (presets de conditions, overrides) ou dans `src/engine/config.ts` (poids, modificateurs, seuils), pas en dur dans le code.
- Tous les scores du moteur sont en « points », la même unité que les `weight` : voir « Échelle unique des scores » dans `docs/TICKETS.md`.
- Les tests du moteur utilisent leurs propres builds de test (fixtures), jamais les builds de l'utilisateur.
- Le moteur doit être couvert par des tests unitaires (objectif > 80 % sur `src/engine`).
- Pas de dépendance lourde sans raison ; privilégier la simplicité.
- Si une règle précise manque, mets une valeur plausible avec un commentaire `TODO(joueur)` dans le code et continue (pas de commentaire dans les fichiers `.json`).
- Mets à jour le README quand un ticket change la façon de lancer ou d'utiliser l'app.

## Workflow Git (à appliquer sans qu'on le redemande)
- `main` ne bouge pas pendant le développement des epics.
- Une branche par epic, créée depuis `main` : `epic-<n>-<nom-de-l-epic>` (ex : `epic-0-fondations-techniques`).
- Une branche par ticket, créée depuis sa branche d'epic : `ticket-<id>-<nom-du-ticket>` (ex : `ticket-0.1-initialiser-le-projet`).
- Cycle d'un ticket :
  1. Je code le ticket, je vérifie (build, tests, lint), je m'arrête pour validation.
  2. Validation du joueur → commit + push sur la branche du ticket. Message : `T0.1 – initialiser le projet`.
  3. Si on continue le ticket : commits supplémentaires sur la même branche, push.
  4. Ticket validé définitivement → merge en local de `ticket-…` dans `epic-…` (`git merge --squash`, un commit `T0.1 – …` par ticket sur l'epic), puis push de l'epic.
- Epic validée définitivement (plus rien à y toucher) → merge en local de `epic-…` dans `main` (`git merge --no-ff`, message `Epic 0 – …`), puis push de `main`.
- Pas de PR GitHub (pas d'accès `gh` sur ce dépôt) : tout se fait en git local + push.
- Ne jamais pousser ni merger sans validation explicite.

## Commandes
- `npm run dev` : serveur de développement
- `npm run build` : build de production
- `npm test` : tests Vitest
