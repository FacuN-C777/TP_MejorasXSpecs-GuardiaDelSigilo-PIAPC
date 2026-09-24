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

describe("investigate behavior", () => {
  it("travels to the sound origin and runs a mini-search before returning (decision 8.2)", () => {
    const sim = new BehaviorSimulator({ map: OPEN_MAP, patrolPoints: PATROL, guardCell: { x: 1, y: 1 } });
    const soundCell = { x: 7, y: 1 };
    const soundWorld = cellCenterWorld(soundCell, DEFAULT_TILE_SIZE);

    sim.step();

    const entry = sim.step({ sound: { heard: true, position: soundWorld }, memory: memoryAt(soundCell, sim.timeMs, "sound") });
    expect(entry.state.fsmState).toBe("INVESTIGATE");
    expect(entry.state.lastEvent).toBe("sound-heard");
    expect(entry.state.lastCause).toBe("sonido");
    expect(entry.state.objective).toEqual(soundCell);

    let reached = false;
    let current = entry.state;
    for (let index = 0; index < 500; index += 1) {
      const frame = sim.step();
      if (frame.state.fsmState === "SEARCH") {
        reached = true;
        current = frame.state;
        break;
      }
    }
    expect(reached).toBe(true);
    expect(current.fsmState).toBe("SEARCH");
    expect(current.lastCause).toBe("investigacion sin hallazgo");

    let returned = false;
    for (let index = 0; index < 600; index += 1) {
      if (sim.state.fsmState === "RETURN") {
        returned = true;
        break;
      }
      sim.step();
    }
    expect(returned).toBe(true);
    expect(sim.state.lastCause).toBe("busqueda agotada");
  });

  it("re-targets the investigation when a new sound arrives", () => {
    const sim = new BehaviorSimulator({ map: OPEN_MAP, patrolPoints: PATROL, guardCell: { x: 1, y: 1 } });
    sim.step();

    const firstSound = cellCenterWorld({ x: 3, y: 1 }, DEFAULT_TILE_SIZE);
    sim.step({ sound: { heard: true, position: firstSound }, memory: memoryAt({ x: 3, y: 1 }, sim.timeMs, "sound") });

    const secondSound = cellCenterWorld({ x: 8, y: 1 }, DEFAULT_TILE_SIZE);
    const again = sim.step({ sound: { heard: true, position: secondSound }, memory: memoryAt({ x: 8, y: 1 }, sim.timeMs, "sound") });

    expect(again.state.fsmState).toBe("INVESTIGATE");
    expect(again.state.lastCause).toBe("sonido reactualizado");
    expect(again.state.objective).toEqual({ x: 8, y: 1 });
  });

  it("prioritizes vision over simultaneous sound", () => {
    const sim = new BehaviorSimulator({ map: OPEN_MAP, patrolPoints: PATROL, guardCell: { x: 1, y: 1 } });
    sim.step();

    const target = cellCenterWorld({ x: 3, y: 1 }, DEFAULT_TILE_SIZE);
    const sound = cellCenterWorld({ x: 8, y: 8 }, DEFAULT_TILE_SIZE);
    const frame = sim.step({
      vision: { visible: true, target },
      sound: { heard: true, position: sound },
      memory: memoryAt({ x: 3, y: 1 }, sim.timeMs),
    });

    expect(frame.state.fsmState).toBe("PURSUE");
    expect(frame.state.lastCause).toBe("vision");
  });
});