import { assertFiniteVector, type Vector2 } from "../model/vector";

export interface VisionCone {
  readonly origin: Vector2;
  readonly direction: Vector2;
  readonly range: number;
  readonly fovRadians: number;
}

export function createVisionCone(
  origin: Vector2,
  direction: Vector2,
  range: number,
  fovRadians: number,
): VisionCone {
  assertFiniteVector(origin);
  assertFiniteVector(direction);
  if (!Number.isFinite(range) || range < 0) {
    throw new Error("Vision cone range must be a finite non-negative number.");
  }
  if (!Number.isFinite(fovRadians) || fovRadians < 0 || fovRadians > Math.PI * 2) {
    throw new Error("Vision cone field of view must be within 0 and 2PI.");
  }
  return { origin, direction, range, fovRadians };
}
