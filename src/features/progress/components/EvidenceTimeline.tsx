import type { EvidenceRecord } from '../../../data/v6/schemas/progressSchema';

export interface EvidenceItem {
  id: string;
  nodeId: string;
  nodeName: string;
  source: EvidenceRecord['source'];
  result: EvidenceRecord['result'];
  misconceptionName?: string;
  createdAt: string;
}

const SOURCE_LABEL: Record<EvidenceRecord['source'], string> = {
  diagnostic: '前置诊断',
  'guided-practice': '引导练习',
  'independent-check': '独立检查',
  practice: '刷题练习',
};

const RESULT_LABEL: Record<EvidenceRecord['result'], string> = {
  correct: '正确',
  partial: '部分正确',
  incorrect: '错误',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const min = `${date.getMinutes()}`.padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

/** 按时间倒序的学习证据流（蓝图 §13：不展示虚假效率数字，只呈现判断依据）。 */
export function EvidenceTimeline({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) {
    return <p className="progress-empty">暂无学习证据。</p>;
  }
  return (
    <div className="evidence-timeline">
      {items.map((item) => (
        <div key={item.id} className="evidence-item">
          <span className={`evidence-item__dot is-${item.result}`} aria-hidden="true" />
          <div className="evidence-item__body">
            <span className="evidence-item__node">{item.nodeName}</span>
            <span className="evidence-item__meta">
              {SOURCE_LABEL[item.source]} · {RESULT_LABEL[item.result]}
            </span>
            {item.misconceptionName && (
              <span className="evidence-item__misconception">误区：{item.misconceptionName}</span>
            )}
          </div>
          <span className="evidence-item__time">{formatTime(item.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
