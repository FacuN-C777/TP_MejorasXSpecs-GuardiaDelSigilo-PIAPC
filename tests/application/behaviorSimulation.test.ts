import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import type { GridPoint } from "../../src/domain/model/grid";
import { findPathAStar } from "../../src/domain/navigation/search";
import { isWalkable } from "../../src/domain/model/grid";
import type { PerceptionMemory } from "../../src/domain/perception/memory";
import {
  GUARD_START,
  LAB_MAP,
  PATROL_POINTS,
  TILE_SIZE,
} from "../../src/application/simulation/labLevel";
import { BehaviorSimulator, cellCenterWorld } from "../support/behaviorSimRunner";

function memoryAt(cell: GridPoint, atMs: number, source: "vision" | "sound" = "vision"): PerceptionMemory {
  return {
    lastKnownPosition: cellCenterWorld(cell, TILE_SIZE),
    lastPerceivedAtMs: atMs,
    source,
  };
}

describe("behavior simulation integration", () => {
  it("keeps every patrol point walkable and mutually reachable on LAB_MAP", () => {
    for (const point of PATROL_POINTS) {
      expect(isWalkable(LAB_MAP, point)).toBe(true);
    }
    for (const from of PATROL_POINTS) {
      for (const to of PATROL_POINTS) {
        expect(findPathAStar(LAB_MAP, from, to).status).toBe("success");
      }
    }
  });

  it("reproduces PATROL -> INVESTIGATE -> PURSUE -> SEARCH -> RETURN -> PATROL", () => {
    const sim = new BehaviorSimulator({
      map: LAB_MAP,
      patrolPoints: PATROL_POINTS,
      guardCell: GUARD_START,
    });

    const visited: string[] = [];
    let state = sim.step().state;
    visited.push(state.fsmState);

    const soundCell = { x: 25, y: 15 };
    const sound = cellCenterWorld(soundCell, TILE_SIZE);
    state = sim.step({ sound: { heard: true, position: sound }, memory: memoryAt(soundCell, sim.timeMs, "sound") }).state;
    visited.push(state.fsmState);
    expect(state.fsmState).toBe("INVESTIGATE");

    const seen = { x: 25, y: 14 };
    const vision = cellCenterWorld(seen, TILE_SIZE);
    state = sim.step({ vision: { visible: true, target: vision }, memory: memoryAt(seen, sim.timeMs) }).state;
    visited.push(state.fsmState);
    expect(state.fsmState).toBe("PURSUE");

    state = sim.step({ memory: memoryAt(seen, sim.timeMs) }).state;
    visited.push(state.fsmState);
    expect(state.fsmState).toBe("SEARCH");

    let returned = false;
    for (let index = 0; index < 4000; index += 1) {
      state = sim.step().state;
      if (state.fsmState === "RETURN") {
        returned = true;
        break;
      }
    }
    expect(returned).toBe(true);
    visited.push("RETURN");

    let patrolling = false;
    for (let index = 0; index < 4000; index += 1) {
      state = sim.step().state;
      if (state.fsmState === "PATROL") {
        patrolling = true;
        break;
      }
    }
    expect(patrolling).toBe(true);
    visited.push("PATROL");

    const sequence = visited.filter((value, index) => index === 0 || value !== visited[index - 1]);
    expect(sequence).toEqual(["PATROL", "INVESTIGATE", "PURSUE", "SEARCH", "RETURN", "PATROL"]);
  });

  it("skips an unreachable patrol point and keeps the cycle going", () => {
    const map = createGridMap(7, 7, [
      { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 },
    ]);
    const sim = new BehaviorSimulator({
      map,
      patrolPoints: [{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 4, y: 4 }],
      guardCell: { x: 0, y: 0 },
      pauseDurationMs: 0,
      lookDurationMs: 0,
    });

    sim.step();
    sim.step();
    sim.step();
    const advance = sim.step();

    expect(advance.state.fsmState).toBe("PATROL");
    expect(advance.state.route.status).toBe("failed");
    expect(advance.state.objective).toEqual({ x: 2, y: 2 });

    const frame = sim.step();

    expect(frame.state.fsmState).toBe("PATROL");
    const failed = frame.transitions.some(
      (event) => event.event === "route-failed" && event.cause === "patrulla inaccesible",
    );
    expect(failed).toBe(true);
    expect(frame.state.objective).toEqual({ x: 4, y: 4 });
    expect(frame.state.route.status).toBe("active");
  });

  it("pauses on arrival, looks toward the next patrol point, then continues", () => {
    const sim = new BehaviorSimulator({
      map: LAB_MAP,
      patrolPoints: PATROL_POINTS,
      guardCell: GUARD_START,
      pauseDurationMs: 200,
      lookDurationMs: 120,
    });

    sim.step();
    sim.step();
    expect(sim.state.patrolPhase.phase).toBe("pause");
    const pausePosition = { ...sim.position };

    let lookFrame: ReturnType<BehaviorSimulator["step"]> | null = null;
    for (let index = 0; index < 100 && lookFrame === null; index += 1) {
      const frame = sim.step();
      expect(sim.position).toEqual(pausePosition);
      if (frame.state.patrolPhase.phase === "look") {
        lookFrame = frame;
      }
    }

    expect(lookFrame).not.toBeNull();
    expect(lookFrame!.facing).toEqual({ x: -1, y: 0 });
    expect(sim.position).toEqual(pausePosition);

    let continued = false;
    for (let index = 0; index < 100 && !continued; index += 1) {
      const frame = sim.step();
      if (frame.state.route.status === "active") {
        continued = true;
      }
    }

    expect(continued).toBe(true);
    expect(sim.state.patrolPhase.phase).toBe("walk");
    expect(sim.state.objective).toEqual({ x: 20, y: 17 });

    sim.step();
    expect(sim.position.x).toBeLessThan(pausePosition.x);
  });

  it("interrupts the patrol pause with vision", () => {
    const sim = new BehaviorSimulator({
      map: LAB_MAP,
      patrolPoints: PATROL_POINTS,
      guardCell: GUARD_START,
    });

    sim.step();
    sim.step();
    expect(sim.state.patrolPhase.phase).toBe("pause");

    const seen = cellCenterWorld({ x: 25, y: 17 }, TILE_SIZE);
    const frame = sim.step({
      vision: { visible: true, target: seen },
      memory: memoryAt({ x: 25, y: 17 }, sim.timeMs),
    });

    expect(frame.state.fsmState).toBe("PURSUE");
    expect(frame.state.lastCause).toBe("vision");
    expect(frame.state.patrolPhase.phase).toBe("walk");
  });

  it("interrupts the directional look with a sound", () => {
    const sim = new BehaviorSimulator({
      map: LAB_MAP,
      patrolPoints: PATROL_POINTS,
      guardCell: GUARD_START,
    });

    sim.step();
    sim.step();
    expect(sim.state.patrolPhase.phase).toBe("pause");

    for (let index = 0; index < 200 && sim.state.patrolPhase.phase !== "look"; index += 1) {
      sim.step();
    }
    expect(sim.state.patrolPhase.phase).toBe("look");

    const soundCell = { x: 25, y: 15 };
    const sound = cellCenterWorld(soundCell, TILE_SIZE);
    const frame = sim.step({
      sound: { heard: true, position: sound },
      memory: memoryAt(soundCell, sim.timeMs, "sound"),
    });

    expect(frame.state.fsmState).toBe("INVESTIGATE");
    expect(frame.state.lastCause).toBe("sonido");
    expect(frame.state.patrolPhase.phase).toBe("walk");
  });

  it("resumes the cycle after RETURN without a new pause", () => {
    const sim = new BehaviorSimulator({
      map: LAB_MAP,
      patrolPoints: PATROL_POINTS,
      guardCell: GUARD_START,
    });

    sim.step();
    const seen = cellCenterWorld({ x: 25, y: 14 }, TILE_SIZE);
    sim.step({ vision: { visible: true, target: seen }, memory: memoryAt({ x: 25, y: 14 }, sim.timeMs) });
    sim.step({ memory: memoryAt({ x: 25, y: 14 }, sim.timeMs) });

    for (let index = 0; index < 4000 && sim.state.fsmState !== "RETURN"; index += 1) {
      sim.step();
    }
    expect(sim.state.fsmState).toBe("RETURN");

    for (let index = 0; index < 4000 && sim.state.fsmState !== "PATROL"; index += 1) {
      sim.step();
    }
    expect(sim.state.fsmState).toBe("PATROL");
    expect(sim.state.lastCause).toBe("regreso completado");
    expect(sim.state.patrolPhase.phase).toBe("walk");
    expect(sim.state.skipPauseOnArrival).toBe(true);

    const advance = sim.step();

    const resumed = advance.transitions.some(
      (event) => event.event === "patrol-advance" && event.cause === "llegada patrulla",
    );
    expect(resumed).toBe(true);
    expect(advance.state.patrolPhase.phase).toBe("walk");
    expect(advance.state.skipPauseOnArrival).toBe(false);
  });
});

