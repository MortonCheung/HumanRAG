import { useMemo } from 'react';
import { useUserStore } from '../../../store/userStore';
import { useProgressStore } from '../../../store/progressStore';
import { DemoDataBadge } from '../../../components/feedback/DemoDataBadge';
import { nodesById } from '../../../data/knowledgeGraph';
import { LEARNER_PROFILES } from '../../../data/v6/catalogs/learnerProfileCatalog';
import { MISCONCEPTIONS_BY_ID } from '../../../data/v6/catalogs/misconceptionCatalog';
import { recommendNextTeaching, pendingReviews } from '../../teaching/teachingPlan';
import { EvidenceTimeline, type EvidenceItem } from '../components/EvidenceTimeline';
import { MasteryOverview, type MasteryItem } from '../components/MasteryOverview';
import { MisconceptionMap, type MisconceptionItem } from '../components/MisconceptionMap';
import { NextTeachingQueue } from '../components/NextTeachingQueue';
import '../progress.css';

const DAY_MS = 86_400_000;

function withinDays(iso: string, latest: string, days: number): boolean {
  const time = Date.parse(iso);
  const latestTime = Date.parse(latest);
  if (Number.isNaN(time) || Number.isNaN(latestTime)) return false;
  return time <= latestTime && latestTime - time <= days * DAY_MS;
}

/** 学习记录 `/progress`（蓝图 §13）：证据流、掌握度变化、误区分布与下一轮教学安排。 */
export function ProgressPage() {
  const learnerId = useUserStore((state) => state.activeProfileId);
  const state = useProgressStore((state) => state);

  const profile = LEARNER_PROFILES.find((entry) => entry.id === learnerId);
  const branchId = profile?.branchId ?? '408';

  const data = useMemo(() => {
    const answerRecords = state.answerRecords.filter((record) => record.learnerId === learnerId);
    const evidenceRecords = state.evidenceRecords.filter((record) => record.learnerId === learnerId);
    const misconceptionRecords = state.misconceptionRecords.filter((record) => record.learnerId === learnerId);
    const remediationTasks = state.remediationTasks.filter((task) => task.learnerId === learnerId);

    // 掌握度按 learnerId 隔离（同一学习者同一节点只有一条）。
    const masteryMap = new Map<string, MasteryItem>();
    for (const mastery of state.masteryByNode) {
      if (mastery.learnerId !== learnerId) continue;
      const node = nodesById.get(mastery.nodeId);
      if (!node || node.branchId !== branchId || masteryMap.has(mastery.nodeId)) continue;
      masteryMap.set(mastery.nodeId, {
        nodeId: mastery.nodeId,
        nodeName: node.name,
        level: mastery.level,
        confidence: mastery.confidence,
        evidenceCount: mastery.evidenceIds.length,
      });
    }
    const masteryItems = Array.from(masteryMap.values());

    // 最近一周窗口：以最新证据时间为基准，避免真实日期与演示时间戳错位。
    const sortedEvidence = [...evidenceRecords].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    const latestEvidence = sortedEvidence[0]?.createdAt;
    const weekTeaching = latestEvidence
      ? evidenceRecords.filter(
          (record) => record.source !== 'practice' && withinDays(record.createdAt, latestEvidence, 7),
        ).length
      : 0;
    const weekPractice = latestEvidence
      ? answerRecords.filter((record) => withinDays(record.createdAt, latestEvidence, 7)).length
      : 0;
    const pendingRemediation = remediationTasks.filter((task) => task.status !== 'done').length;

    const evidenceItems: EvidenceItem[] = sortedEvidence.slice(0, 40).map((record) => {
      const node = nodesById.get(record.nodeId);
      return {
        id: record.id,
        nodeId: record.nodeId,
        nodeName: node?.name ?? record.nodeId,
        source: record.source,
        result: record.result,
        misconceptionName: record.misconceptionId
          ? MISCONCEPTIONS_BY_ID.get(record.misconceptionId)?.name
          : undefined,
        createdAt: record.createdAt,
      };
    });

    // 误区聚合：同一误区多次触发合并出现次数，按出现次数降序。
    const misconceptionMap = new Map<string, MisconceptionItem>();
    for (const record of misconceptionRecords) {
      const entry = MISCONCEPTIONS_BY_ID.get(record.misconceptionId);
      const node = nodesById.get(record.nodeId);
      const existing = misconceptionMap.get(record.misconceptionId);
      if (existing) {
        existing.occurrences += record.occurrences;
        if (record.status === 'open' && existing.status !== 'open') existing.status = record.status;
      } else {
        misconceptionMap.set(record.misconceptionId, {
          misconceptionId: record.misconceptionId,
          name: entry?.name ?? record.misconceptionId,
          nodeName: node?.name ?? record.nodeId,
          occurrences: record.occurrences,
          status: record.status,
        });
      }
    }
    const misconceptionItems = Array.from(misconceptionMap.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 12);

    return { evidenceItems, masteryItems, misconceptionItems, weekTeaching, weekPractice, pendingRemediation };
  }, [state, learnerId, branchId]);

  const recommendation = recommendNextTeaching(learnerId);
  const reviews = pendingReviews(learnerId);

  return (
    <div className="page">
      <div className="page__inner">
        <h1 className="page-title">学习记录</h1>
        <p className="page-lead">
          系统根据证据判断你掌握或未掌握什么，而不是给出虚假的效率数字。 <DemoDataBadge />
        </p>

        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel__body progress-summary">
            <p className="progress-summary__lead">
              {profile ? `${profile.name}（${profile.major} · ${profile.identity}）最近一周完成 ` : '最近一周完成 '}
              <strong>{data.weekTeaching} 次教学证据</strong>、
              <strong>{data.weekPractice} 次练习</strong>，还有
              <strong>{data.pendingRemediation} 个知识点</strong>需要复教。
            </p>
            <div className="progress-summary__metrics">
              <div className="progress-summary__metric">
                <span className="progress-summary__value">{data.weekTeaching}</span>
                <span className="progress-summary__label">教学证据</span>
              </div>
              <div className="progress-summary__metric">
                <span className="progress-summary__value">{data.weekPractice}</span>
                <span className="progress-summary__label">本周练习</span>
              </div>
              <div className="progress-summary__metric">
                <span className="progress-summary__value">{data.pendingRemediation}</span>
                <span className="progress-summary__label">待复教</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid-12" style={{ marginBottom: 20 }}>
          <section className="panel" style={{ gridColumn: 'span 8' }}>
            <div className="panel__header">
              <h3 className="panel-title">证据流</h3>
            </div>
            <div className="panel__body">
              <EvidenceTimeline items={data.evidenceItems} />
            </div>
          </section>
          <section className="panel" style={{ gridColumn: 'span 4' }}>
            <div className="panel__header">
              <h3 className="panel-title">掌握度变化</h3>
            </div>
            <div className="panel__body">
              <MasteryOverview items={data.masteryItems} />
            </div>
          </section>
        </div>

        <div className="grid-12">
          <section className="panel" style={{ gridColumn: 'span 7' }}>
            <div className="panel__header">
              <h3 className="panel-title">误区分布</h3>
            </div>
            <div className="panel__body">
              <MisconceptionMap items={data.misconceptionItems} />
            </div>
          </section>
          <section className="panel" style={{ gridColumn: 'span 5' }}>
            <div className="panel__header">
              <h3 className="panel-title">下一轮教学安排</h3>
            </div>
            <div className="panel__body">
              <NextTeachingQueue recommendation={recommendation} reviews={reviews} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
