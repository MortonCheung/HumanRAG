import type { ReviewItem } from '../teachingPlan';

export function ReviewList({ items }: { items: ReviewItem[] }) {
  return (
    <section className="panel review-list" style={{ gridColumn: 'span 4' }}>
      <p className="panel-kicker">需要复习</p>
      <h3 className="panel-title" style={{ marginBottom: 8 }}>
        待复教知识点
      </h3>
      {items.length === 0 ? (
        <p className="review-list__why">当前没有待复教任务，继续保持练习即可。</p>
      ) : (
        items.map((item) => (
          <a
            key={item.id}
            className="review-list__item"
            href={`/teach/${item.unitId}`}
            style={{ textDecoration: 'none' }}
          >
            <span>
              <span className="review-list__name">{item.nodeName}</span>
              <span className="review-list__why">{item.why}</span>
            </span>
            <span className="review-list__button">去复教 →</span>
          </a>
        ))
      )}
    </section>
  );
}
