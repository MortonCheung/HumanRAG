import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, X } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { CustomNode, CustomNodeKind } from '../../../store/libraryStore';
import { useLibraryStore } from '../../../store/libraryStore';
import { NodeRelationPreview } from './NodeRelationPreview';
import { CustomTreeCanvas } from './CustomTreeCanvas';

type ConfigTab = 'basic' | 'relations' | 'teaching' | 'appearance';
type AtelierPhase = 'content' | 'spatial';

const TABS: Array<{ id: ConfigTab; label: string }> = [
  { id: 'basic', label: '基本信息' },
  { id: 'relations', label: '知识关系' },
  { id: 'teaching', label: '教学内容' },
  { id: 'appearance', label: '外观' },
];

const KIND_LABELS: Record<CustomNodeKind, string> = { course: '课程', topic: '主题', knowledge: '知识点' };
const COLORS = ['#d8c58f', '#84abb0', '#8998b8', '#b28b82', '#89a98d', '#c3a4b6'];
/** 色板名称（蓝图 §10.7）：读出颜色名而非十六进制值。 */
const COLOR_NAMES: Record<string, string> = {
  '#d8c58f': '暖金',
  '#84abb0': '冷青',
  '#8998b8': '石蓝',
  '#b28b82': '陶土',
  '#89a98d': '灰绿',
  '#c3a4b6': '灰粉',
};

interface AtelierDraft {
  name: string;
  kind: CustomNodeKind;
  domain: string;
  color: string;
  layer: number;
  difficulty: '基础' | '进阶' | '挑战';
  estimatedMinutes: number;
  description: string;
  content: string;
  tags: string;
  learningObjectives: string;
  misconceptions: string;
  recommendedContent: string;
  parentId: string;
  prerequisiteIds: string[];
  relatedIds: string[];
  position: [number, number, number];
}

const INITIAL_DRAFT: AtelierDraft = {
  name: '',
  kind: 'knowledge',
  domain: '计算机科学',
  color: COLORS[1],
  layer: 3,
  difficulty: '基础',
  estimatedMinutes: 18,
  description: '',
  content: '',
  tags: '',
  learningObjectives: '',
  misconceptions: '',
  recommendedContent: '',
  parentId: '',
  prerequisiteIds: [],
  relatedIds: [],
  position: [0, 2, 0],
};

