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
    });

    sim.step();
    sim.step();
    const frame = sim.step();

    expect(frame.state.fsmState).toBe("PATROL");
    const failed = frame.transitions.some(
      (event) => event.event === "route-failed" && event.cause === "patrulla inaccesible",
    );
    expect(failed).toBe(true);
    expect(frame.state.objective).toEqual({ x: 4, y: 4 });
    expect(frame.state.route.status).toBe("active");
  });
});