import { useMemo, useState } from 'react'
import { INVENTORY } from '../../engine/config'
import { enemyLayout } from '../../engine/draft'
import { POSITIONS, type Position, type Situation } from '../../engine/types'
import { nextItemFallbackReason } from '../../engine/explain'
import {
  buildSuggestions,
  componentTarget,
  freeSlots,
  questSlotItemIndex,
} from '../../engine/inventory'
import { activeQuestEffects } from '../../engine/roleQuests'
import { gameSnapshotText } from '../../engine/testNotes'
import { ROLE_QUESTS } from '../../data/roleQuests'
import { useDraftStore } from '../../store/draftStore'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { EnemySheet } from '../components/EnemySheet'
import { GameIcon } from '../components/GameIcon'
import { ItemPicker } from '../components/ItemPicker'
import { Sheet } from '../components/Sheet'
import { Tabs, type TabOption } from '../components/Tabs'
import { useCatalog } from '../data/gameDataContext'
import {
  useGameRecommendation,
  usePreGameRecommendation,
  type GameRecommendation,
} from '../data/useRecommendation'
import { POSITION_LABELS, SITUATION_LABELS } from '../labels'
import { goBack, navigate, useRouteParams } from '../navigation/useRoute'
import { useWakeLock } from '../useWakeLock'
import styles from './GameScreen.module.css'
import { NotesSheet } from './NotesSheet'

const SITUATION_OPTIONS: TabOption<Situation>[] = [
  { value: 'ahead', label: SITUATION_LABELS.ahead, tone: 'ahead' },
  { value: 'even', label: SITUATION_LABELS.even, tone: 'even' },
  { value: 'behind', label: SITUATION_LABELS.behind, tone: 'behind' },
]

const ADD_PARAM = 'ajouter'
const ITEM_PARAM = 'item'
const ENEMY_PARAM = 'ennemi'
/** Notes de test (T7.1), ouvertes depuis le lien « Notes » de l'en-tête. */
const NOTES_PARAM = 'notes'

