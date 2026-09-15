import * as THREE from 'three';

export const TREE_PREVIEW_ROTATION_SPEED = 0.075;
export const TREE_RING_SPACING = 72;
export const TREE_RING_MIN_RADIUS = 38;

function ringRadius(count: number) {
  if (count <= 1) return 0;
  if (count === 2) return TREE_RING_MIN_RADIUS;
  return Math.max(TREE_RING_MIN_RADIUS, TREE_RING_SPACING / (2 * Math.sin(Math.PI / count)));
}

/** Library order maps deterministically onto a count-aware spatial ring. */
export function treePreviewAnchor(index: number, count: number) {
  if (count <= 1) return new THREE.Vector3();
  const radius = ringRadius(count);
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    Math.sin(angle * 2) * 4,
    Math.sin(angle) * radius,
  );
}

/** Give every tree a stable orientation while keeping the shared rotation speed. */
export function treeRotationPhase(treeId: string) {
  let hash = 2166136261;
  for (let index = 0; index < treeId.length; index += 1) {
    hash ^= treeId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff) * Math.PI * 2;
}

export function treePreviewRotation(treeId: string, elapsedSeconds: number, rotationStartedAt = 0) {
  return treeRotationPhase(treeId) + Math.max(0, elapsedSeconds - rotationStartedAt) * TREE_PREVIEW_ROTATION_SPEED;
}

export function buildTreePreviewAnchors(treeIds: readonly string[]) {
  return new Map(treeIds.map((treeId, index) => [treeId, treePreviewAnchor(index, treeIds.length)]));
}
