import type { TreeIdentity } from '../../../domain/knowledge/types';

interface TreeIdentityFormProps {
  onSubmit: (identity: TreeIdentity) => void;
  identity: TreeIdentity;
  onChange: (identity: TreeIdentity) => void;
  busy?: boolean;
}

const COLORS = ['#b1d8ca', '#8aabad', '#929eb4', '#b79990', '#9dad92'];

export function TreeIdentityForm({ onSubmit, onChange, identity, busy = false }: TreeIdentityFormProps) {
  const { name, description, color } = identity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(identity);
  };

  const update = (next: Partial<TreeIdentity>) => {
    onChange({ ...identity, ...next });
  };

  return (
    <form id="tree-identity-form" className="tree-identity-form" onSubmit={handleSubmit} aria-busy={busy}>
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
          rows={3}
        />
      </div>
      <div className="tree-identity-form__field">
        <label htmlFor="tree-color">颜色</label>
        <div className="tree-color-options" role="radiogroup" aria-label="知识树颜色">
          {COLORS.map((value, index) => <button key={value} type="button" role="radio" aria-label={['玉色', '灰青', '灰蓝', '灰珊瑚', '灰绿'][index]} aria-checked={(color || COLORS[0]) === value} style={{ background: value }} onClick={() => update({ color: value })} />)}
          <label className="tree-color-options__custom" title="自定义颜色"><input id="tree-color" type="color" value={color || COLORS[0]} onChange={(e) => update({ color: e.target.value })} /><span>+</span></label>
        </div>
      </div>
    </form>
  );
}
