import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel } from '../graph/types';

const DRAG_THRESHOLD = 7;

/**
 * 屏幕空间拾取：点击范围以 CSS 像素计算，不依赖发光点大小、设备像素比或显卡。
 * 所有节点都进入同一最近点计算，拖动画布时不会误触选择。
 */
export function NodeHitField({ model, onHover, onSelect, enabled = true }: {
  model: SceneModel;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  enabled?: boolean;
}) {
  const anchor = useRef<THREE.Group>(null);
  const currentPositions = useRef(model.nodes.map((node) => new THREE.Vector3(...node.displayPosition)));
  const modelRef = useRef(model);
  modelRef.current = model;
  const pointerDown = useRef<{ x: number; y: number; id: number } | null>(null);
  const hoverFrame = useRef<number | null>(null);
  const { camera, gl } = useThree();

  useEffect(() => {
    currentPositions.current = model.nodes.map((node) => new THREE.Vector3(...node.displayPosition));
  }, [model.nodes]);

  useEffect(() => {
    if (!enabled) { pointerDown.current = null; onHover(null); return; }
    const canvas = gl.domElement;
    const projected = new THREE.Vector3();
    const world = new THREE.Vector3();
    const findNearest = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestDepth = Number.POSITIVE_INFINITY;
      anchor.current?.updateWorldMatrix(true, false);
      modelRef.current.nodes.forEach((node, index) => {
        const position = currentPositions.current[index];
        if (!position) return;
        world.copy(position);
        if (anchor.current) world.applyMatrix4(anchor.current.matrixWorld);
        projected.copy(world).project(camera);
        if (projected.z < -1 || projected.z > 1) return;
        const screenX = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
        const screenY = rect.top + (-projected.y * 0.5 + 0.5) * rect.height;
        const distance = Math.hypot(screenX - clientX, screenY - clientY);
        const radius = node.visualState === 'selected' ? 19 : node.visualState === 'dormant' ? 12 : 15;
        if (distance > radius) return;
        if (distance < bestDistance - 0.5 || (Math.abs(distance - bestDistance) <= 0.5 && projected.z < bestDepth)) {
          bestId = node.id;
          bestDistance = distance;
          bestDepth = projected.z;
        }
      });
      return bestId;
    };
    const down = (event: PointerEvent) => { if (event.button === 0) pointerDown.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; };
    const move = (event: PointerEvent) => {
      if (event.buttons) { onHover(null); return; }
      if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current);
      hoverFrame.current = requestAnimationFrame(() => {
        onHover(findNearest(event.clientX, event.clientY));
        hoverFrame.current = null;
      });
    };
    const up = (event: PointerEvent) => {
      const start = pointerDown.current;
      pointerDown.current = null;
      if (!start || start.id !== event.pointerId || event.button !== 0 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD) return;
      const id = findNearest(event.clientX, event.clientY);
      if (id) onSelect(id);
    };
    const leave = () => { pointerDown.current = null; onHover(null); };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointercancel', leave);
    return () => {
      if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointercancel', leave);
    };
  }, [camera, gl, enabled, onHover, onSelect]);

  return <group ref={anchor} />;
}
