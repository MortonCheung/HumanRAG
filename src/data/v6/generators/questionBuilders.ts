import { SeededRandom } from './seededRandom';
import type { QuestionAnswer, QuestionMaterial } from '../schemas/questionSchema';

const LETTERS: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface ChoiceWrongOption {
  text: string;
  /** 误区描述或目录 id，作为 misconceptionByAnswer 的值。 */
  misconception?: string;
}

export function buildChoice(input: {
  rng: SeededRandom;
  stem: string;
  correct: string;
  wrong: ChoiceWrongOption[];
  explanation: string;
  multiple?: boolean;
}): QuestionMaterial {
  const entries = [
    { text: input.correct, misconception: undefined as string | undefined, isCorrect: true },
    ...input.wrong.map((wrong) => ({ text: wrong.text, misconception: wrong.misconception, isCorrect: false })),
  ];
  const shuffled = input.rng.shuffle(entries);
  const options = shuffled.map((entry, index) => ({ id: LETTERS[index], text: entry.text }));
  const optionIds = shuffled
    .map((entry, index) => (entry.isCorrect ? LETTERS[index] : null))
    .filter((id): id is string => id !== null);
  const misconceptionByAnswer: Record<string, string> = {};
  shuffled.forEach((entry, index) => {
    if (entry.misconception) misconceptionByAnswer[LETTERS[index]] = entry.misconception;
  });
  const answer: QuestionAnswer = { kind: 'choice', optionIds };
  return {
    stem: input.stem,
    options,
    answer,
    explanation: input.explanation,
    misconceptionByAnswer,
  };
}

export function buildTrueFalse(input: {
  stem: string;
  value: boolean;
  explanation: string;
  misconception?: string;
}): QuestionMaterial {
  const misconceptionByAnswer: Record<string, string> = {};
  // 误区绑定到错误值：学生只有选错时才会命中该误区。
  if (input.misconception) misconceptionByAnswer[input.value ? 'false' : 'true'] = input.misconception;
  return {
    stem: input.stem,
    answer: { kind: 'boolean', value: input.value },
    explanation: input.explanation,
    misconceptionByAnswer,
  };
}

export function buildOrdering(input: {
  rng: SeededRandom;
  stem: string;
  items: string[];
  explanation: string;
  misconception?: string;
}): QuestionMaterial {
  const correctOrder = input.items.map((_, index) => index);
  let shuffled = input.rng.shuffle(correctOrder);
  // 防止洗牌后与正确顺序完全相同。
  if (shuffled.every((value, index) => value === correctOrder[index])) {
    shuffled = [...shuffled.slice(1), shuffled[0]];
  }
  const options = shuffled.map((itemIndex, position) => ({
    id: LETTERS[position],
    text: input.items[itemIndex],
  }));
  // 正确答案是「按正确顺序排列后的选项 id 序列」：第 i 项的正确位置即其所在选项 id。
  const answer: QuestionAnswer = {
    kind: 'ordering',
    optionIds: correctOrder.map((itemIndex) => LETTERS[shuffled.indexOf(itemIndex)]),
  };
  return {
    stem: input.stem,
    options,
    answer,
    explanation: input.explanation,
    misconceptionByAnswer: input.misconception ? { default: input.misconception } : {},
  };
}

export function buildText(input: {
  stem: string;
  value: string;
  explanation: string;
  misconception?: string;
}): QuestionMaterial {
  return {
    stem: input.stem,
    answer: { kind: 'text', value: input.value },
    explanation: input.explanation,
    misconceptionByAnswer: input.misconception ? { default: input.misconception } : {},
  };
}

/** 数值型计算题：正确值与干扰值都由同一纯函数产生，保证题干与答案一致。 */
export function buildNumericChoice(input: {
  rng: SeededRandom;
  stem: string;
  unit?: string;
  correct: number | string;
  wrong: Array<{ value: number | string; misconception: string }>;
  explanation: string;
}): QuestionMaterial {
  return buildChoice({
    rng: input.rng,
    stem: input.stem,
    correct: `${input.correct}${input.unit ?? ''}`,
    wrong: input.wrong.map((entry) => ({
      text: `${entry.value}${input.unit ?? ''}`,
      misconception: entry.misconception,
    })),
    explanation: input.explanation,
  });
}
