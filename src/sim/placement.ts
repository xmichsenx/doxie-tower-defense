import { circleRect, dist } from '../core/math';
import type { Path } from '../core/path';
import { FIELD_H, FIELD_W, type Vec2 } from '../core/types';
import type { MapDef } from '../data/maps';

export interface Footprint {
  pos: Vec2;
  radius: number;
}

export type PlacementProblem = 'bounds' | 'path' | 'tower' | 'decoration' | null;

/** Why a tower of the given radius cannot stand at pos, or null if it can. */
export function placementProblem(
  map: MapDef,
  paths: readonly Path[],
  towers: readonly Footprint[],
  pos: Vec2,
  radius: number,
): PlacementProblem {
  if (pos.x < radius || pos.y < radius || pos.x > FIELD_W - radius || pos.y > FIELD_H - radius) return 'bounds';
  const clearance = map.pathWidth / 2 + radius - 4;
  if (paths.some((p) => p.distanceTo(pos) < clearance)) return 'path';
  if (towers.some((t) => dist(t.pos, pos) < t.radius + radius)) return 'tower';
  if (map.decorations.some((d) => circleRect(pos, radius - 4, d))) return 'decoration';
  return null;
}

export function canPlace(
  map: MapDef,
  paths: readonly Path[],
  towers: readonly Footprint[],
  pos: Vec2,
  radius: number,
): boolean {
  return placementProblem(map, paths, towers, pos, radius) === null;
}
