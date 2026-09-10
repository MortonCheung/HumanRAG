import { ArrowRight, Check, FlagCheckered, Repeat } from '@phosphor-icons/react';
import { TransitionLink as Link } from '../../../app/pageNavigation';
import { MasteryCelebration } from '../../../components/feedback/MasteryCelebration';
import { contentRepository } from '../../../services/content/ContentRepository';
import type { TeachingUnit } from '../../../data/v6/schemas/teachingSchema';
import type { SessionAnswer, TeachingOutcome } from '../../../store/teachingStore';

interface TeachingCompletionEvidenceProps {
  unit: TeachingUnit;
  answers: SessionAnswer[];
  completedStepIds: string[];
  outcome: TeachingOutcome;
  onFinish: () => void;
  onRestart: () => void;
}

function scoreOf(answers: SessionAnswer[], stepKind: SessionAnswer['stepKind']) {
  const entries = answers.filter((entry) => entry.stepKind === stepKind);
  return {
    correct: entries.filter((entry) => entry.correct).length,
    total: entries.length,
    percentage: entries.length > 0 ? Math.round((entries.filter((entry) => entry.correct).length / entries.length) * 100) : 0,
  };
}

export function TeachingCompletionEvidence({
  unit,
  answers,
  completedStepIds,
  outcome,
  onFinish,
  onRestart,
}: TeachingCompletionEvidenceProps) {
  const isExhausted = outcome === 'remediation-exhausted';
  const prerequisites = unit.prerequisiteNodeIds
    .map((nodeId) => contentRepository.getTeachingUnitForNode(nodeId))
    .filter((entry): entry is TeachingUnit => entry !== undefined);
  const completedKinds = new Set(
    completedStepIds
      .map((stepId) => contentRepository.getTeachingStep(stepId)?.kind)
      .filter((kind): kind is NonNullable<typeof kind> => kind !== undefined),
  );
  const diagnostic = scoreOf(answers, 'diagnostic');
  const guided = scoreOf(answers, 'guided-practice');
  const check = scoreOf(answers, 'independent-check');
  const wrongAnswers = answers.filter((entry) => !entry.correct);
  const misconceptionNames = Array.from(
    new Set(wrongAnswers.map((entry) => entry.misconceptionText).filter((value): value is string => Boolean(value))),
  );

  const trace = [
    {
      label: '诊断',
      value: diagnostic.total > 0 ? `${diagnostic.correct}/${diagnostic.total}，正确率 ${diagnostic.percentage}%` : '已完成，无诊断题',
      state: completedKinds.has('diagnostic') ? 'done' : 'skipped',
    },
    {
      label: '讲解',
      value: completedKinds.has('explanation') ? '完成直觉、正式定义与应用边界讲解' : '依据诊断结果未进入本步骤',
      state: completedKinds.has('explanation') ? 'done' : 'skipped',
    },
    {
      label: '示范',
      value: completedKinds.has('worked-example') ? '完成教师示范与标准解题顺序' : '依据诊断结果未进入本步骤',
      state: completedKinds.has('worked-example') ? 'done' : 'skipped',
    },
    {
      label: '练习',
      value: guided.total > 0 ? `${guided.correct}/${guided.total}，正确率 ${guided.percentage}%` : '本路径未安排引导题',
      state: completedKinds.has('guided-practice') ? 'done' : 'skipped',
    },
    {
      label: '纠错',
      value: completedKinds.has('remediation')
        ? `已执行针对性复教${misconceptionNames.length > 0 ? `，处理 ${misconceptionNames.length} 类误区` : ''}`
        : '掌握检查达标，无需触发补救讲解',
      state: completedKinds.has('remediation') ? 'remediated' : 'not-needed',
    },
    {
      label: '掌握确认',
      value: check.total > 0 ? `${check.correct}/${check.total}，正确率 ${check.percentage}%` : '已完成总结确认',
      state: completedKinds.has('summary') ? 'done' : 'skipped',
    },
  ] as const;

  return (
    <section className="teaching-completion" aria-labelledby="teaching-completion-title">
      <header className="teaching-completion__header">
        {isExhausted ? (
          <div>
            <p className="stage-block__kicker">本轮结束</p>
            <h2 className="stage-block__title" id="teaching-completion-title">建议先补前置知识</h2>
            <p className="teaching-completion__lead">
              经过两轮复教仍未达到掌握标准，本轮不记为掌握完成。建议先回到前置教学单元巩固基础，再重新学习本节。
            </p>
          </div>
        ) : (
          <>
            <MasteryCelebration label={`${unit.title}教学单元完成`} />
            <div>
              <p className="stage-block__kicker">教学单元完成</p>
              <h2 className="stage-block__title" id="teaching-completion-title">{unit.title}</h2>
              <p className="teaching-completion__lead">
                系统已保存本节的实际教学轨迹。以下结果来自诊断、教学步骤和掌握检查，不用单一总分代替过程证据。
              </p>
            </div>
          </>
        )}
      </header>

      <div className="teaching-completion__metrics" aria-label="本节教学结果">
        <div><strong>{answers.length}</strong><span>累计作答</span></div>
        <div><strong>{answers.filter((entry) => entry.correct).length}</strong><span>回答正确</span></div>
        <div><strong>{misconceptionNames.length}</strong><span>识别误区</span></div>
        <div><strong>{check.percentage}%</strong><span>掌握检查</span></div>
      </div>

      <div className="teaching-completion__trace" aria-label="教学执行轨迹">
        {trace.map((item, index) => (
          <div className={`teaching-trace teaching-trace--${item.state}`} key={item.label}>
            <span className="teaching-trace__index">{String(index + 1).padStart(2, '0')}</span>
            <span className="teaching-trace__mark" aria-hidden="true"><Check size={12} weight="bold" /></span>
            <div>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {misconceptionNames.length > 0 && (
        <div className="teaching-completion__misconceptions">
          <span>本节识别到的误区</span>
          <p>{misconceptionNames.join('；')}</p>
        </div>
      )}

      {isExhausted && prerequisites.length > 0 && (
        <div className="teaching-completion__misconceptions">
          <span>建议先补前置知识</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {prerequisites.map((prereq) => (
              <Link key={prereq.id} className="text-button text-button--ghost" to={`/teach/${prereq.id}`}>
                {prereq.title} <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <footer className="teaching-completion__actions">
        {!isExhausted && (
          <Link className="text-button text-button--primary" to={`/practice/session/node:${unit.nodeId}`}>
            去刷题验证 <ArrowRight size={14} />
          </Link>
        )}
        <button type="button" className="text-button text-button--ghost" onClick={onRestart}>
          <Repeat size={14} /> 再学一遍
        </button>
        <button type="button" className="text-button text-button--ghost" onClick={onFinish}>
          <FlagCheckered size={14} /> 返回教学首页
        </button>
      </footer>
    </section>
  );
}
