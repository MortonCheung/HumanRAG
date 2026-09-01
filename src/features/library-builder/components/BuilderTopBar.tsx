import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from '@phosphor-icons/react';

/** 创建知识库顶部任务栏：返回、名称、保存状态、保存（蓝图 §11.3）。 */
export function BuilderTopBar({
  name,
  saveStatus,
  onSave,
  canSave,
}: {
  name: string;
  saveStatus: string;
  onSave: () => void;
  canSave: boolean;
}) {
  return (
    <header className="builder-topbar">
      <Link className="builder-topbar__back" to="/library" aria-label="返回知识库">
        <ArrowLeft size={17} />
      </Link>
      <div className="builder-topbar__title">
        <span className="builder-topbar__name">{name || '未命名知识库'}</span>
        <span className="builder-topbar__status">{saveStatus}</span>
      </div>
      <button
        className="text-button text-button--primary"
        type="button"
        onClick={onSave}
        disabled={!canSave}
      >
        <Check size={15} weight="bold" /> 保存
      </button>
    </header>
  );
}
