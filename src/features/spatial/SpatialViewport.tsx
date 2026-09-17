import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface ViewportRect { left: number; top: number; width: number; height: number }
type Occluder = 'navigation' | 'inspector' | 'stage' | 'pico';
interface SpatialViewportValue {
  rect: ViewportRect;
  picoRect: ViewportRect | null;
  register: (kind: Occluder, element: HTMLElement | null) => void;
  measure: () => void;
}
const SpatialViewportContext = createContext<SpatialViewportValue | null>(null);

/** Geometry, not camera constants, defines the usable canvas rectangle. */
export function usableViewport(width: number, height: number, navigation?: ViewportRect, inspector?: ViewportRect, stage?: ViewportRect, pico?: ViewportRect): ViewportRect {
  if (stage) {
    const left = Math.max(0, stage.left);
    const right = Math.min(width, stage.left + stage.width, pico?.left ?? width);
    return {
      left,
      top: Math.max(0, stage.top),
      width: Math.max(0, right - left),
      height: Math.max(0, Math.min(height, stage.top + stage.height) - Math.max(0, stage.top)),
    };
  }
  const top = Math.min(height, Math.max(0, navigation ? navigation.top + navigation.height : 0));
  let right = width;
  let bottom = height;
  if (inspector) {
    // A wide panel is a bottom sheet; a tall narrow panel is docked to the side.
    if (inspector.width >= width * 0.65) bottom = Math.max(top, inspector.top);
    else right = Math.max(0, inspector.left);
  }
  if (pico) right = Math.min(right, Math.max(0, pico.left));
  return { left: 0, top, width: right, height: bottom - top };
}

export function SpatialViewportProvider({ children }: { children: ReactNode }) {
  const elements = useRef(new Map<Occluder, HTMLElement>());
  const observer = useRef<ResizeObserver | null>(null);
  const [rect, setRect] = useState<ViewportRect>(() => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }));
  const [picoRect, setPicoRect] = useState<ViewportRect | null>(null);
  const measure = useCallback(() => {
    const bounds = (kind: Occluder) => elements.current.get(kind)?.getBoundingClientRect();
    const pico = bounds('pico') ?? null;
    const next = usableViewport(window.innerWidth, window.innerHeight, bounds('navigation'), bounds('inspector'), bounds('stage'), pico ?? undefined);
    setRect((previous) => Object.keys(next).every((key) => Math.abs(previous[key as keyof ViewportRect] - next[key as keyof ViewportRect]) < 0.5) ? previous : next);
    setPicoRect((previous) => {
      if (previous === pico) return previous;
      if (previous && pico && Object.keys(pico).every((key) => Math.abs(previous[key as keyof ViewportRect] - pico[key as keyof ViewportRect]) < 0.5)) return previous;
      return pico;
    });
  }, []);
  const register = useCallback((kind: Occluder, element: HTMLElement | null) => {
    const previous = elements.current.get(kind);
    if (previous) observer.current?.unobserve(previous);
    if (element) { elements.current.set(kind, element); observer.current?.observe(element); }
    else elements.current.delete(kind);
    measure();
  }, [measure]);
  useLayoutEffect(() => {
    observer.current = new ResizeObserver(measure);
    elements.current.forEach((element) => observer.current?.observe(element));
    window.addEventListener('resize', measure);
    measure();
    return () => { observer.current?.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);
  const value = useMemo(() => ({ rect, picoRect, register, measure }), [rect, picoRect, register, measure]);
  return <SpatialViewportContext.Provider value={value}>{children}</SpatialViewportContext.Provider>;
}

export function useSpatialOccluder(kind: Occluder, active = true) {
  const context = useContext(SpatialViewportContext);
  const register = context?.register;
  const ref = useCallback((element: HTMLElement | null) => { register?.(kind, active ? element : null); }, [register, kind, active]);
  return { ref, measure: context?.measure };
}
export function useSpatialViewport() { return useContext(SpatialViewportContext)?.rect; }
/** The Pico Dock rectangle on its own, so camera composition can yield to the dock without inheriting other occluders. */
export function useSpatialPicoRect() { return useContext(SpatialViewportContext)?.picoRect ?? null; }
