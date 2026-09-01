const QUEUE = [
  { title: '前置诊断', note: '三道题确认起点' },
  { title: '新知识讲解', note: '直觉 / 正式 / 应用' },
  { title: '巩固练习', note: '示范 + 引导 + 独立检查' },
  { title: '复教', note: '误区触发时自动安排' },
] as const;

export function TeachingQueue() {
  return (
    <section className="panel" style={{ gridColumn: 'span 12' }}>
      <div className="panel__header">
        <p className="panel-kicker">教学队列</p>
      </div>
      <div className="teach-queue">
        {QUEUE.map((item, index) => (
          <div key={item.title} style={{ display: 'contents' }}>
            <div className="teach-queue__item">
              {item.title}
              <small>{item.note}</small>
            </div>
            {index < QUEUE.length - 1 && <span className="teach-queue__arrow">→</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