/** Panneau ouvert d'après l'URL : `#/partie/ajouter`, `#/partie/item/2` ou `#/partie/ennemi/mid`. */
function parseSheet(params: readonly string[], ownedCount: number, canAdd: boolean) {
  if (params[0] === NOTES_PARAM) return { kind: 'notes' } as const
  const position = POSITIONS.find((p) => p === params[1])
  if (params[0] === ENEMY_PARAM && position) return { kind: 'enemy', position } as const
  if (params[0] === ADD_PARAM && canAdd) return { kind: 'add' } as const
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
  const draft = useDraftStore((s) => s.draft)
  const questCompleted = useDraftStore((s) => s.questCompleted)
  const setQuestCompleted = useDraftStore((s) => s.setQuestCompleted)
  // Quête de rôle du poste joué (epic 8) : ses effets ne s'appliquent qu'une fois terminée.
  const quest = ROLE_QUESTS?.quests[draft.playerPosition] ?? null
  const questEffects = activeQuestEffects(ROLE_QUESTS, draft.playerPosition, questCompleted)
  const questIndex = questSlotItemIndex(owned, catalog.itemsById, questEffects)
  const free = Math.max(0, freeSlots(owned, catalog.itemsById, questEffects))
  const questSlotShown = Boolean(questEffects.dedicatedSlot)
  const questSlotFree = questSlotShown && questIndex === null
  const sheet = parseSheet(useRouteParams(), owned.length, free > 0 || questSlotFree)
  const next = useGameRecommendation(result, owned, situation, questEffects)
  // Pendant la partie, l'écran reste allumé (le téléphone est posé à côté du clavier).
  useWakeLock(result.status === 'ready')

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
  const itemCell = (id: string, index: number, inQuestSlot = false) => {
    const item = catalog.itemsById.get(id)
    const target = build ? componentTarget(id, build, owned, catalog.itemsById) : null
    const where = inQuestSlot ? ', emplacement de quête' : ''
    return (
      <li key={`${index}-${id}`}>
        <button
          type="button"
          className={styles.slot}
          data-quest={inQuestSlot || undefined}
          onClick={() => navigate('partie', ITEM_PARAM, String(index))}
          aria-label={`${itemName(id)}${target ? `, vers ${itemName(target)}` : ''}${where} : modifier`}
          title={target ? `${itemName(id)} → ${itemName(target)}` : itemName(id)}
        >
          <GameIcon
            entry={item ? { name: item.name, icon: item.image } : null}
            fallbackId={id}
            size={40}
            label=""
          />
          {target && (
            <span className={styles.progress} aria-hidden="true">
              →
            </span>
          )}
        </button>
      </li>
    )
  }
  const emptyCell = (key: string, inQuestSlot = false) => (
    <li key={key}>
      <button
        type="button"
        className={styles.slot}
        data-empty
        data-quest={inQuestSlot || undefined}
        onClick={() => navigate('partie', ADD_PARAM)}
        aria-label={
          inQuestSlot ? 'Ajouter des bottes (emplacement de quête)' : 'Ajouter un item acheté'
        }
      >
        <span className={styles.plus} aria-hidden="true">
          +
        </span>
      </button>
    </li>
  )

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

      {!build && (
        <p className="muted">
          Aucun build pour ce champion : les achats sont notés sans suggestion.
        </p>
      )}

      {next && <NextItemCard next={next} itemName={itemName} />}

      <section className={styles.items} aria-labelledby="partie-items">
        <div className={styles.itemsHeader}>
          <h2 id="partie-items" className={styles.itemsTitle}>
            Mes items {INVENTORY.maxItems - free}/{INVENTORY.maxItems}
          </h2>
          {questSlotShown ? (
            // Emplacement de quête (ex : les bottes, quête Bot) : à côté de l'interrupteur.
            <ul className={styles.questSlot} aria-label="Emplacement de quête">
              {questIndex === null
                ? emptyCell('quete', true)
                : itemCell(owned[questIndex]!, questIndex, true)}
            </ul>
          ) : (
            build && <span className={styles.buildName}>{build.name}</span>
          )}
          {quest && (
            <button
              type="button"
              className={styles.questToggle}
              aria-pressed={questCompleted}
              aria-label={`Quête de rôle ${POSITION_LABELS[draft.playerPosition]} terminée`}
              title={quest.reward}
              onClick={() => setQuestCompleted(!questCompleted)}
            >
              Quête
            </button>
          )}
        </div>
        <ul className={styles.inventory}>
          {owned.map((id, index) => (index === questIndex ? null : itemCell(id, index)))}
          {Array.from({ length: free }, (_, i) => emptyCell(`vide-${i}`))}
        </ul>
        {questCompleted && quest && !questSlotShown ? (
          <p className={styles.questReward}>
            Quête {POSITION_LABELS[draft.playerPosition]} : {quest.reward}
          </p>
        ) : (
          owned.length === 0 && (
            <p className={styles.hint}>Touche « + » à chaque achat, un item pour le changer.</p>
          )
        )}
      </section>

      <EnemyStrip
        layout={enemyLayout(draft, catalog.positionRates)}
        enemies={draft.enemies.map((e) => e.championId)}
        playerPosition={draft.playerPosition}
      />

      {sheet?.kind === 'notes' && (
        <NotesSheet
          onClose={closeSheet}
          snapshot={() => {
            const championName = (id: string) => catalog.championsById.get(id)?.name ?? id
            const layout = enemyLayout(draft, catalog.positionRates)
            const player = result.championId
            return gameSnapshotText({
              now: new Date(),
              player: `${championName(player)} (${POSITION_LABELS[draft.playerPosition]})`,
              situation: SITUATION_LABELS[situation],
              enemies: POSITIONS.flatMap((p) => {
                const index = layout[p]
                const enemy = index === null ? undefined : draft.enemies[index]
                return enemy ? [`${POSITION_LABELS[p]} ${championName(enemy.championId)}`] : []
              }),
              items: owned.map(itemName),
              nextItem: next?.recommendation?.choice.name ?? null,
              alternative: next?.recommendation?.alternatives[0]?.choice.name ?? null,
            })
          }}
        />
      )}
      {sheet?.kind === 'enemy' && <EnemySheet target={sheet.position} onClose={closeSheet} />}
      {sheet?.kind === 'add' && (
        <Sheet title="Item acheté" onClose={closeSheet}>
          <ItemPicker
            items={catalog.items}
            suggestedIds={suggestions}
            suggestedLabel="Ton build"
            autoFocus={false}
            onSelect={(item) => {
              buy(item.id, catalog.itemsById, questEffects)
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

/**
 * Prochain item, lisible à bout de bras (T6.5) : nom en grand, une raison sur une ligne.
 * Un tap sur la raison affiche toutes les raisons.
 */
function NextItemCard({
  next,
  itemName,
}: {
  next: GameRecommendation
  itemName: (id: string) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const recommendation = next.recommendation
  if (!recommendation) {
    return (
      <section className={styles.nextCard} aria-label="Prochain item">
        <p className="muted">Aucun item à proposer pour l’instant.</p>
      </section>
    )
  }
  const reasons =
    recommendation.reasons.length > 0
      ? recommendation.reasons
      : [nextItemFallbackReason(next.slot, next.categories)]
  const alternative = recommendation.alternatives[0]
  return (
    <section className={styles.nextCard} aria-label="Prochain item">
      <div className={styles.next}>
        <GameIcon
          entry={{ name: recommendation.choice.name, icon: recommendation.choice.image }}
          size={64}
          label=""
        />
        <div className={styles.nextText}>
          <p className={styles.nextLabel}>
            Prochain item · {next.slot !== null ? `n° ${next.slot} du build` : 'de situation'}
          </p>
          <p className={styles.nextName}>{recommendation.choice.name}</p>
        </div>
      </div>
      <button
        type="button"
        className={styles.reasons}
        data-expanded={expanded || undefined}
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
      >
        {(expanded ? reasons : reasons.slice(0, 1)).map((reason) => (
          <span key={reason} className={styles.reason}>
            {reason}
          </span>
        ))}
        {!expanded && reasons.length > 1 && (
          <span className={styles.more}>
            +{reasons.length - 1} raison{reasons.length > 2 ? 's' : ''}
          </span>
        )}
      </button>
      {(alternative || next.componentsOwned.length > 0) && (
        <p className={styles.nextMeta}>
          {alternative && (
            <>
              <GameIcon
                entry={{ name: alternative.choice.name, icon: alternative.choice.image }}
                size={28}
                label=""
              />
              <span>ou {alternative.choice.name}</span>
            </>
          )}
          {next.componentsOwned.length > 0 && (
            <span className={styles.owned}>
              Déjà : {next.componentsOwned.map(itemName).join(', ')}
            </span>
          )}
        </p>
      )}
    </section>
  )
}
