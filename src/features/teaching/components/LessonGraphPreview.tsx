import { knowledgeGraph } from '../../../data/knowledgeGraph';

/** 宽幅知识关系预览：本节知识在完整知识图谱中的上下游（静态 SVG，确定性布局）。 */
export function LessonGraphPreview({ nodeId }: { nodeId: string }) {
  const node = knowledgeGraph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;

  const upstream = knowledgeGraph.edges
    .filter((edge) => edge.relationType === 'prerequisite' && edge.target === nodeId)
    .map((edge) => knowledgeGraph.nodes.find((candidate) => candidate.id === edge.source))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .slice(0, 4);
  const downstream = knowledgeGraph.edges
    .filter((edge) => edge.relationType === 'prerequisite' && edge.source === nodeId)
    .map((edge) => knowledgeGraph.nodes.find((candidate) => candidate.id === edge.target))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .slice(0, 4);

  const width = 1080;
  const rowHeight = 34;
  const upstreamCount = Math.max(upstream.length, 1);
  const downstreamCount = Math.max(downstream.length, 1);
  const rows = Math.max(upstreamCount, downstreamCount);
  const height = rows * rowHeight + 40;
  const centerX = width / 2;

  return (
    <section className="panel lesson-graph-preview" style={{ gridColumn: 'span 12' }}>
      <p className="panel-kicker">宽幅关系预览</p>
      <h3 className="panel-title" style={{ marginBottom: 14 }}>
        「{node.name}」在知识图谱中的位置
      </h3>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${node.name} 的上下游知识关系`}>
        <text x={centerX - 190} y={16} fill="#6b716b" fontSize={11} fontFamily="var(--it-mono)">
          前置知识
        </text>
        <text x={centerX + 130} y={16} fill="#6b716b" fontSize={11} fontFamily="var(--it-mono)">
          后续知识
        </text>

        {upstream.map((item, index) => (
          <g key={item.id}>
            <path
              d={`M ${centerX - 130} ${30 + index * rowHeight + 10} C ${centerX - 90} ${30 + index * rowHeight + 10}, ${centerX - 70} ${height / 2}, ${centerX - 26} ${height / 2}`}
              stroke="rgba(240,239,233,0.25)"
              fill="none"
            />
            <text
              x={centerX - 140}
              y={30 + index * rowHeight + 14}
              fill="#a7aaa2"
              fontSize={12}
              textAnchor="end"
            >
              {item.name}
            </text>
          </g>
        ))}

        <circle cx={centerX} cy={height / 2} r={5} fill="#d7b86a" />
        <circle cx={centerX} cy={height / 2} r={10} fill="none" stroke="rgba(215,184,106,0.35)" />
        <text x={centerX} y={height / 2 - 14} fill="#f0efe9" fontSize={13} textAnchor="middle">
          {node.name}
        </text>

        {downstream.map((item, index) => (
          <g key={item.id}>
            <path
              d={`M ${centerX + 26} ${height / 2} C ${centerX + 70} ${height / 2}, ${centerX + 90} ${30 + index * rowHeight + 10}, ${centerX + 130} ${30 + index * rowHeight + 10}`}
              stroke="rgba(240,239,233,0.25)"
              fill="none"
            />
            <text x={centerX + 140} y={30 + index * rowHeight + 14} fill="#a7aaa2" fontSize={12}>
              {item.name}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
