import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

export function NodeRelationPreview({
  name,
  color,
  relationNames,
}: {
  name: string;
  color: string;
  relationNames: string[];
}) {
  const rootRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();
  const names = useMemo(() => relationNames.filter(Boolean).slice(0, 6), [relationNames]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return undefined;
    let cancelled = false;
    let scope: { revert: () => void } | null = null;

    void import('animejs').then(({ animate, createScope, stagger }) => {
      if (cancelled || !root.isConnected) return;
      scope = createScope({ root }).add(() => {
        animate('.atelier-topology__edge', {
          strokeDashoffset: [1, 0],
          opacity: [0, 0.72],
          duration: 520,
          delay: stagger(45),
          ease: 'outQuint',
        });
        animate('.atelier-topology__node', {
          scale: [0.45, 1],
          opacity: [0, 1],
          duration: 460,
          delay: stagger(58, { start: 90, from: 'center' }),
          ease: 'out(3)',
        });
      });
    });

    return () => {
      cancelled = true;
      scope?.revert();
    };
  }, [names, reducedMotion]);

  const satellites = names.length ? names : ['前置知识', '相关知识', '后续知识'];
  return (
    <svg ref={rootRef} className="atelier-topology" viewBox="0 0 340 150" role="img" aria-label="节点关系预览">
      {satellites.map((item, index) => {
        const angle = -Math.PI * 0.82 + (index / Math.max(1, satellites.length - 1)) * Math.PI * 1.64;
        const x = 170 + Math.cos(angle) * 122;
        const y = 77 + Math.sin(angle) * 52;
        return (
          <g key={`${item}-${index}`}>
            <line className="atelier-topology__edge" pathLength="1" x1="170" y1="75" x2={x} y2={y} />
            <g className="atelier-topology__node" transform={`translate(${x} ${y})`}>
              <circle r="4" fill={color} />
              <text y={y < 75 ? -10 : 17} textAnchor="middle">{item.slice(0, 8)}</text>
            </g>
          </g>
        );
      })}
      <g className="atelier-topology__node" transform="translate(170 75)">
        <circle className="atelier-topology__core-halo" r="17" fill={color} />
        <circle r="6" fill="#fffdf3" />
        <text y="30" textAnchor="middle">{name || '新知识节点'}</text>
      </g>
    </svg>
  );
}
