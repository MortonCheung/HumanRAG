import type { Question } from '../schemas/questionSchema';

/** Deliberately bounded RTT model, not a packet-level TCP simulation (RFC 5681 §3.1). */
export const TCP_VERSION = 'tcp-rtt-v1';
export const TCP_NODE_ID = 'knowledge-tcp';
export const TCP_UNIT_ID = `tu-${TCP_NODE_ID}`;
export type TcpDifficulty = 'growth' | 'round' | 'threshold' | 'window' | 'unknown';
export const TCP_RULES = '第 0 轮是初始状态。窗口低于门限时每轮翻倍；达到门限后每轮增加 1 MSS。本例不含丢包、超时、接收窗口限制与实际 ACK 时序。';

export function tcpWindows(initial: number, threshold: number, rounds: number): number[] {
  const exponent = Math.log2(threshold / initial);
  if (!Number.isInteger(initial) || initial < 1 || initial > 8 || !Number.isInteger(threshold) || threshold < 1 || threshold > 64 || !Number.isInteger(exponent) || exponent < 0 || !Number.isInteger(rounds) || rounds < 0 || rounds > 8) {
    throw new Error('初始窗口须为 1–8，门限须为 1–64 且是初始窗口的 2 的非负整数次幂倍，轮次须为 0–8 的整数。');
  }
  const values = [initial];
  for (let round = 0; round < rounds; round += 1) {
    const previous = values[round];
    values.push(previous < threshold ? previous * 2 : previous + 1);
  }
  return values;
}

export const TCP_REASONS = [
  { id: 'rule', text: '低于门限时翻倍，达到门限后每轮加 1' },
  { id: 'growth', text: '每轮都增加一个固定数量' },
  { id: 'round', text: '初始窗口就是第 1 轮结束时的窗口' },
  { id: 'threshold', text: '达到门限以后仍然每轮翻倍' },
  { id: 'window', text: '还不清楚窗口和 MSS 表示什么' },
  { id: 'unknown', text: '暂时无法确定规则' },
] as const;

export interface TcpTask {
  id: string;
  role: 'diagnostic' | 'clarification' | 'guided' | 'predict' | 'observe';
  initial: number;
  threshold: number;
  rounds: number[];
}

export const TCP_TASKS: TcpTask[] = [
  { id: 'tcp-diagnostic-v1', role: 'diagnostic', initial: 1, threshold: 8, rounds: [1, 2, 3, 4] },
  { id: 'tcp-clarification-v1', role: 'clarification', initial: 2, threshold: 8, rounds: [0, 1, 3] },
  { id: 'tcp-guided-v1', role: 'guided', initial: 4, threshold: 16, rounds: [1, 2, 3] },
  { id: 'tcp-check-a1', role: 'predict', initial: 3, threshold: 12, rounds: [2, 4] },
  { id: 'tcp-check-b1', role: 'observe', initial: 5, threshold: 20, rounds: [0, 1, 2, 3, 4] },
  { id: 'tcp-check-a2', role: 'predict', initial: 6, threshold: 24, rounds: [2, 5] },
  { id: 'tcp-check-b2', role: 'observe', initial: 7, threshold: 28, rounds: [0, 1, 2, 3, 4] },
  { id: 'tcp-check-a3', role: 'predict', initial: 3, threshold: 24, rounds: [3, 5] },
  { id: 'tcp-check-b3', role: 'observe', initial: 5, threshold: 40, rounds: [0, 1, 2, 3, 4, 5] },
];
export const getTcpTask = (id: string) => TCP_TASKS.find((task) => task.id === id);

export function tcpResultKey(initial: number, threshold: number, round: number): string {
  return `${TCP_VERSION}:${initial}:${threshold}:${round}`;
}
export function tcpTaskSignature(task: TcpTask): string {
  return `${TCP_VERSION}:${task.initial}:${task.threshold}:${task.rounds.join(',')}:${task.role === 'observe' ? 'observe' : 'predict'}`;
}
export function tcpTaskResultKeys(task: TcpTask): string[] {
  return task.rounds.map((round) => tcpResultKey(task.initial, task.threshold, round));
}

export interface TcpResponse { values: number[]; reason: string }
export function parseTcpResponse(selected: string): TcpResponse | null {
  try {
    const value: unknown = JSON.parse(selected);
    if (!value || typeof value !== 'object' || !('values' in value) || !('reason' in value)) return null;
    const { values, reason } = value;
    if (!Array.isArray(values) || !values.every((item) => Number.isFinite(item) && Number.isInteger(item) && item >= 0) || typeof reason !== 'string' || !TCP_REASONS.some((item) => item.id === reason)) return null;
    return { values, reason };
  } catch { return null; }
}

export function tcpExpected(task: TcpTask): number[] {
  if (task.role === 'observe') return [Math.log2(task.threshold / task.initial), 1];
  const values = tcpWindows(task.initial, task.threshold, Math.max(...task.rounds));
  return task.rounds.map((round) => values[round]);
}

