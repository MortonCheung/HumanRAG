import { Suspense, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel } from '../../graph/types';
import { usePicoStore } from './picoStore';
import { PicoModel } from './PicoActor';
import { easeOutCubic, picoCameraAxes, picoFlightControl, picoNodeTarget, PICO_FLIGHT_DURATION_MS, quadraticBezier } from './picoTravel';

interface FlightState {
  nonce: number;
  returning: boolean;
  startedAt: number;
  start: THREE.Vector3;
  control: THREE.Vector3;
  end: THREE.Vector3;
}

/** Universe-only renderer. The dock and world share state, but clone the static GLB independently. */
export function PicoWorldActor({ model, motionAllowed }: { model: SceneModel; motionAllowed: boolean }) {
  const face = usePicoStore((state) => state.face);
  const motion = usePicoStore((state) => state.motion);
  const motionNonce = usePicoStore((state) => state.motionNonce);
  const presence = usePicoStore((state) => state.presence);
  const targetId = usePicoStore((state) => state.travelTargetId);
  const travelNonce = usePicoStore((state) => state.travelNonce);
  const finishTravel = usePicoStore((state) => state.finishTravel);
  const finishReturn = usePicoStore((state) => state.finishReturn);
  const actor = useRef<THREE.Group>(null);
  const flight = useRef<FlightState | null>(null);
  const hasWorldPosition = useRef(false);
  const scratch = useRef(new THREE.Vector3());
  const { camera, gl, invalidate, viewport } = useThree();

  useEffect(() => {
    gl.domElement.dataset.picoPresence = presence;
    if (targetId) gl.domElement.dataset.picoTargetId = targetId;
    else delete gl.domElement.dataset.picoTargetId;
    gl.domElement.dataset.picoTravelNonce = String(travelNonce);
    if (presence === 'docked') gl.domElement.dataset.picoFlightProgress = '0.000';
  }, [gl.domElement, presence, targetId, travelNonce]);

  useEffect(() => {
    const group = actor.current;
    if (!group) return;
    if (presence === 'docked') {
      group.visible = false;
      flight.current = null;
      hasWorldPosition.current = false;
      invalidate();
      return;
    }
    if (presence === 'perched') {
      group.visible = true;
      return;
    }
    if (flight.current?.nonce === travelNonce && flight.current.returning === (presence === 'returning')) return;
    const node = model.nodes.find((candidate) => candidate.id === targetId);
    if (!node) return;
    const nodePosition = new THREE.Vector3(...node.displayPosition);
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    const { right, up } = picoCameraAxes(cameraDirection, camera.up);
    const perch = picoNodeTarget(nodePosition, node.coreRadius, cameraDirection, camera.up);
    const currentViewport = viewport.getCurrentViewport(camera, perch);
    const edgeDistance = Math.max(5, currentViewport.width * 0.55);
    const edge = perch.clone().addScaledVector(right, edgeDistance).addScaledVector(up, 0.35);
    const returning = presence === 'returning';
    const start = hasWorldPosition.current ? group.position.clone() : edge;
    const end = returning ? edge : perch;
    group.visible = true;
    group.position.copy(start);
    group.scale.setScalar(returning ? 1 : hasWorldPosition.current ? 1 : 0.72);
    flight.current = {
      nonce: travelNonce,
      returning,
      startedAt: Date.now(),
      start,
      control: picoFlightControl(start, end, up),
      end,
    };
    hasWorldPosition.current = true;
    invalidate();
  }, [camera, invalidate, model.nodes, presence, targetId, travelNonce, viewport]);

  useFrame(() => {
    const group = actor.current;
    const current = flight.current;
    if (!group || !group.visible) return;
    group.quaternion.copy(camera.quaternion);
    if (!current) return;
    if (!motionAllowed) {
      group.position.copy(current.end);
      group.scale.setScalar(current.returning ? 0.72 : 1);
      flight.current = null;
      if (current.returning) finishReturn(current.nonce);
      else finishTravel(current.nonce);
      invalidate();
      return;
    }
    const linear = (Date.now() - current.startedAt) / PICO_FLIGHT_DURATION_MS;
    const progress = easeOutCubic(linear);
    gl.domElement.dataset.picoFlightProgress = Math.min(1, linear).toFixed(3);
    quadraticBezier(current.start, current.control, current.end, progress, scratch.current);
    group.position.copy(scratch.current);
    group.scale.setScalar(current.returning
      ? THREE.MathUtils.lerp(1, 0.72, progress)
      : THREE.MathUtils.lerp(0.72, 1, progress));
    if (linear < 1) {
      invalidate();
      return;
    }
    group.position.copy(current.end);
    gl.domElement.dataset.picoFlightProgress = '1.000';
    flight.current = null;
    if (current.returning) finishReturn(current.nonce);
    else finishTravel(current.nonce);
  });

  useEffect(() => () => {
    delete gl.domElement.dataset.picoPresence;
    delete gl.domElement.dataset.picoTargetId;
    delete gl.domElement.dataset.picoTravelNonce;
    delete gl.domElement.dataset.picoFlightProgress;
  }, [gl.domElement]);

  return <>
    <ambientLight intensity={1.35} />
    <directionalLight position={[4, 8, 6]} intensity={1.8} color="#d8f5ff" />
    <group ref={actor} visible={false} scale={0.72}>
      <Suspense fallback={null}><PicoModel face={face} motion={motion} motionNonce={motionNonce} motionAllowed={motionAllowed && presence !== 'docked'} /></Suspense>
    </group>
  </>;
}
