import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { PicoFace } from './picoTypes';

const MODEL_PATH = '/models/Pico.glb';

class ActorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <span className="pico-actor-fallback" aria-hidden="true">P</span> : this.props.children; }
}

function CompanionFace({ face }: { face: PicoFace }) {
  const { invalidate } = useThree();
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#091015';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#c5efff';
    context.font = '600 58px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(face === 'thinking' ? '>...' : face === 'success' ? ':D' : face === 'error' ? '><' : '>_', 128, 68);
    texture.needsUpdate = true;
    invalidate();
  }, [face, invalidate, texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 0.28, 0.54]}>
    <planeGeometry args={[0.44, 0.22]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} />
  </mesh>;
}

export function PicoModel({ face }: { face: PicoFace }) {
  const gltf = useGLTF(MODEL_PATH);
  const object = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <group position={[0, -0.56, 0]} rotation={[0, 0, 0]} scale={1.05} dispose={null}>
    <primitive object={object} dispose={null} />
    <CompanionFace face={face} />
  </group>;
}

export function PicoActor({ face }: { face: PicoFace }) {
  return <ActorBoundary><Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0.25, 3.1], fov: 30 }} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={2.2} />
    <directionalLight position={[2, 3, 4]} intensity={2.8} color="#d8f5ff" />
    <Suspense fallback={null}><PicoModel face={face} /></Suspense>
  </Canvas></ActorBoundary>;
}
