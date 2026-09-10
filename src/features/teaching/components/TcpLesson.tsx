import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TransitionLink as Link, usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ArrowRight, CaretLeft, CaretRight, Pause, Play } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';
import { TCP_FRAGMENTS, TCP_NODE_ID, TCP_RULES, TCP_VERSION, getTcpQuestion, getTcpTask, tcpResultKey, tcpWindows, type TcpDifficulty } from '../../../data/v6/handcrafted/tcpLesson';
import { currentTcpTaskId, tcpEventId, useTeachingStore, type PracticeReturnContext } from '../../../store/teachingStore';
import { useProgressStore, learningStatusFromEvidence } from '../../../store/progressStore';
import { useUserStore } from '../../../store/userStore';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { ROUTES } from '../../../app/routes';
import { TcpTaskInputs } from './TcpTaskInputs';

const STAGES = { ready: '开始之前', diagnostic: '先试一次', clarification: '再看关键一步', teaching: '看清变化', guided: '试着应用', independent: '独立验证', complete: '本轮完成', paused: '本轮结束' };
const PHASES = ['先试一次', '观察示范', '引导练习', '独立验证'];
const PHASE_INDEX = { ready: 0, diagnostic: 0, clarification: 0, teaching: 1, guided: 2, independent: 3, complete: 3, paused: 3 };

