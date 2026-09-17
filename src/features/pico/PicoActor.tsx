import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { PicoFace, PicoMotion } from './picoTypes';
import { PICO_CALIBRATION, PICO_CAMERA } from './picoCalibration';

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
  return <mesh position={PICO_CALIBRATION.facePosition} rotation={PICO_CALIBRATION.faceRotation}>
    <planeGeometry args={PICO_CALIBRATION.faceSize} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} />
  </mesh>;
}

const ACTION_DURATION: Record<PicoMotion, number> = {
  idle: 820,
  attention: 620,
  hop: 720,
  wobble: 560,
  turn: 680,
};

export function PicoModel({ face, motion = 'idle', motionNonce = 0, motionAllowed = true }: {
  face: PicoFace;
  motion?: PicoMotion;
  motionNonce?: number;
  motionAllowed?: boolean;
}) {
  const gltf = useGLTF(MODEL_PATH);
  const object = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const actor = useRef<THREE.Group>(null);
  const action = useRef<{ kind: PicoMotion; startedAt: number; duration: number } | null>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    if (!motionAllowed) {
      action.current = null;
      if (actor.current) {
        actor.current.position.set(...PICO_CALIBRATION.visualOffset);
        actor.current.rotation.set(0, 0, 0);
      }
      invalidate();
      return;
    }
    if (motionNonce > 0 && motion !== 'idle') {
      action.current = { kind: motion, startedAt: performance.now(), duration: ACTION_DURATION[motion] };
      invalidate();
    }
  }, [invalidate, motion, motionAllowed, motionNonce]);

  useEffect(() => {
    if (!motionAllowed || motion !== 'idle') return;
    let timeout = 0;
    const schedule = () => {
      timeout = window.setTimeout(() => {
        action.current = { kind: 'idle', startedAt: performance.now(), duration: ACTION_DURATION.idle };
        invalidate();
        schedule();
      }, 10_000 + Math.random() * 8_000);
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, [invalidate, motion, motionAllowed, motionNonce]);

  useFrame(() => {
    const group = actor.current;
    const current = action.current;
    if (!group || !current || !motionAllowed) return;
    const progress = THREE.MathUtils.clamp((performance.now() - current.startedAt) / current.duration, 0, 1);
    const pulse = Math.sin(progress * Math.PI);
    group.position.set(...PICO_CALIBRATION.visualOffset);
    group.rotation.set(0, 0, 0);
    if (current.kind === 'idle') {
      group.position.y += pulse * 0.035;
      group.rotation.y = Math.sin(progress * Math.PI * 2) * 0.035;
    } else if (current.kind === 'attention') {
      group.rotation.z = -pulse * 0.11;
      group.rotation.y = pulse * 0.12;
    } else if (current.kind === 'hop') {
      group.position.y += Math.sin(progress * Math.PI) * 0.16;
    } else if (current.kind === 'wobble') {
      group.rotation.z = Math.sin(progress * Math.PI * 5) * (1 - progress) * 0.14;
    } else if (current.kind === 'turn') {
      group.position.x += Math.sin(progress * Math.PI) * 0.06;
      group.rotation.y = Math.sin(progress * Math.PI) * 0.3;
    }
    if (progress < 1) invalidate();
    else {
      group.position.set(...PICO_CALIBRATION.visualOffset);
      group.rotation.set(0, 0, 0);
      action.current = null;
    }
  });

  return <group ref={actor} position={PICO_CALIBRATION.visualOffset} rotation={[0, 0, 0]} scale={PICO_CALIBRATION.visualScale} dispose={null}>
    <primitive object={object} dispose={null} />
    <CompanionFace face={face} />
  </group>;
}

export function PicoActor({ face, motion = 'idle', motionNonce = 0, motionAllowed = true }: {
  face: PicoFace;
  motion?: PicoMotion;
  motionNonce?: number;
  motionAllowed?: boolean;
}) {
  return <ActorBoundary><Canvas frameloop="demand" dpr={[1, 1.5]} camera={PICO_CAMERA} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={2.2} />
    <directionalLight position={[2, 3, 4]} intensity={2.8} color="#d8f5ff" />
    <Suspense fallback={null}><PicoModel face={face} motion={motion} motionNonce={motionNonce} motionAllowed={motionAllowed} /></Suspense>
  </Canvas></ActorBoundary>;
}
