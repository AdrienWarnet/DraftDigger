import { useEffect, useId, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import type { GameCatalog } from '../../data/catalog'
import { filterBuilds, groupBuilds } from '../../engine/buildList'
import { validateBuildAgainstData } from '../../engine/patchValidation'
import { POSITIONS, type Build, type Position } from '../../engine/types'
import { useBuildsStore } from '../../store/buildsStore'
import { BuildView } from '../components/BuildView'
import { BuildEditor } from './BuildEditor'
import { Button } from '../components/Button'
import { ConfirmPanel } from '../components/ConfirmPanel'
import { EmptyState } from '../components/EmptyState'
import { GameIcon } from '../components/GameIcon'
import { Tabs } from '../components/Tabs'
import { useCatalog } from '../data/gameDataContext'
import { POSITION_LABELS } from '../labels'
import { goBack, navigate, useRouteParams } from '../navigation/useRoute'
import styles from './BuildsScreen.module.css'

/**
 * Sous-pages de l'onglet : liste, `#/builds/voir/<id>`, `#/builds/nouveau`,
 * `#/builds/modifier/<id>` (et `/champion` pour le sélecteur de champion de l'éditeur).
 */
export function BuildsScreen() {
  const catalog = useCatalog()
  const status = useBuildsStore((s) => s.status)
  const error = useBuildsStore((s) => s.error)
  const load = useBuildsStore((s) => s.load)
  const params = useRouteParams()
  const [page, id] = params
  const builds = useBuildsStore((s) => s.list.builds)

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'idle' || status === 'loading') {
    return (
      <p className="muted" role="status">
        Chargement des builds…
      </p>
    )
  }
  if (status === 'error') {
    console.error(error)
    return (
      <EmptyState
        title="Builds illisibles"
        description="Le stockage du téléphone est inaccessible. Ferme puis rouvre l'app ; si le problème continue, vérifie l'espace disponible."
      />
    )
  }
  if (page === 'voir' && id) return <BuildDetail id={id} catalog={catalog} />
  if (page === 'nouveau') {
    return <BuildEditor catalog={catalog} existing={null} sheetParams={params.slice(1)} />
  }
  if (page === 'modifier' && id) {
    const existing = builds.find((b) => b.id === id)
    if (!existing) return <BuildDetail id={id} catalog={catalog} />
    return <BuildEditor catalog={catalog} existing={existing} sheetParams={params.slice(2)} />
  }
  return <BuildList catalog={catalog} />
}

type PositionFilter = Position | 'all'

/**
 * Champion déroulé dans la liste (un seul à la fois). Gardé en mémoire hors du composant :
 * il reste ouvert quand on revient de la fiche d'un build.
 */
const useExpandedChampion = create<{ id: string | null; toggle: (id: string) => void }>()(
  (set) => ({
    id: null,
    toggle: (id) => set((s) => ({ id: s.id === id ? null : id })),
  }),
)

