import type { TeachingContentBlock } from '../../../data/v6/schemas/teachingSchema';
import { knowledgeGraph } from '../../../data/knowledgeGraph';

/** 讲解内容块的统一渲染：段落、对比、图示、示例、列表。 */
export function ContentBlockView({ block }: { block: TeachingContentBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p>{block.text}</p>;
    case 'key-contrast':
      return (
        <div className="key-contrast">
          {block.items.map((item) => (
            <div className="key-contrast__row" key={item.label}>
              <span className="key-contrast__label">{item.label}</span>
              <span className="key-contrast__text">{item.text}</span>
            </div>
          ))}
        </div>
      );
    case 'diagram':
      return <DiagramBlock block={block} />;
    case 'example':
      return (
        <div className="worked-example">
          <h4 className="worked-example__title">{block.title}</h4>
          <p className="worked-example__prompt">{block.prompt}</p>
          <ol className="worked-example__steps">
            {block.walkthrough.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      );
    case 'list':
      return (
        <div>
          <p style={{ marginTop: 14, marginBottom: 4, color: 'var(--it-text)', fontWeight: 560, fontSize: 14 }}>
            {block.title}
          </p>
          <ul className="summary-list">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}

function DiagramBlock({
  block,
}: {
  block: Extract<TeachingContentBlock, { kind: 'diagram' }>;
}) {
  const positions = block.nodes.map((name, index) => ({
    name,
    x: 80 + index * 220,
    y: 40,
  }));
  return (
    <figure className="stage-diagram">
      <svg viewBox={`0 0 ${80 + block.nodes.length * 220} 80`} role="img" aria-label={block.caption}>
        {positions.slice(0, -1).map((position, index) => {
          const next = positions[index + 1];
          return (
            <g key={`edge-${position.name}`}>
              <path
                d={`M ${position.x + 60} ${position.y} L ${next.x - 60} ${next.y}`}
                stroke="rgba(215,184,106,0.5)"
                strokeWidth={1}
              />
              <circle cx={next.x - 60} cy={next.y} r={2.5} fill="#d7b86a" />
            </g>
          );
        })}
        {positions.map((position) => (
          <g key={position.name}>
            <rect
              x={position.x - 60}
              y={position.y - 16}
              width={120}
              height={32}
              rx={7}
              fill="#111414"
              stroke="rgba(240,239,233,0.18)"
            />
            <text x={position.x} y={position.y + 4} fill="#f0efe9" fontSize={12} textAnchor="middle">
              {position.name}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>{block.caption}</figcaption>
    </figure>
  );
}

/** 供图示组件使用的辅助：通过节点 id 查名称。 */
export function nodeNameOf(nodeId: string): string {
  return knowledgeGraph.nodes.find((node) => node.id === nodeId)?.name ?? nodeId;
}
