import { describe, expect, it, vi } from 'vitest'
import shardsJson from '../../data/defaults/rune-shards.json'
import fixture from './__fixtures__/runes-16.22.1.json'
import type { RawRuneTree, RawSummonerSpell } from './ddragonTypes'
import { buildRuneCatalog, parseShardRows } from './runes'

const catalog = buildRuneCatalog({
  version: fixture.version,
  runeTrees: fixture.runeTrees as RawRuneTree[],
  summonerSpells: fixture.summonerSpells as Record<string, RawSummonerSpell>,
})

describe('buildRuneCatalog (patch 16.22.1)', () => {
  it('5 arbres, chacun avec une ligne de runes clés et 3 lignes mineures', () => {
    expect(catalog.trees.map((t) => t.name)).toEqual([
      'Domination',
      'Inspiration',
      'Précision',
      'Volonté',
      'Sorcellerie',
    ])
    for (const tree of catalog.trees) expect(tree.rows).toHaveLength(4)
  })

  it('retrouve une rune par id avec son arbre, sa ligne et son icône', () => {
    expect(catalog.runesById.get('8437')).toEqual({
      id: '8437',
      name: "Poigne de l'immortel",
      icon: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png',
      treeId: '8400',
      row: 0,
    })
    expect(catalog.treesById.get('8400')?.name).toBe('Volonté')
  })

  it('garde uniquement les sorts de la Faille', () => {
    // Les 9 sorts de la Faille, triés par nom français (Barrière, Châtiment… Téléportation).
    expect(catalog.summonerSpells.map((s) => s.id)).toEqual([
      'SummonerBarrier',
      'SummonerSmite',
      'SummonerDot',
      'SummonerHaste',
      'SummonerExhaust',
      'SummonerBoost',
      'SummonerFlash',
      'SummonerHeal',
      'SummonerTeleport',
    ])
    expect(catalog.summonerSpellsById.get('SummonerSnowball')).toBeUndefined()
    expect(catalog.summonerSpellsById.get('SummonerFlash')?.icon).toBe(
      'https://ddragon.leagueoflegends.com/cdn/16.22.1/img/spell/SummonerFlash.png',
    )
  })

  it('fragments : 3 lignes de 3, issues de data/defaults/rune-shards.json', () => {
    expect(catalog.shardRows.map((r) => r.label)).toEqual(['Attaque', 'Flexible', 'Défense'])
    for (const row of catalog.shardRows) expect(row.shards).toHaveLength(3)
    expect(catalog.shardsById.get('5011')?.name).toBe('PV')
  })
})

describe('parseShardRows', () => {
  it('le fichier livré est valide (aucun avertissement)', () => {
    const warn = vi.fn()
    parseShardRows(shardsJson, warn)
    expect(warn).not.toHaveBeenCalled()
  })

  it('fichier ou ligne invalide : avertissement, pas de crash', () => {
    const warn = vi.fn()
    expect(parseShardRows({}, warn)).toEqual([])
    expect(parseShardRows({ rows: [{ label: 3 }] }, warn)).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
  })
})
