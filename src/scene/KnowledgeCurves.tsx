import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildEdgeCurve } from '../graph/curves';
import type { SceneEdge } from '../graph/types';

const EDGE_STYLE = {
  background: { color: '#25303b', opacity: 0.045 },
  contextual: { color: '#5c7083', opacity: 0.2 },
  active: { color: '#8ba0b4', opacity: 0.42 },
  path: { color: '#9fc7ff', opacity: 0.9 },
} as const;

function CurveLine({ edge, positions }: { edge: SceneEdge; positions: React.MutableRefObject<Map<string, THREE.Vector3>> }) {
  const signal = useRef<THREE.Mesh>(null);
  const currentCurve = useRef<THREE.Curve<THREE.Vector3> | null>(null);
  const lastSource = useRef(new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0));
  const lastTarget = useRef(new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0));
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(new Float32Array(25 * 3), 3));
    return next;
  }, []);
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: EDGE_STYLE[edge.visualState].color, transparent: true, opacity: EDGE_STYLE[edge.visualState].opacity, depthWrite: false }),
    [],
  );
  const lineObject = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const source = positions.current.get(edge.source);
    const target = positions.current.get(edge.target);
    if (!source || !target) return;
    const moved = source.distanceToSquared(lastSource.current) > 0.000001 || target.distanceToSquared(lastTarget.current) > 0.000001;
    if (moved) {
      const curve = buildEdgeCurve(edge, source.toArray(), target.toArray());
      currentCurve.current = curve;
      const points = curve.getPoints(24);
      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      points.forEach((point, index) => attribute.setXYZ(index, point.x, point.y, point.z));
      attribute.needsUpdate = true;
      lastSource.current.copy(source);
      lastTarget.current.copy(target);
    }
    material.color.set(EDGE_STYLE[edge.visualState].color);
    material.opacity = THREE.MathUtils.lerp(material.opacity, EDGE_STYLE[edge.visualState].opacity, 0.12);
    if (signal.current && edge.visualState === 'path' && currentCurve.current) {
      const progress = (clock.elapsedTime * 0.16 + (edge.id.length % 9) / 9) % 1;
      signal.current.position.copy(currentCurve.current.getPoint(progress));
    }
  });

  return (
    <group>
      <primitive object={lineObject} />
      {edge.visualState === 'path' && (
        <mesh ref={signal}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshBasicMaterial color="#dcebff" transparent opacity={0.94} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function KnowledgeCurves({ edges, positions }: { edges: SceneEdge[]; positions: React.MutableRefObject<Map<string, THREE.Vector3>> }) {
  return <group>{edges.map((edge) => <CurveLine key={edge.id} edge={edge} positions={positions} />)}</group>;
}
