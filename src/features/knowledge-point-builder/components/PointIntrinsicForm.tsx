import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PointDraft } from '../../../domain/knowledge/types';

interface PointIntrinsicFormProps {
  draft: PointDraft;
  onSave: (draft: PointDraft) => void;
}

export function PointIntrinsicForm({ draft: initialDraft, onSave }: PointIntrinsicFormProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PointDraft>(initialDraft);

  const handleChange = (field: keyof PointDraft, value: unknown) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form
      className="point-intrinsic-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-name">名称</label>
        <input
          id="point-name"
          type="text"
          value={draft.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-kind">类别</label>
        <select
          id="point-kind"
          value={draft.kind}
          onChange={(e) => handleChange('kind', e.target.value)}
        >
          <option value="course">课程</option>
          <option value="skill">技能</option>
          <option value="knowledge">知识</option>
          <option value="practice">练习</option>
        </select>
      </div>
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-desc">说明</label>
        <textarea
          id="point-desc"
          value={draft.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-content">教学正文</label>
        <textarea
          id="point-content"
          value={draft.content}
          onChange={(e) => handleChange('content', e.target.value)}
          rows={6}
        />
      </div>
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-color">颜色</label>
        <input
          id="point-color"
          type="color"
          value={draft.color || '#8b7355'}
          onChange={(e) => handleChange('color', e.target.value)}
        />
      </div>
      <div className="point-intrinsic-form__actions">
        <button type="button" onClick={() => navigate(-1)}>
          取消
        </button>
        <button type="submit" className="point-intrinsic-form__primary">
          设置位置与关系
        </button>
      </div>
    </form>
  );
}
