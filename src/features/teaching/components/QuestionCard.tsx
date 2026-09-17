import { useState } from 'react';
import type { Question } from '../../../data/v6/schemas/questionSchema';
import { contentRepository } from '../../../services/content/ContentRepository';
import { useTeachingStore, type SessionAnswer } from '../../../store/teachingStore';
import { AskPicoButton } from '../../pico/AskPicoButton';
import { questionExplicitContext } from '../../pico/questionContext';

const TYPE_LABELS: Record<Question['type'], string> = {
  'single-choice': '单选题',
  'multiple-choice': '多选题',
  'true-false': '判断题',
  'fill-blank': '填空题',
  ordering: '排序题',
  'code-trace': '代码追踪',
  'short-answer': '简答题',
};

interface QuestionCardProps {
  questionId: string;
  index: number;
  onSelectionChange: (questionId: string, selected: string) => void;
}

export function QuestionCard({ questionId, index, onSelectionChange }: QuestionCardProps) {
  const question = contentRepository.getQuestion(questionId);
  const currentStepId = useTeachingStore((state) => state.currentStepId);
  const attempt = useTeachingStore((state) => state.attempt);
  // 只匹配当前步骤与当前 attempt 的作答，历史 attempt 保留为证据但不锁定新一次作答。
  const submitted = useTeachingStore((state) =>
    state.answers.find(
      (entry) => entry.questionId === questionId && entry.stepId === currentStepId && entry.attempt === attempt,
    ),
  );
  const [selection, setSelection] = useState<string>('');
  const [orderingPicks, setOrderingPicks] = useState<string[]>([]);

  if (!question) return null;
  const answer = submitted as SessionAnswer | undefined;
  const locked = answer !== undefined;
  const answerData = question.answer;

  const commit = (value: string) => {
    if (locked) return;
    setSelection(value);
    onSelectionChange(questionId, value);
  };

  const toggleOrdering = (optionId: string) => {
    if (locked) return;
    const next = orderingPicks.includes(optionId)
      ? orderingPicks.filter((id) => id !== optionId)
      : [...orderingPicks, optionId];
    setOrderingPicks(next);
    onSelectionChange(questionId, next.join(','));
  };

  const toggleMultiple = (optionId: string) => {
    if (locked) return;
    const parts = selection ? selection.split(',') : [];
    const next = parts.includes(optionId)
      ? parts.filter((id) => id !== optionId)
      : [...parts, optionId];
    setSelection(next.join(','));
    onSelectionChange(questionId, next.join(','));
  };

  const correctOptionIds =
    answerData.kind === 'choice' || answerData.kind === 'ordering' ? answerData.optionIds : [];

  return (
    <article className="question-card">
      <span className="question-card__type">
        {index + 1}. {TYPE_LABELS[question.type]} · 难度 {question.difficulty}
      </span>
      <p className="question-card__stem">{question.stem}</p>
      <AskPicoButton
        label={locked ? '问问 Pico · 这道题' : '问问 Pico'}
        context={questionExplicitContext(question, `第 ${index + 1} 题`, answer)}
      />

      {question.options && (answerData.kind === 'choice' || answerData.kind === 'ordering') && (
        <div className="question-card__options">
          {question.options.map((option) => {
            const isCorrect = correctOptionIds.includes(option.id);
            const isSelected =
              answerData.kind === 'ordering'
                ? orderingPicks.includes(option.id)
                : question.type === 'multiple-choice'
                  ? selection.split(',').includes(option.id)
                  : selection === option.id;
            let stateClass = '';
            if (locked && isCorrect) stateClass = 'is-correct';
            else if (locked && isSelected && !isCorrect) stateClass = 'is-wrong';
            else if (isSelected) stateClass = 'is-selected';
            const orderBadge = answerData.kind === 'ordering' ? orderingPicks.indexOf(option.id) + 1 : 0;
            return (
              <button
                key={option.id}
                type="button"
                className={`question-option ${stateClass}`}
                disabled={locked}
                onClick={() =>
                  answerData.kind === 'ordering'
                    ? toggleOrdering(option.id)
                    : question.type === 'multiple-choice'
                      ? toggleMultiple(option.id)
                      : commit(option.id)
                }
              >
                <span className="question-option__key">
                  {orderBadge > 0 ? orderBadge : option.id}
                </span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {answerData.kind === 'boolean' && (
        <div className="question-card__options">
          {[
            { label: '正确', value: 'true' },
            { label: '错误', value: 'false' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`question-option ${locked && String(answerData.value) === option.value ? 'is-correct' : ''} ${selection === option.value && locked && String(answerData.value) !== option.value ? 'is-wrong' : ''} ${selection === option.value ? 'is-selected' : ''}`}
              disabled={locked}
              onClick={() => commit(option.value)}
            >
              <span className="question-option__key">{option.value === 'true' ? 'T' : 'F'}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {answerData.kind === 'text' && (
        <input
          className="question-card__input"
          value={locked ? answer?.selected ?? '' : selection}
          disabled={locked}
          placeholder="输入你的答案"
          onChange={(event) => commit(event.target.value)}
        />
      )}

      {locked && answer && (
        <div className={`question-feedback ${answer.correct ? 'question-feedback--correct' : 'question-feedback--wrong'}`}>
          {answer.correct ? '回答正确。' : '回答不正确。'}
          {answer.misconceptionText && (
            <div className="question-feedback__misconception">错因：{answer.misconceptionText}</div>
          )}
          <div className="question-feedback__misconception">解析：{question.explanation}</div>
        </div>
      )}
    </article>
  );
}
