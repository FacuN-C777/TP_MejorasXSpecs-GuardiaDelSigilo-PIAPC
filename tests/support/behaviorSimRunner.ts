import {
  initialBehaviorState,
  updateBehavior,
  type BehaviorFrame,
  type BehaviorRuntimeState,
  type BehaviorTransition,
} from "../../src/application/simulation/behaviorSimulation";
import type { PerceptionMemory } from "../../src/domain/perception/memory";
import { cellCenter, type GridMap, type GridPoint } from "../../src/domain/model/grid";
import type { Vector2 } from "../../src/domain/model/vector";

export interface StepPerception {
  readonly vision?: Readonly<{ visible: boolean; target: Vector2 | null }>;
  readonly sound?: Readonly<{ heard: boolean; position: Vector2 | null }>;
  readonly memory?: PerceptionMemory;
}

export interface SimulatorOptions {
  readonly map: GridMap;
  readonly patrolPoints: readonly GridPoint[];
  readonly guardCell: GridPoint;
  readonly tileSize?: number;
  readonly speed?: number;
  readonly captureDistance?: number;
  readonly replanIntervalMs?: number;
  readonly searchDurationMs?: number;
  readonly searchRadiusCells?: number;
}

export const DEFAULT_TILE_SIZE = 32;
const DEFAULT_SPEED = 115;
const DEFAULT_DELTA_MS = 16;
const DEFAULT_CAPTURE_DISTANCE = 24;
const DEFAULT_REPLAN_INTERVAL_MS = 300;
const DEFAULT_SEARCH_DURATION_MS = 8000;
const DEFAULT_SEARCH_RADIUS_CELLS = 2;

export function cellCenterWorld(cell: GridPoint, tileSize: number): Vector2 {
  return cellCenter(cell, tileSize);
}

export class BehaviorSimulator {
  public readonly map: GridMap;
  public readonly patrolPoints: readonly GridPoint[];
  public readonly tileSize: number;
  public readonly speed: number;
  public readonly captureDistance: number;
  public readonly replanIntervalMs: number;
  public readonly searchDurationMs: number;
  public readonly searchRadiusCells: number;
  public state: BehaviorRuntimeState;
  public position: Vector2;
  public timeMs = 0;
  public frame = 0;
  public readonly allTransitions: BehaviorTransition[] = [];

  public constructor(options: SimulatorOptions) {
    this.map = options.map;
    this.patrolPoints = options.patrolPoints;
    this.tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
    this.speed = options.speed ?? DEFAULT_SPEED;
    this.captureDistance = options.captureDistance ?? DEFAULT_CAPTURE_DISTANCE;
    this.replanIntervalMs = options.replanIntervalMs ?? DEFAULT_REPLAN_INTERVAL_MS;
    this.searchDurationMs = options.searchDurationMs ?? DEFAULT_SEARCH_DURATION_MS;
    this.searchRadiusCells = options.searchRadiusCells ?? DEFAULT_SEARCH_RADIUS_CELLS;
    this.state = initialBehaviorState();
    this.position = cellCenterWorld(options.guardCell, this.tileSize);
  }

  public step(perception: StepPerception = {}, deltaMs = DEFAULT_DELTA_MS): BehaviorFrame {
    const frame = updateBehavior(this.state, {
      map: this.map,
      tileSize: this.tileSize,
      patrolPoints: this.patrolPoints,
      guardPosition: this.position,
      vision: perception.vision ?? { visible: false, target: null },
      soundHeard: perception.sound?.heard ?? false,
      soundPosition: perception.sound?.position ?? null,
      memory: perception.memory ?? emptyMemory(),
      captureDistance: this.captureDistance,
      speed: this.speed,
      deltaMs,
      timeMs: this.timeMs,
      replanIntervalMs: this.replanIntervalMs,
      searchDurationMs: this.searchDurationMs,
      searchRadiusCells: this.searchRadiusCells,
    });

    this.state = frame.state;
    this.position = frame.movement.position;
    this.timeMs += deltaMs;
    this.frame += 1;
    this.allTransitions.push(...frame.transitions);
    return frame;
  }

  public runFrames(count: number, perception: StepPerception = {}, deltaMs = DEFAULT_DELTA_MS): void {
    for (let index = 0; index < count; index += 1) {
      this.step(perception, deltaMs);
    }
  }
}

function emptyMemory(): PerceptionMemory {
  return { lastKnownPosition: null, lastPerceivedAtMs: null, source: null };
}