import { useLibraryStore } from '../../../store/libraryStore';
import type { BuilderStep } from '../types';

const NEXT_HINTS: Record<BuilderStep, string> = {
  source: '解析资料或载入模板后，进入结构步骤编辑节点。',
  structure: '确认节点与关系后，进入教学步骤生成教学单元。',
  teaching: '生成教学单元后，进入题目步骤生成练习。',
  questions: '生成题目后，进入预览步骤检查并保存。',
  preview: '确认无误后点击「保存并发布」，返回知识库首页即可重新打开。',
};

/** 右侧建议区：当前草稿状态、解析结果与下一步建议（蓝图 §11.3）。 */
export function BuilderInspector({ step }: { step: BuilderStep }) {
  const draft = useLibraryStore((state) => state.draft);

  return (
    <aside className="builder-inspector">
      <div className="builder-inspector__section">
        <p className="builder-inspector__kicker">当前知识库</p>
        <p className="builder-inspector__text">
          {draft ? (
            <>
              <strong>{draft.name || '未命名知识库'}</strong>
              <br />
              {draft.domain || '自定义'} · {draft.nodes.length} 节点 · {draft.edges.length} 关系
              <br />
              教学 {draft.teachingUnitIds.length} · 题目 {draft.questionIds.length}
            </>
          ) : (
            '尚未开始，请在来源步骤输入名称并解析。'
          )}
        </p>
      </div>

      <div className="builder-inspector__section">
        <p className="builder-inspector__kicker">解析说明</p>
        <p className="builder-inspector__text">
          上传文件只读取文件名与类型，不读取真实内容；解析为本地演示，固定种子产生 420–760ms 延迟。
        </p>
      </div>

      <div className="builder-inspector__section">
        <p className="builder-inspector__kicker">下一步</p>
        <p className="builder-inspector__text">{NEXT_HINTS[step]}</p>
      </div>
    </aside>
  );
}
