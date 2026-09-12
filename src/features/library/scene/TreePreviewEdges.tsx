import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { CustomEdge } from '../../../store/libraryStore';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { QUALITY_CONFIG } from '../../../performance/qualityPolicy';
import type { TreePositionMap } from '../../library-builder/customTreeLayout';

export const treeEdgeBuildShader = `
  uniform float uBuild;
  varying float vProgress;
  void main() {
    float distanceToEnd=min(vProgress,1.0-vProgress)*2.0;
    float visible=1.0-smoothstep(uBuild,uBuild+0.08,distanceToEnd);
    vec3 color=mix(vec3(0.43,0.62,0.75),vec3(0.78,0.91,1.0),visible*0.35);
    gl_FragColor=vec4(color,0.30*visible);
  }
`;

const treeEdgeVertexShader = `
  attribute float aProgress;
  varying float vProgress;
  void main() {
    vProgress=aProgress;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;

/** The completed extraction and every Library preview share this exact curve geometry. */
export function buildTreePreviewEdgeGeometry(edges: readonly CustomEdge[], positions: TreePositionMap, segments: number) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(edges.length * segments * 2 * 3);
  const progress = new Float32Array(edges.length * segments * 2);
  const point = new THREE.Vector3();
  let vertex = 0;
  edges.forEach((edge) => {
    const start = positions.get(edge.source);
    const end = positions.get(edge.target);
    if (!start || !end) return;
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const mid = a.clone().lerp(b, 0.5);
    mid.z += Math.min(2.8, a.distanceTo(b) * 0.16) * (edge.relationType === 'related' ? -1 : 1);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    for (let segment = 0; segment < segments; segment += 1) {
      for (const t of [segment / segments, (segment + 1) / segments]) {
        curve.getPoint(t, point).toArray(vertices, vertex * 3);
        progress[vertex] = t;
        vertex += 1;
      }
    }
  });
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));
  geometry.setDrawRange(0, vertex);
  geometry.computeBoundingSphere();
  return geometry;
}

export function TreePreviewEdges({ edges, positions, getBuild }: {
  edges: readonly CustomEdge[];
  positions: TreePositionMap;
  getBuild?: () => number;
}) {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const segments = QUALITY_CONFIG[quality].curveSegments;
  const geometry = useMemo(() => buildTreePreviewEdgeGeometry(edges, positions, segments), [edges, positions, segments]);
  const uniforms = useMemo(() => ({ uBuild: { value: getBuild ? 0 : 1 } }), []);
  useFrame(() => { uniforms.uBuild.value = getBuild?.() ?? 1; });
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry} raycast={() => null}>
    <shaderMaterial
      vertexShader={treeEdgeVertexShader}
      fragmentShader={treeEdgeBuildShader}
      uniforms={uniforms}
      transparent
      depthTest={false}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </lineSegments>;
}
