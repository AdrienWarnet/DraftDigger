/**
 * Formats bruts de Data Dragon, limités aux champs utilisés par l'app.
 * Les fichiers contiennent d'autres champs, ignorés ici.
 */

export type RawImage = { full: string }

export type RawChampion = {
  id: string // "Yorick"
  key: string // "83"
  name: string
  title: string
  tags: string[] // Fighter, Tank, Mage...
  info: { attack: number; defense: number; magic: number; difficulty: number }
  image: RawImage
}

export type RawItem = {
  name: string
  description?: string // HTML
  colloq?: string // alias de recherche séparés par « ; » (ex : « ;bork;botrk;Blade of the Ruined King »)
  from?: string[]
  into?: string[]
  gold: { base: number; total: number; sell: number; purchasable: boolean }
  tags?: string[]
  maps: Record<string, boolean> // "11" = Faille de l'invocateur
  stats: Record<string, number>
  image: RawImage
  inStore?: boolean
  requiredChampion?: string
  requiredAlly?: string
  depth?: number
}

export type RawRune = {
  id: number
  key: string
  icon: string
  name: string
  shortDesc: string
}

export type RawRuneTree = {
  id: number
  key: string // "Domination"
  icon: string
  name: string
  slots: { runes: RawRune[] }[] // slot 0 = keystones
}

export type RawSummonerSpell = {
  id: string // "SummonerFlash"
  key: string
  name: string
  modes: string[] // "CLASSIC" = Faille de l'invocateur
  image: RawImage
}

/** Les 4 fichiers d'un patch, tels que l'app les garde en cache. */
export type DDragonData = {
  version: string
  champions: Record<string, RawChampion>
  items: Record<string, RawItem>
  runeTrees: RawRuneTree[]
  summonerSpells: Record<string, RawSummonerSpell>
}
