import { useRef, useState } from 'react';
import { CornersOut, LinkSimple, Plus, Trash, X } from '@phosphor-icons/react';
import { AnimatePresence } from 'motion/react';
import type { CustomNodeKind, CustomRelationType } from '../../../store/libraryStore';
import { useLibraryStore } from '../../../store/libraryStore';
import { CustomTreeCanvas } from './CustomTreeCanvas';
import { NodeAtelier } from './NodeAtelier';

const KIND_LABELS: Record<CustomNodeKind, string> = { course: '课程', topic: '主题', knowledge: '知识点' };
const RELATION_LABELS: Record<CustomRelationType, string> = {
  hierarchy: '包含',
  prerequisite: '前置',
  related: '相关',
  practice_for: '练习对应',
};

/** 独立的三维个人知识树编辑器：旋转、缩放、拖动节点并建立关系。 */
export function GraphEditorStep() {
  const draft = useLibraryStore((state) => state.draft);
  const updateNode = useLibraryStore((state) => state.updateNode);
  const commitNodePosition = useLibraryStore((state) => state.commitNodePosition);
  const removeNode = useLibraryStore((state) => state.removeNode);
  const addEdge = useLibraryStore((state) => state.addEdge);
  const removeEdge = useLibraryStore((state) => state.removeEdge);
  const nodes = draft?.nodes ?? [];
  const edges = draft?.edges ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<CustomRelationType>('hierarchy');
  const [atelierOpen, setAtelierOpen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const addNodeButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;

  function connectTo(targetId: string) {
    if (!connectSource || connectSource === targetId) return;
    addEdge({
      id: `cedge-${connectSource}-${targetId}-${relationType}-${Date.now().toString(36)}`,
      source: connectSource,
      target: targetId,
      relationType,
    });
    setSelectedId(targetId);
    setConnectSource(null);
  }

  return (
    <div className="builder-stage__scroll builder-stage__scroll--spatial">
      <p className="builder-step__kicker">三维结构</p>
      <div className="builder-step__title-row">
        <div>
          <h2 className="builder-step__title">编辑你的知识树</h2>
          <p className="builder-spatial-intro">左键旋转，右键平移，滚轮缩放；直接拖动节点改变它在知识树中的位置。</p>
        </div>
        <button ref={addNodeButtonRef} className="text-button text-button--primary" type="button" onClick={() => setAtelierOpen(true)}>
          <Plus size={15} weight="bold" /> 添加节点
        </button>
      </div>

      <div className="builder-spatial-toolbar" aria-label="三维知识树工具">
        <button className={`text-button text-button--ghost${connectSource ? ' is-active' : ''}`} type="button" disabled={!selectedId} onClick={() => setConnectSource((current) => current ? null : selectedId)}>
          {connectSource ? <X size={14} /> : <LinkSimple size={14} />}{connectSource ? '取消连接' : '连接节点'}
        </button>
        {(Object.keys(RELATION_LABELS) as CustomRelationType[]).map((type) => (
          <button key={type} type="button" className={`builder-chip${relationType === type ? ' is-active' : ''}`} onClick={() => setRelationType(type)}>{RELATION_LABELS[type]}</button>
        ))}
        <button className="text-button text-button--ghost builder-spatial-toolbar__reset" type="button" onClick={() => setCanvasKey((value) => value + 1)}><CornersOut size={14} /> 恢复视角</button>
      </div>

      {connectSource && (
        <div className="builder-edge-hint" role="status">
          从 <strong>{nodes.find((node) => node.id === connectSource)?.name}</strong> 出发，点击另一个节点建立“{RELATION_LABELS[relationType]}”关系。
        </div>
      )}

      <div className="builder-spatial-workspace">
        <section className="builder-tree-stage" aria-label="三维知识树编辑区">
          <CustomTreeCanvas
            key={canvasKey}
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            connectSource={connectSource}
            onSelect={setSelectedId}
            onConnectTarget={connectTo}
            onMove={commitNodePosition}
          />
          <div className="builder-tree-stage__caption"><span>{nodes.length} 个节点</span><span>{edges.length} 条关系</span><span>三维坐标已启用</span></div>
        </section>

        <aside className="builder-spatial-inspector" aria-label="节点属性编辑">
          {selectedNode ? (
            <>
              <header className="builder-spatial-inspector__head">
                <div><small>当前节点</small><strong>{selectedNode.name}</strong></div>
                <button type="button" className="icon-button" onClick={() => { removeNode(selectedNode.id); setSelectedId(null); }} aria-label="删除当前节点"><Trash size={15} /></button>
              </header>
              <div className="builder-spatial-inspector__body">
                <label className="builder-field"><span>名称</span><input className="builder-input" value={selectedNode.name} onChange={(event) => updateNode(selectedNode.id, { name: event.target.value })} /></label>
                <label className="builder-field"><span>类别</span><select className="builder-input" value={selectedNode.kind} onChange={(event) => updateNode(selectedNode.id, { kind: event.target.value as CustomNodeKind })}>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="builder-field"><span>说明</span><textarea className="builder-textarea" value={selectedNode.description} onChange={(event) => updateNode(selectedNode.id, { description: event.target.value })} /></label>
                <div className="builder-position-readout">
                  {(selectedNode.position ?? [selectedNode.x, selectedNode.y, selectedNode.z ?? 0]).map((value, index) => <span key={['x', 'y', 'z'][index]}><small>{['X', 'Y', 'Z'][index]}</small>{value.toFixed(2)}</span>)}
                </div>
                <p className="builder-empty-note">拖动左侧光点即可更新坐标。选中“连接节点”后，再点击目标光点建立关系。</p>
              </div>
              <div className="builder-spatial-inspector__relations">
                <small>关系 {edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length}</small>
                {edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).map((edge) => (
                  <div className="builder-edge-item" key={edge.id}>
                    <span>{nodes.find((node) => node.id === edge.source)?.name} <em>—{RELATION_LABELS[edge.relationType]}→</em> {nodes.find((node) => node.id === edge.target)?.name}</span>
                    <button type="button" className="builder-edge-item__remove" onClick={() => removeEdge(edge.id)} aria-label="删除关系"><X size={13} /></button>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="builder-empty-note">点击三维知识树中的任意光点，在这里编辑它。</p>}
        </aside>
      </div>

      <AnimatePresence>
        {atelierOpen && (
          <NodeAtelier
            onClose={() => {
              setAtelierOpen(false);
              requestAnimationFrame(() => addNodeButtonRef.current?.focus());
            }}
            onCreated={(id) => {
              setSelectedId(id);
              setConnectSource(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
