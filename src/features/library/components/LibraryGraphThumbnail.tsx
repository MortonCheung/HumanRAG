export interface ThumbNode {
  id: string;
  x: number;
  y: number;
}
export interface ThumbEdge {
  source: string;
  target: string;
}

/** 纯 SVG 静态知识库缩略图：不创建额外 WebGLRenderer（蓝图 §10.3）。 */
export function LibraryGraphThumbnail({
  nodes,
  edges,
  width = 400,
  height = 240,
}: {
  nodes: ThumbNode[];
  edges: ThumbEdge[];
  width?: number;
  height?: number;
}) {
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = xs.length > 0 ? Math.min(...xs) : -10;
  const maxX = xs.length > 0 ? Math.max(...xs) : 10;
  const minY = ys.length > 0 ? Math.min(...ys) : -10;
  const maxY = ys.length > 0 ? Math.max(...ys) : 10;
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const pad = 24;
  const sx = (x: number) => pad + ((x - minX) / spanX) * (width - pad * 2);
  const sy = (y: number) => pad + ((y - minY) / spanY) * (height - pad * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="知识库关系预览">
      {edges.map((edge, index) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (!source || !target) return null;
        return (
          <line
            key={`${edge.source}-${edge.target}-${index}`}
            x1={sx(source.x)}
            y1={sy(source.y)}
            x2={sx(target.x)}
            y2={sy(target.y)}
            stroke="rgba(215,184,106,0.35)"
            strokeWidth={0.8}
          />
        );
      })}
      {nodes.map((node, index) => (
        <circle
          key={node.id}
          cx={sx(node.x)}
          cy={sy(node.y)}
          r={index === 0 ? 4 : 2.6}
          fill={index === 0 ? '#d7b86a' : '#6b716b'}
        />
      ))}
    </svg>
  );
}
