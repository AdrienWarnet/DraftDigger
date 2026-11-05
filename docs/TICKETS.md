# DraftDigger – Tickets du MVP

Document à donner à Claude Code. Il contient le contexte, les choix techniques, les formats de données, puis les epics 0 à 7 découpées en tickets.

---

## 0. Contexte du projet

Une WebApp (mobile-first, PWA) pour League of Legends. Le joueur **crée lui-même ses builds dans l'app** (runes, sorts, items, conditions d'usage), pour **n'importe quel champion**, et les enregistre sur son téléphone. L'app :

1. **Avant la game** : le joueur choisit son poste (top, jungle, mid, bot, support) et son champion, puis saisit la compo alliée et ennemie poste par poste. Son vis-à-vis de lane est l'ennemi du même poste. L'app recommande **l'un de ses builds pour ce champion à ce poste** et **le premier item** à acheter, avec une explication.
2. **Pendant la game** : le joueur saisit les items achetés et indique s'il est devant / à égalité / en retard. L'app propose **les prochains items** avec une explication.

Le moteur doit être **générique** (aucun code spécifique à un champion). Au premier lancement, l'app charge un **build d'exemple** (Yorick, `data/builds/example.json`) pour pouvoir tester tout de suite.

**Tout tourne sur le téléphone** : aucun serveur dans le MVP. Un backend viendra probablement plus tard (calculs plus lourds, synchro) : l'accès aux builds passe donc par une interface `BuildRepository` remplaçable.

Hors MVP (ne pas le faire) : lecture de la partie en direct, backend, comptes utilisateurs, recommandation de pick, données automatiques (stats de builds), éditeur avancé de conditions (voir « Plus tard »).

## 1. Choix techniques (à suivre sauf bonne raison contraire)

