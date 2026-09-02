import { CornersOut, MagnifyingGlass, Target, TreeStructure, SlidersHorizontal } from '@phosphor-icons/react';
import { useKnowledgeStore } from '../store/knowledgeStore';

export function TopBar() {
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const openPanel = useKnowledgeStore((state) => state.openPanel);
  const returnOverview = useKnowledgeStore((state) => state.returnOverview);
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const action = (panel: 'search' | 'lens' | 'atlas' | 'settings', label: string, icon: React.ReactNode) => (
    <button className={`hud-action ${activePanel === panel ? 'is-active' : ''}`} onClick={() => openPanel(panel)} aria-label={label} data-tooltip={label}>{icon}</button>
  );

  return (
    <header className="top-bar">
      <nav className="top-bar__actions" aria-label="知识空间操作">
        {action('search', '搜索', <MagnifyingGlass size={18} weight="regular" />)}
        {action('lens', '选择目标', <Target size={18} weight="regular" />)}
        {action('atlas', '浏览知识', <TreeStructure size={18} weight="regular" />)}
        {action('settings', '性能设置', <SlidersHorizontal size={18} weight="regular" />)}
        {selectedGoalId && <button className="hud-action hud-action--overview hud-action--labeled" onClick={returnOverview} aria-label="回到知识全景" data-tooltip="回到知识全景"><CornersOut size={18} weight="regular" /><span>回到全景</span></button>}
      </nav>
    </header>
  );
}
