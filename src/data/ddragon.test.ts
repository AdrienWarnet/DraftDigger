import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DDRAGON_CACHE_KEY,
  DDragonError,
  ddragonUrls,
  loadDDragon,
  type DDragonDeps,
  type KeyValueStorage,
} from './ddragon'

// --- Faux Data Dragon -------------------------------------------------------

type FakeServer = { latest: string; offline: boolean; failingFiles: string[] }

function patchFiles(version: string): Record<string, unknown> {
  return {
    [ddragonUrls.data(version, 'champion')]: {
      data: { Yorick: { id: 'Yorick', name: 'Yorick', patch: version } },
    },
    [ddragonUrls.data(version, 'item')]: { data: { '3065': { name: 'Visage spirituel' } } },
    [ddragonUrls.data(version, 'runesReforged')]: [{ id: 8100, key: 'Domination', slots: [] }],
    [ddragonUrls.data(version, 'summoner')]: { data: { SummonerFlash: { id: 'SummonerFlash' } } },
    [ddragonUrls.data(version, 'item', 'en_US')]: {
      data: { '3065': { name: 'Spirit Visage', colloq: 'sv', description: '…' } },
    },
  }
}

function createFetch(server: FakeServer) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input)
    if (server.offline) throw new TypeError('Failed to fetch')
    if (server.failingFiles.some((f) => url.includes(f))) {
      return new Response('erreur', { status: 500 })
    }
    if (url === ddragonUrls.versions()) {
      return Response.json([server.latest, '0.0.1'])
    }
    const body = patchFiles(server.latest)[url]
    return body === undefined ? new Response('', { status: 404 }) : Response.json(body)
  })
}

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

