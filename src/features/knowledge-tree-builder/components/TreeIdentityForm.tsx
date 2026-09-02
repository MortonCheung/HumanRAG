import { useState } from 'react';
import type { TreeIdentity } from '../../../domain/knowledge/types';

interface TreeIdentityFormProps {
  onSubmit: (identity: TreeIdentity) => void;
  onChange?: (identity: TreeIdentity) => void;
  busy?: boolean;
}

const COLORS = ['#8b7355', '#6f8f91', '#727f9d', '#9a756d', '#78906f'];

export function TreeIdentityForm({ onSubmit, onChange, busy = false }: TreeIdentityFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, color });
  };

  const update = (next: Partial<TreeIdentity>) => {
    const identity = { name, description, color: color || COLORS[0], ...next };
    if (next.name !== undefined) setName(next.name);
    if (next.description !== undefined) setDescription(next.description);
    if (next.color !== undefined) setColor(next.color);
    onChange?.(identity);
  };

  return (
    <form className="tree-identity-form" onSubmit={handleSubmit}>
      <div className="tree-identity-form__field">
        <label htmlFor="tree-name">名称</label>
        <input
          id="tree-name"
          type="text"
          value={name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="例如：计算机网络"
        />
      </div>
      <div className="tree-identity-form__field">
        <label htmlFor="tree-desc">简介</label>
        <textarea
          id="tree-desc"
          value={description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="它将帮助你组织哪一类知识？可稍后填写"
          rows={3}
        />
      </div>
      <div className="tree-identity-form__field">
        <label htmlFor="tree-color">颜色</label>
        <div className="tree-color-options" role="radiogroup" aria-label="知识树颜色">
          {COLORS.map((value) => <button key={value} type="button" role="radio" aria-checked={(color || COLORS[0]) === value} style={{ background: value }} onClick={() => update({ color: value })} />)}
          <label className="tree-color-options__custom" title="自定义颜色"><input id="tree-color" type="color" value={color || COLORS[0]} onChange={(e) => update({ color: e.target.value })} /><span>+</span></label>
        </div>
      </div>
      <p className="tree-identity-form__note">名称、简介和颜色都不是必填项，创建后仍可在设置中修改。</p>
      <button type="submit" className="tree-identity-form__submit" disabled={busy}>
        {busy ? '正在生成知识空间' : '创建知识树'}
      </button>
    </form>
  );
}
