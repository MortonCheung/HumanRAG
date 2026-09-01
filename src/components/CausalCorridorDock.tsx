import { ArrowsOutCardinal, ArrowUDownLeft, ArrowUUpRight, Path, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import type { SceneModel } from '../graph/types';
import { nodesById } from '../data/knowledgeGraph';
import { useKnowledgeStore } from '../store/knowledgeStore';

export function CausalCorridorDock({ model }: { model: SceneModel }) {
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const relationMode = useKnowledgeStore((state) => state.relationMode);
  const setRelationMode = useKnowledgeStore((state) => state.setRelationMode);
  const close = useKnowledgeStore((state) => state.closeNodeDetail);
  const generatePath = useKnowledgeStore((state) => state.generateLearningPath);
  const learningPathStatus = useKnowledgeStore((state) => state.learningPathStatus);
  const node = selectedNodeId ? nodesById.get(selectedNodeId) : null;
  return <AnimatePresence>{node && <motion.nav className="corridor-dock" aria-label="因果走廊控制台" initial={{ opacity: 0, y: 14, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
    <button className={`corridor-stat ${relationMode === 'upstream' ? 'is-active' : ''}`} onClick={() => setRelationMode('upstream')}><ArrowUDownLeft size={16} /><span>上游 {model.upstreamNodeIds.size}</span></button>
    <span className="corridor-current">{node.name}</span>
    <button className={`corridor-stat ${relationMode === 'downstream' ? 'is-active' : ''}`} onClick={() => setRelationMode('downstream')}><ArrowUUpRight size={16} /><span>下游 {model.downstreamNodeIds.size}</span></button>
    <span className="corridor-rule" />
    <button className={`corridor-icon ${relationMode === 'primary' ? 'is-active' : ''}`} onClick={() => setRelationMode('primary')} aria-label="仅看主路径" data-tooltip="主路径"><Path size={16} /></button>
    <button className={`corridor-icon ${relationMode === 'all' ? 'is-active' : ''}`} onClick={() => setRelationMode('all')} aria-label="显示全部关系" data-tooltip="全部关系"><ArrowsOutCardinal size={16} /></button>
    <button className="corridor-icon" onClick={() => void generatePath()} aria-label="生成学习路径" data-tooltip="学习路径" disabled={learningPathStatus === 'loading'}><Path size={16} weight="bold" /></button>
    <button className="corridor-icon" onClick={close} aria-label="返回透镜全景" data-tooltip="返回全景"><X size={16} /></button>
  </motion.nav>}</AnimatePresence>;
}
