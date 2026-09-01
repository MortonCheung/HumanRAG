import { Sparkle } from '@phosphor-icons/react';
import { useLibraryStore } from '../../../store/libraryStore';
import { buildTeachingUnits } from '../generateCustomContent';

/** 教学步骤：为每个主题节点生成 8 步教学单元（蓝图 §11.1）。 */
export function TeachingSchemaStep() {
  const draft = useLibraryStore((state) => state.draft);
  const updateDraft = useLibraryStore((state) => state.updateDraft);

  const nodes = draft?.nodes ?? [];
  const edges = draft?.edges ?? [];
  const topicCount = nodes.filter((node) => node.kind !== 'course').length;
  const generated = draft?.teachingUnitIds ?? [];

  function generate() {
    const { units, steps } = buildTeachingUnits(nodes, edges);
    updateDraft({
      teachingUnits: units,
      teachingSteps: steps,
      teachingUnitIds: units.map((unit) => unit.id),
    });
  }

  return (
    <div className="builder-stage__scroll">
      <p className="builder-step__kicker">教学</p>
      <h2 className="builder-step__title">生成教学结构</h2>
      <div className="builder-step__body">
        <p>
          为 {topicCount} 个主题节点各生成一个 8 步教学单元：目标、前置诊断、讲解、示范、引导练习、独立检查、纠错复教、总结。
        </p>
        <button className="text-button text-button--primary" type="button" onClick={generate} disabled={topicCount === 0}>
          <Sparkle size={15} weight="fill" /> {generated.length > 0 ? '重新生成教学' : '生成教学'}
        </button>

        {generated.length > 0 && (
          <div className="builder-unit-list">
            {generated.map((id) => {
              const nodeId = id.startsWith('tu-') ? id.slice(3) : id;
              const node = nodes.find((entry) => entry.id === nodeId);
              return (
                <div className="builder-unit-item" key={id}>
                  <span className="builder-unit-item__name">{node ? `「${node.name}」教学单元` : id}</span>
                  <span className="builder-unit-item__meta">8 步闭环 · 含诊断与独立检查</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
