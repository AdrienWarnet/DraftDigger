import type { Build, Champion, Item, WeightedCondition, Condition } from '../types'
import championsJson from './champions-16.22.1.json'
import itemsJson from './items-16.22.1.json'

/**
 * Fixtures du moteur (T4.6) : champions et items réels du patch 16.22.1 (overrides compris),
 * 5 compos types et des builds de TEST (jamais ceux du joueur).
 */
export const championsById = new Map((championsJson as Champion[]).map((c) => [c.id, c]))
export const itemsById = new Map((itemsJson as Item[]).map((i) => [i.id, i]))
export const champion = (id: string) => championsById.get(id)!

/** Compos ennemies ; le premier champion est le vis-à-vis de Yorick (top). */
export const COMPOS = {
  fullAd: ['Darius', 'Graves', 'Zed', 'Draven', 'Pyke'],
  fullAp: ['Mordekaiser', 'Elise', 'Syndra', 'Ziggs', 'Lux'],
  mixte: ['Malphite', 'Sejuani', 'Ahri', 'Jinx', 'Leona'],
  beaucoupDeCc: ['Ornn', 'Sejuani', 'Lissandra', 'Ashe', 'Leona'],
  beaucoupDeSoin: ['DrMundo', 'Warwick', 'Vladimir', 'Aphelios', 'Soraka'],
} as const

const cond = (
  metric: Condition['metric'],
  op: Condition['op'],
  value: number | string,
): Condition => ({
  metric,
  op,
  value,
})
const when = (condition: Condition, weight: number, explain: string): WeightedCondition => ({
  condition,
  weight,
  explain,
})

const RUNES = {
  primaryTree: '8400',
  keystone: '8437',
  primarySlots: ['8446', '8444', '8451'],
  secondaryTree: '8000',
  secondarySlots: ['9111', '9105'],
  shards: ['5008', '5008', '5011'],
}

/** Build de test favori : bruiser, prévu contre les compos AD. */
export const BRUISER: Build = {
  id: 'test-bruiser',
  name: 'Bruiser',
  championId: 'Yorick',
  position: 'top',
  order: 0,
  favorite: true,
  updatedAt: '2026-11-06T00:00:00.000Z',
  runes: RUNES,
  summonerSpells: ['SummonerFlash', 'SummonerTeleport'],
  useWhen: [
    when(cond('enemyAdShare', '>=', 0.6), 2, 'Leur équipe fait surtout des dégâts physiques.'),
  ],
  firstItemOptions: [
    { itemId: '1055', useWhen: [] },
    {
      itemId: '1054',
      useWhen: [
        when(
          cond('laneOpponentDamage', '==', 'ap'),
          3,
          'Contre un vis-à-vis AP, le Bouclier de Doran.',
        ),
        when(
          cond('situation', '==', 'behind'),
          1,
          'En difficulté, le Bouclier de Doran aide à tenir.',
        ),
      ],
    },
  ],
  itemOrder: [
    {
      slot: 1,
      default: '6610',
      alternatives: [
        {
          itemId: '3078',
          when: [cond('situation', '==', 'ahead')],
          explain: 'En avance, la Force de la trinité.',
        },
      ],
    },
    {
      slot: 2,
      default: '3047',
      alternatives: [
        {
          itemId: '3111',
          when: [cond('enemyApShare', '>=', 0.6)],
          explain: 'Compo AP : Sandales de Mercure.',
        },
      ],
    },
    {
      slot: 3,
      default: '3071',
      alternatives: [
        {
          itemId: '3065',
          when: [cond('enemyApShare', '>=', 0.6)],
          explain: 'Compo AP : Visage spirituel.',
        },
      ],
    },
    {
      slot: 4,
      default: '3053',
      alternatives: [
        {
          itemId: '3075',
          when: [cond('enemyHealCount', '>=', 2)],
          explain: 'Ils se soignent : Cotte épineuse.',
        },
      ],
    },
    { slot: 5, default: '6333', alternatives: [] },
    {
      slot: 6,
      default: '6694',
      alternatives: [
        {
          itemId: '3742',
          when: [cond('enemyAdShare', '>=', 0.75)],
          explain: 'Compo très AD : Plaque du mort.',
        },
      ],
    },
  ],
}

/** Build de test anti-mage, prévu contre les compos AP et à contrôles. */
export const ANTI_MAGE: Build = {
  ...BRUISER,
  id: 'test-anti-mage',
  name: 'Anti-mage',
  order: 1,
  favorite: false,
  useWhen: [
    when(cond('enemyApShare', '>=', 0.6), 3, 'Leur équipe fait surtout des dégâts magiques.'),
    when(cond('enemyCcCount', '>=', 5), 2, 'Beaucoup de contrôles en face.'),
  ],
  firstItemOptions: [{ itemId: '1054', useWhen: [] }],
  itemOrder: [
    { slot: 1, default: '3111', alternatives: [] },
    { slot: 2, default: '4401', alternatives: [] },
    { slot: 3, default: '3065', alternatives: [] },
  ],
}

/** Build de test pour un autre poste (repli quand aucun build n'existe pour le poste joué). */
export const JUNGLE: Build = {
  ...BRUISER,
  id: 'test-jungle',
  name: 'Jungle',
  position: 'jungle',
  favorite: false,
}

export const TEST_BUILDS = [BRUISER, ANTI_MAGE, JUNGLE]
