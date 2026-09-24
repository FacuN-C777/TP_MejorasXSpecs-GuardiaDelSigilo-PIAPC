import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import type { GridPoint } from "../../src/domain/model/grid";
import type { PerceptionMemory } from "../../src/domain/perception/memory";
import { BehaviorSimulator, cellCenterWorld, DEFAULT_TILE_SIZE } from "../support/behaviorSimRunner";

const OPEN_MAP = createGridMap(10, 10, []);
const PATROL = [{ x: 1, y: 1 }, { x: 1, y: 5 }];

function memoryAt(cell: GridPoint, atMs: number): PerceptionMemory {
  return {
    lastKnownPosition: cellCenterWorld(cell, DEFAULT_TILE_SIZE),
    lastPerceivedAtMs: atMs,
    source: "vision",
  };
}

describe("search behavior", () => {
  it("walks the pattern around the last known position and returns when exhausted", () => {
    const sim = new BehaviorSimulator({
      map: OPEN_MAP,
      patrolPoints: PATROL,
      guardCell: { x: 1, y: 1 },
      searchRadiusCells: 1,
    });

    sim.step();
    const target = cellCenterWorld({ x: 4, y: 4 }, DEFAULT_TILE_SIZE);
    sim.step({ vision: { visible: true, target }, memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });

    const lost = sim.step({ memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });
    expect(lost.state.fsmState).toBe("SEARCH");
    expect(lost.state.search?.originCell).toEqual({ x: 4, y: 4 });
    expect(lost.state.search?.points.length).toBeGreaterThan(0);

    let sawAdvance = false;
    let returned = false;
    let current = lost.state;
    for (let index = 0; index < 3000; index += 1) {
      const frame = sim.step();
      if (frame.transitions.some((event) => event.event === "patrol-advance" && event.cause === "avance de busqueda")) {
        sawAdvance = true;
      }
      if (frame.state.fsmState === "RETURN") {
        returned = true;
        current = frame.state;
        break;
      }
    }

    expect(returned).toBe(true);
    expect(sawAdvance).toBe(true);
    expect(current.lastCause).toBe("busqueda agotada");
  });

  it("resumes pursuit when vision is recovered during the search", () => {
    const sim = new BehaviorSimulator({
      map: OPEN_MAP,
      patrolPoints: PATROL,
      guardCell: { x: 1, y: 1 },
      searchRadiusCells: 1,
    });

    sim.step();
    const target = cellCenterWorld({ x: 4, y: 4 }, DEFAULT_TILE_SIZE);
    sim.step({ vision: { visible: true, target }, memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });
    sim.step({ memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });

    const recovered = cellCenterWorld({ x: 6, y: 6 }, DEFAULT_TILE_SIZE);
    const frame = sim.step({ vision: { visible: true, target: recovered }, memory: memoryAt({ x: 6, y: 6 }, sim.timeMs) });

    expect(frame.state.fsmState).toBe("PURSUE");
    expect(frame.state.lastCause).toBe("vision recuperada");
  });

  it("returns immediately with an empty pattern when the origin is isolated", () => {
    const map = createGridMap(5, 5, [
      { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 4 },
    ]);
    const sim = new BehaviorSimulator({
      map,
      patrolPoints: [{ x: 0, y: 4 }, { x: 4, y: 4 }],
      guardCell: { x: 0, y: 0 },
    });

    sim.step();
    const target = cellCenterWorld({ x: 2, y: 3 }, DEFAULT_TILE_SIZE);
    sim.step({ vision: { visible: true, target }, memory: memoryAt({ x: 2, y: 3 }, sim.timeMs) });
    sim.step({ memory: memoryAt({ x: 2, y: 3 }, sim.timeMs) });

    const frame = sim.step({ memory: memoryAt({ x: 2, y: 3 }, sim.timeMs) });
    expect(frame.state.fsmState).toBe("RETURN");
    expect(frame.state.lastCause).toBe("busqueda agotada");
  });
});