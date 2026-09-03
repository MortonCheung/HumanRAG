import { useEffect, useState } from 'react';
import type { KnowledgePoint, PointDraft } from '../../../domain/knowledge/types';

const KINDS = [
  ['goal', '目标'], ['direction', '方向'], ['course', '课程'], ['skill', '技能'],
  ['knowledge', '知识点'], ['practice', '练习'],
] as const;

function join(values: string[]) { return values.join('，'); }
function split(value: string) { return value.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean); }

export function PointInspectorPanel({ draft, points, onChange, onCancel, onSave, onDelete, error }: {
  draft: PointDraft;
  points: KnowledgePoint[];
  onChange: (draft: PointDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  error: string | null;
}) {
  const [section, setSection] = useState<'content' | 'relations'>('content');
  useEffect(() => setSection('content'), [draft.id]);
  const candidates = points.filter((point) => point.id !== draft.id);
  const update = <K extends keyof PointDraft>(key: K, value: PointDraft[K]) => onChange({ ...draft, [key]: value });
  const toggle = (key: 'prerequisiteIds' | 'relatedIds', id: string) => {
    const current = draft[key];
    update(key, current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  return (
    <section className="point-inspector" aria-label="知识点属性">
      <div className="point-inspector__title">
        <span className="point-list__swatch" style={{ background: draft.color }} />
        <div><small>属性</small><strong>{draft.name || '未命名知识点'}</strong></div>
      </div>
      <div className="point-inspector__tabs" role="tablist">
        <button type="button" className={section === 'content' ? 'is-active' : ''} onClick={() => setSection('content')}>内容</button>
        <button type="button" className={section === 'relations' ? 'is-active' : ''} onClick={() => setSection('relations')}>关系</button>
      </div>
      <div className="point-inspector__body">
        {section === 'content' ? (
          <>
            <label className="editor-field">名称<input value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
            <div className="point-inspector__row">
              <label className="editor-field">类型<select value={draft.kind} onChange={(event) => update('kind', event.target.value as PointDraft['kind'])}>{KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="editor-field">颜色<input className="point-inspector__color" type="color" value={draft.color} onChange={(event) => update('color', event.target.value)} /></label>
            </div>
            <label className="editor-field">简介<textarea rows={2} value={draft.description} onChange={(event) => update('description', event.target.value)} /></label>
            <label className="editor-field">学习内容<textarea rows={7} value={draft.content} onChange={(event) => update('content', event.target.value)} /></label>
            <div className="point-inspector__row">
              <label className="editor-field">难度<select value={draft.difficulty ?? ''} onChange={(event) => update('difficulty', (event.target.value || undefined) as PointDraft['difficulty'])}><option value="">未设置</option><option>基础</option><option>进阶</option><option>挑战</option></select></label>
              <label className="editor-field">预计分钟<input type="number" min="0" value={draft.estimatedMinutes ?? ''} onChange={(event) => update('estimatedMinutes', event.target.value ? Number(event.target.value) : undefined)} /></label>
            </div>
            <label className="editor-field">标签<input value={join(draft.tags)} onChange={(event) => update('tags', split(event.target.value))} placeholder="用逗号分隔" /></label>
            <label className="editor-field">学习目标<textarea rows={2} value={join(draft.learningObjectives)} onChange={(event) => update('learningObjectives', split(event.target.value))} /></label>
            <label className="editor-field">常见误区<textarea rows={2} value={join(draft.misconceptions)} onChange={(event) => update('misconceptions', split(event.target.value))} /></label>
          </>
        ) : (
          <>
            <label className="editor-field">上级节点<select value={draft.parentId ?? ''} onChange={(event) => update('parentId', event.target.value || undefined)}><option value="">无</option>{candidates.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label>
            <fieldset className="editor-field point-inspector__checks"><legend>前置知识</legend>{candidates.length === 0 ? <small>暂无其他节点</small> : candidates.map((point) => <label key={point.id} className="editor-check"><input type="checkbox" checked={draft.prerequisiteIds.includes(point.id)} disabled={draft.parentId === point.id} onChange={() => toggle('prerequisiteIds', point.id)} />{point.name}</label>)}</fieldset>
            <fieldset className="editor-field point-inspector__checks"><legend>相关知识</legend>{candidates.length === 0 ? <small>暂无其他节点</small> : candidates.map((point) => <label key={point.id} className="editor-check"><input type="checkbox" checked={draft.relatedIds.includes(point.id)} onChange={() => toggle('relatedIds', point.id)} />{point.name}</label>)}</fieldset>
            <fieldset className="editor-field"><legend>空间位置</legend><div className="point-inspector__position">{(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}>{axis}<input type="number" step="0.5" value={draft.position?.[index] ?? 0} onChange={(event) => { const next = [...(draft.position ?? [0, 0, 0])] as [number, number, number]; next[index] = Number(event.target.value); update('position', next); }} /></label>)}</div></fieldset>
          </>
        )}
        {error && <p className="point-inspector__error">{error}</p>}
      </div>
      <footer className="point-inspector__actions">
        <button type="button" className="point-inspector__delete" onClick={onDelete}>删除</button>
        <span />
        <button type="button" onClick={onCancel}>取消</button>
        <button type="button" className="is-primary" onClick={onSave}>保存</button>
      </footer>
    </section>
  );
}
