import { Sparkle } from '@phosphor-icons/react';
import { useLibraryStore } from '../../../store/libraryStore';
import type { Question } from '../../../data/v6/schemas/questionSchema';
import { buildQuestions } from '../generateCustomContent';

const TYPE_LABELS: Record<string, string> = {
  'single-choice': '单选',
  'multiple-choice': '多选',
  'true-false': '判断',
  'fill-blank': '填空',
  ordering: '排序',
  'code-trace': '代码追踪',
  'short-answer': '简答',
};

function countBy<K extends string | number>(items: Question[], key: (question: Question) => K): Array<[K, number]> {
  const map = new Map<K, number>();
  for (const item of items) {
    const value = key(item);
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()];
}

/** 题目步骤：为每个主题节点生成确定性演示题目，并展示完整题目预览（蓝图 §9.4）。 */
export function QuestionGenerationStep() {
  const draft = useLibraryStore((state) => state.draft);
  const updateDraft = useLibraryStore((state) => state.updateDraft);

  const nodes = draft?.nodes ?? [];
  const topicCount = nodes.filter((node) => node.kind !== 'course').length;
  const generated = draft?.questionIds ?? [];
  const questions = draft?.questions ?? [];

  function generate() {
    const next = buildQuestions(nodes);
    updateDraft({
      questions: next,
      questionIds: next.map((question) => question.id),
    });
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const noAnswer = questions.filter((question) => !question.answer).length;
  const noExplanation = questions.filter((question) => !question.explanation?.trim()).length;
  const noMapping = questions.filter(
    (question) => question.nodeIds.length === 0 || question.nodeIds.every((id) => !nodeIds.has(id)),
  ).length;
  const typeDist = countBy(questions, (question) => question.type);
  const difficultyDist = countBy(questions, (question) => question.difficulty);

  return (
    <div className="builder-stage__scroll">
      <p className="builder-step__kicker">题目</p>
      <h2 className="builder-step__title">生成题目</h2>
      <div className="builder-step__body">
        <p>
          为 {topicCount} 个主题节点各生成确定性题目：诊断 3 道、引导练习 4 道、独立检查 3 道、补救 2 道，用于教学练习与刷题回写。
        </p>
        <button className="text-button text-button--primary" type="button" onClick={generate} disabled={topicCount === 0}>
          <Sparkle size={15} weight="fill" /> {generated.length > 0 ? '重新生成题目' : '生成题目'}
        </button>

        {questions.length > 0 && (
          <>
            <div className="builder-question-stats">
              <div className="builder-question-stats__total">
                <strong>{questions.length}</strong>
                <span>总题量</span>
              </div>
              <div className="builder-question-stats__group">
                <span className="builder-question-stats__label">题型分布</span>
                {typeDist.map(([type, count]) => (
                  <span key={type}>{TYPE_LABELS[type] ?? type} {count}</span>
                ))}
              </div>
              <div className="builder-question-stats__group">
                <span className="builder-question-stats__label">难度分布</span>
                {difficultyDist.map(([difficulty, count]) => (
                  <span key={difficulty}>难度 {difficulty} · {count}</span>
                ))}
              </div>
              <div className="builder-question-stats__group">
                <span className="builder-question-stats__label">质量检查</span>
                <span>无答案 {noAnswer}</span>
                <span>无解析 {noExplanation}</span>
                <span>无知识点映射 {noMapping}</span>
              </div>
            </div>

            <div className="builder-unit-list">
              <p className="builder-step__kicker">题目预览（前 3 道）</p>
              {questions.slice(0, 3).map((question) => {
                const node = nodes.find((entry) => entry.id === question.nodeIds[0]);
                return (
                  <div className="builder-unit-item" key={question.id}>
                    <span className="builder-unit-item__name">{question.stem}</span>
                    <span className="builder-unit-item__meta">
                      {TYPE_LABELS[question.type] ?? question.type} · {node ? `关联 ${node.name}` : '演示题'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
