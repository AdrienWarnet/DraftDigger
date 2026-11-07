import { useMemo } from 'react'
import { INVENTORY } from '../../engine/config'
import { enemyLayout } from '../../engine/draft'
import { POSITIONS, type Position, type Situation } from '../../engine/types'
import { nextItemFallbackReason } from '../../engine/explain'
import { buildSuggestions, componentTarget } from '../../engine/inventory'
import { useDraftStore } from '../../store/draftStore'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { EnemySheet } from '../components/EnemySheet'
import { GameIcon } from '../components/GameIcon'
import { ItemPicker } from '../components/ItemPicker'
import { Sheet } from '../components/Sheet'
import { Tabs, type TabOption } from '../components/Tabs'
import { useCatalog } from '../data/gameDataContext'
import { useGameRecommendation, usePreGameRecommendation } from '../data/useRecommendation'
import { POSITION_LABELS, SITUATION_LABELS } from '../labels'
import { goBack, navigate, useRouteParams } from '../navigation/useRoute'
import styles from './GameScreen.module.css'

const SITUATION_OPTIONS: TabOption<Situation>[] = [
  { value: 'ahead', label: SITUATION_LABELS.ahead, tone: 'ahead' },
  { value: 'even', label: SITUATION_LABELS.even, tone: 'even' },
  { value: 'behind', label: SITUATION_LABELS.behind, tone: 'behind' },
]

const ADD_PARAM = 'ajouter'
const ITEM_PARAM = 'item'
const ENEMY_PARAM = 'ennemi'

/** Panneau ouvert d'après l'URL : `#/partie/ajouter`, `#/partie/item/2` ou `#/partie/ennemi/mid`. */
function parseSheet(params: readonly string[], ownedCount: number) {
  const position = POSITIONS.find((p) => p === params[1])
  if (params[0] === ENEMY_PARAM && position) return { kind: 'enemy', position } as const
  if (params[0] === ADD_PARAM && ownedCount < INVENTORY.maxItems) return { kind: 'add' } as const
  if (params[0] === ITEM_PARAM) {
    const index = Number(params[1])
    if (Number.isInteger(index) && index >= 0 && index < ownedCount) {
      return { kind: 'item', index } as const
    }
  }
  return null
}

