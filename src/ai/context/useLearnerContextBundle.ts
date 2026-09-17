import { useMemo } from 'react';
import { getLearningRecommendation } from '../learningRecommendation';
import { MISCONCEPTIONS_BY_ID } from '../../data/v6/catalogs/misconceptionCatalog';
import { LEARNER_PROFILES } from '../../data/v6/catalogs/learnerProfileCatalog';
import { TCP_FRAGMENTS } from '../../data/v6/handcrafted/tcpLesson';
import { resolveLearnerProfile } from '../../domain/learning/resolveLearnerProfile';
import { useLearningQuestionStore } from '../../domain/learning/learningQuestions';
import { contentRepository } from '../../services/content/ContentRepository';
import { useProgressStore } from '../../store/progressStore';
import { useUserStore } from '../../store/userStore';
import { buildLearnerContextBundle } from './learnerContext';

function misconceptionName(id: string) {
  return MISCONCEPTIONS_BY_ID.get(id)?.name
    ?? TCP_FRAGMENTS[id.replace('tcp-', '') as keyof typeof TCP_FRAGMENTS]?.label;
}

/** The sole React-to-domain adapter used by every AI surface. */
export function useLearnerContextBundle() {
  const learnerId = useUserStore((state) => state.activeProfileId);
  const profileOverride = useUserStore((state) => state.profileOverrides[learnerId]);
  const answerRecords = useProgressStore((state) => state.answerRecords);
  const evidenceRecords = useProgressStore((state) => state.evidenceRecords);
  const misconceptionRecords = useProgressStore((state) => state.misconceptionRecords);
  const tasks = useProgressStore((state) => state.remediationTasks);
  const learningQuestions = useLearningQuestionStore((state) => state.questions);
  const activityEndDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const profiles = useMemo(() => LEARNER_PROFILES.map((profile) => (
    profile.id === learnerId ? resolveLearnerProfile(profile, profileOverride) : profile
  )), [learnerId, profileOverride]);
  const recommendation = useMemo(
    () => getLearningRecommendation(learnerId),
    [evidenceRecords, learnerId, learningQuestions, tasks],
  );

  const bundle = useMemo(() => buildLearnerContextBundle({
    learnerId,
    profiles,
    answerRecords,
    evidenceRecords,
    misconceptionRecords,
    resolveQuestion: (questionId) => contentRepository.getQuestion(questionId),
    resolveNode: (nodeId) => contentRepository.getNode(nodeId),
    resolveMisconceptionName: misconceptionName,
    recommendation,
    activityEndDate,
  }), [activityEndDate, answerRecords, evidenceRecords, learnerId, misconceptionRecords, profiles, recommendation]);

  return { learnerId, bundle };
}
