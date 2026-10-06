import { describe, expect, it } from "vitest";
import type {
  GuardEvent,
  GuardState,
  TransitionCause,
} from "../../src/domain/behavior/guardFsm";
import { escapeForTransitions } from "../../src/application/simulation/escapeFeedback";
import type { BehaviorTransition } from "../../src/application/simulation/behaviorSimulation";
import {
  ESCAPE_NEAR_DISTANCE,
  GUARD_START,
  LAB_MAP,
  PATROL_POINTS,
  TILE_SIZE,
} from "../../src/application/simulation/labLevel";
import type { PerceptionMemory } from "../../src/domain/perception/memory";
import { BehaviorSimulator, cellCenterWorld } from "../support/behaviorSimRunner";

function makeTransition(
  previousState: GuardState,
  newState: GuardState,
  timeMs: number,
  event: GuardEvent = "vision-lost",
  cause: TransitionCause = "perdida de vision",
): BehaviorTransition {
  return { timeMs, previousState, event, newState, cause };
}

const GUARD_AT_ORIGIN = { x: 0, y: 0 };

describe("escapeForTransitions", () => {
  it("returns an escape feedback for a near-miss pursuit break", () => {
    const feedback = escapeForTransitions(
      [makeTransition("PURSUE", "SEARCH", 1200)],
      GUARD_AT_ORIGIN,
      { x: 50, y: 0 },
      ESCAPE_NEAR_DISTANCE,
    );

    expect(feedback).toEqual({
      timeMs: 1200,
      distance: 50,
      nearDistance: ESCAPE_NEAR_DISTANCE,
    });
  });

  it("returns null when the pursuit break happens far away", () => {
    const feedback = escapeForTransitions(
      [makeTransition("PURSUE", "SEARCH", 1200)],
      GUARD_AT_ORIGIN,
      { x: 200, y: 0 },
      ESCAPE_NEAR_DISTANCE,
    );

    expect(feedback).toBeNull();
  });

  it("returns null for an empty batch of transitions", () => {
    expect(
      escapeForTransitions([], GUARD_AT_ORIGIN, { x: 10, y: 0 }, ESCAPE_NEAR_DISTANCE),
    ).toBeNull();
  });

  it("returns null for transitions that are not a pursuit break", () => {
    const feedback = escapeForTransitions(
      [
        makeTransition("PATROL", "PURSUE", 10, "vision-valid", "vision"),
        makeTransition("PURSUE", "CAPTURED", 20, "captured", "captura"),
        makeTransition("PATROL", "INVESTIGATE", 30, "sound-heard", "sonido"),
      ],
      GUARD_AT_ORIGIN,
      { x: 20, y: 0 },
      ESCAPE_NEAR_DISTANCE,
    );

    expect(feedback).toBeNull();
  });

  it("uses the first matching transition of the batch", () => {
    const feedback = escapeForTransitions(
      [
        makeTransition("PURSUE", "SEARCH", 400),
        makeTransition("PURSUE", "SEARCH", 800),
      ],
      GUARD_AT_ORIGIN,
      { x: 30, y: 0 },
      ESCAPE_NEAR_DISTANCE,
    );

    expect(feedback?.timeMs).toBe(400);
  });
});

describe("escape feedback integration", () => {
  it("derives an escape after a close pursuit is broken", () => {
    const sim = new BehaviorSimulator({
      map: LAB_MAP,
      patrolPoints: PATROL_POINTS,
      guardCell: GUARD_START,
    });

    const seenCell = { x: 26, y: 17 };
    const seen = cellCenterWorld(seenCell, TILE_SIZE);
    const memory: PerceptionMemory = {
      lastKnownPosition: seen,
      lastPerceivedAtMs: sim.timeMs,
      source: "vision",
    };

    sim.step();
    sim.step({ vision: { visible: true, target: seen }, memory });
    const frame = sim.step({ memory });

    const feedback = escapeForTransitions(
      frame.transitions,
      sim.position,
      seen,
      ESCAPE_NEAR_DISTANCE,
    );

    expect(feedback).not.toBeNull();
    expect(feedback!.distance).toBeGreaterThan(0);
    expect(feedback!.distance).toBeLessThanOrEqual(ESCAPE_NEAR_DISTANCE);
    expect(feedback!.nearDistance).toBe(ESCAPE_NEAR_DISTANCE);
  });
});