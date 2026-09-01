export interface MisconceptionItem {
  misconceptionId: string;
  name: string;
  nodeName: string;
  occurrences: number;
  status: 'open' | 'remediated' | 'suppressed';
}

const STATUS_LABEL: Record<MisconceptionItem['status'], string> = {
  open: '待处理',
  remediated: '已复教',
  suppressed: '已缓解',
};

/** 误区分布（蓝图 §13 底部）：按出现次数降序，展示误区名称、关联节点与处理状态。 */
export function MisconceptionMap({ items }: { items: MisconceptionItem[] }) {
  if (items.length === 0) {
    return <p className="progress-empty">暂无误区记录。</p>;
  }
  return (
    <div className="misconception-list">
      {items.map((item) => (
        <div key={item.misconceptionId} className="misconception-item">
          <span className="misconception-item__name">
            {item.name}
            <span className="misconception-item__node">{item.nodeName}</span>
          </span>
          <span className="misconception-item__meta">
            <span className="misconception-item__count">出现 {item.occurrences} 次</span>
            <span className={`misconception-item__status is-${item.status}`}>{STATUS_LABEL[item.status]}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
