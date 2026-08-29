import * as THREE from 'three';
import type { KnowledgeEdge } from './types';

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stablePerpendicular(edgeId: string, direction: THREE.Vector3) {
  const up = Math.abs(direction.y) > 0.86 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const perpendicular = new THREE.Vector3().crossVectors(direction, up).normalize();
  if (stableHash(edgeId) % 2 === 0) perpendicular.multiplyScalar(-1);
  return perpendicular;
}

export function buildEdgeCurve(
  edge: KnowledgeEdge,
  sourcePosition: [number, number, number],
  targetPosition: [number, number, number],
) {
  const source = new THREE.Vector3(...sourcePosition);
  const target = new THREE.Vector3(...targetPosition);
  const vector = target.clone().sub(source);
  const distance = Math.max(vector.length(), 0.001);
  const direction = vector.clone().normalize();
  const perpendicular = stablePerpendicular(edge.id, direction);
  const phase = ((stableHash(edge.id) % 1000) / 1000 - 0.5) * 0.7;

  if (edge.relationType === 'hierarchy' || edge.relationType === 'practice_for') {
    const bend = Math.min(1.8, distance * 0.075) * (1 + phase);
    const sourceControl = source.clone().lerp(target, 0.34).addScaledVector(perpendicular, bend);
    const targetControl = source.clone().lerp(target, 0.68).addScaledVector(perpendicular, bend * 0.66);
    return new THREE.CubicBezierCurve3(source, sourceControl, targetControl, target);
  }

  const midpoint = source.clone().lerp(target, 0.5);
  const bend = Math.min(3.2, distance * 0.16) * (1 + phase);
  midpoint.addScaledVector(perpendicular, bend);
  midpoint.y += Math.min(2.4, distance * 0.08);
  return new THREE.QuadraticBezierCurve3(source, midpoint, target);
}

export function sampleCurve(curve: THREE.Curve<THREE.Vector3>, segments = 26) {
  return curve.getPoints(segments).map((point) => point.toArray() as [number, number, number]);
}
