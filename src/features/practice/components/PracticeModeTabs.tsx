import type { PracticeMode } from '../../../ai/practice/PracticePlanner';

const TABS: Array<{ mode: PracticeMode; label: string }> = [
  { mode: 'daily', label: '今日练习' },
  { mode: 'goal', label: '按目标练习' },
  { mode: 'node', label: '按知识点练习' },
  { mode: 'paper', label: '模拟试卷' },
  { mode: 'mistake', label: '错题复习' },
];

export function PracticeModeTabs({
  active,
  onChange,
}: {
  active: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}) {
  return (
    <nav className="mode-tabs" aria-label="练习方式">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          type="button"
          className={`mode-tab ${active === tab.mode ? 'is-active' : ''}`}
          onClick={() => onChange(tab.mode)}
          aria-current={active === tab.mode ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