export function GameScreen() {
  const catalog = useCatalog()
  const result = usePreGameRecommendation()
  const owned = useDraftStore((s) => s.ownedItemIds)
  const buy = useDraftStore((s) => s.buyItem)
  const remove = useDraftStore((s) => s.removeItem)
  const replace = useDraftStore((s) => s.replaceItem)
  const situation = useDraftStore((s) => s.situation)
  const setSituation = useDraftStore((s) => s.setSituation)
  const sheet = parseSheet(useRouteParams(), owned.length)
  const next = useGameRecommendation(result, owned, situation)
  const draft = useDraftStore((s) => s.draft)

  const build =
    result.status === 'ready' && result.build.kind === 'ok'
      ? result.build.recommendation.choice
      : null
  const suggestions = useMemo(
    () => (build ? buildSuggestions(build, owned, catalog.itemsById) : []),
    [build, owned, catalog.itemsById],
  )

  if (result.status === 'loading') {
    return (
      <p className="muted" role="status">
        Chargement de tes builds…
      </p>
    )
  }

  if (result.status === 'noChampion') {
    return (
      <EmptyState
        title="Aucune partie en cours"
        description="Choisis ton poste et ton champion dans la draft pour suivre tes achats et savoir quoi acheter ensuite."
        action={
          <Button variant="secondary" onClick={() => navigate('draft')}>
            Remplir la draft
          </Button>
        }
      />
    )
  }

  const closeSheet = () => goBack('partie')
  const itemName = (id: string) => catalog.itemsById.get(id)?.name ?? id
  const emptySlots = INVENTORY.maxItems - owned.length

  return (
    <>
      <div className={styles.situation}>
        <Tabs
          label="Ta situation dans la partie"
          options={SITUATION_OPTIONS}
          value={situation}
          onChange={setSituation}
        />
      </div>

      <p className="muted">
        {build
          ? `Build : ${build.name}`
          : `Aucun build pour ce champion : les achats sont notés sans suggestion.`}
      </p>

      {next && (
        <section className={styles.nextCard} aria-label="Prochain item">
          {next.recommendation ? (
            <>
              <div className={styles.next}>
                <GameIcon
                  entry={{
                    name: next.recommendation.choice.name,
                    icon: next.recommendation.choice.image,
                  }}
                  size={48}
                  label=""
                />
                <div className={styles.nextText}>
                  <p className={styles.nextLabel}>
                    Prochain item ·{' '}
                    {next.slot !== null ? `n° ${next.slot} du build` : 'de situation'}
                  </p>
                  <p className={styles.nextName}>{next.recommendation.choice.name}</p>
                </div>
              </div>
              <ul className={styles.reasons}>
                {(next.recommendation.reasons.length > 0
                  ? next.recommendation.reasons
                  : [nextItemFallbackReason(next.slot, next.categories)]
                ).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {next.componentsOwned.length > 0 && (
                <p className={styles.nextMeta}>
                  Déjà : {next.componentsOwned.map(itemName).join(', ')}.
                </p>
              )}
              {next.recommendation.alternatives[0] && (
                <p className={`${styles.nextMeta} ${styles.alternative}`}>
                  <GameIcon
                    entry={{
                      name: next.recommendation.alternatives[0].choice.name,
                      icon: next.recommendation.alternatives[0].choice.image,
                    }}
                    size={28}
                    label=""
                  />
                  Autre choix : {next.recommendation.alternatives[0].choice.name}
                </p>
              )}
            </>
          ) : (
            <p className="muted">Aucun item à proposer pour l’instant.</p>
          )}
        </section>
      )}

      <Card title={`Mes items (${owned.length}/${INVENTORY.maxItems})`}>
        <ul className={styles.inventory}>
          {owned.map((id, index) => {
            const item = catalog.itemsById.get(id)
            const target = build ? componentTarget(id, build, owned, catalog.itemsById) : null
            return (
              <li key={`${index}-${id}`}>
                <button
                  type="button"
                  className={styles.slot}
                  onClick={() => navigate('partie', ITEM_PARAM, String(index))}
                  aria-label={`${itemName(id)}${target ? `, vers ${itemName(target)}` : ''} : modifier`}
                >
                  <GameIcon
                    entry={item ? { name: item.name, icon: item.image } : null}
                    fallbackId={id}
                    size={48}
                    label=""
                  />
                  <span className={styles.name}>{itemName(id)}</span>
                  {target && <span className={styles.progress}>→ {itemName(target)}</span>}
                </button>
              </li>
            )
          })}
          {Array.from({ length: emptySlots }, (_, i) => (
            <li key={`vide-${i}`}>
              <button
                type="button"
                className={styles.slot}
                data-empty
                onClick={() => navigate('partie', ADD_PARAM)}
                aria-label="Ajouter un item acheté"
              >
                <span className={styles.plus} aria-hidden="true">
                  +
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          {owned.length === 0
            ? 'Touche « + » à chaque achat. Les composants sont remplacés automatiquement quand tu achètes l’item complet.'
            : 'Touche un item pour le changer ou le retirer (vendu).'}
        </p>
      </Card>

      <EnemyStrip
        layout={enemyLayout(draft, catalog.positionRates)}
        enemies={draft.enemies.map((e) => e.championId)}
        playerPosition={draft.playerPosition}
      />

      {sheet?.kind === 'enemy' && <EnemySheet target={sheet.position} onClose={closeSheet} />}
      {sheet?.kind === 'add' && (
        <Sheet title="Item acheté" onClose={closeSheet}>
          <ItemPicker
            items={catalog.items}
            suggestedIds={suggestions}
            suggestedLabel="Ton build"
            autoFocus={false}
            onSelect={(item) => {
              buy(item.id, catalog.itemsById)
              closeSheet()
            }}
          />
        </Sheet>
      )}
      {sheet?.kind === 'item' && (
        <Sheet
          title={`Remplacer ${itemName(owned[sheet.index] ?? '')}`}
          onClose={closeSheet}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                remove(sheet.index)
                closeSheet()
              }}
            >
              Retirer
            </Button>
          }
        >
          <ItemPicker
            items={catalog.items}
            suggestedIds={suggestions}
            suggestedLabel="Ton build"
            autoFocus={false}
            onSelect={(item) => {
              replace(sheet.index, item.id)
              closeSheet()
            }}
          />
        </Sheet>
      )}
    </>
  )
}

/**
 * Les 5 ennemis par poste, toujours modifiables pendant la partie (T6.4) : un tap ouvre le
 * panneau pour changer le champion ou corriger son poste. Le vis-à-vis est entouré de rouge.
 */
function EnemyStrip({
  layout,
  enemies,
  playerPosition,
}: {
  layout: Record<Position, number | null>
  enemies: readonly string[]
  playerPosition: Position
}) {
  const { championsById } = useCatalog()
  const opponentIndex = layout[playerPosition]
  const opponentId = opponentIndex === null ? null : enemies[opponentIndex]
  const opponent = opponentId ? (championsById.get(opponentId)?.name ?? opponentId) : null
  // Résumé visible fermé : nombre d'ennemis et vis-à-vis.
  const summary = `${enemies.length}/5${opponent ? ` · vis-à-vis : ${opponent}` : ''}`
  return (
    <details className={styles.enemies} aria-labelledby="partie-ennemis">
      <summary className={styles.enemiesHeader}>
        <span id="partie-ennemis" className={styles.enemiesTitle}>
          Équipe ennemie
        </span>
        <span className={styles.enemiesHint}>{summary}</span>
      </summary>
      <p className={styles.enemiesHint}>Reprise de ta draft · touche un ennemi pour le modifier.</p>
      <ul className={styles.enemyList}>
        {POSITIONS.map((position) => {
          const index = layout[position]
          const id = index === null ? null : (enemies[index] ?? null)
          const champion = id ? (championsById.get(id) ?? null) : null
          const label = POSITION_LABELS[position]
          const opponent = position === playerPosition
          return (
            <li key={position}>
              <button
                type="button"
                className={styles.enemy}
                data-opponent={opponent || undefined}
                onClick={() => navigate('partie', ENEMY_PARAM, position)}
                aria-label={`${opponent ? 'Ton vis-à-vis' : 'Ennemi'} ${label} : ${
                  id ? `${champion?.name ?? id}, modifier` : 'ajouter'
                }`}
              >
                {id ? (
                  <GameIcon
                    entry={champion ? { name: champion.name, icon: champion.image } : null}
                    fallbackId={id}
                    size={40}
                    shape="round"
                    label=""
                  />
                ) : (
                  <span className={styles.enemyEmpty} aria-hidden="true">
                    +
                  </span>
                )}
                <span className={styles.enemyPosition}>{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
