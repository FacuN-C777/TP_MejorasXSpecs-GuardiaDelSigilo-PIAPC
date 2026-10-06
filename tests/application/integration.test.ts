import { describe, expect, it } from 'vitest'
import type {
  GuardEvent,
  GuardState,
  TransitionCause,
} from '../../src/domain/behavior/guardFsm'
import { alertsForTransitions } from '../../src/application/simulation/alertFeedback'
import { escapeForTransitions } from '../../src/application/simulation/escapeFeedback'
import type { BehaviorTransition } from '../../src/application/simulation/behaviorSimulation'
import {
  ESCAPE_NEAR_DISTANCE,
  GUARD_START,
  TILE_SIZE,
} from '../../src/application/simulation/labLevel'

function t(
  previousState: GuardState,
  newState: GuardState,
  event: GuardEvent,
  cause: TransitionCause,
  timeMs: number
): BehaviorTransition {
  return {
    timeMs,
    previousState,
    event,
    newState,
    cause,
  }
}

describe('integration: full cycle across all improvements', () => {
  it('captures alerts and escape for near-miss across improvements', () => {
    const guardPos = { x: GUARD_START.x * TILE_SIZE, y: GUARD_START.y * TILE_SIZE }
    const targetNear = { x: guardPos.x + ESCAPE_NEAR_DISTANCE, y: guardPos.y }

    const transitions: BehaviorTransition[] = [
      t('PATROL', 'INVESTIGATE', 'sound-heard', 'sonido', 100),
      t('INVESTIGATE', 'PURSUE', 'vision-valid', 'vision', 200),
      t('PURSUE', 'SEARCH', 'vision-lost', 'perdida de vision', 300),
      t('SEARCH', 'RETURN', 'search-exhausted', 'busqueda agotada', 400 + 5000),
      t('RETURN', 'PATROL', 'patrol-advance', 'llegada patrulla', 500 + 6000),
    ]

    const alertList = alertsForTransitions(transitions)
    expect(alertList.length).toBeGreaterThanOrEqual(1)

    const escape = escapeForTransitions(transitions, guardPos, targetNear, ESCAPE_NEAR_DISTANCE)
    expect(escape).not.toBeNull()
  })
})
