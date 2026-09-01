import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { QUALITY_CONFIG } from '../performance/qualityPolicy';

export type ScenePresence = 'intro' | 'active' | 'idle';

/**
 * 管理知识图谱的“生命状态”。装饰性呼吸只在入场或长时间闲置时运行；
 * 指针、滚轮、键盘、触控和节点悬停都会立即让图谱平滑回到可操作的中性姿态。
 */
export function ScenePresenceController({
  groupRef,
  activityKey,
  onPresenceChange,
}: {
  groupRef: MutableRefObject<THREE.Group | null>;
  activityKey: string;
  onPresenceChange: (presence: ScenePresence) => void;
}) {
  const { gl, invalidate } = useThree();
  const hoveredNodeId = useKnowledgeStore((state) => state.hoveredNodeId);
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const modeRef = useRef<ScenePresence>('intro');
  const idleTimerRef = useRef<number | null>(null);
  const introTimerRef = useRef<number | null>(null);
  const lifeFrameTimerRef = useRef<number | null>(null);
  const settlingRef = useRef(true);
  const activityKeyMountedRef = useRef(false);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  const setMode = useCallback((next: ScenePresence) => {
    if (modeRef.current === next) return;
    modeRef.current = next;
    settlingRef.current = true;
    onPresenceChange(next);
    invalidate();
  }, [invalidate, onPresenceChange]);

  const scheduleIdle = useCallback(() => {
    clearIdleTimer();
    if (useKnowledgeStore.getState().hoveredNodeId) return;
    idleTimerRef.current = window.setTimeout(() => {
      if (!useKnowledgeStore.getState().hoveredNodeId) setMode('idle');
    }, 9000);
  }, [clearIdleTimer, setMode]);

  const markActive = useCallback(() => {
    if (introTimerRef.current !== null) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    setMode('active');
    scheduleIdle();
  }, [scheduleIdle, setMode]);

  useEffect(() => {
    const element = gl.domElement;
    const activityEvents: Array<keyof HTMLElementEventMap> = ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'keydown'];
    activityEvents.forEach((eventName) => element.addEventListener(eventName, markActive, { passive: true }));

    onPresenceChange('intro');
    invalidate();
    introTimerRef.current = window.setTimeout(() => {
      setMode('active');
      scheduleIdle();
    }, 4800);

    return () => {
      activityEvents.forEach((eventName) => element.removeEventListener(eventName, markActive));
      clearIdleTimer();
      if (introTimerRef.current !== null) window.clearTimeout(introTimerRef.current);
      if (lifeFrameTimerRef.current !== null) window.clearTimeout(lifeFrameTimerRef.current);
    };
  }, [clearIdleTimer, gl, invalidate, markActive, onPresenceChange, scheduleIdle, setMode]);

  useEffect(() => {
    if (hoveredNodeId) {
      clearIdleTimer();
      setMode('active');
      return;
    }
    scheduleIdle();
  }, [clearIdleTimer, hoveredNodeId, scheduleIdle, setMode]);

  useEffect(() => {
    // 节点选择、目标切换和镜头意图变化都属于用户任务，优先退出闲置动画。
    if (!activityKeyMountedRef.current) {
      activityKeyMountedRef.current = true;
      return;
    }
    markActive();
  }, [activityKey, markActive]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const time = clock.elapsedTime;
    const life = QUALITY_CONFIG[quality].idleFps > 0 && (modeRef.current === 'intro' || modeRef.current === 'idle');
    const targetY = life ? Math.sin(time * 0.13) * 0.055 : 0;
    const targetX = life ? Math.sin(time * 0.09 + 0.8) * 0.012 : 0;
    const targetScaleXZ = life ? 1 + Math.sin(time * 0.24) * 0.011 : 1;
    const targetScaleY = life ? 1 + Math.sin(time * 0.19 + 1.2) * 0.006 : 1;
    const targetOffsetY = life ? Math.sin(time * 0.2 + 0.4) * 0.18 : 0;

    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, life ? 1.2 : 5.8, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetX, life ? 1.1 : 5.8, delta);
    group.scale.x = THREE.MathUtils.damp(group.scale.x, targetScaleXZ, life ? 1.4 : 6.2, delta);
    group.scale.z = THREE.MathUtils.damp(group.scale.z, targetScaleXZ, life ? 1.4 : 6.2, delta);
    group.scale.y = THREE.MathUtils.damp(group.scale.y, targetScaleY, life ? 1.4 : 6.2, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, targetOffsetY, life ? 1.2 : 6.2, delta);

    const settled = !life
      && Math.abs(group.rotation.y) < 0.0005
      && Math.abs(group.rotation.x) < 0.0005
      && Math.abs(group.scale.x - 1) < 0.0005
      && Math.abs(group.scale.y - 1) < 0.0005
      && Math.abs(group.position.y) < 0.0005;

    if (life || !settled) {
      settlingRef.current = true;
      if (life) {
        // 闲置生命感以约 25fps 更新，避免 Windows 集显为装饰动画持续满帧工作。
        if (lifeFrameTimerRef.current === null) {
          lifeFrameTimerRef.current = window.setTimeout(() => {
            lifeFrameTimerRef.current = null;
            invalidate();
          }, 1000 / QUALITY_CONFIG[quality].idleFps);
        }
      } else {
        invalidate();
      }
    } else if (settlingRef.current) {
      settlingRef.current = false;
      group.rotation.set(0, 0, 0);
      group.scale.set(1, 1, 1);
      group.position.set(0, 0, 0);
    }
  });

  return null;
}