- **Vite + React + TypeScript** (mode strict).
- **Pas de backend** : tout tourne dans le navigateur. Stockage local via `localStorage` (hors artifacts Claude.ai, donc OK ici). Demander `navigator.storage.persist()` pour limiter le risque d'effacement des données par le navigateur.
- **Validation** : Zod. **État** : Zustand avec persistance.
- **Tests** : Vitest. Le moteur de recommandation (epic 4) doit être couvert par des tests unitaires, avec ses propres builds de test (jamais ceux de l'utilisateur).
- **PWA** : `vite-plugin-pwa`.
- **Style** : CSS simple (modules CSS ou Tailwind), mobile-first, thème sombre par défaut.
- **Langue de l'interface** : français.
- **Déploiement** : hébergement statique gratuit (Cloudflare Pages, Netlify ou GitHub Pages).
- **Structure suggérée** :

```
src/
  data/            # chargement Data Dragon, overrides, BuildRepository
  engine/          # moteur pur (aucune dépendance React)
  ui/              # composants et écrans
  store/           # état de la partie (draft, items, situation)
data/
  builds/example.json        # build d'exemple chargé au 1er lancement
  presets/conditions.json    # presets de conditions de l'éditeur
  overrides/champions.json
  overrides/items.json
```

**Règle d'or** : `src/engine` est du TypeScript pur, testable sans navigateur. L'UI appelle le moteur, jamais l'inverse. Les builds ne sont lus et écrits que via `BuildRepository`.

## 2. Sources de données

Data Dragon (gratuit, sans clé, appelable depuis le navigateur) :

- Versions : `https://ddragon.leagueoflegends.com/api/versions.json` (la première est la plus récente)
- Champions : `https://ddragon.leagueoflegends.com/cdn/{version}/data/fr_FR/champion.json`
- Items : `https://ddragon.leagueoflegends.com/cdn/{version}/data/fr_FR/item.json`
- Runes : `https://ddragon.leagueoflegends.com/cdn/{version}/data/fr_FR/runesReforged.json`
- Sorts d'invocateur : `https://ddragon.leagueoflegends.com/cdn/{version}/data/fr_FR/summoner.json`
- Images : `https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{id}.png` et `.../img/item/{id}.png`

Limites connues : Data Dragon ne donne ni les ratios de dégâts des sorts, ni le type d'effet « anti-soin ». D'où les fichiers `overrides` édités à la main.

## 3. Formats de données (contrats entre les couches)

### Champion (modèle interne, après enrichissement)

```ts
type Champion = {
  id: string;            // "Yorick"
  name: string;
  image: string;         // URL
  tags: string[];        // tags Data Dragon : Fighter, Tank, Mage...
  damage: { ad: number; ap: number; true: number }; // somme = 1
  threats: {
    cc: 0 | 1 | 2 | 3;       // quantité de contrôle de foule
    burst: 0 | 1 | 2 | 3;
    engage: 0 | 1 | 2 | 3;
    heal: 0 | 1 | 2 | 3;     // soin / drain
    tank: 0 | 1 | 2 | 3;     // résistance
  };
};
```

Valeur par défaut de `damage` : calculée depuis `info.attack` et `info.magic` de Data Dragon, puis corrigée par `overrides/champions.json`.

### Item (modèle interne)

```ts
type Item = {
  id: string;
  name: string;
  image: string;
  cost: number;           // gold.total
  stats: { armor?: number; mr?: number; hp?: number; ad?: number; ap?: number };
  categories: string[];   // "armor", "mr", "hp", "antiheal", "antitank", "mobility"...
  buildsFrom: string[];   // composants
};
```

`categories` vient des tags Data Dragon + `overrides/items.json` (notamment `antiheal`, `antitank`).

### Conditions (utilisées partout dans les builds et règles)

```ts
type Condition = {
  metric: Metric;
  op: ">=" | "<=" | ">" | "<" | "==";
  value: number | string;
};

type Metric =
  | "enemyAdShare"        // 0..1, part de dégâts AD de l'équipe ennemie
  | "enemyApShare"        // 0..1
  | "enemyCcCount"        // somme des threats.cc
  | "enemyHealCount"      // somme des threats.heal
  | "enemyTankCount"      // nombre d'ennemis avec threats.tank >= 2
  | "enemyBurstCount"
  | "enemyEngageCount"
  | "laneOpponentDamage"  // "ad" | "ap" | "mixed"
  | "laneOpponentIsTank"  // true/false (valeur 1 ou 0)
  | "situation";          // "ahead" | "even" | "behind"
```

### Poste

```ts
type Position = "top" | "jungle" | "mid" | "bot" | "support";
```

Chaque équipe a 5 emplacements, un par poste. Le vis-à-vis de lane du joueur est l'ennemi placé au même poste que lui.

### Build (le format central)

```ts
type Build = {
  id: string;                   // identifiant unique généré (uuid)
  name: string;                 // "Duelliste"
  championId: string;           // "Yorick"
  position: Position;           // "top" : un build est propre à un champion ET un poste
  order: number;                // ordre d'affichage, sert aussi au départage
  updatedAt: string;            // date ISO de dernière modification
  runes: {
    primaryTree: string;
    keystone: string;
    primarySlots: string[];     // 3 runes
    secondaryTree: string;
    secondarySlots: string[];   // 2 runes
    shards: string[];           // 3 fragments
  };
  summonerSpells: [string, string];
  useWhen: { condition: Condition; weight: number; explain: string }[];
  firstItemOptions: {
    itemId: string;
    useWhen: { condition: Condition; weight: number; explain: string }[];
  }[];
  itemOrder: {
    slot: number;               // 1, 2, 3...
    default: string;            // itemId
    alternatives: { itemId: string; when: Condition[]; explain: string }[];
  }[];
};
```

### Preset de condition (éditeur de builds)

```ts
type ConditionPreset = {
  id: string;            // "vs-ap-lane"
  label: string;         // "Vis-à-vis AP"
  condition: Condition;  // { metric: "laneOpponentDamage", op: "==", value: "ap" }
  explain: string;       // texte par défaut, modifiable par le joueur
};
```

Les presets vivent dans `data/presets/conditions.json`. Le build stocke la **condition complète** (pas seulement l'id du preset) pour rester autonome ; l'éditeur retrouve le preset par égalité de condition, sinon affiche « condition personnalisée ».

Poids proposés dans l'éditeur : faible = 1, moyen = 2, fort = 3 (configurables).

### Sortie du moteur (toujours ce format)

```ts
type Recommendation<T> = {
  choice: T;                    // build, item...
  score: number;
  reasons: string[];            // phrases en français, prêtes à afficher
  alternatives: { choice: T; score: number; reasons: string[] }[];
  confidence: "low" | "medium" | "high";
};
```

## 4. Règles de calcul de référence

- **Réduction de dégâts** : dégâts reçus = dégâts × 100 / (100 + résistance). Exemple : 100 d'armure divise les dégâts physiques par 2, soit 50 % de réduction.
- **Gain d'un item défensif** : pour un item donné et une compo ennemie, `gain = enemyAdShare × (réduction AD apportée) + enemyApShare × (réduction AP apportée)`, mesuré par rapport aux résistances de départ du build à ce moment.
- **Choix d'un build** : `score = somme des weight des useWhen dont la condition est vraie`. Seuls les builds du champion joué **et du poste joué** sont candidats. Le plus haut score gagne ; en cas d'égalité, le build avec le plus petit `order`. Les `explain` des conditions vraies forment les `reasons`.
- **Situation** (`ahead` / `even` / `behind`) : voir T4.5. Avant la partie, la situation vaut toujours `even`.

### Échelle unique des scores : les « points »

Tous les scores du moteur sont exprimés en **points**, la même unité que les `weight` (faible = 1, moyen = 2, fort = 3). Rien n'est additionné s'il n'a pas été converti en points.

- **Choix du build et du premier item** : `score = somme des weight des useWhen vrais`. Pas de `defensiveGain` ni de modificateur de situation ici (avant la partie, `even`).
- **Prochain item** (T6.3), pour chaque candidat (le `default` du slot + chaque alternative dont toutes les conditions `when` sont vraies) :
  `score = bonusAlternative + defensiveGain × gainToPoints + modificateurSituation`
  - `bonusAlternative` = 2 si le candidat est une alternative valide, 0 pour le `default` (le joueur a prévu cette alternative pour ce cas, elle doit l'emporter sauf écart net).
  - `gainToPoints` = 10 (un gain de 0,3, soit 30 % de dégâts en moins pondéré par la compo, vaut 3 points, comme une condition « forte »).
  - `modificateurSituation` : voir T4.5.
  - Égalité : le `default` gagne.
- **Confiance** (`Recommendation.confidence`), à partir de l'écart de points entre le 1er et le 2e et du nombre d'ennemis connus :
  - `high` : écart ≥ 3 et ≥ 4 ennemis connus ;
  - `medium` : écart ≥ 1 et ≥ 2 ennemis connus ;
  - `low` : sinon (dont 0 ennemi connu, ou une seule option).

Toutes ces valeurs (poids, `bonusAlternative`, `gainToPoints`, modificateurs, seuils de confiance, seuils des items de situation) vivent dans **un seul fichier** : `src/engine/config.ts`. Valeurs de départ à ajuster en T7.2 (`TODO(joueur)`).

---

# EPIC 0 – Fondations techniques

### T0.1 – Initialiser le projet (S)

**Quoi** : un projet Vite + React + TypeScript qui démarre.
**À faire**
- [ ] Créer le projet, TypeScript strict, ESLint, Prettier.
- [ ] Ajouter Vitest et un script `npm test`.
- [ ] Créer l'arborescence de la section 1.
- [ ] README avec les commandes (`dev`, `build`, `test`).

**Terminé quand** : `npm run dev`, `npm run build` et `npm test` passent.

### T0.2 – Déploiement automatique (S)

**Quoi** : chaque push sur `main` met le site en ligne.
**À faire**
- [ ] Configurer un hébergement statique gratuit et le déploiement automatique.
- [ ] Documenter l'URL et la procédure dans le README.

**Terminé quand** : l'app (même vide) est accessible par URL publique.
**Dépend de** : T0.1.

### T0.3 – PWA (M)

**Quoi** : l'app s'installe sur l'écran d'accueil du téléphone.
**À faire**
- [ ] `vite-plugin-pwa` : manifest (nom, icônes, couleur), service worker.
- [ ] Mise en cache de l'app pour un lancement rapide.

**Terminé quand** : Chrome ne remonte aucune erreur d'installabilité (DevTools → Application → Manifest ; l'audit PWA de Lighthouse n'existe plus depuis Lighthouse 12), l'app se relance hors ligne, et elle est installable sur Android.
**Dépend de** : T0.2.

### T0.4 – Thème mobile-first (S)

**Quoi** : un socle visuel simple et lisible au pouce.
**À faire**
- [ ] Variables CSS (couleurs, espacements), thème sombre par défaut.
- [ ] Composants de base : bouton (grande zone tactile), carte, onglets, bandeau d'explication.
- [ ] Navigation : 4 écrans (Draft, Recommandation, Partie, Mes builds).

**Terminé quand** : les 4 écrans vides sont navigables sur mobile, zones tactiles ≥ 44 px.
**Dépend de** : T0.1.

---

# EPIC 1 – Données Riot et tags

### T1.1 – Chargement de Data Dragon avec cache (M)

**Quoi** : récupérer champions, items, runes et sorts de la dernière version.
**À faire**
- [ ] `src/data/ddragon.ts` : récupérer la dernière version, puis les 4 fichiers JSON en `fr_FR`.
- [ ] Cache dans `localStorage` clé par version ; ne recharger que si la version change.
- [ ] États de chargement et d'erreur gérés (hors ligne : utiliser le cache).

**Terminé quand** : au 2e lancement, plus aucune requête réseau pour les JSON si la version n'a pas changé ; test avec fetch mocké.
**Dépend de** : T0.1.

### T1.2 – Modèle champion enrichi (M)

**Quoi** : produire des `Champion` conformes à la section 3.
**À faire**
- [ ] Transformer `champion.json` en `Champion[]`.
- [ ] `damage` calculé depuis `info.attack` et `info.magic` (normalisés pour sommer à 1).
- [ ] `threats` par défaut déduits des tags (ex : `Tank` → `tank: 3`, `Assassin` → `burst: 2`, `Mage` → `burst: 1`), faciles à retoucher.

**Terminé quand** : tests unitaires sur 5 champions représentatifs (un tank, un mage, un tireur, un assassin, un support).
**Dépend de** : T1.1.

### T1.3 – Modèle item enrichi (M)

**Quoi** : produire des `Item` conformes à la section 3.
**À faire**
- [ ] Transformer `item.json` en `Item[]` (coût, stats utiles, composants).
- [ ] `categories` : déduites des tags Data Dragon (`Armor`, `SpellBlock`, `Health`...), complétées par les overrides.
- [ ] Ignorer les items non achetables ou hors Faille de l'invocateur.

**Terminé quand** : tests sur 5 items (armure, RM, PV, anti-soin, item sans stat défensive).
**Dépend de** : T1.1.

### T1.4 – Fichiers d'overrides (M)

**Quoi** : corriger à la main ce que Data Dragon ne sait pas dire.
**À faire**
- [ ] `data/overrides/champions.json` : surcharge par `id` de `damage`, `threats`, `tags`.
- [ ] `data/overrides/items.json` : ajout de catégories (`antiheal`, `antitank`...).
- [ ] Fusion des overrides dans T1.2 et T1.3, avec validation (un `id` inconnu produit un avertissement console, pas un crash).
- [ ] Pré-remplir quelques overrides évidents (items anti-soin connus, champions mixtes).

**Terminé quand** : modifier un override change le champion ou l'item affiché sans toucher au code.
**Dépend de** : T1.2, T1.3.

### T1.5 – Changement de patch (M)

**Quoi** : l'app survit aux nouveaux patchs.
**À faire**
- [ ] Au chargement, comparer les `id` des builds avec les items et runes du patch courant.
- [ ] Lister les ids introuvables dans un écran « Alertes de données » (item supprimé, rune renommée).
- [ ] Afficher la version du patch en bas de l'app.

**Terminé quand** : un build contenant un item inexistant produit une alerte lisible, sans planter.
**Dépend de** : T1.1, T3.4.

---

# EPIC 2 – Saisie de la draft

### T2.1 – Sélecteur de champion (M)

**Quoi** : choisir un champion en 2 ou 3 touches.
**À faire**
- [ ] Composant `ChampionPicker` : champ de recherche avec autocomplétion (ignore accents et casse), grille d'icônes.
- [ ] Les résultats se filtrent à la frappe, le premier résultat se valide en un tap.

**Terminé quand** : « mord » trouve Mordekaiser et « ori » trouve Orianna ; utilisable une main sur mobile.
**Dépend de** : T1.2.

### T2.2 – Écran de saisie des deux équipes (M)

**Quoi** : 5 emplacements alliés + 5 ennemis, un par poste.
**À faire**
- [ ] Écran Draft : pour chaque poste (Top, Jungle, Mid, Bot, Support, dans cet ordre), un emplacement allié et un emplacement ennemi face à face ; tap pour choisir ou changer un champion.
- [ ] Le joueur choisit son poste (`playerPosition`) : l'emplacement allié de ce poste est marqué « moi » et il y choisit son champion (`playerChampionId`). Poste et champion pré-remplis avec ceux de la dernière partie.
- [ ] Les champions qui ont au moins un build pour le poste du joueur sont proposés en tête du sélecteur pour l'emplacement « moi ».
- [ ] Échanger deux emplacements d'une même équipe (2 taps) pour corriger un poste mal deviné.
- [ ] Bouton de suppression sur chaque emplacement.

**Terminé quand** : on peut remplir et vider les 10 emplacements, changer son poste et son champion, échanger deux ennemis ; l'état est conservé en changeant d'onglet.
**Dépend de** : T2.1, T0.4.

### T2.3 – Vis-à-vis de lane (S)

**Quoi** : savoir quel ennemi est face au joueur, sans saisie supplémentaire.
**À faire**
- [ ] Le vis-à-vis est déduit : l'ennemi au même poste que le joueur (fonction pure `laneOpponent(draft)` dans `src/engine`).
- [ ] L'emplacement ennemi correspondant est mis en évidence (« ton vis-à-vis »).
- [ ] Changer de poste ou échanger deux ennemis met à jour le vis-à-vis.

**Terminé quand** : le vis-à-vis suit le poste du joueur et les échanges d'ennemis ; aucun vis-à-vis si l'emplacement ennemi du poste est vide (test).
**Dépend de** : T2.2.

### T2.4 – Draft partielle (S)

**Quoi** : l'app fonctionne même si tout n'est pas rempli.
**À faire**
- [ ] Les métriques du moteur (T4.1) tolèrent des emplacements vides.
- [ ] Un message indique combien d'ennemis sont connus (« recommandation basée sur 3/5 ennemis »).

**Terminé quand** : avec 0 ennemi, l'écran ne plante pas et le moteur renvoie un résultat de confiance « low ».
**Dépend de** : T2.2.

### T2.5 – Sauvegarde et réinitialisation (S)

**Quoi** : ne pas perdre la partie en cours si le navigateur se ferme.
**À faire**
- [ ] Store (Zustand ou Context) avec persistance `localStorage`.
- [ ] Bouton « Nouvelle partie » avec confirmation qui remet tout à zéro.

**Terminé quand** : recharger la page restaure draft (postes compris), items achetés et situation.
**Dépend de** : T2.2.

---

# EPIC 3 – Builds : format, stockage et éditeur

Le joueur crée et modifie ses builds dans l'app, pour n'importe quel champion. Pas de build saisi à la main dans le code, sauf le build d'exemple.

### T3.1 – Schéma du build (M)

**Quoi** : implémenter le type `Build`, `ConditionPreset` et leurs sous-types de la section 3.
**À faire**
- [ ] Types TypeScript dans `src/engine/types.ts`.
- [ ] Schéma de validation (Zod) correspondant, avec messages d'erreur clairs.
- [ ] Build d'exemple Yorick top valide dans `data/builds/example.json` (JSON pur, sans commentaire ; valeurs plausibles).

**Terminé quand** : un JSON invalide est rejeté avec un message qui désigne le champ en cause ; `example.json` passe la validation.
**Dépend de** : T0.1.

### T3.2 – Stockage des builds (M)

**Quoi** : enregistrer les builds sur le téléphone, de façon remplaçable par un backend plus tard.
**À faire**
- [ ] Interface `BuildRepository` (`list`, `listByChampion`, `get`, `save`, `delete`, `reorder`), asynchrone (prête pour un futur appel réseau).
- [ ] Implémentation `LocalBuildRepository` sur `localStorage`, avec validation Zod à la lecture (un build invalide est signalé, pas un crash).
- [ ] Au premier lancement (stockage vide), charger le build d'exemple.
- [ ] Appeler `navigator.storage.persist()` si disponible.
- [ ] Version de schéma stockée avec les données, pour pouvoir migrer plus tard.

**Terminé quand** : tests sur l'implémentation locale (création, modification, suppression, ordre, premier lancement, donnée corrompue).
**Dépend de** : T3.1.

### T3.3 – Affichage d'un build (M)

**Quoi** : voir un build lisiblement.
**À faire**
- [ ] Composant `BuildView` : champion, arbre de runes (icônes), sorts, options de premier item, ordre des items avec images.
- [ ] Noms et icônes issus de Data Dragon à partir des ids.

**Terminé quand** : le build d'exemple s'affiche correctement sur mobile.
**Dépend de** : T3.2, T1.1.

### T3.4 – Validation contre le patch (S)

**Quoi** : vérifier que les ids existent dans le patch courant.
**À faire**
- [ ] Fonction `validateBuildAgainstData(build, data)` qui renvoie la liste des ids inconnus (champion, items, runes, sorts).
- [ ] Appelée au chargement des builds et à l'enregistrement dans l'éditeur.

**Terminé quand** : test avec un item inexistant → l'erreur est listée.
**Dépend de** : T3.1, T1.1.

### T3.5 – Écran « Mes builds » (M)

**Quoi** : gérer la liste de ses builds.
**À faire**
- [ ] Liste groupée par champion puis par poste (icône, poste, nom du build), filtres par champion et par poste.
- [ ] Actions : créer, ouvrir, dupliquer, supprimer (avec confirmation), réordonner au sein d'un champion.
- [ ] Un build en erreur (T3.4) est signalé par un badge.

**Terminé quand** : on peut créer, dupliquer, réordonner et supprimer un build ; tout est conservé après rechargement.
**Dépend de** : T3.2, T3.3, T0.4.

### T3.6 – Éditeur : identité, runes et sorts (M)

**Quoi** : remplir la partie « fixe » d'un build.
**À faire**
- [ ] Champs : nom, champion (`ChampionPicker` de T2.1), poste.
- [ ] Sélection des runes en suivant la structure Data Dragon : arbre principal → keystone → 3 runes, arbre secondaire (différent du principal) → 2 runes de lignes différentes, 3 fragments.
- [ ] Sélection des 2 sorts d'invocateur (distincts, sorts de la Faille uniquement).
- [ ] Brouillon conservé si on quitte l'éditeur sans enregistrer ; validation Zod + T3.4 à l'enregistrement.

**Terminé quand** : on crée un build complet côté runes et sorts en moins de 2 minutes sur mobile, et une combinaison de runes invalide est impossible à saisir.
**Dépend de** : T3.5, T1.1, T2.1.

### T3.7 – Éditeur : items (M)

**Quoi** : définir les premiers items et l'ordre d'achat.
**À faire**
- [ ] Sélecteur d'items réutilisable (recherche, filtres par catégorie), partagé avec T6.1.
- [ ] Options de premier item : 1 à 3 items.
- [ ] Ordre des items : liste de slots réordonnable ; pour chaque slot, un item par défaut et 0 à 3 alternatives.

**Terminé quand** : on définit 3 options de premier item et 6 slots avec alternatives ; le build enregistré passe la validation.
**Dépend de** : T3.6, T1.3.

### T3.8 – Éditeur : conditions par presets (M)

**Quoi** : dire quand utiliser un build, une option de premier item ou une alternative, sans écrire de condition à la main.
**À faire**
- [ ] `data/presets/conditions.json` : une quinzaine de presets couvrant chaque `Metric` (ex : « Compo majoritairement AD », « Compo majoritairement AP », « Beaucoup de soin », « Beaucoup de CC », « 2 tanks ou plus », « Vis-à-vis AD », « Vis-à-vis AP », « Vis-à-vis tank », « En retard », « Devant »).
- [ ] Sur un build et sur chaque option de premier item : liste de presets cochables, chacun avec un poids (faible / moyen / fort) et un texte d'explication pré-rempli et modifiable → alimente `useWhen`.
- [ ] Sur chaque alternative de slot : presets cochables (toutes doivent être vraies) → alimente `when`.
- [ ] Une condition qui ne correspond à aucun preset s'affiche « condition personnalisée » en lecture seule.

**Terminé quand** : le build d'exemple peut être entièrement recréé via l'éditeur ; les presets se modifient dans le JSON sans toucher au code.
**Dépend de** : T3.7.

### T3.9 – Export / import des builds (S)

**Quoi** : ne pas perdre ses builds et pouvoir les transférer.
**À faire**
- [ ] Export de tous les builds (ou d'un seul) en fichier JSON (téléchargement ou partage natif via Web Share API si disponible).
- [ ] Import d'un fichier JSON : validation Zod, aperçu, choix en cas de conflit d'id (remplacer / garder les deux).
- [ ] Rappel discret dans « Mes builds » si aucun export n'a été fait depuis 7 jours.

**Terminé quand** : exporter, vider le stockage, réimporter → les builds sont identiques ; un fichier invalide est refusé avec un message clair.
**Dépend de** : T3.2, T3.5.

---

# EPIC 4 – Moteur d'adaptation (`src/engine`)

Toute cette epic est du TypeScript pur, sans React, avec des tests.

### T4.1 – Métriques de la compo ennemie (M)

**Quoi** : transformer une liste de champions ennemis en métriques (`Metric`).
**À faire**
- [ ] `computeMetrics(enemies, laneOpponent)` : `enemyAdShare`, `enemyApShare` (moyenne pondérée des `damage`), `enemyCcCount`, `enemyHealCount`, `enemyTankCount`, `enemyBurstCount`, `enemyEngageCount`, `laneOpponentDamage`, `laneOpponentIsTank`.
- [ ] `laneOpponentDamage` : `"ad"` si part AD ≥ 0,65, `"ap"` si part AP ≥ 0,65, sinon `"mixed"`.
- [ ] Gérer 0 à 5 ennemis (retourner aussi `knownEnemies`).

**Terminé quand** : tests sur 3 compos (full AD, full AP, mixte) et sur une compo vide.
**Dépend de** : T1.2.

### T4.2 – Calcul de réduction de dégâts (M)

**Quoi** : quantifier l'effet d'un item défensif.
**À faire**
- [ ] `damageReduction(resist)` = `resist / (100 + resist)`.
- [ ] `defensiveGain(item, currentStats, metrics)` selon la formule de la section 4.
- [ ] Retourner aussi un texte exploitable (« +X % de réduction face à leurs dégâts AD »).

**Terminé quand** : tests avec valeurs connues (100 d'armure = 50 %).
**Dépend de** : T4.1, T1.3.

### T4.3 – Évaluateur de conditions et de règles (L)

**Quoi** : le cœur du moteur.
**À faire**
- [ ] `evaluateCondition(condition, metrics, situation)` pour tous les `Metric` et `op`.
- [ ] `scoreOptions(options, metrics, situation)` : somme des `weight` des conditions vraies, retourne aussi les `explain` des conditions vraies.
- [ ] Format de sortie `Recommendation<T>` de la section 3, avec `confidence` selon les seuils de la section 4 (« Échelle unique des scores »).
- [ ] Créer `src/engine/config.ts` avec les poids et seuils de confiance.

**Terminé quand** : tests unitaires couvrant chaque opérateur, l'égalité, les conditions fausses, la draft partielle.
**Dépend de** : T4.1.

### T4.4 – Générateur d'explications (M)

**Quoi** : des phrases claires en français pour chaque recommandation.
**À faire**
- [ ] Combiner les `explain` du build et les textes chiffrés de T4.2 (« Contre leurs 4 sources de dégâts AP, cet item réduit les dégâts de 31 % »).
- [ ] Longueur : 1 à 3 phrases courtes, maximum 3 raisons par recommandation.

**Terminé quand** : snapshot tests sur 3 cas types.
**Dépend de** : T4.2, T4.3.

### T4.5 – Prise en compte de la situation (M)

**Quoi** : adapter les conseils quand on est devant ou en retard.
**À faire**
- [ ] `situation` : `"ahead" | "even" | "behind"` passée à toutes les évaluations.
- [ ] Modificateurs de score, en points (s'appliquent aux candidats du prochain item, T6.3) :
  - `behind` : +1 si l'item est défensif (catégorie `armor`, `mr` ou `hp`) ; +1 au candidat le moins cher, −1 au plus cher (s'il y a au moins 2 candidats de coûts différents). L'explication le dit (« en retard, on privilégie un item abordable et défensif »).
  - `ahead` : +1 si l'item est offensif (stat `ad` ou `ap`, sans stat défensive).
  - `even` : aucun modificateur.
- [ ] Valeurs dans `src/engine/config.ts`, logique dans `src/engine/situation.ts`.

**Terminé quand** : le même état donne un item différent entre `behind` et `ahead` dans un test.
**Dépend de** : T4.3.

### T4.6 – Tests sur des compos types (M)

**Quoi** : filet de sécurité avant l'UI.
**À faire**
- [ ] Fixtures de 5 compos (full AD, full AP, mixte, beaucoup de CC, beaucoup de soin).
- [ ] Un test de bout en bout par compo : choix du build, premier item, 2 items suivants.
- [ ] Un test avec draft vide.

**Terminé quand** : la couverture du dossier `engine` dépasse 80 %.
**Dépend de** : T4.1 à T4.5.

---

# EPIC 5 – Recommandation avant la partie

### T5.1 – Choix du build (M)

**Quoi** : appeler le moteur pour choisir parmi les builds du champion et du poste joués.
**À faire**
- [ ] `recommendBuild(builds, metrics)` utilisant les `useWhen` des builds (l'appelant passe les builds de `playerChampionId` + `playerPosition`).
- [ ] Départage par `order`.
- [ ] Un seul build : il est retenu, confiance selon les ennemis connus.
- [ ] Aucun build pour ce champion à ce poste, mais des builds à d'autres postes : ils sont proposés avec la mention « build prévu pour <poste> », confiance « low ».
- [ ] Aucun build pour ce champion : message « Aucun build pour X » + bouton « Créer un build » (ouvre l'éditeur avec champion et poste pré-remplis).

**Terminé quand** : test sur les 5 fixtures de T4.6 avec des builds de test, résultat attendu documenté ; cas 0 build, 1 build et « build d'un autre poste » testés.
**Dépend de** : T4.3, T3.2.

### T5.2 – Choix du premier item (M)

**Quoi** : départager les 2-3 options de premier item du build retenu.
**À faire**
- [ ] `recommendFirstItem(build, metrics, situation)` avec les `useWhen` de chaque option.
- [ ] Le **vis-à-vis de lane** pèse plus que le reste de l'équipe : utiliser `laneOpponentDamage` en priorité (par exemple poids élevé dans les `useWhen`), garder les autres métriques comme départage.

**Terminé quand** : vis-à-vis AP → l'option RM est choisie ; vis-à-vis AD → l'option armure ; test dédié.
**Dépend de** : T4.3, T3.1.

### T5.3 – Écran de recommandation (M)

**Quoi** : afficher le résultat de la draft.
**À faire**
- [ ] Carte « Build recommandé » (nom, runes, sorts) avec `BuildView` de T3.3.
- [ ] Carte « Premier item » (image, nom, raison).
- [ ] Les `reasons` en puces courtes.
- [ ] Bouton « Lancer la partie » qui ouvre l'écran Partie.

**Terminé quand** : en saisissant une compo, la recommandation apparaît en moins d'une seconde.
**Dépend de** : T5.1, T5.2, T3.3.

### T5.4 – Alternatives et confiance (S)

**Quoi** : montrer que le choix est discutable.
**À faire**
- [ ] Afficher la 2e meilleure option et son score en repli (accordéon).
- [ ] Un badge de confiance (faible / moyenne / élevée) avec info-bulle.
- [ ] Possibilité de forcer un autre build manuellement (le choix manuel est conservé).

**Terminé quand** : forcer un autre build met à jour le premier item recommandé pour ce build.
**Dépend de** : T5.3.

---

# EPIC 6 – Suivi de partie

### T6.1 – Saisie rapide des items achetés (M)

**Quoi** : noter les achats en quelques taps.
**À faire**
- [ ] Écran Partie : liste des items possédés (jusqu'à 6 + bottes), bouton « + » ouvrant le sélecteur d'items de T3.7 (recherche + suggestions du build en premier).
- [ ] Suppression et remplacement d'un item.
- [ ] Un item acheté qui est un composant compte pour la progression vers son item final.

**Terminé quand** : ajouter 3 items prend moins de 10 secondes.
**Dépend de** : T1.3, T2.5, T3.7.

### T6.2 – Sélecteur de situation (S)

**Quoi** : dire si on est devant, à égalité ou en retard.
**À faire**
- [ ] Contrôle à 3 boutons toujours visible en haut de l'écran Partie.
- [ ] Mise à jour immédiate des recommandations.

**Terminé quand** : changer la situation modifie la recommandation en moins de 200 ms.
**Dépend de** : T4.5.

### T6.3 – Recommandation du prochain item (L)

**Quoi** : dire quoi acheter ensuite, et pourquoi.
**À faire**
- [ ] `recommendNextItem(build, ownedItems, metrics, situation)` :
  1. Trouver le premier `slot` du `itemOrder` pas encore couvert. Un slot est couvert si on possède son `default` ou l'une de ses alternatives (item final) ; un composant possédé ne couvre pas le slot mais s'affiche comme progression.
  2. Candidats : le `default` + les alternatives dont toutes les conditions `when` sont vraies. Score selon la formule de la section 4 (« Échelle unique des scores »).
  3. Retourner une `Recommendation<Item>` avec les raisons.
- [ ] Afficher « Prochain item » + 1 alternative + les raisons.
- [ ] Si tous les slots sont faits : proposer un item de situation, parmi les items achetables non possédés : catégorie `antiheal` si `enemyHealCount` ≥ 2, `antitank` si `enemyTankCount` ≥ 2, sinon `armor` / `mr` / `hp`. Même formule de score (sans `bonusAlternative`), seuils dans `src/engine/config.ts`.

**Terminé quand** : tests sur 3 scénarios complets (début, milieu, fin de partie), avec une compo AD, AP et mixte.
**Dépend de** : T4.2, T4.3, T4.5, T6.1.

### T6.4 – Mise à jour en cours de partie (M)

**Quoi** : corriger les informations en cours de route.
**À faire**
- [ ] Modifier un ennemi ou échanger deux ennemis (donc le vis-à-vis) depuis l'écran Partie sans repasser par Draft (modale rapide).
- [ ] Les recommandations se recalculent automatiquement.
- [ ] Si un item est vendu, la progression se met à jour.

**Terminé quand** : ajouter un ennemi AP en cours de partie change la reco quand la règle correspondante s'applique.
**Dépend de** : T6.3, T2.2.

### T6.5 – Écran Partie lisible d'un coup d'œil (M)

**Quoi** : optimiser l'écran principal pour l'usage réel.
**À faire**
- [ ] Mise en page : situation en haut, prochain item en grand, raison en une ligne, items possédés en bas.
- [ ] Texte lisible à bout de bras, contraste élevé, pas de défilement nécessaire sur un écran de 6".
- [ ] Mode « garder l'écran allumé » (Wake Lock API si disponible).

**Terminé quand** : toute l'information utile est visible sans scroller sur un petit mobile.
**Dépend de** : T6.3.

---

# EPIC 7 – Qualité et usage réel

### T7.1 – Session de test en partie réelle (M)

**Quoi** : vérifier l'utilité de l'app pour de vrai.
**À faire**
- [ ] Checklist de test (draft, reco, achat, changement de situation) dans `docs/TEST.md`.
- [ ] Zone de notes dans l'app (un simple champ texte local, bouton « exporter ») pour noter ce qui cloche pendant et après la partie.

**Terminé quand** : le joueur a testé sur au moins 3 parties et exporté ses notes.
**Dépend de** : Epics 0 à 6.

### T7.2 – Ajustement des règles et poids (M)

**Quoi** : corriger le moteur d'après les retours.
**À faire**
- [ ] Reprendre les notes de T7.1, ajuster les presets de conditions, les overrides et les modificateurs de situation (les `weight` et `useWhen` des builds se règlent par le joueur dans l'éditeur).
- [ ] Ajouter un test de régression pour chaque bug corrigé.

**Terminé quand** : chaque retour est soit corrigé et testé, soit rejeté avec une raison.
**Dépend de** : T7.1.

### T7.3 – Optimisation de la vitesse de saisie (M)

**Quoi** : réduire le nombre de taps.
**À faire**
- [ ] Mesurer le nombre de taps pour remplir une draft complète et pour ajouter un item ; viser ≤ 12 pour une draft complète.
- [ ] Raccourcis possibles : derniers champions utilisés en tête, champions de la dernière partie, validation au clavier.

**Terminé quand** : le chiffre cible est atteint, documenté dans le README.
**Dépend de** : T7.1.

### T7.4 – Documentation d'usage (S)

**Quoi** : une page d'explication courte.
**À faire**
- [ ] `README.md` : comment installer l'app sur le téléphone, créer et modifier un build, sauvegarder ses builds (export/import), ajouter un preset de condition ou un override.
- [ ] Écran « À propos » dans l'app (version du patch, lien vers le README).

**Terminé quand** : quelqu'un crée un build pour un nouveau champion et l'exporte en suivant le README.
**Dépend de** : Epics 0 à 6.

### T7.5 – Bouton « Installer l'app » (S)

**Quoi** : proposer l'installation sans passer par le menu de Chrome.
**À faire**
- [ ] Capter l'événement `beforeinstallprompt` ; afficher un bouton « Installer l'app » (écran « À propos » ou bandeau discret) uniquement quand l'installation est possible.
- [ ] Masquer le bouton une fois l'app installée (`appinstalled`, ou lancée en mode `standalone`).

**Terminé quand** : sur Chrome Android, le bouton ouvre la fenêtre d'installation ; il n'apparaît pas dans l'app installée.
**Dépend de** : T0.3.

---

# EPIC 8 – Quêtes de rôle (hors MVP, plus tard)

### T8.1 – Effets des quêtes de rôle (M)

**Quoi** : tenir compte des récompenses des quêtes de rôle de chaque poste dans les recommandations.
**Entrée requise du joueur** : la liste des effets à prendre en compte par poste (ex : emplacement d'item supplémentaire, niveau max, XP bonus), valables au patch courant. Data Dragon ne fournit pas ces informations.
**À faire**
- [ ] `data/role-quests.json` : effets par poste, éditables à chaque patch sans toucher au code.
- [ ] Prise en compte dans la recommandation d'items (T6.3) : par exemple un emplacement supplémentaire change le nombre de slots à remplir.
- [ ] Explication affichée quand un effet de quête influence la recommandation.

**Terminé quand** : modifier un effet dans le JSON change la recommandation dans un test dédié.
**Dépend de** : T6.3.

---

## Ordre de réalisation conseillé

1. **Socle** : T0.1 → T0.4, puis T1.1 → T1.4.
2. **Saisie** : T2.1 → T2.5.
3. **Builds et moteur** : T3.1 → T3.4, puis T4.1 → T4.6.
4. **Éditeur de builds** : T3.5 → T3.9.
5. **Usage** : T5.1 → T5.4, puis T6.1 → T6.5.
6. **Finition** : T1.5, puis T7.1 → T7.5.
7. **Plus tard** : epic 8 (quêtes de rôle).

## Plus tard (hors MVP)

- **Quêtes de rôle** : voir epic 8.
- **Éditeur avancé de conditions** : saisie libre métrique / opérateur / valeur / poids, en complément des presets.
- **Backend** : nouvelle implémentation de `BuildRepository` (synchro entre appareils, sauvegarde), calculs plus lourds côté serveur.
- Lecture de la partie en direct, données automatiques, recommandation de pick, comptes.

## Règles de travail pour Claude Code

- Un ticket = une branche `ticket-<id>-<nom>` issue de la branche `epic-<n>-<nom>`, commits nommés avec l'identifiant (`T4.3 – évaluateur de conditions`), merge en squash dans la branche d'epic une fois validé (pas de PR). Détail dans `CLAUDE.md` (« Workflow Git »).
- Ne jamais mettre de logique métier dans les composants React : tout passe par `src/engine`.
- Les builds ne sont lus et écrits que via `BuildRepository`.
- Tout ce qui est configurable (presets, overrides, poids, modificateurs) vit dans des fichiers JSON ou un fichier de config unique, pas dans le code.
- Les tests utilisent des builds de test (fixtures), jamais ceux de l'utilisateur.
- Pas de dépendance lourde sans raison ; privilégier la simplicité.
- En cas d'information manquante (règles précises), mettre une valeur plausible avec un commentaire `TODO(joueur)` dans le code (pas dans les `.json`) et continuer.
- Mettre à jour le README quand un ticket change la façon de lancer ou d'utiliser l'app.
