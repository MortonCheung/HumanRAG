export interface MasteryItem {
  nodeId: string;
  nodeName: string;
  level: number; // 0-4
  confidence: number; // 0-1
  evidenceCount: number;
}

function Ticks({ level }: { level: number }) {
  return (
    <span className="mastery-item__ticks" aria-label={`掌握等级 ${level} / 4`}>
      {[0, 1, 2, 3, 4].map((tick) => (
        <span key={tick} className={`mastery-item__tick ${tick < level ? 'is-on' : ''}`} />
      ))}
    </span>
  );
}

/** 掌握度概览：等级分布 + 最薄弱与已掌握节点（蓝图 §13：用微型刻度与置信度表达，不用大进度条）。 */
export function MasteryOverview({ items }: { items: MasteryItem[] }) {
  const dist = [0, 1, 2, 3, 4].map((level) => items.filter((item) => item.level === level).length);
  const weak = items
    .filter((item) => item.level <= 1)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 6);
  const strong = items
    .filter((item) => item.level >= 3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return (
    <>
      <div className="mastery-dist" aria-label="掌握等级分布">
        {dist.map((count, level) => (
          <div key={level} className="mastery-dist__cell">
            <span className="mastery-dist__count">{count}</span>
            <span className="mastery-dist__label">L{level}</span>
          </div>
        ))}
      </div>
      <div className="mastery-list">
        {weak.map((item) => (
          <div key={item.nodeId} className="mastery-item">
            <span className="mastery-item__name">
              {item.nodeName}
              <span className="mastery-item__conf">薄弱 · 置信 {Math.round(item.confidence * 100)}%</span>
            </span>
            <Ticks level={item.level} />
          </div>
        ))}
        {strong.map((item) => (
          <div key={item.nodeId} className="mastery-item">
            <span className="mastery-item__name">
              {item.nodeName}
              <span className="mastery-item__conf">已掌握 · 置信 {Math.round(item.confidence * 100)}%</span>
            </span>
            <Ticks level={item.level} />
          </div>
        ))}
        {weak.length === 0 && strong.length === 0 && (
          <p className="progress-empty">暂无掌握度记录。</p>
        )}
      </div>
    </>
  );
}
