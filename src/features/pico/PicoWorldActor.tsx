import { Suspense } from 'react';
import { usePicoStore } from './picoStore';
import { PicoModel } from './PicoActor';

/** World renderer owns its own cloned GLB; it is activated by the travel state in Phase G. */
export function PicoWorldActor({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const face = usePicoStore((state) => state.face);
  const presence = usePicoStore((state) => state.presence);
  if (presence === 'docked') return null;
  return <Suspense fallback={null}><group position={position} scale={1.15}><PicoModel face={face} /></group></Suspense>;
}
