import type { GridMap } from "../../domain/model/grid";
import type { Vector2 } from "../../domain/model/vector";
import {
  emptyPerceptionMemory,
  rememberObservation,
  type PerceptionMemory,
} from "../../domain/perception/memory";
import {
  evaluateSound,
  evaluateVision,
  type SoundEvent,
  type VisionResult,
} from "../../domain/perception/perception";
import { createVisionCone, type VisionCone } from "../../domain/perception/visionCone";
import { evaluateCover, type CoverResult } from "../../domain/perception/cover";
import { COVER_VISION_FACTOR } from "./labLevel";

export interface PerceptionSimulationState {
  readonly memory: PerceptionMemory;
  readonly soundEvent: SoundEvent | null;
}

export interface PerceptionFrame {
  readonly state: PerceptionSimulationState;
  readonly vision: VisionResult;
  readonly soundHeard: boolean;
  readonly cone: VisionCone;
  readonly cover: CoverResult;
}

export interface PerceptionFrameInput {
  readonly map: GridMap;
  readonly tileSize: number;
  readonly observer: Vector2;
  readonly facing: Vector2;
  readonly target: Vector2;
  readonly visionRange: number;
  readonly fieldOfViewRadians: number;
  readonly timeMs: number;
}

export function initialPerceptionState(): PerceptionSimulationState {
  return { memory: emptyPerceptionMemory(), soundEvent: null };
}

export function withSoundEvent(
  state: PerceptionSimulationState,
  soundEvent: SoundEvent,
): PerceptionSimulationState {
  return { ...state, soundEvent };
}

export function updatePerceptionSimulation(
  state: PerceptionSimulationState,
  input: PerceptionFrameInput,
): PerceptionFrame {
  let memory = state.memory;
  let soundEvent = state.soundEvent;
  let soundHeard = false;

  if (soundEvent) {
    const sound = evaluateSound(input.observer, soundEvent, input.timeMs);
    soundHeard = sound.heard;
    if (sound.heard) {
      memory = rememberObservation(memory, {
        source: "sound",
        position: soundEvent.position,
        observedAtMs: input.timeMs,
      });
    }
    if (!sound.active && input.timeMs > soundEvent.emittedAtMs + soundEvent.durationMs) {
      soundEvent = null;
    }
  }

  const cover = evaluateCover(input.map, input.tileSize, input.target);
  const effectiveRange = cover.covered
    ? input.visionRange * COVER_VISION_FACTOR
    : input.visionRange;

  const vision = evaluateVision({
    map: input.map,
    tileSize: input.tileSize,
    observer: input.observer,
    facing: input.facing,
    target: input.target,
    range: effectiveRange,
    fieldOfViewRadians: input.fieldOfViewRadians,
  });
  if (vision.visible) {
    memory = rememberObservation(memory, {
      source: "vision",
      position: input.target,
      observedAtMs: input.timeMs,
    });
  }

  const cone = createVisionCone(
    input.observer,
    input.facing,
    effectiveRange,
    input.fieldOfViewRadians,
  );

  return {
    state: { memory, soundEvent },
    vision,
    soundHeard,
    cone,
    cover,
  };
}
