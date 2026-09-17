import { useRef, useState, type FormEvent } from 'react';
import { ArrowUp } from '@phosphor-icons/react';
import { AI_SUBMISSION_COOLDOWN_MS, type ChatMessage, type ChatSource } from '../../../ai/chat/contracts';
import { sendChat } from '../../../ai/chat/chatClient';
import { routeTutorContext } from '../../../ai/context/contextRouter';
import { selectContextBlocks } from '../../../ai/context/learnerContext';
import { useLearnerContextBundle } from '../../../ai/context/useLearnerContextBundle';
import type { ContextBlockId } from '../../../ai/context/contracts';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import './tutor.css';

type TutorItem = ChatMessage & { id: number; source?: ChatSource; references?: ContextBlockId[] };

const BLOCK_LABELS: Record<ContextBlockId, string> = {
  mistakes: '薄弱项', activity: '学习活动', branches: '方向表现', recommendation: '下一步建议', recentLearning: '最近学习',
};

export function TutorPage() {
  const { bundle } = useLearnerContextBundle();
  const [messages, setMessages] = useState<TutorItem[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const sequence = useRef(0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy || Date.now() < cooldownUntil) return;
    const routing = routeTutorContext(message);
    const contextBlocks = selectContextBlocks(bundle, routing.blocks);
    const history = messages.slice(-12).map(({ role, content }) => ({ role, content }));
    setDraft('');
    setBusy(true);
    setMessages((current) => [...current, { id: sequence.current++, role: 'user', content: message }]);
    const result = await sendChat({ mode: 'tutor', message, history, baseContext: bundle.base, contextBlocks, routing });
    setMessages((current) => [...current, { id: sequence.current++, role: 'assistant', content: result.text, source: result.source, references: routing.blocks }]);
    setBusy(false);
    const until = Date.now() + AI_SUBMISSION_COOLDOWN_MS;
    setCooldownUntil(until);
    window.setTimeout(() => setCooldownUntil((current) => current === until ? 0 : current), AI_SUBMISSION_COOLDOWN_MS);
  };

  return <div className="page tutor-page">
    <WorkspaceHeader title="AI导师" />
    <main className="tutor-workspace">
      <header className="tutor-heading"><p>全局学习支持</p><h1>AI导师</h1><span>问知识，也可以结合你的学习记录进行分析</span></header>
      <section className="tutor-conversation" aria-label="导师对话">
        {messages.length === 0 && <div className="tutor-empty"><strong>从一个具体问题开始</strong><p>可以直接问概念，也可以问“我哪里最薄弱”或“下一步学什么”。只有这类明确问题才会读取相应学习明细。</p></div>}
        {messages.map((item) => <article key={item.id} className={`tutor-message tutor-message--${item.role}`}>
          <span>{item.role === 'user' ? '你' : 'AI导师'}</span>
          <p>{item.content}</p>
          {item.role === 'assistant' && <footer>{item.references?.length ? <small>参考：{item.references.map((id) => BLOCK_LABELS[id]).join(' · ')}</small> : <span />}{item.source === 'mock' && <small>演示回复</small>}</footer>}
        </article>)}
        {busy && <p className="tutor-busy" role="status">正在整理回答…</p>}
      </section>
      <form className="tutor-composer" onSubmit={submit}>
        <label htmlFor="tutor-input">输入问题</label>
        <div><textarea id="tutor-input" maxLength={1000} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="问一个知识问题，或询问你的学习情况…" /><button type="submit" aria-label="发送给 AI 导师" disabled={!draft.trim() || busy || Date.now() < cooldownUntil}><ArrowUp size={19} /></button></div>
      </form>
    </main>
  </div>;
}
