import { TransitionLink as Link } from '../../../app/pageNavigation';
import { ArrowRight, Stack } from '@phosphor-icons/react';
import { MISCONCEPTIONS } from '../../../data/v6/catalogs/misconceptionCatalog';

export function MistakeReviewQueue({
  count,
  misconceptionIds,
}: {
  count: number;
  misconceptionIds: string[];
}) {
  const names = misconceptionIds
    .map((id) => MISCONCEPTIONS.find((entry) => entry.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <div className="mistake-queue">
      {count === 0 ? (
        <p className="mistake-queue__empty">暂无错题记录。完成一次练习后，答错的题目会进入这里。</p>
      ) : (
        <>
          <div className="mistake-summary">
            <div className="mistake-summary__metric">
              <span className="mistake-summary__value">{count}</span>
              <span className="mistake-summary__label">错题</span>
            </div>
            <div className="mistake-summary__metric">
              <span className="mistake-summary__value">{names.length}</span>
              <span className="mistake-summary__label">活跃误区</span>
            </div>
          </div>
          {names.length > 0 && (
            <p className="practice-feedback__text">
              高频误区：{names.slice(0, 3).join('、')}
              {names.length > 3 ? ' 等' : ''}。
            </p>
          )}
          <div>
            <Link className="text-button text-button--primary" to="/practice/session/mistake">
              <Stack size={15} weight="regular" /> 开始错题复习 <ArrowRight size={14} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