function BuildList({ catalog }: { catalog: GameCatalog }) {
  const { builds, invalid } = useBuildsStore((s) => s.list)
  const toggleFavorite = useBuildsStore((s) => s.toggleFavorite)
  const [championFilter, setChampionFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all')

  const championName = (championId: string) =>
    catalog.championsById.get(championId)?.name ?? championId
  const shown = filterBuilds(builds, {
    championId: championFilter || null,
    position: positionFilter === 'all' ? null : positionFilter,
  })
  const groups = groupBuilds(shown, championName)
  const expandedId = useExpandedChampion((s) => s.id)
  const toggleChampion = useExpandedChampion((s) => s.toggle)
  // Un seul champion affiché (un seul en tout, ou filtre sur un champion) : déjà déroulé.
  const isExpanded = (championId: string) => groups.length === 1 || expandedId === championId
  const championsWithBuilds = groupBuilds(builds, championName).map((g) => g.championId)

  return (
    <>
      <Button block onClick={() => navigate('builds', 'nouveau')}>
        Créer un build
      </Button>

      {invalid.length > 0 && (
        <p className={styles.warning} role="status">
          {invalid.length === 1 ? '1 build illisible' : `${invalid.length} builds illisibles`} :{' '}
          {invalid.map((b) => b.name ?? b.id ?? 'sans nom').join(', ')}. Ils sont conservés tels
          quels.
        </p>
      )}

      {builds.length > 1 && (
        <section className={styles.filters} aria-label="Filtres">
          <select
            className={styles.select}
            value={championFilter}
            onChange={(e) => setChampionFilter(e.target.value)}
            aria-label="Filtrer par champion"
          >
            <option value="">Tous les champions</option>
            {championsWithBuilds.map((championId) => (
              <option key={championId} value={championId}>
                {championName(championId)}
              </option>
            ))}
          </select>
          <Tabs<PositionFilter>
            label="Filtrer par poste"
            value={positionFilter}
            onChange={setPositionFilter}
            options={[
              { value: 'all', label: 'Tous' },
              ...POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] })),
            ]}
          />
        </section>
      )}

      {builds.length === 0 ? (
        <EmptyState
          title="Aucun build pour l'instant"
          description="Crée ton premier build : champion, poste, runes, sorts et ordre des items."
        />
      ) : groups.length === 0 ? (
        <p className="muted">Aucun build ne correspond à ces filtres.</p>
      ) : (
        groups.map((group) => (
          <ChampionGroup
            key={group.championId}
            championId={group.championId}
            name={championName(group.championId)}
            catalog={catalog}
            buildCount={group.positions.reduce((n, p) => n + p.builds.length, 0)}
            expanded={isExpanded(group.championId)}
            collapsible={groups.length > 1}
            onToggle={() => toggleChampion(group.championId)}
          >
            {group.positions.map(({ position, builds: positionBuilds }) => (
              <div key={position} className={styles.positionGroup}>
                <h3 className={styles.positionTitle}>{POSITION_LABELS[position]}</h3>
                <ul className={styles.rows}>
                  {positionBuilds.map((build) => (
                    <BuildRow
                      key={build.id}
                      build={build}
                      catalog={catalog}
                      hasIssues={validateBuildAgainstData(build, catalog).length > 0}
                      onToggleFavorite={() => void toggleFavorite(build.id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </ChampionGroup>
        ))
      )}
    </>
  )
}

type ChampionGroupProps = {
  championId: string
  name: string
  catalog: GameCatalog
  buildCount: number
  expanded: boolean
  /** `false` quand c'est le seul champion affiché : toujours déroulé, pas d'en-tête cliquable. */
  collapsible: boolean
  onToggle: () => void
  children: ReactNode
}

/** Un champion de la liste : en-tête qui se déroule pour afficher ses builds par poste. */
function ChampionGroup({
  championId,
  name,
  catalog,
  buildCount,
  expanded,
  collapsible,
  onToggle,
  children,
}: ChampionGroupProps) {
  const contentId = useId()
  const champion = catalog.championsById.get(championId) ?? null
  const icon = (
    <GameIcon
      entry={champion && { name: champion.name, icon: champion.image }}
      fallbackId={championId}
      size={36}
      label=""
    />
  )
  return (
    <section className={styles.group} aria-label={name}>
      <h2 className={styles.championTitle}>
        {collapsible ? (
          <button
            type="button"
            className={styles.championToggle}
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={onToggle}
          >
            {icon}
            <span className={styles.championName}>{name}</span>
            <span className={styles.count}>
              {buildCount} build{buildCount > 1 ? 's' : ''}
            </span>
            <svg
              className={styles.expandIcon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <span className={styles.championStatic}>
            {icon}
            <span className={styles.championName}>{name}</span>
          </span>
        )}
      </h2>
      {expanded && (
        <div id={contentId} className={styles.groupContent}>
          {children}
        </div>
      )}
    </section>
  )
}

type BuildRowProps = {
  build: Build
  catalog: GameCatalog
  hasIssues: boolean
  onToggleFavorite: () => void
}

function BuildRow({ build, catalog, hasIssues, onToggleFavorite }: BuildRowProps) {
  const favorite = build.favorite ?? false
  return (
    <li className={styles.row} data-favorite={favorite || undefined}>
      <button
        type="button"
        className={styles.open}
        onClick={() => navigate('builds', 'voir', build.id)}
        aria-label={`Ouvrir ${build.name}${favorite ? ', favori' : ''}${hasIssues ? ', à revoir pour ce patch' : ''}`}
      >
        <BuildPreviewRunes build={build} catalog={catalog} />
        <span className={styles.summary}>
          <span className={styles.buildName}>{build.name}</span>
          <BuildPreviewItems build={build} catalog={catalog} />
        </span>
        {hasIssues && <span className={styles.badge}>À revoir</span>}
      </button>
      <button
        type="button"
        className={styles.favorite}
        aria-pressed={favorite}
        aria-label={
          favorite ? `${build.name} est ton favori` : `Choisir ${build.name} comme favori`
        }
        onClick={onToggleFavorite}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  )
}

/** Aperçu des runes : rune clé, avec l'arbre secondaire en médaillon. */
function BuildPreviewRunes({ build, catalog }: { build: Build; catalog: GameCatalog }) {
  const keystone = catalog.runesById.get(build.runes.keystone) ?? null
  const secondary = catalog.treesById.get(build.runes.secondaryTree) ?? null
  return (
    <span className={styles.previewRunes} aria-hidden="true">
      <GameIcon entry={keystone} fallbackId={build.runes.keystone} size={40} shape="round" />
      <span className={styles.previewSecondary}>
        <GameIcon
          entry={secondary}
          fallbackId={build.runes.secondaryTree}
          size={18}
          shape="round"
        />
      </span>
    </span>
  )
}

/** Aperçu des 3 premiers items du build (le cœur du build). */
function BuildPreviewItems({ build, catalog }: { build: Build; catalog: GameCatalog }) {
  const core = [...build.itemOrder].sort((a, b) => a.slot - b.slot).slice(0, 3)
  return (
    <span className={styles.previewItems} aria-hidden="true">
      {core.map((slot) => {
        const item = catalog.itemsById.get(slot.default)
        return (
          <GameIcon
            key={slot.slot}
            entry={item ? { name: item.name, icon: item.image } : null}
            fallbackId={slot.default}
            size={22}
          />
        )
      })}
    </span>
  )
}

function BuildDetail({ id, catalog }: { id: string; catalog: GameCatalog }) {
  const build = useBuildsStore((s) => s.list.builds.find((b) => b.id === id))
  const duplicate = useBuildsStore((s) => s.duplicate)
  const remove = useBuildsStore((s) => s.remove)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!build) {
    return (
      <EmptyState
        title="Build introuvable"
        description="Ce build a peut-être été supprimé."
        action={<Button onClick={() => goBack('builds')}>Retour à mes builds</Button>}
      />
    )
  }

  return (
    <>
      <Button variant="ghost" className={styles.back} onClick={() => goBack('builds')}>
        Retour à mes builds
      </Button>
      <Button block onClick={() => navigate('builds', 'modifier', build.id)}>
        Modifier
      </Button>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={async () => {
            const copy = await duplicate(build.id)
            if (copy) window.location.replace(`#/builds/voir/${encodeURIComponent(copy.id)}`)
          }}
        >
          Dupliquer
        </Button>
        <Button variant="secondary" onClick={() => setConfirmingDelete(true)}>
          Supprimer
        </Button>
      </div>
      {confirmingDelete && (
        <ConfirmPanel
          message={`Supprimer « ${build.name} » ? Cette action est définitive.`}
          confirmLabel="Supprimer"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await remove(build.id)
            goBack('builds')
          }}
        />
      )}
      <BuildView
        build={build}
        catalog={catalog}
        issues={validateBuildAgainstData(build, catalog)}
      />
    </>
  )
}
