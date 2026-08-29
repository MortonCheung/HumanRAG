import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export function ScreenAnchorTracker({ selectedNodeId, positions }: { selectedNodeId: string | null; positions: React.MutableRefObject<Map<string, THREE.Vector3>> }) {
  const { camera, size } = useThree();
  const projected = useMemo(() => new THREE.Vector3(), []);
  const shellRef = useRef<HTMLElement | null>(null);

  useFrame(() => {
    if (!selectedNodeId) return;
    const position = positions.current.get(selectedNodeId);
    const shell = shellRef.current ?? document.querySelector<HTMLElement>('.app-shell');
    if (!position || !shell) return;
    shellRef.current = shell;
    projected.copy(position).project(camera);
    const x = THREE.MathUtils.clamp((projected.x * 0.5 + 0.5) * size.width, 24, size.width - 24);
    const y = THREE.MathUtils.clamp((-projected.y * 0.5 + 0.5) * size.height, 24, size.height - 24);
    shell.style.setProperty('--node-screen-x', `${x}px`);
    shell.style.setProperty('--node-screen-y', `${y}px`);
  });
  return null;
}
