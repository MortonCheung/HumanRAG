import { useNavigate } from 'react-router-dom';
import { CheckCircle, Warning, WarningCircle } from '@phosphor-icons/react';
import { useLibraryStore } from '../../../store/libraryStore';
import type { BuilderStep } from '../types';
import { validateLibrary } from '../validateLibrary';

/** 预览步骤：发布前完整校验与保存（蓝图 §9.5 / §15.3）。 */
export function PublishPreviewStep({ onGoToStep }: { onGoToStep: (step: BuilderStep) => void }) {
  const navigate = useNavigate();
  const draft = useLibraryStore((state) => state.draft);
  const publishDraft = useLibraryStore((state) => state.publishDraft);

  const validation = validateLibrary(draft);
  const nodeCount = draft?.nodes.length ?? 0;
  const edgeCount = draft?.edges.length ?? 0;
  const teachingCount = draft?.teachingUnitIds.length ?? 0;
  const questionCount = draft?.questionIds.length ?? 0;

  function publish() {
    if (!validation.valid) return;
    const id = publishDraft();
    if (id) navigate(`/library/${id}`);
  }

  return (
    <div className="builder-stage__scroll">
      <p className="builder-step__kicker">预览</p>
      <h2 className="builder-step__title">发布前检查</h2>
      <div className="builder-step__body">
        <div className="builder-summary">
          <div className="builder-summary__row">
            <span className="builder-summary__label">名称</span>
            <span className="builder-summary__value">{draft?.name || '未命名知识库'}</span>
          </div>
          <div className="builder-summary__row">
            <span className="builder-summary__label">领域</span>
            <span className="builder-summary__value">{draft?.domain || '自定义'}</span>
          </div>
          <div className="builder-summary__row">
            <span className="builder-summary__label">说明</span>
            <span className="builder-summary__value">{draft?.description || '—'}</span>
          </div>
        </div>

        <div className="builder-summary__stats">
          <div className="builder-summary__stat"><strong>{nodeCount}</strong><span>节点</span></div>
          <div className="builder-summary__stat"><strong>{edgeCount}</strong><span>关系</span></div>
          <div className="builder-summary__stat"><strong>{teachingCount}</strong><span>教学单元</span></div>
          <div className="builder-summary__stat"><strong>{questionCount}</strong><span>题目</span></div>
        </div>

        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="builder-validation" role="group" aria-label="发布校验结果">
            {validation.errors.map((issue, index) => (
              <button
                key={`error-${index}`}
                type="button"
                className="builder-validation__item builder-validation__item--error"
                onClick={() => onGoToStep(issue.step)}
              >
                <WarningCircle size={15} weight="fill" />
                <span>{issue.message}</span>
                <em>前往 {issue.step}</em>
              </button>
            ))}
            {validation.warnings.map((issue, index) => (
              <div key={`warn-${index}`} className="builder-validation__item builder-validation__item--warn">
                <Warning size={15} weight="fill" />
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        {validation.valid && (
          <p className="builder-validation__ok">
            <CheckCircle size={15} weight="fill" /> 所有校验通过，可以发布。
          </p>
        )}

        <button className="text-button text-button--primary" type="button" onClick={publish} disabled={!validation.valid}>
          <CheckCircle size={15} weight="fill" /> 保存并发布
        </button>
        {!validation.valid && (
          <p className="builder-empty-note">点击上方错误项可跳转到对应步骤修复，全部满足后即可发布。</p>
        )}
      </div>
    </div>
  );
}
