import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import type { GridPoint } from "../../src/domain/model/grid";
import type { PerceptionMemory } from "../../src/domain/perception/memory";
import { BehaviorSimulator, cellCenterWorld, DEFAULT_TILE_SIZE } from "../support/behaviorSimRunner";

const OPEN_MAP = createGridMap(10, 10, []);
const PATROL = [{ x: 1, y: 1 }, { x: 1, y: 5 }];

function memoryAt(cell: GridPoint, atMs: number, source: "vision" | "sound" = "vision"): PerceptionMemory {
  return {
    lastKnownPosition: cellCenterWorld(cell, DEFAULT_TILE_SIZE),
    lastPerceivedAtMs: atMs,
    source,
  };
}

function enterReturn(sim: BehaviorSimulator): void {
  sim.step();
  const target = cellCenterWorld({ x: 4, y: 4 }, DEFAULT_TILE_SIZE);
  sim.step({ vision: { visible: true, target }, memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });
  sim.step({ memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });
  sim.step({});
}

describe("return behavior", () => {
  it("travels back to a patrol point and resumes the cycle", () => {
    const sim = new BehaviorSimulator({
      map: OPEN_MAP,
      patrolPoints: PATROL,
      guardCell: { x: 1, y: 1 },
      searchRadiusCells: 0,
    });

    enterReturn(sim);
    expect(sim.state.fsmState).toBe("RETURN");

    let resumed = false;
    for (let index = 0; index < 500; index += 1) {
      if (sim.state.fsmState === "PATROL") {
        resumed = true;
        break;
      }
      sim.step();
    }

    expect(resumed).toBe(true);
    expect(sim.state.lastCause).toBe("regreso completado");
  });

  it("interrupts the return with a recovered vision", () => {
    const sim = new BehaviorSimulator({
      map: OPEN_MAP,
      patrolPoints: PATROL,
      guardCell: { x: 1, y: 1 },
      searchRadiusCells: 0,
    });

    enterReturn(sim);
    const visionCell = { x: 2, y: 3 };
    const vision = cellCenterWorld(visionCell, DEFAULT_TILE_SIZE);
    const frame = sim.step({ vision: { visible: true, target: vision }, memory: memoryAt(visionCell, sim.timeMs) });

    expect(frame.state.fsmState).toBe("PURSUE");
    expect(frame.state.lastCause).toBe("vision durante regreso");
  });

  it("interrupts the return with a sound", () => {
    const sim = new BehaviorSimulator({
      map: OPEN_MAP,
      patrolPoints: PATROL,
      guardCell: { x: 1, y: 1 },
      searchRadiusCells: 0,
    });

    enterReturn(sim);
    const soundCell = { x: 4, y: 4 };
    const sound = cellCenterWorld(soundCell, DEFAULT_TILE_SIZE);
    const frame = sim.step({ sound: { heard: true, position: sound }, memory: memoryAt(soundCell, sim.timeMs, "sound") });

    expect(frame.state.fsmState).toBe("INVESTIGATE");
    expect(frame.state.lastCause).toBe("sonido durante regreso");
  });

  it("recovers explicitly by picking another reachable patrol point", () => {
    const map = createGridMap(7, 7, [
      { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 },
    ]);
    const sim = new BehaviorSimulator({
      map,
      patrolPoints: [{ x: 2, y: 2 }, { x: 4, y: 4 }],
      guardCell: { x: 0, y: 0 },
      searchRadiusCells: 0,
    });

    enterReturn(sim);
    expect(sim.state.fsmState).toBe("RETURN");
    expect(sim.state.objective).toEqual({ x: 2, y: 2 });

    const recovery = sim.step();
    const failed = recovery.transitions.some((event) => event.event === "route-failed" && event.cause === "regreso inaccesible");

    expect(failed).toBe(true);
    expect(recovery.state.objective).toEqual({ x: 4, y: 4 });
    expect(recovery.state.route.status).toBe("active");
  });
});