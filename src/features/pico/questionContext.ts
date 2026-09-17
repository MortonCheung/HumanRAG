import type { Question } from '../../data/v6/schemas/questionSchema';
import type { PicoActiveQuestion, PicoExplicitContext } from '../../ai/chat/contracts';

function optionText(question: Question, optionId: string) {
  return question.options?.find((option) => option.id === optionId)?.text ?? optionId;
}

export function formatQuestionAnswer(question: Question) {
  const answer = question.answer;
  if (answer.kind === 'text') return answer.value;
  if (answer.kind === 'boolean') return answer.value ? '正确' : '错误';
  return answer.optionIds.map((id) => optionText(question, id)).join('；');
}

export function formatUserAnswer(question: Question, selected: string) {
  if (!question.options) return selected;
  return selected.split(',').filter(Boolean).map((id) => optionText(question, id)).join('；');
}

export function questionExplicitContext(question: Question, title: string, answer?: { selected: string; misconceptionText?: string }): PicoExplicitContext {
  if (!answer) return { type: 'question', questionId: question.id, title, stem: question.stem, answerPolicy: 'hint-only' };
  return {
    type: 'question', questionId: question.id, title, stem: question.stem, answerPolicy: 'review',
    userAnswer: formatUserAnswer(question, answer.selected), expectedAnswer: formatQuestionAnswer(question),
    explanation: question.explanation, misconception: answer.misconceptionText,
  };
}

export function activeQuestionContext(question: Question, answer?: { selected: string }): PicoActiveQuestion {
  if (!answer) return { questionId: question.id, stem: question.stem, state: 'before-submit', answerPolicy: 'hint-only' };
  return {
    questionId: question.id, stem: question.stem, state: 'after-submit', answerPolicy: 'review',
    userAnswer: formatUserAnswer(question, answer.selected), expectedAnswer: formatQuestionAnswer(question), explanation: question.explanation,
  };
}
