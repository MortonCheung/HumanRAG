import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneModel, VisualState } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';

const OPACITY: Record<VisualState, number> = { dormant: 0.16, contextual: 0.35, lensActive: 0.72, upstream: 0.95, downstream: 0.95, lateral: 0.6, selected: 1, recommendedPath: 0.92, searchMatch: 1 };

const vertex = `attribute float aSize; attribute float aOpacity; attribute vec3 color; varying vec3 vColor; varying float vOpacity; uniform float uTime; uniform float uLife; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); float pulse=1.0+sin(uTime*2.15+position.x*0.23+position.z*0.17)*(0.026*uLife); gl_PointSize=clamp(aSize*pulse*(250.0/max(1.0,-mv.z)),3.0,42.0); gl_Position=projectionMatrix*mv; vColor=color; vOpacity=aOpacity; }`;
const fragment = `varying vec3 vColor; varying float vOpacity; void main(){ vec2 uv=gl_PointCoord-0.5; float d=length(uv)*2.0; if(d>1.0) discard; float core=1.0-smoothstep(0.12,0.34,d); float membrane=(1.0-smoothstep(0.38,0.62,d))*0.35; float halo=(1.0-smoothstep(0.25,1.0,d))*0.17; gl_FragColor=vec4(vColor,(core+membrane+halo)*vOpacity); }`;

export function NodePointField({
  model,
  lifeActive,
}: {
  model: SceneModel;
  lifeActive: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const hoveredNodeId = useKnowledgeStore((state) => state.hoveredNodeId);
  const { invalidate } = useThree();
  const geometry = useMemo(() => {
    const positions = new Float32Array(model.nodes.length * 3);
    const colors = new Float32Array(model.nodes.length * 3);
    const sizes = new Float32Array(model.nodes.length);
    const opacity = new Float32Array(model.nodes.length);
    const color = new THREE.Color();
    model.nodes.forEach((node, index) => {
      positions.set(node.displayPosition, index * 3);
      color.set(node.visualState === 'selected' ? '#fff7e6' : node.domainColor);
      colors.set([color.r, color.g, color.b], index * 3);
      sizes[index] = (node.visualState === 'selected' ? 1.7 : node.visualState === 'upstream' || node.visualState === 'downstream' ? 1.35 : 1) * (node.coreRadius * 24 + 4);
      opacity[index] = OPACITY[node.visualState];
    });
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    next.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    next.setAttribute('aOpacity', new THREE.BufferAttribute(opacity, 1));
    return next;
  }, [model]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uLife: { value: 0 } },
  }), []);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    return () => { geometry.dispose(); };
  }, [geometry]);

  useEffect(() => {
    material.uniforms.uLife.value = lifeActive ? 1 : 0;
    invalidate();
  }, [invalidate, lifeActive, material]);

  useEffect(() => {
    const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttribute = geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const opacityAttribute = geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
    const baseColor = new THREE.Color();
    const hoverColor = new THREE.Color('#fff8dc');

    model.nodes.forEach((node, index) => {
      const hovered = node.id === hoveredNodeId;
      baseColor.set(node.visualState === 'selected' ? '#fff7e6' : node.domainColor);
      if (hovered && node.visualState !== 'selected') baseColor.lerp(hoverColor, 0.28);
      colorAttribute.setXYZ(index, baseColor.r, baseColor.g, baseColor.b);
      const stateScale = node.visualState === 'selected'
        ? 1.7
        : node.visualState === 'upstream' || node.visualState === 'downstream' ? 1.35 : 1;
      sizeAttribute.setX(index, stateScale * (node.coreRadius * 24 + 4) * (hovered ? 1.24 : 1));
      opacityAttribute.setX(index, hovered ? Math.max(0.92, OPACITY[node.visualState]) : OPACITY[node.visualState]);
    });

    colorAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;
    opacityAttribute.needsUpdate = true;
    invalidate();
  }, [geometry, hoveredNodeId, invalidate, model.nodes]);

  useFrame(({ clock }) => { material.uniforms.uTime.value = clock.elapsedTime; });

  return (
    <points
      ref={points}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