export function TcpLesson({ parent }: { parent: { to: string; state?: unknown } }) {
  const lessonHeading = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const learnerId = useUserStore((state) => state.activeProfileId);
  const store = useTeachingStore();
  const records = useProgressStore((state) => state.evidenceRecords);
  const practiceReturn = (location.state as { practiceReturn?: PracticeReturnContext } | null)?.practiceReturn;
  const session = store.tcp?.learnerId === learnerId ? store.tcp : null;
  const taskId = session ? currentTcpTaskId(session) : undefined;
  const task = getTcpTask(taskId ?? '');
  const question = getTcpQuestion(taskId ?? '');
  const eventId = session && task ? tcpEventId(session, task.id) : '';
  const hintShown = session?.hints.includes(eventId) ?? false;
  const status = learningStatusFromEvidence(records, TCP_NODE_ID, learnerId);

  useEffect(() => { useTeachingStore.getState().ensureTcpSession(practiceReturn); }, [learnerId, practiceReturn]);
  useEffect(() => { if (taskId) useTeachingStore.getState().presentTcpTask(); }, [taskId, session?.id, session?.attempt]);
  useLayoutEffect(() => {
    if (!session) return;
    lessonHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    lessonHeading.current?.focus({ preventScroll: true });
  }, [session?.stage, taskId]);

  const returnContext = session?.practiceReturn?.learnerId === learnerId ? session.practiceReturn : undefined;
  const exit = () => navigate(parent.to, { state: parent.state });
  return (
    <div className="page tcp-page">
      <WorkspaceHeader title="TCP 慢启动" backLabel="返回知识树" onBack={exit} actions={<Link className="context-nav__button" to={ROUTES.progress} state={{ returnTo: location.pathname, returnState: location.state }}>学习记录</Link>} primaryAction={returnContext ? <Link className="context-nav__button context-nav__button--primary" to={returnContext.path}>继续原练习</Link> : undefined} />
      <main className="tcp-lesson">
        <header className="tcp-lesson__heading"><div><p className="tcp-eyebrow">计算机网络 <span aria-hidden="true">/</span> TCP 慢启动</p><h1 ref={lessonHeading} tabIndex={-1}>{session?.stage === 'teaching' ? TCP_FRAGMENTS[session.difficulty].title : session?.stage === 'independent' ? '换个条件，独立判断。' : session?.stage === 'complete' ? '本轮验证完成。' : session?.stage === 'paused' ? '先停在这里。' : '窗口，怎样一步步变大？'}</h1></div><span className="tcp-lesson__edition" aria-hidden="true">TCP<br />01</span></header>
        {session && <ol className="tcp-phases" aria-label="本轮教学阶段">{PHASES.map((label, index) => <li key={label} aria-current={index === PHASE_INDEX[session.stage] ? 'step' : undefined}><span aria-hidden="true">0{index + 1}</span>{label}</li>)}</ol>}
        {store.storageError && <div role="alert" className="lesson-save-error">{store.storageError}<button type="button" className="text-button" onClick={() => session ? store.saveTcp(session) : store.ensureTcpSession(practiceReturn)}>重试保存</button></div>}
        {!session ? <p>正在恢复本次学习。</p> : session.stage === 'ready' ? <section className="tcp-intro"><div className="tcp-intro__copy"><p>给定初始窗口与门限，<br />判断每轮之后的变化。</p><button className="text-button text-button--primary" type="button" onClick={store.advanceTcp}>开始尝试 <ArrowRight size={18} /></button><p className="tcp-fine">逐 RTT 的简化模型，不是完整 TCP 仿真。</p><TcpSource /></div><div className="tcp-intro__notation" aria-hidden="true"><div><small>拥塞窗口</small><span>cwnd</span></div><div className="tcp-intro__packets">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div><div className="tcp-intro__threshold"><small>慢启动门限</small><span>ssthresh</span></div></div></section> : session.stage === 'teaching' ? <>
          <p className="tcp-lesson__lead">{TCP_FRAGMENTS[session.difficulty].text}</p>
          <TcpDemonstration key={`${session.id}-${session.attempt}-${session.difficulty}`} difficulty={session.difficulty} learnerId={learnerId} />
          <div className="tcp-stage-end"><button type="button" className="text-button text-button--primary" onClick={store.advanceTcp}>自己试一次 <ArrowRight size={18} /></button></div>
        </> : task && question ? <section key={eventId} className="tcp-task" aria-labelledby="tcp-task-title">
          <div className="tcp-task__main"><p className="tcp-eyebrow">{session.stage === 'independent' ? `第 ${session.attempt} 轮 · ${session.taskIndex + 1} / 2 · ${hintShown ? '已使用帮助' : '未使用帮助'}` : STAGES[session.stage]}</p><h2 id="tcp-task-title">{question.stem}</h2>
            {task.role === 'observe' && <ol className="tcp-observations" aria-label="观测窗口">{tcpWindows(task.initial, task.threshold, Math.max(...task.rounds)).map((value, round) => <li key={round}><span>第 {round} 轮</span><strong>{value}</strong><small>MSS</small></li>)}</ol>}
            <TcpTaskInputs task={task} value={session.drafts[eventId] ?? ''} disabled={Boolean(session.feedback)} onChange={store.setTcpDraft} />
            {hintShown && <div className="tcp-help" role="status">{TCP_RULES}{session.stage === 'independent' && <p>本题按辅助作答记录，之后用新任务验证。</p>}</div>}
            {session.feedback ? <div className="tcp-feedback" role="status"><strong>{session.feedback.correct ? hintShown ? '辅助下完成' : '本题正确' : '还需要调整'}</strong><p>{session.feedback.text}</p>{!session.feedback.correct && <p>{session.feedback.difficulty === 'unknown' ? '这个答案尚不足以确定原因。' : TCP_FRAGMENTS[session.feedback.difficulty].title}</p>}</div> : null}
            <div className="tcp-task__actions">{session.feedback ? <button className="text-button text-button--primary" onClick={store.advanceTcp} type="button">{session.stage === 'independent' && session.feedback.correct && session.feedback.independent ? session.taskIndex === 0 ? '下一项任务' : '查看本轮结果' : session.feedback.correct ? '继续' : '看关键一步'} <ArrowRight size={18} /></button> : <><button className="text-button text-button--primary" type="button" onClick={store.submitTcp}>提交判断 <ArrowRight size={18} /></button><button className="text-button text-button--ghost" type="button" disabled={hintShown} onClick={store.requestTcpHint}>{hintShown ? '已使用提示' : '需要提示'}</button></>}</div>
          </div><aside className="tcp-task__aside"><dl className="tcp-task__conditions"><div><dt>初始窗口</dt><dd>{task.initial}<small>MSS</small></dd></div><div><dt>慢启动门限</dt><dd>{task.threshold}<small>MSS</small></dd></div></dl><p className="tcp-eyebrow">{session.stage === 'independent' ? '独立验证' : '当前安排'}</p><p>{session.stage === 'independent' ? '正向预测与观测判断，须在同一轮无帮助完成。' : session.decision}</p><details><summary>本例的范围</summary><p>第 0 轮为初始状态；每轮代表一个 RTT。题目给定初始窗口和门限。这里只验证无丢包情形。</p></details></aside>
        </section> : <section className="tcp-complete"><span className={`tcp-status tcp-status--${status.status}`}>{status.label}</span><p>{session.stage === 'paused' ? session.pauseReason : '本轮的正向预测与观测判断均无帮助通过。这个结果只说明本次验证，不代表长期掌握。'}</p><div className="tcp-complete__facts">{session.answers.slice(-6).map((answer) => <div key={answer.eventId}><span>第 {answer.attempt} 轮 · {getTcpTask(answer.questionId)?.role === 'observe' ? '观测判断' : getTcpTask(answer.questionId)?.role === 'predict' ? '窗口预测' : '过程作答'}</span><strong>{answer.correct ? answer.independent ? '独立正确' : '正确 · 非独立验证' : '需巩固'}</strong></div>)}</div><button className="text-button text-button--primary" onClick={exit} type="button">返回知识树 <ArrowRight size={18} /></button></section>}
      </main>
    </div>
  );
}