function lines(value: string) {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

export function NodeAtelier({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const nodes = useLibraryStore((state) => state.draft?.nodes ?? []);
  const edges = useLibraryStore((state) => state.draft?.edges ?? []);
  const commitNodeBundle = useLibraryStore((state) => state.commitNodeBundle);
  const [phase, setPhase] = useState<AtelierPhase>('content');
  const [tab, setTab] = useState<ConfigTab>('basic');
  const [draft, setDraft] = useState<AtelierDraft>(INITIAL_DRAFT);

  useGSAP(() => {
    if (reducedMotion) return;
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .fromTo('.node-atelier__aperture', { scaleX: 0.12, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.52 })
      .fromTo('.node-atelier__beam', { opacity: 0, scaleY: 0.25 }, { opacity: 1, scaleY: 1, duration: 0.62 }, 0.08)
      .fromTo('.knowledge-card-preview', { y: 54, rotateX: -10, scale: 0.92, opacity: 0 }, { y: 0, rotateX: 0, scale: 1, opacity: 1, duration: 0.78 }, 0.16)
      .fromTo('.node-atelier__config', { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.56 }, 0.28);
  }, { scope: rootRef, dependencies: [reducedMotion] });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const selectedRelations = useMemo(() => {
    const ids = [draft.parentId, ...draft.prerequisiteIds, ...draft.relatedIds].filter(Boolean);
    return ids.map((id) => nodes.find((node) => node.id === id)?.name ?? '').filter(Boolean);
  }, [draft.parentId, draft.prerequisiteIds, draft.relatedIds, nodes]);

  const previewNode = useMemo<CustomNode>(() => ({
    id: 'atelier-preview-node',
    name: draft.name || '新知识节点',
    kind: draft.kind,
    description: draft.description || '正在定制的知识节点',
    x: draft.position[0],
    y: draft.position[1],
    z: draft.position[2],
    position: draft.position,
    color: draft.color,
    layer: draft.layer,
  }), [draft.color, draft.description, draft.kind, draft.layer, draft.name, draft.position]);

  const previewEdges = useMemo(() => {
    const result = [];
    if (draft.parentId) result.push({ id: 'atelier-preview-parent', source: draft.parentId, target: previewNode.id, relationType: 'hierarchy' as const });
    draft.prerequisiteIds.forEach((source, index) => result.push({ id: `atelier-preview-prerequisite-${index}`, source, target: previewNode.id, relationType: 'prerequisite' as const }));
    draft.relatedIds.forEach((target, index) => result.push({ id: `atelier-preview-related-${index}`, source: previewNode.id, target, relationType: 'related' as const }));
    return result;
  }, [draft.parentId, draft.prerequisiteIds, draft.relatedIds, previewNode.id]);

  function patch<K extends keyof AtelierDraft>(key: K, value: AtelierDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: 'prerequisiteIds' | 'relatedIds', id: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id],
    }));
  }

  function continueToSpatial() {
    const name = draft.name.trim();
    if (!name) {
      setTab('basic');
      return;
    }
    const parent = nodes.find((node) => node.id === draft.parentId);
    const parentPosition = parent?.position ?? (parent ? [parent.x, parent.y, parent.z ?? 0] as [number, number, number] : null);
    const index = nodes.length;
    const angle = index * 2.399963;
    const fallback: [number, number, number] = parentPosition
      ? [parentPosition[0] + Math.cos(angle) * 4.5, parentPosition[1] - 5.2, parentPosition[2] + Math.sin(angle) * 4.5]
      : nodes.length === 0 ? [0, 8, 0] : [Math.cos(angle) * 7, 2, Math.sin(angle) * 7];
    patch('position', fallback.map((value) => Number(value.toFixed(2))) as [number, number, number]);
    setPhase('spatial');
    setTab('relations');
  }

  function save() {
    const name = draft.name.trim();
    if (!name) return;
    const id = `cnode-user-${Date.now().toString(36)}`;
    const node: CustomNode = {
      id,
      name,
      kind: draft.kind,
      description: draft.description.trim() || `${name}的核心概念与学习说明。`,
      x: draft.position[0],
      y: draft.position[1],
      z: draft.position[2],
      position: draft.position,
      domain: draft.domain.trim() || '自定义',
      color: draft.color,
      layer: draft.layer,
      difficulty: draft.difficulty,
      estimatedMinutes: draft.estimatedMinutes,
      tags: lines(draft.tags),
      content: draft.content.trim(),
      learningObjectives: lines(draft.learningObjectives),
      misconceptions: lines(draft.misconceptions),
      recommendedContent: lines(draft.recommendedContent),
    };
    const nextEdges = [];
    if (draft.parentId) nextEdges.push({ id: `cedge-${draft.parentId}-${id}-hierarchy`, source: draft.parentId, target: id, relationType: 'hierarchy' as const });
    draft.prerequisiteIds.forEach((source) => nextEdges.push({ id: `cedge-${source}-${id}-prerequisite`, source, target: id, relationType: 'prerequisite' as const }));
    draft.relatedIds.forEach((target) => nextEdges.push({ id: `cedge-${id}-${target}-related`, source: id, target, relationType: 'related' as const }));
    commitNodeBundle(node, nextEdges);
    onCreated(id);
    onClose();
  }

  return (
    <motion.div
      ref={rootRef}
      className="node-atelier"
      role="dialog"
      aria-modal="true"
      aria-label="定制知识节点"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
    >
      <button className="node-atelier__close" type="button" onClick={onClose} aria-label="关闭节点定制"><X size={18} /></button>
      <div className="node-atelier__aperture" aria-hidden="true" />
      <div className="node-atelier__beam" aria-hidden="true" />

      <section className="node-atelier__stage" aria-label="知识卡实时预览">
        <div className={`node-atelier__tree-backdrop${phase === 'spatial' ? ' is-visible' : ''}`} aria-hidden={phase !== 'spatial'}>
          <CustomTreeCanvas nodes={nodes} edges={edges} selectedId={phase === 'spatial' ? previewNode.id : null} previewNode={previewNode} previewEdges={previewEdges} interactive={false} />
        </div>
        <p className="node-atelier__eyebrow">{phase === 'content' ? '新知识节点' : '放入知识树'}</p>
        <motion.div
          className="knowledge-card-preview"
          style={{ '--node-accent': draft.color } as CSSProperties}
          animate={phase === 'content'
            ? { scale: 1, opacity: 1, borderRadius: 14, y: 0 }
            : { scale: 0.055, opacity: 0.72, borderRadius: 999, y: 16 }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        >
          <header className="knowledge-card-preview__head">
            <span>{draft.domain || '自定义知识库'}</span>
            <i aria-hidden="true" />
          </header>
          <div className="knowledge-card-preview__body">
            <small>{KIND_LABELS[draft.kind]} · 层级 {draft.layer}</small>
            <h2>{draft.name || '为这个知识节点命名'}</h2>
            <p>{draft.description || '用一句清楚的话说明它是什么、为什么值得学习。'}</p>
          </div>
          <div className="knowledge-card-preview__tags">
            {(lines(draft.tags).length ? lines(draft.tags) : ['知识', '教学']).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <dl className="knowledge-card-preview__stats">
            <div><dt>难度</dt><dd>{draft.difficulty}</dd></div>
            <div><dt>预计学习</dt><dd>{draft.estimatedMinutes} 分钟</dd></div>
            <div><dt>关系</dt><dd>{selectedRelations.length} 条</dd></div>
          </dl>
          <NodeRelationPreview name={draft.name} color={draft.color} relationNames={selectedRelations} />
        </motion.div>
        <p className="node-atelier__stage-note">{phase === 'content' ? '卡片会随内容实时书写；下一步，它会凝聚成知识树中的发光节点。' : '同一张知识卡已凝聚为节点。现在设置它在三维树中的位置与关系。'}</p>
      </section>

      <section className="node-atelier__config" aria-label="节点属性配置">
        <header className="node-atelier__config-head">
          <span>{phase === 'content' ? '编辑节点内容' : '设置节点属性'}</span>
          <small>{phase === 'content' ? '先把知识讲清楚' : '层级 · 关系 · 三维坐标'}</small>
        </header>
        <div className="node-atelier__tabs" role="tablist" aria-label="节点配置分类">
          {TABS.filter((item) => phase === 'content' ? ['basic', 'teaching'].includes(item.id) : ['relations', 'appearance'].includes(item.id)).map((item) => (
            <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>
              {tab === item.id && <motion.span layoutId="node-atelier-tab" className="node-atelier__tab-active" />}
              <b>{item.label}</b>
            </button>
          ))}
        </div>
        <div className="node-atelier__form">
          {tab === 'basic' && (
            <>
              <Field label="名称" required><input value={draft.name} onChange={(event) => patch('name', event.target.value)} placeholder="例如：进程调度" autoFocus /></Field>
              <div className="node-atelier__form-grid">
                <Field label="类别"><select value={draft.kind} onChange={(event) => patch('kind', event.target.value as CustomNodeKind)}>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Field label="层级"><select value={draft.layer} onChange={(event) => patch('layer', Number(event.target.value))}>{[0, 1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
              </div>
              <Field label="所属领域"><input value={draft.domain} onChange={(event) => patch('domain', event.target.value)} /></Field>
              <Field label="概念说明"><textarea value={draft.description} onChange={(event) => patch('description', event.target.value)} placeholder="说明概念的定义和学习价值" /></Field>
              <Field label="标签"><input value={draft.tags} onChange={(event) => patch('tags', event.target.value)} placeholder="用逗号分隔，例如：操作系统，调度" /></Field>
            </>
          )}

          {tab === 'relations' && (
            <>
              <Field label="上级节点"><select value={draft.parentId} onChange={(event) => patch('parentId', event.target.value)}><option value="">无上级节点</option>{nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></Field>
              <RelationPicker label="前置知识" nodes={nodes} selected={draft.prerequisiteIds} onToggle={(id) => toggleList('prerequisiteIds', id)} />
              <RelationPicker label="相关知识" nodes={nodes} selected={draft.relatedIds} onToggle={(id) => toggleList('relatedIds', id)} />
            </>
          )}

          {tab === 'teaching' && (
            <>
              <Field label="教学正文"><textarea value={draft.content} onChange={(event) => patch('content', event.target.value)} placeholder="写下系统讲解这个知识点时应覆盖的内容" /></Field>
              <Field label="学习目标"><textarea value={draft.learningObjectives} onChange={(event) => patch('learningObjectives', event.target.value)} placeholder="每行一个可验证目标" /></Field>
              <Field label="常见误区"><textarea value={draft.misconceptions} onChange={(event) => patch('misconceptions', event.target.value)} placeholder="每行一个常见误解" /></Field>
              <Field label="推荐学习内容"><textarea value={draft.recommendedContent} onChange={(event) => patch('recommendedContent', event.target.value)} placeholder="每行一个阅读、示例或练习建议" /></Field>
            </>
          )}

          {tab === 'appearance' && (
            <>
              <Field label="节点颜色">
                <div className="node-atelier__colors" role="group" aria-label="选择节点颜色">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={draft.color === color ? 'is-active' : ''}
                      style={{ background: color }}
                      onClick={() => patch('color', color)}
                      aria-label={`选择颜色 ${COLOR_NAMES[color] ?? color}`}
                      aria-pressed={draft.color === color}
                    >
                      {draft.color === color && <Check size={13} weight="bold" />}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="node-atelier__form-grid">
                <Field label="难度"><select value={draft.difficulty} onChange={(event) => patch('difficulty', event.target.value as AtelierDraft['difficulty'])}>{['基础', '进阶', '挑战'].map((value) => <option key={value}>{value}</option>)}</select></Field>
                <Field label="预计学习时长"><input type="number" min="5" max="180" value={draft.estimatedMinutes} onChange={(event) => patch('estimatedMinutes', Number(event.target.value))} /></Field>
              </div>
              <div className="node-atelier__form-grid node-atelier__position-grid">
                {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                  <Field key={axis} label={`${axis} 坐标`}><input type="number" step="0.5" value={draft.position[index]} onChange={(event) => {
                    const position = [...draft.position] as [number, number, number];
                    position[index] = Number(event.target.value);
                    patch('position', position);
                  }} /></Field>
                ))}
              </div>
              <p className="node-atelier__help">颜色用于区分知识领域，不改变教学优先级。光晕强度由知识图谱自动平衡。</p>
            </>
          )}
        </div>
        <footer className="node-atelier__footer">
          <button className="text-button text-button--ghost" type="button" onClick={phase === 'spatial' ? () => { setPhase('content'); setTab('basic'); } : onClose}>{phase === 'spatial' ? '返回内容' : '取消'}</button>
          {phase === 'content' ? (
            <button className="text-button text-button--primary" type="button" onClick={continueToSpatial} disabled={!draft.name.trim()}>继续设置位置与关系</button>
          ) : (
            <button className="text-button text-button--primary" type="button" onClick={save}><Check size={14} /> 完成并加入知识树</button>
          )}
        </footer>
      </section>
    </motion.div>
  );
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <label className="node-atelier__field"><span>{label}{required && <em>必填</em>}</span>{children}</label>;
}

function RelationPicker({ label, nodes, selected, onToggle }: { label: string; nodes: CustomNode[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <fieldset className="node-atelier__relation-picker">
      <legend>{label}</legend>
      <div>{nodes.map((node) => <button type="button" key={node.id} className={selected.includes(node.id) ? 'is-active' : ''} onClick={() => onToggle(node.id)}><i style={{ background: node.color ?? '#82989b' }} />{node.name}{selected.includes(node.id) && <Check size={12} />}</button>)}</div>
    </fieldset>
  );
}
