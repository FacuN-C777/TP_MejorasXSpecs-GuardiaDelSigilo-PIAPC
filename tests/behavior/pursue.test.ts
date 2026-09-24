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

describe("pursue behavior", () => {
  it("starts a pursuit on a valid vision", () => {
    const sim = new BehaviorSimulator({ map: OPEN_MAP, patrolPoints: PATROL, guardCell: { x: 1, y: 1 } });
    sim.step();

    const target = cellCenterWorld({ x: 4, y: 4 }, DEFAULT_TILE_SIZE);
    const frame = sim.step({ vision: { visible: true, target }, memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });

    expect(frame.state.fsmState).toBe("PURSUE");
    expect(frame.state.lastCause).toBe("vision");
    expect(frame.state.objective).toEqual({ x: 4, y: 4 });
  });

  it("does not replan on every frame while the target stays put", () => {
    const sim = new BehaviorSimulator({ map: OPEN_MAP, patrolPoints: PATROL, guardCell: { x: 1, y: 1 } });
    sim.step();

    const target = cellCenterWorld({ x: 5, y: 5 }, DEFAULT_TILE_SIZE);
    sim.step({ vision: { visible: true, target }, memory: memoryAt({ x: 5, y: 5 }, sim.timeMs) });
    const plannedAt = sim.state.plannedAtMs;

    sim.runFrames(8, { vision: { visible: true, target }, memory: memoryAt({ x: 5, y: 5 }, sim.timeMs) });

    expect(sim.state.objective).toEqual({ x: 5, y: 5 });
    expect(sim.state.plannedAtMs).toBe(plannedAt);
    expect(sim.allTransitions.some((event) => event.event === "target-differs")).toBe(false);
  });

  it("replans when the perceived target changes cell", () => {
    const sim = new BehaviorSimulator({ map: OPEN_MAP, patrolPoints: PATROL, guardCell: { x: 1, y: 1 } });
    sim.step();

    const first = cellCenterWorld({ x: 5, y: 5 }, DEFAULT_TILE_SIZE);
    sim.step({ vision: { visible: true, target: first }, memory: memoryAt({ x: 5, y: 5 }, sim.timeMs) });

    const second = cellCenterWorld({ x: 8, y: 8 }, DEFAULT_TILE_SIZE);
    const frame = sim.step({ vision: { visible: true, target: second }, memory: memoryAt({ x: 8, y: 8 }, sim.timeMs) });

    const last = frame.transitions[frame.transitions.length - 1];
    expect(last?.event).toBe("target-differs");
    expect(last?.cause).toBe("replanificacion");
    expect(frame.state.objective).toEqual({ x: 8, y: 8 });
  });

  it("searches the last known position after losing vision", () => {
    const sim = new BehaviorSimulator({ map: OPEN_MAP, patrolPoints: PATROL, guardCell: { x: 1, y: 1 } });
    sim.step();

    const target = cellCenterWorld({ x: 4, y: 4 }, DEFAULT_TILE_SIZE);
    sim.step({ vision: { visible: true, target }, memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });

    const lost = sim.step({ memory: memoryAt({ x: 4, y: 4 }, sim.timeMs) });

    expect(lost.state.fsmState).toBe("SEARCH");
    expect(lost.state.lastCause).toBe("perdida de vision");
    expect(lost.state.search?.originCell).toEqual({ x: 4, y: 4 });
  });

  it("captures the player at close range and stops navigating", () => {
    const sim = new BehaviorSimulator({
      map: OPEN_MAP,
      patrolPoints: [{ x: 1, y: 1 }, { x: 1, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 1 }],
      guardCell: { x: 1, y: 1 },
    });
    sim.step();

    const own = cellCenterWorld({ x: 1, y: 1 }, DEFAULT_TILE_SIZE);
    const entry = sim.step({ vision: { visible: true, target: own }, memory: memoryAt({ x: 1, y: 1 }, sim.timeMs) });
    expect(entry.state.fsmState).toBe("PURSUE");

    const capture = sim.step({ vision: { visible: true, target: own }, memory: memoryAt({ x: 1, y: 1 }, sim.timeMs) });
    expect(capture.state.fsmState).toBe("CAPTURED");
    expect(capture.state.lastCause).toBe("captura");

    const position = sim.position;
    sim.runFrames(10, { vision: { visible: true, target: own }, memory: memoryAt({ x: 1, y: 1 }, sim.timeMs) });

    expect(sim.state.fsmState).toBe("CAPTURED");
    expect(sim.position.x).toBeCloseTo(position.x);
    expect(sim.position.y).toBeCloseTo(position.y);
  });
});