describe("anexo A: planRoute usa el modo ponderado del mapa (A-AC3)", () => {
  const START: GridPoint = { x: 0, y: 1 };
  const GOAL: GridPoint = { x: 4, y: 1 };
  const SLOW_MAP = createGridMap(5, 3, [], [
    [{ x: 1, y: 1 }, 5],
    [{ x: 2, y: 1 }, 5],
    [{ x: 3, y: 1 }, 5],
  ]);
  const UNIT_MAP = createGridMap(5, 3, []);

  it("planifica con costo 6 cuando el mapa trae la franja lenta", () => {
    const sim = new BehaviorSimulator({
      map: SLOW_MAP,
      patrolPoints: [GOAL],
      guardCell: START,
    });

    sim.step();

    const plan = sim.state.lastPlan;
    expect(plan).not.toBeNull();
    expect(plan!.status).toBe("success");
    expect(plan!.path.length - 1).toBe(6);
    expect(plan!.totalCost).toBe(6);
  });

  it("conserva el plan unitario con costo 4", () => {
    const sim = new BehaviorSimulator({
      map: UNIT_MAP,
      patrolPoints: [GOAL],
      guardCell: START,
    });

    sim.step();

    const plan = sim.state.lastPlan;
    expect(plan).not.toBeNull();
    expect(plan!.status).toBe("success");
    expect(plan!.path.length - 1).toBe(4);
    expect(plan!.totalCost).toBe(4);
  });
});
