import { ArrowCounterClockwise, CornersOut, Path } from '@phosphor-icons/react';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { BrandMark } from './BrandMark';

export function ExplorerHeader() {
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const pathOpen = useKnowledgeStore((state) => state.isPathRibbonOpen);
  const pathStatus = useKnowledgeStore((state) => state.aiStatus);
  const returnOverview = useKnowledgeStore((state) => state.returnOverview);
  const openOnboarding = useKnowledgeStore((state) => state.openOnboarding);
  const generatePath = useKnowledgeStore((state) => state.generateLearningPath);
  const closePath = useKnowledgeStore((state) => state.closeLearningPath);

  return (
    <header className="explorer-header">
      <BrandMark />
      <nav className="explorer-actions" aria-label="知识空间操作">
        <button className="hud-action" onClick={returnOverview} aria-label="返回知识全景" data-tooltip="知识全景">
          <CornersOut size={18} />
        </button>
        {selectedGoalId && (
          <button
            className={`hud-action ${pathOpen ? 'is-active' : ''}`}
            onClick={() => pathOpen ? closePath() : void generatePath()}
            aria-label={pathOpen ? '关闭学习路径' : '生成学习路径'}
            data-tooltip={pathOpen ? '关闭路径' : '生成路径'}
            disabled={pathStatus === 'loading'}
          >
            <Path size={18} />
          </button>
        )}
        <button className="hud-action" onClick={openOnboarding} aria-label="重新设置学习目标" data-tooltip="重设目标">
          <ArrowCounterClockwise size={18} />
        </button>
      </nav>
    </header>
  );
}
