import { ArrowCounterClockwise, MagnifyingGlass, Notebook, Target, SlidersHorizontal } from '@phosphor-icons/react';
import { TransitionLink as Link } from '../app/pageNavigation';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { WorkspaceHeader } from '../features/workspace/WorkspaceHeader';
import { FullscreenButton } from './navigation/FullscreenButton';
import { ROUTES } from '../app/routes';

export function TopBar() {
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const openPanel = useKnowledgeStore((state) => state.openPanel);
  const returnOverview = useKnowledgeStore((state) => state.returnOverview);
  return (
    <WorkspaceHeader title="知识空间" actions={<>
      <button type="button" className="context-nav__button" onClick={() => openPanel('search')} aria-label="搜索" aria-pressed={activePanel === 'search'}><MagnifyingGlass size={18} aria-hidden="true" /><span>搜索</span></button>
      <button type="button" className="context-nav__button" onClick={() => openPanel('lens')} aria-label="选择目标" aria-pressed={activePanel === 'lens'}><Target size={18} aria-hidden="true" /><span>目标</span></button>
      <Link className="context-nav__button" to={ROUTES.progress} state={{ returnTo: ROUTES.universe }} aria-label="学习记录" title="学习记录"><Notebook size={18} aria-hidden="true" /><span>学习记录</span></Link>
      <FullscreenButton />
      <button type="button" className="context-nav__button context-nav__utility" onClick={returnOverview} aria-label="视图复位" title="视图复位"><ArrowCounterClockwise size={18} aria-hidden="true" /><span>复位</span></button>
      <button type="button" className="context-nav__button context-nav__utility" onClick={() => openPanel('settings')} aria-label="性能设置" title="画质" aria-pressed={activePanel === 'settings'}><SlidersHorizontal size={18} aria-hidden="true" /><span>画质</span></button>
    </>} />
  );
}