function setup(overrides: Partial<FakeServer> = {}) {
  const server: FakeServer = { latest: '16.22.1', offline: false, failingFiles: [], ...overrides }
  const fetch = createFetch(server)
  const storage = new MemoryStorage()
  const deps: DDragonDeps = { fetch: fetch as unknown as typeof globalThis.fetch, storage }
  return { server, fetch, storage, deps }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// --- Tests --------------------------------------------------------------------

describe('loadDDragon', () => {
  it('noms anglais indisponibles : le chargement réussit quand même', async () => {
    const { deps } = setup({ failingFiles: ['/en_US/'] })
    const result = await loadDDragon(deps)
    expect(result.source).toBe('network')
    expect(result.data.itemNamesEn).toEqual({})
  })

  it('1er lancement : télécharge la version, les 4 fichiers en fr_FR et les noms anglais des items, et les met en cache', async () => {
    const { fetch, storage, deps } = setup()

    const result = await loadDDragon(deps)

    expect(result.source).toBe('network')
    expect(result.stale).toBe(false)
    expect(result.data.version).toBe('16.22.1')
    expect(Object.keys(result.data.champions)).toEqual(['Yorick'])
    expect(result.data.runeTrees).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(6)
    const urls = fetch.mock.calls.map(([url]) => String(url))
    expect(urls).toContain(ddragonUrls.versions())
    expect(urls.filter((u) => u.includes('/16.22.1/data/fr_FR/'))).toHaveLength(4)
    // Noms anglais des items : seulement le nom et les surnoms, pour la recherche.
    expect(result.data.itemNamesEn).toEqual({ '3065': { name: 'Spirit Visage', colloq: 'sv' } })
    expect(storage.getItem(DDRAGON_CACHE_KEY)).toContain('16.22.1')
  })

  it('2e lancement, même version : aucune requête pour les fichiers JSON', async () => {
    const { fetch, deps } = setup()
    await loadDDragon(deps)
    fetch.mockClear()

    const result = await loadDDragon(deps)

    expect(result.source).toBe('cache')
    expect(result.stale).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(fetch.mock.calls[0]?.[0])).toBe(ddragonUrls.versions())
  })

  it('nouveau patch : recharge les fichiers et remplace le cache', async () => {
    const { server, fetch, storage, deps } = setup()
    await loadDDragon(deps)
    server.latest = '16.23.1'
    fetch.mockClear()

    const result = await loadDDragon(deps)

    expect(result.source).toBe('network')
    expect(result.data.version).toBe('16.23.1')
    expect(fetch).toHaveBeenCalledTimes(6)
    expect(storage.getItem(DDRAGON_CACHE_KEY)).toContain('16.23.1')
    expect(storage.getItem(DDRAGON_CACHE_KEY)).not.toContain('16.22.1')
  })

  it('hors ligne avec cache : renvoie le cache marqué comme possiblement ancien', async () => {
    const { server, deps } = setup()
    await loadDDragon(deps)
    server.offline = true

    const result = await loadDDragon(deps)

    expect(result).toMatchObject({ source: 'cache', stale: true })
    expect(result.data.version).toBe('16.22.1')
  })

  it('hors ligne sans cache : lève une DDragonError', async () => {
    const { deps } = setup({ offline: true })
    await expect(loadDDragon(deps)).rejects.toBeInstanceOf(DDragonError)
  })

  it('nouveau patch mais un fichier échoue : garde l’ancien cache', async () => {
    const { server, storage, deps } = setup()
    await loadDDragon(deps)
    server.latest = '16.23.1'
    server.failingFiles = ['item.json']

    const result = await loadDDragon(deps)

    expect(result).toMatchObject({ source: 'cache', stale: true })
    expect(result.data.version).toBe('16.22.1')
    expect(storage.getItem(DDRAGON_CACHE_KEY)).toContain('16.22.1')
  })

  it('1er lancement et un fichier en erreur HTTP : lève une DDragonError', async () => {
    const { deps } = setup({ failingFiles: ['champion.json'] })
    await expect(loadDDragon(deps)).rejects.toBeInstanceOf(DDragonError)
  })

  it('cache corrompu : l’ignore et recharge depuis le réseau', async () => {
    const { fetch, storage, deps } = setup()
    storage.setItem(DDRAGON_CACHE_KEY, '{pas du json')

    const result = await loadDDragon(deps)

    expect(result.source).toBe('network')
    expect(fetch).toHaveBeenCalledTimes(6)
  })

  it('cache d’un ancien format : l’ignore', async () => {
    const { fetch, storage, deps } = setup()
    storage.setItem(DDRAGON_CACHE_KEY, JSON.stringify({ format: 0, data: { version: '16.22.1' } }))

    await loadDDragon(deps)

    expect(fetch).toHaveBeenCalledTimes(6)
  })

  it('stockage plein : renvoie quand même les données', async () => {
    const { deps, storage } = setup()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }

    const result = await loadDDragon(deps)

    expect(result.source).toBe('network')
    expect(console.warn).toHaveBeenCalled()
  })

  it('sans stockage disponible : fonctionne depuis le réseau', async () => {
    const { deps } = setup()
    const result = await loadDDragon({ ...deps, storage: null })
    expect(result.source).toBe('network')
  })

  it('liste des versions invalide et pas de cache : lève une DDragonError', async () => {
    const fetch = vi.fn(async () => Response.json({ pas: 'un tableau' }))
    const deps: DDragonDeps = {
      fetch: fetch as unknown as typeof globalThis.fetch,
      storage: new MemoryStorage(),
    }
    await expect(loadDDragon(deps)).rejects.toBeInstanceOf(DDragonError)
  })

  it('réseau trop lent : abandonne après le délai et utilise le cache', async () => {
    const { deps } = setup()
    await loadDDragon(deps)
    const hangingFetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('abort', 'AbortError')),
          )
        }),
    )

    const result = await loadDDragon({
      ...deps,
      fetch: hangingFetch as unknown as typeof globalThis.fetch,
      timeoutMs: 20,
    })

    expect(result).toMatchObject({ source: 'cache', stale: true })
  })
})

describe('ddragonUrls', () => {
  it('construit les URLs d’images', () => {
    expect(ddragonUrls.championImage('16.22.1', 'Yorick.png')).toBe(
      'https://ddragon.leagueoflegends.com/cdn/16.22.1/img/champion/Yorick.png',
    )
    expect(ddragonUrls.itemImage('16.22.1', '3065.png')).toBe(
      'https://ddragon.leagueoflegends.com/cdn/16.22.1/img/item/3065.png',
    )
    expect(ddragonUrls.runeIcon('perk-images/Styles/7200_Domination.png')).toBe(
      'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7200_Domination.png',
    )
  })
})
