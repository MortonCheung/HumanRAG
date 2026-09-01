import { useState } from 'react';
import { useUserStore } from '../../../store/userStore';
import { DemoDataBadge } from '../../../components/feedback/DemoDataBadge';
import { LEARNER_PROFILES } from '../../../data/v6/catalogs/learnerProfileCatalog';
import { knowledgeGraph } from '../../../data/knowledgeGraph';
import { useProgressStore } from '../../../store/progressStore';
import {
  planForSession,
  weakNodes,
  weakMisconceptions,
  mistakeCount,
  type PracticeMode,
} from '../../../ai/practice/PracticePlanner';
import { DailyPracticeHero } from '../components/DailyPracticeHero';
import { WeakNodeList } from '../components/WeakNodeList';
import { PracticeModeTabs } from '../components/PracticeModeTabs';
import { KnowledgeQuestionPicker } from '../components/KnowledgeQuestionPicker';
import { MockPaperList } from '../components/MockPaperList';
import { MistakeReviewQueue } from '../components/MistakeReviewQueue';
import '../practice.css';

function branchOf(learnerId: string): string {
  return LEARNER_PROFILES.find((profile) => profile.id === learnerId)?.branchId ?? '408';
}

export function PracticeHomePage() {
  const learnerId = useUserStore((state) => state.activeProfileId);
  useProgressStore((state) => state.answerRecords.length);
  useProgressStore((state) => state.masteryByNode.length);

  const [mode, setMode] = useState<PracticeMode>('daily');
  const branchId = branchOf(learnerId);

  const dailyPlan = planForSession('daily', learnerId);
  const weak = weakNodes(learnerId, 6).map((nodeId) => {
    const node = knowledgeGraph.nodes.find((entry) => entry.id === nodeId);
    const mastery = useProgressStore
      .getState()
      .masteryByNode.find((state) => state.learnerId === learnerId && state.nodeId === nodeId);
    return {
      nodeId,
      name: node?.name ?? nodeId,
      level: mastery?.level ?? 0,
      confidence: mastery?.confidence ?? 0,
    };
  });

  const misconceptions = weakMisconceptions(learnerId, 5);
  const mistakes = mistakeCount(learnerId);

  return (
    <div className="page">
      <div className="page__inner">
        <div className="teach-home__title-row">
          <h1 className="page-title">刷题</h1>
          <p className="page-lead">
            选择练习方式，系统会把错误回写到知识图谱。 <DemoDataBadge />
          </p>
        </div>

        <div className="grid-12">
          {dailyPlan && <DailyPracticeHero plan={dailyPlan} />}
          <WeakNodeList nodes={weak} />
        </div>

        <div style={{ marginTop: 28 }}>
          <PracticeModeTabs active={mode} onChange={setMode} />
          <section className="panel" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <div className="panel__body">
              {mode === 'daily' && dailyPlan && (
                <p className="practice-hero__plan">{dailyPlan.description} 使用上方「开始练习」进入今日练习。</p>
              )}
              {mode === 'goal' && <KnowledgeQuestionPicker mode="goal" branchId={branchId} />}
              {mode === 'node' && <KnowledgeQuestionPicker mode="node" branchId={branchId} />}
              {mode === 'paper' && <MockPaperList branchId={branchId} />}
              {mode === 'mistake' && <MistakeReviewQueue count={mistakes} misconceptionIds={misconceptions} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