export function evaluateTcpTask(task: TcpTask, selected: string) {
  const response = parseTcpResponse(selected);
  const expected = tcpExpected(task);
  const valuesCorrect = !!response && expected.length === response.values.length && expected.every((value, index) => value === response.values[index]);
  const correct = valuesCorrect && response?.reason === 'rule';
  let difficulty: TcpDifficulty = 'unknown';
  // A wrong number alone is never a diagnosis. Require a matching process AND reason.
  if (response && !correct) {
    if (response.reason === 'window') difficulty = 'window';
    else if (task.role !== 'observe') {
      const hypotheses: Record<'growth' | 'round' | 'threshold', number[]> = {
        growth: task.rounds.map((round) => task.initial + round),
        round: task.rounds.map((round) => tcpWindows(task.initial, task.threshold, Math.max(0, round - 1)).at(-1)!),
        threshold: task.rounds.map((round) => task.initial * 2 ** round),
      };
      for (const candidate of ['growth', 'round', 'threshold'] as const) {
        if (response.reason === candidate && hypotheses[candidate].length === response.values.length && hypotheses[candidate].every((value, index) => value === response.values[index])) difficulty = candidate;
      }
    } else if (response.reason === 'threshold' && response.values[1] === task.threshold) difficulty = 'threshold';
  }
  return { correct, valuesCorrect, difficulty, misconceptionId: !correct && difficulty !== 'unknown' ? `tcp-${difficulty}` : undefined, misconceptionText: correct ? undefined : TCP_FRAGMENTS[difficulty].label };
}

export const TCP_FRAGMENTS: Record<TcpDifficulty, { id: string; label: string; title: string; text: string; reason: string }> = {
  growth: { id: 'tcp-growth-v1', label: '倍增与固定相加', title: '每轮变化取决于上一轮', text: '在本例中，慢启动把当前窗口乘以 2。窗口从 2 到 4，增加 2；从 4 到 8，增加 4。增量并不固定。先预测，再逐轮比较你的轨迹。', reason: '数值过程与“固定相加”的理由一致，先看连续两轮的增量。' },
  round: { id: 'tcp-round-v1', label: '初始状态与轮次', title: '从第 0 轮开始计时', text: '第 0 轮是发送前的初始窗口。经过一个完整 RTT，才来到第 1 轮。时间轴向右移动一次，窗口也只更新一次。', reason: '作答整体错后一轮，且理由把初始状态当作第 1 轮。' },
  threshold: { id: 'tcp-threshold-v1', label: '门限后的规则', title: '到门限时，切换规则', text: '先比较当前窗口与门限。低于门限，下一轮翻倍；相等或更高，下一轮只增加 1 MSS。例如到达 16 以后，接下来是 17，而不是 32。', reason: '门限后的预测仍在翻倍，先看规则切换的位置。' },
  window: { id: 'tcp-window-v1', label: '窗口与单位', title: '窗口描述能在途的数据量', text: 'MSS 是本例的数据量单位。窗口为 4 MSS，表示拥塞控制允许的在途数据量上限为 4 个 MSS；它不是第 4 轮，也不表示每轮固定发送 4 个报文。先建立单位，再观察窗口变化。', reason: '你表示窗口与单位还不清楚，先补这一必要前提。' },
  unknown: { id: 'tcp-basic-v1', label: '原因待确认', title: '把每一步写出来', text: '当前答案不足以确定是哪种困难。我们先使用本知识点的基础规则：标明初始状态，每轮比较窗口与门限，再计算下一轮。', reason: '追问后原因仍待确认，使用本知识点的基础讲解，不推断其他误区。' },
};

export function getTcpQuestion(id: string): Question | undefined {
  const task = getTcpTask(id);
  if (!task) return undefined;
  const sequence = tcpWindows(task.initial, task.threshold, Math.max(...task.rounds));
  const stem = task.role === 'observe'
    ? `第 0–${sequence.length - 1} 轮的窗口依次是 ${sequence.join('、')} MSS。在哪轮结束时首次达到门限？随后每轮增加多少 MSS？`
    : `初始窗口 ${task.initial} MSS，门限 ${task.threshold} MSS。请填写第 ${task.rounds.join('、')} 轮结束后的窗口，并选择计算依据。`;
  return {
    id, blueprintId: 'tcp-rtt', variantSeed: 0, nodeIds: [TCP_NODE_ID], type: 'short-answer', difficulty: 3,
    stem, answer: { kind: 'text', value: JSON.stringify({ values: tcpExpected(task), reason: 'rule' }) },
    explanation: task.role === 'observe' ? `第 ${Math.log2(task.threshold / task.initial)} 轮结束达到门限 ${task.threshold} MSS；随后每轮 +1 MSS。` : `从第 0 轮开始：${sequence.join(' → ')} MSS。`,
    misconceptionByAnswer: {}, remediationUnitId: TCP_UNIT_ID, sourceLabel: 'TCP 逐 RTT 简化教学模型 · RFC 5681 §3.1',
  };
}

export interface TcpExposure { learnerId: string; signature: string; resultKeys: string[]; createdAt: string; eventId?: string }
export function freshTcpPair(exposures: TcpExposure[], learnerId: string): string[] {
  const own = exposures.filter((entry) => entry.learnerId === learnerId);
  const fresh = (task: TcpTask) => !own.some((entry) => entry.signature === tcpTaskSignature(task) || tcpTaskResultKeys(task).some((key) => entry.resultKeys.includes(key)));
  return ['predict', 'observe'].flatMap((role) => {
    const task = TCP_TASKS.find((candidate) => candidate.role === role && fresh(candidate));
    return task ? [task.id] : [];
  });
}
