import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildEdgeCurve } from '../graph/curves';
import type { EdgeVisualState, SceneEdge } from '../graph/types';
import { CHAIN_GOLD, HOT_CORE } from '../design/domainPalette';

const EDGE_STYLE: Record<EdgeVisualState, { color: string; opacity: number }> = {
  background: { color: '#172027', opacity: 0.075 },
  contextual: { color: '#475864', opacity: 0.22 },
  lensActive: { color: '#718993', opacity: 0.42 },
  upstream: { color: HOT_CORE, opacity: 0.76 },
  downstream: { color: CHAIN_GOLD, opacity: 0.82 },
  lateral: { color: '#a28585', opacity: 0.38 },
  path: { color: CHAIN_GOLD, opacity: 0.88 },
};

function CurveLine({ edge, positions }: { edge: SceneEdge; positions: React.MutableRefObject<Map<string, THREE.Vector3>> }) {
  const currentCurve = useRef<THREE.Curve<THREE.Vector3> | null>(null);
  const lastSource = useRef(new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0));
  const lastTarget = useRef(new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0));
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(new Float32Array(31 * 3), 3));
    return next;
  }, []);
  const material = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }), []);
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
      const points = curve.getPoints(30);
      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      points.forEach((point, index) => attribute.setXYZ(index, point.x, point.y, point.z));
      attribute.needsUpdate = true;
      lastSource.current.copy(source);
      lastTarget.current.copy(target);
    }
    const style = EDGE_STYLE[edge.visualState];
    const traversing = edge.visualState === 'upstream' || edge.visualState === 'downstream' || edge.visualState === 'path';
    const signal = traversing ? 0.72 + Math.max(0, Math.sin(clock.elapsedTime * 4.8 - edge.propagationDelay * 16)) * 0.28 : 1;
    material.color.set(style.color);
    material.opacity = THREE.MathUtils.lerp(material.opacity, style.opacity * signal, 0.12);
  });

  return <primitive object={lineObject} />;
}

export function KnowledgeCurves({ edges, positions }: { edges: SceneEdge[]; positions: React.MutableRefObject<Map<string, THREE.Vector3>> }) {
  return <group>{edges.map((edge) => <CurveLine key={edge.id} edge={edge} positions={positions} />)}</group>;
}
