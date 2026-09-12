import * as THREE from 'three';

export const TREE_PREVIEW_SPACING = 82;

/** Library order is persistent, so an appended tree never moves an existing anchor. */
export function treePreviewAnchor(index: number) {
  return new THREE.Vector3(index * TREE_PREVIEW_SPACING, 0, 0);
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

export function buildTreePreviewAnchors(treeIds: readonly string[]) {
  return new Map(treeIds.map((treeId, index) => [treeId, treePreviewAnchor(index)]));
}
