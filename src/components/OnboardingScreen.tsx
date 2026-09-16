import { ArrowRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { UserProfile } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { BrandMark } from './BrandMark';

const QUICK_GOALS = ['考研408', 'AI工程', '游戏开发', '前端开发'];

export function OnboardingScreen() {
  const profile = useKnowledgeStore((state) => state.profile);
  const submitProfile = useKnowledgeStore((state) => state.submitProfile);
  const [draft, setDraft] = useState<UserProfile>(profile ?? { major: '', identity: '', goal: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(profile ?? { major: '', identity: '', goal: '' });
  }, [profile]);

  const update = (key: keyof UserProfile, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    setSubmitting(true);
    await submitProfile({
      major: draft.major.trim(),
      identity: draft.identity.trim(),
      goal: draft.goal.trim(),
    });
    setSubmitting(false);
  };

  return (
    <section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <header className="onboarding__header">
        <BrandMark />
        <span>HumanRAG · 信息仅保存在本机</span>
      </header>

      <div className="onboarding__layout">
        <section className="onboarding__story">
          <p className="intro-kicker">目标驱动的三维知识地图</p>
          <h1 id="onboarding-title">知识不是目录。<br />它是一片可以进入的关系。</h1>
          <p className="onboarding__lead">告诉系统你是谁、准备去哪里。与你目标相关的知识会靠近，其余内容仍留在远处，保持完整世界的存在感。</p>

          <div className="onboarding__metrics" aria-label="知识空间规模">
            <span><strong>100</strong><small>知识节点</small></span>
            <span><strong>04</strong><small>学习方向</small></span>
            <span><strong>05</strong><small>认知层级</small></span>
          </div>
        </section>

        <section className="onboarding__form-panel">
          <div className="form-intro">
            <span className="form-index">01 / 建立学习坐标</span>
            <h2>你准备抵达哪里？</h2>
            <p>三项信息只用于本次路径匹配。</p>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate>
            <Field label="专业（可选）" value={draft.major} placeholder="例如：软件工程" onChange={(value) => update('major', value)} />
            <Field label="当前身份（可选）" value={draft.identity} placeholder="例如：本科生" onChange={(value) => update('identity', value)} />
            <label className="field-block">
              <span>学习目标（可选）</span>
              <textarea value={draft.goal} onChange={(event) => update('goal', event.target.value)} placeholder="例如：计算机考研408" rows={3} maxLength={160} />
            </label>

            <div className="goal-shortcuts" aria-label="快捷目标">
              {QUICK_GOALS.map((label) => (
                <button type="button" key={label} className={draft.goal === label ? 'is-selected' : ''} onClick={() => update('goal', label)}>
                  <span>{label}</span><ArrowRight size={14} />
                </button>
              ))}
            </div>

            <button className="primary-button" type="submit" disabled={submitting}>
              <span>{submitting ? '正在整理知识关系' : '进入知识地图'}</span>
              <ArrowRight size={18} weight="bold" />
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="field-block">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={80} />
    </label>
  );
}
