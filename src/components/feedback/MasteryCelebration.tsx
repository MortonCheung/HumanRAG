import { useEffect, useRef, useState } from 'react';
import { Check } from '@phosphor-icons/react';
import './mastery-celebration.css';

interface MasteryCelebrationProps {
  label: string;
  compact?: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 完成时的一次性确认反馈。动画数据来自本地 public/lottie，播放器只在组件挂载后异步加载。
 * 低动态偏好或播放器加载失败时使用静态 Check，完成信息不依赖动画表达。
 */
export function MasteryCelebration({ label, compact = false }: MasteryCelebrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [useStaticMark, setUseStaticMark] = useState(prefersReducedMotion);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handlePreferenceChange = () => setUseStaticMark(media.matches);
    media.addEventListener('change', handlePreferenceChange);
    return () => media.removeEventListener('change', handlePreferenceChange);
  }, []);

  useEffect(() => {
    if (useStaticMark || !containerRef.current) return;

    let disposed = false;
    let animation: { destroy: () => void } | undefined;

    void import('lottie-web')
      .then(({ default: lottie }) => {
        if (disposed || !containerRef.current) return;
        animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          path: '/lottie/mastery-check.json',
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
          },
        });
      })
      .catch(() => {
        if (!disposed) setUseStaticMark(true);
      });

    return () => {
      disposed = true;
      animation?.destroy();
    };
  }, [useStaticMark]);

  return (
    <div
      className={`mastery-celebration ${compact ? 'mastery-celebration--compact' : ''}`}
      role="img"
      aria-label={label}
    >
      {useStaticMark ? (
        <span className="mastery-celebration__static" aria-hidden="true">
          <Check size={compact ? 34 : 46} weight="bold" />
        </span>
      ) : (
        <div className="mastery-celebration__animation" ref={containerRef} aria-hidden="true" />
      )}
    </div>
  );
}
