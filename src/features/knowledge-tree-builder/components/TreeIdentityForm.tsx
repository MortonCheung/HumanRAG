import { useState } from 'react';
import type { TreeIdentity } from '../../../domain/knowledge/types';

interface TreeIdentityFormProps {
  onSubmit: (identity: TreeIdentity) => void;
}

export function TreeIdentityForm({ onSubmit }: TreeIdentityFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, color });
  };

  return (
    <form className="tree-identity-form" onSubmit={handleSubmit}>
      <div className="tree-identity-form__field">
        <label htmlFor="tree-name">名称</label>
        <input
          id="tree-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="知识树名称"
        />
      </div>
      <div className="tree-identity-form__field">
        <label htmlFor="tree-desc">简介</label>
        <textarea
          id="tree-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="知识树简介（可选）"
          rows={3}
        />
      </div>
      <div className="tree-identity-form__field">
        <label htmlFor="tree-color">颜色</label>
        <input
          id="tree-color"
          type="color"
          value={color || '#8b7355'}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
      <button type="submit" className="tree-identity-form__submit">
        创建知识树
      </button>
    </form>
  );
}
