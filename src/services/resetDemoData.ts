import { useUserStore } from '../store/userStore';
import { useProgressStore } from '../store/progressStore';
import { useTeachingStore } from '../store/teachingStore';
import { usePracticeStore } from '../store/practiceStore';
import { useLibraryStore } from '../store/libraryStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { useLearningQuestionStore } from '../domain/learning/learningQuestions';
import { resetV9Domain } from '../domain/knowledge/migration';

/**
 * 演示数据重置（蓝图 §17.1）：「演示重置」归属用户域，但需协调各内存 store 与本地存储，
 * 使界面立即回到确定性演示初态。此处作为无环依赖的统一入口，供移动端菜单等调用。
 */
export function resetDemoData(): void {
  useTeachingStore.getState().resetSession();
  usePracticeStore.getState().resetSession();
  useProgressStore.getState().reset();
  useLearningQuestionStore.getState().reset();
  resetV9Domain();
  useLibraryStore.getState().resetAll();
  useKnowledgeStore.getState().resetKnowledge();
  useUserStore.getState().resetDemo();
}