function TcpSource() {
  return <details className="tcp-source"><summary>规则与来源</summary><p>{TCP_RULES}</p><p>本例约定在窗口等于门限时转为每轮 +1。真实 TCP 由 ACK 等条件驱动；该离散过程只用于理解增长阶段。</p><a href="https://www.rfc-editor.org/rfc/rfc5681.html#section-3.1" target="_blank" rel="noreferrer">RFC 5681 · §3.1</a><span>内容版本 {TCP_VERSION} · 本地规则判定</span></details>;
}

export function TcpDemonstration({ difficulty, learnerId }: { difficulty: TcpDifficulty; learnerId: string }) {
  const reduced = useReducedMotion();
  const [parameters, setParameters] = useState({ initial: 2, threshold: 16, rounds: 4 });
  const [draft, setDraft] = useState({ initial: '2', threshold: '16', rounds: '4' });
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [prediction, setPrediction] = useState('');
  const [predictions, setPredictions] = useState<Record<number, number>>({});
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const values = tcpWindows(parameters.initial, parameters.threshold, parameters.rounds);
  const max = Math.max(parameters.threshold + 4, values.at(-1)!);
  const x = (n: number) => 64 + n * (650 / Math.max(parameters.rounds, 1));
  const y = (v: number) => 300 - v / max * 240;
  const reveal = (next: number) => {
    const ok = useProgressStore.getState().markExposure({ learnerId, signature: `${TCP_VERSION}:demo:${parameters.initial}:${parameters.threshold}:${next}`, resultKeys: [tcpResultKey(parameters.initial, parameters.threshold, next)] });
    if (!ok) { setError('示范记录未保存，暂不揭示新结果。请重试。'); return false; }
    setError(''); return true;
  };
  const finish = () => { setRound((value) => value + 1); setRevealed((value) => Math.max(value, round + 1)); setPlaying(false); setPaused(false); setPrediction(''); };
  const next = () => {
    if (round >= parameters.rounds || playing) return;
    if (round >= revealed && (prediction.trim() === '' || !Number.isInteger(Number(prediction)) || Number(prediction) < 0)) { setError('先预测下一轮的窗口。'); return; }
    if (!reveal(round + 1)) return;
    if (round >= revealed) setPredictions((state) => ({ ...state, [round + 1]: Number(prediction) }));
    if (reduced) finish(); else setPlaying(true);
  };
  const apply = () => {
    const nextParameters = { initial: Number(draft.initial), threshold: Number(draft.threshold), rounds: Number(draft.rounds) };
    try { if (Object.values(draft).some((value) => !value.trim())) throw new Error('请填写全部参数。'); tcpWindows(nextParameters.initial, nextParameters.threshold, nextParameters.rounds); } catch (cause) { setError(cause instanceof Error ? cause.message : '参数无效。'); return; }
    setParameters(nextParameters); setRound(0); setRevealed(0); setPredictions({}); setPrediction(''); setPlaying(false); setPaused(false); setError('');
  };
  return <section className={`tcp-demonstration tcp-demonstration--${difficulty}`} aria-label="TCP 窗口示范">
    <div className="tcp-demo-top"><p>初始 <strong>{parameters.initial} MSS</strong> <span> / </span> 门限 <strong>{parameters.threshold} MSS</strong></p><details><summary>调整参数</summary><div className="tcp-parameters">{(['initial', 'threshold', 'rounds'] as const).map((name, index) => <label key={name}>{['初始窗口', '门限', '轮次'][index]}<input type="number" value={draft[name]} onChange={(event) => setDraft({ ...draft, [name]: event.target.value })} /></label>)}<button className="text-button" type="button" onClick={apply}>应用并重置</button></div></details></div>
    <div className="tcp-demo-stage"><figure className="tcp-chart"><svg viewBox="0 0 760 350" role="img" aria-label={`窗口变化图：第 ${round} 轮，${values[round]} MSS；已显示 ${values.slice(0, round + 1).join('、')} MSS`}>
      {[.25, .5, .75].map((fraction) => <path key={fraction} d={`M64 ${300 - fraction * 240} H730`} className="tcp-chart__grid" />)}
      <text x="64" y="24" className="tcp-chart__label">窗口 / MSS</text><path d="M64 48 V300 H730" className="tcp-chart__axis" />
      <path d={`M64 ${y(parameters.threshold)} H730`} className="tcp-chart__threshold" /><text x="728" y={y(parameters.threshold) - 10} textAnchor="end" className="tcp-chart__label">门限 {parameters.threshold} MSS</text>
      {Array.from({ length: parameters.rounds + 1 }, (_, index) => <g key={index}><text x={x(index)} y="326" textAnchor="middle" className={`tcp-chart__label ${index === 0 ? 'tcp-chart__origin' : ''}`}>{index}</text>{index <= round && <><circle cx={x(index)} cy={y(values[index])} r={index === round ? 5 : 3} className="tcp-chart__point" /><text x={x(index)} y={y(values[index]) - 13} textAnchor="middle" className="tcp-chart__value">{values[index]}</text></>}</g>)}
      {values.slice(1, round + 1).map((value, index) => <line key={index} x1={x(index)} y1={y(values[index])} x2={x(index + 1)} y2={y(value)} className="tcp-chart__line" />)}
      {Object.entries(predictions).filter(([index]) => Number(index) <= round || playing && Number(index) === round + 1).map(([index, value]) => <g key={index}><circle cx={x(Number(index))} cy={y(Math.min(value, max))} r="7" className="tcp-chart__prediction" /><path d={`M${x(Number(index) - 1)} ${y(values[Number(index) - 1])} L${x(Number(index))} ${y(Math.min(value, max))}`} className="tcp-chart__prediction" /></g>)}
      {playing && <line key={`reveal-${round}`} x1={x(round)} y1={y(values[round])} x2={x(round + 1)} y2={y(values[round + 1])} pathLength="1" className="tcp-chart__line tcp-chart__reveal" style={{ animationPlayState: paused ? 'paused' : 'running' }} onAnimationEnd={finish} />}
      <text x="730" y="345" textAnchor="end" className="tcp-chart__label">完成的 RTT / 轮</text>
    </svg><figcaption>实线：实际窗口 <span>○ 虚线：你的预测</span></figcaption></figure>
    <div className="tcp-window"><span className="tcp-eyebrow">第 {round} 轮</span><strong><span key={round} className="tcp-window__number">{values[round]}</span><small>MSS</small></strong><div className="tcp-window__blocks" aria-hidden="true">{Array.from({ length: playing ? values[round + 1] : values[round] }, (_, index) => <i key={index} className={index >= values[round] ? 'is-arriving' : undefined} style={{ animationPlayState: paused ? 'paused' : 'running' }} />)}</div><p aria-live="polite">{round === 0 ? '初始状态，尚未经过一个 RTT。' : `${values[round - 1]} → ${values[round]} MSS`}</p><span className="tcp-window__rule">{values[round] < parameters.threshold ? '下一轮 × 2' : '已到门限 · 下一轮 + 1'}</span></div></div>
    <div className="tcp-demo-controls"><label>下一轮预测 <input aria-label="下一轮窗口预测" type="number" min="0" step="1" value={prediction} disabled={playing || round === parameters.rounds || round < revealed} onChange={(event) => setPrediction(event.target.value)} /><span>MSS</span></label><div><button type="button" className="text-button" disabled={round === 0 || playing} onClick={() => { setRound(round - 1); setPrediction(''); }} aria-label="上一状态"><CaretLeft size={18} /></button>{playing ? <button type="button" className="text-button text-button--primary" onClick={() => setPaused(!paused)}>{paused ? <Play size={17} /> : <Pause size={17} />}{paused ? '继续播放' : '暂停'}</button> : <button type="button" className="text-button text-button--primary" onClick={next} disabled={round >= parameters.rounds}><Play size={17} />{round < revealed ? '重播这一步' : '验证这一步'}</button>}<button type="button" className="text-button" aria-label="下一状态" disabled={playing || round >= revealed} onClick={() => setRound(round + 1)}><CaretRight size={18} /></button></div></div>
    {error && <p className="lesson-save-error" role="alert">{error}</p>}<TcpSource />
  </section>;
}
