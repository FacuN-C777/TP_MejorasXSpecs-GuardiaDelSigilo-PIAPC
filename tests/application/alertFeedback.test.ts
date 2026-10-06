import { describe, expect, it } from "vitest";
import type {
  GuardEvent,
  GuardState,
  TransitionCause,
} from "../../src/domain/behavior/guardFsm";
import {
  alertsForTransitions,
  strongestAlert,
} from "../../src/application/simulation/alertFeedback";
import type { BehaviorTransition } from "../../src/application/simulation/behaviorSimulation";
import {
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
  event: GuardEvent = "vision-valid",
  cause: TransitionCause = "vision",
): BehaviorTransition {
  return { timeMs: 0, previousState, event, newState, cause };
}

describe("alertsForTransitions", () => {
  it("emits a pursue alert when entering PURSUE", () => {
    const alerts = alertsForTransitions([makeTransition("PATROL", "PURSUE")]);

    expect(alerts).toEqual([
      { kind: "pursue-start", intensity: 0.8, durationMs: 450 },
    ]);
  });

  it("emits the strongest alert when entering CAPTURED", () => {
    const alerts = alertsForTransitions([
      makeTransition("PURSUE", "CAPTURED", "captured", "captura"),
    ]);

    expect(alerts).toEqual([
      { kind: "captured", intensity: 1, durationMs: 700 },
    ]);
  });

  it("emits a medium alert when entering INVESTIGATE", () => {
    const alerts = alertsForTransitions([
      makeTransition("PATROL", "INVESTIGATE", "sound-heard", "sonido"),
    ]);

    expect(alerts).toEqual([
      { kind: "investigate-start", intensity: 0.45, durationMs: 300 },
    ]);
  });

  it("emits a low alert when entering SEARCH", () => {
    const alerts = alertsForTransitions([
      makeTransition("PURSUE", "SEARCH", "vision-lost", "perdida de vision"),
    ]);

    expect(alerts).toEqual([
      { kind: "search-start", intensity: 0.35, durationMs: 300 },
    ]);
  });

  it("ignores self transitions that keep the same state", () => {
    const alerts = alertsForTransitions([
      makeTransition("PATROL", "PATROL", "pause-start", "pausa"),
      makeTransition("PATROL", "PATROL", "look-start", "mirada"),
      makeTransition("PURSUE", "PURSUE", "vision-valid", "actualizacion"),
      makeTransition("PURSUE", "PURSUE", "target-differs", "replanificacion"),
      makeTransition("INVESTIGATE", "INVESTIGATE", "sound-heard", "sonido reactualizado"),
      makeTransition("SEARCH", "SEARCH", "patrol-advance", "avance de busqueda"),
    ]);

    expect(alerts).toEqual([]);
  });

  it("ignores transitions into states without alert severity", () => {
    const alerts = alertsForTransitions([
      makeTransition("SEARCH", "RETURN", "search-exhausted", "busqueda agotada"),
      makeTransition("RETURN", "PATROL", "route-completed", "regreso completado"),
      makeTransition("INVESTIGATE", "RETURN", "route-failed", "destino inaccesible"),
      makeTransition("CAPTURED", "PATROL", "reset", "reinicio"),
    ]);

    expect(alerts).toEqual([]);
  });

  it("keeps the order of several alerts in one batch", () => {
    const alerts = alertsForTransitions([
      makeTransition("PATROL", "INVESTIGATE", "sound-heard", "sonido"),
      makeTransition("INVESTIGATE", "PURSUE"),
      makeTransition("PURSUE", "CAPTURED", "captured", "captura"),
    ]);

    expect(alerts.map((alert) => alert.kind)).toEqual([
      "investigate-start",
      "pursue-start",
      "captured",
    ]);
  });

  it("returns an empty list for an empty batch", () => {
    expect(alertsForTransitions([])).toEqual([]);
  });
});

describe("strongestAlert", () => {
  it("returns null when there are no alerts", () => {
    expect(strongestAlert([])).toBeNull();
  });

  it("returns the alert with the highest intensity", () => {
    const alerts = alertsForTransitions([
      makeTransition("PATROL", "INVESTIGATE", "sound-heard", "sonido"),
      makeTransition("INVESTIGATE", "PURSUE"),
      makeTransition("PURSUE", "SEARCH", "vision-lost", "perdida de vision"),
    ]);

    expect(strongestAlert(alerts)).toEqual({
      kind: "pursue-start",
      intensity: 0.8,
      durationMs: 450,
    });
  });
});

describe("alert feedback integration", () => {
  function memoryAt(cell: { x: number; y: number }, atMs: number): PerceptionMemory {
    return {
      lastKnownPosition: cellCenterWorld(cell, TILE_SIZE),
      lastPerceivedAtMs: atMs,
      source: "vision",
    };
  }

  it("derives exactly the threat alerts from a full behavior run", () => {
    const sim = new BehaviorSimulator({
      map: LAB_MAP,
      patrolPoints: PATROL_POINTS,
      guardCell: GUARD_START,
    });

    sim.step();

    const soundCell = { x: 25, y: 15 };
    const sound = cellCenterWorld(soundCell, TILE_SIZE);
    sim.step({
      sound: { heard: true, position: sound },
      memory: { ...memoryAt(soundCell, sim.timeMs), source: "sound" },
    });

    const seen = { x: 25, y: 14 };
    const vision = cellCenterWorld(seen, TILE_SIZE);
    sim.step({ vision: { visible: true, target: vision }, memory: memoryAt(seen, sim.timeMs) });

    sim.step({ memory: memoryAt(seen, sim.timeMs) });

    let returned = false;
    for (let index = 0; index < 4000 && !returned; index += 1) {
      returned = sim.step().state.fsmState === "RETURN";
    }
    expect(returned).toBe(true);

    let resumed = false;
    for (let index = 0; index < 4000 && !resumed; index += 1) {
      resumed = sim.step().state.fsmState === "PATROL";
    }
    expect(resumed).toBe(true);

    const alerts = alertsForTransitions(sim.allTransitions);
    expect(alerts.map((alert) => alert.kind)).toEqual([
      "investigate-start",
      "pursue-start",
      "search-start",
    ]);
  });
});
