import { evaluateEscape } from "../../domain/behavior/escapeMoment";
import { distanceBetween, type Vector2 } from "../../domain/model/vector";
import type { BehaviorTransition } from "./behaviorSimulation";

export interface EscapeFeedback {
  readonly timeMs: number;
  readonly distance: number;
  readonly nearDistance: number;
}

export function escapeForTransitions(
  transitions: readonly BehaviorTransition[],
  guardPosition: Vector2,
  playerPosition: Vector2,
  nearDistance: number,
): EscapeFeedback | null {
  if (transitions.length === 0) {
    return null;
  }

  const distance = distanceBetween(guardPosition, playerPosition);

  for (const transition of transitions) {
    const escape = evaluateEscape({
      previousState: transition.previousState,
      newState: transition.newState,
      distance,
      nearDistance,
    });
    if (escape) {
      return {
        timeMs: transition.timeMs,
        distance: escape.distance,
        nearDistance: escape.nearDistance,
      };
    }
  }

  return null;
}
