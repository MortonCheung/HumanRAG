import type { PointDraft } from '../../../domain/knowledge/types';

interface PointIntrinsicFormProps {
  draft: PointDraft;
  onChange: (field: keyof PointDraft, value: unknown) => void;
  onSave: (draft: PointDraft) => void;
}

export function PointIntrinsicForm({ draft, onChange, onSave }: PointIntrinsicFormProps) {
  const handleChange = (field: keyof PointDraft, value: unknown) => {
    onChange(field, value);
  };

  return (
    <form
      id="point-intrinsic-form"
      className="point-intrinsic-form"
      onSubmit={(e) => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        onSave({
          ...draft,
          name: String(values.get('point-name') ?? draft.name),
          kind: String(values.get('point-kind') ?? draft.kind) as PointDraft['kind'],
          description: String(values.get('point-description') ?? draft.description),
          content: String(values.get('point-content') ?? draft.content),
          color: String(values.get('point-color') ?? draft.color),
        });
      }}
    >
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-name">名称</label>
        <input
          id="point-name"
          name="point-name"
          type="text"
          required
          value={draft.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-kind">类别</label>
        <select
          id="point-kind"
          name="point-kind"
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
          name="point-description"
          value={draft.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-content">教学正文</label>
        <textarea
          id="point-content"
          name="point-content"
          value={draft.content}
          onChange={(e) => handleChange('content', e.target.value)}
          rows={6}
        />
      </div>
      <div className="point-intrinsic-form__field">
        <label htmlFor="point-color">颜色</label>
        <input
          id="point-color"
          name="point-color"
          type="color"
          value={draft.color || '#8b7355'}
          onChange={(e) => handleChange('color', e.target.value)}
        />
      </div>
    </form>
  );
}
