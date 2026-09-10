import { TCP_REASONS, type TcpTask } from '../../../data/v6/handcrafted/tcpLesson';
import { useId } from 'react';

interface Props { task: TcpTask; value: string; disabled?: boolean; onChange: (value: string) => void }

/** The same structured response is used by teaching and practice. No free-text pseudo grading. */
export function TcpTaskInputs({ task, value, disabled, onChange }: Props) {
  const reasonGroup = useId();
  let draft: { values: Array<number | null>; reason: string } = { values: [], reason: '' };
  try { if (value) draft = JSON.parse(value); } catch { /* An older plain-text draft remains ungraded. */ }
  const labels = task.role === 'observe' ? ['首次达到门限的轮次', '随后每轮增加（MSS）'] : task.rounds.map((round) => `第 ${round} 轮（MSS）`);
  const changeValue = (index: number, raw: string) => {
    const values = labels.map((_, i) => i === index ? raw === '' ? null : Number(raw) : draft.values[i] ?? null);
    onChange(JSON.stringify({ ...draft, values }));
  };
  return (
    <fieldset className="tcp-response" disabled={disabled}>
      <legend className="sr-only">窗口预测与计算依据</legend>
      <div className="tcp-response__values">
        {labels.map((label, index) => <label key={label}>{label}<input type="number" min="0" step="1" inputMode="numeric" value={draft.values[index] ?? ''} onChange={(event) => changeValue(index, event.target.value)} /></label>)}
      </div>
      <fieldset className="tcp-response__reason">
        <legend>计算依据</legend>
        <div className="tcp-reasons">{TCP_REASONS.map((reason) => <label key={reason.id} className="tcp-reason">
          <input type="radio" name={reasonGroup} value={reason.id} checked={draft.reason === reason.id} onChange={() => onChange(JSON.stringify({ ...draft, reason: reason.id }))} />
          <span>{reason.text}</span>
        </label>)}</div>
      </fieldset>
    </fieldset>
  );
}
