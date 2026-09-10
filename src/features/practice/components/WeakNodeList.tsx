import { TransitionLink as Link } from '../../../app/pageNavigation';
import { ArrowRight } from '@phosphor-icons/react';

export interface WeakNode {
  nodeId: string;
  name: string;
  level: number;
  confidence: number;
}

const LEVEL_LABELS = ['未掌握', '模糊', '基本掌握', '较熟练', '已掌握'];

export function WeakNodeList({ nodes }: { nodes: WeakNode[] }) {
  return (
    <section className="panel" style={{ gridColumn: 'span 4' }}>
      <div className="panel__header">
        <div>
          <p className="panel-kicker">薄弱知识点</p>
          <h3 className="panel-title">需要巩固</h3>
        </div>
      </div>
      <div className="panel__body weak-node-list">
        {nodes.length === 0 ? (
          <p className="mistake-queue__empty">当前没有掌握度偏低的知识点。</p>
        ) : (
          nodes.map((node) => (
            <div className="weak-node-item" key={node.nodeId}>
              <div>
                <span className="weak-node-item__name">{node.name}</span>
                <span className="weak-node-item__level">
                  掌握度 {LEVEL_LABELS[node.level]} · 置信 {Math.round(node.confidence * 100)}%
                </span>
              </div>
              <Link className="weak-node-item__link" to={`/practice/session/node:${node.nodeId}`}>
                只练这个 <ArrowRight size={12} />
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
