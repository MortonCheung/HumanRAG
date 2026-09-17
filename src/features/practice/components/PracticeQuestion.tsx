import type { Question } from '../../../data/v6/schemas/questionSchema';
import { contentRepository } from '../../../services/content/ContentRepository';
import type { PracticeAnswer } from '../../../store/practiceStore';
import { getTcpTask } from '../../../data/v6/handcrafted/tcpLesson';
import { TcpTaskInputs } from '../../teaching/components/TcpTaskInputs';
import '../../teaching/tcp-lesson.css';
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

interface PracticeQuestionProps {
  questionId: string;
  index: number;
  total: number;
  selected: string;
  answer?: PracticeAnswer;
  revealResult?: boolean;
  onSelectChange: (questionId: string, value: string) => void;
}

export function PracticeQuestion({
  questionId,
  index,
  total,
  selected,
  answer,
  revealResult = true,
  onSelectChange,
}: PracticeQuestionProps) {
  const question = contentRepository.getQuestion(questionId);
  if (!question) return null;
  const tcpTask = getTcpTask(questionId);

  const locked = answer !== undefined;
  const answerData = question.answer;
  const selectedIds = selected ? selected.split(',') : [];

  const commit = (value: string) => {
    if (locked) return;
    onSelectChange(questionId, value);
  };

  const toggleMultiple = (optionId: string) => {
    if (locked) return;
    const next = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    onSelectChange(questionId, next.join(','));
  };

  const toggleOrdering = (optionId: string) => {
    if (locked) return;
    const picks = selectedIds.filter((id) => id !== '');
    const next = picks.includes(optionId)
      ? picks.filter((id) => id !== optionId)
      : [...picks, optionId];
    onSelectChange(questionId, next.join(','));
  };

  const correctOptionIds =
    answerData.kind === 'choice' || answerData.kind === 'ordering' ? answerData.optionIds : [];

  return (
    <article>
      <span className="practice-question__type">
        {index + 1} / {total} · {TYPE_LABELS[question.type]} · 难度 {question.difficulty}
      </span>
      <p className="practice-question__stem">{question.stem}</p>
      <AskPicoButton
        label={locked ? '问问 Pico · 这道题' : '问问 Pico'}
        context={questionExplicitContext(question, `第 ${index + 1} 题`, answer)}
      />

      {question.options && (answerData.kind === 'choice' || answerData.kind === 'ordering') && (
        <div className="practice-question__options">
          {question.options.map((option) => {
            const isCorrect = correctOptionIds.includes(option.id);
            const isSelected =
              answerData.kind === 'ordering' ? selectedIds.includes(option.id) : selectedIds.includes(option.id);
            let stateClass = '';
            if (locked && revealResult && isCorrect) stateClass = 'is-correct';
            else if (locked && revealResult && isSelected && !isCorrect) stateClass = 'is-wrong';
            else if (isSelected) stateClass = 'is-selected';
            const orderBadge =
              answerData.kind === 'ordering' && selectedIds.includes(option.id)
                ? selectedIds.indexOf(option.id) + 1
                : 0;
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
                <span className="question-option__key">{orderBadge > 0 ? orderBadge : option.id}</span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {answerData.kind === 'boolean' && (
        <div className="practice-question__options">
          {[
            { label: '正确', value: 'true' },
            { label: '错误', value: 'false' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`question-option ${selected === option.value ? 'is-selected' : ''} ${locked && revealResult && String(answerData.value) === option.value ? 'is-correct' : ''} ${locked && revealResult && selected === option.value && String(answerData.value) !== option.value ? 'is-wrong' : ''}`}
              disabled={locked}
              onClick={() => commit(option.value)}
            >
              <span className="question-option__key">{option.value === 'true' ? 'T' : 'F'}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {tcpTask && <TcpTaskInputs task={tcpTask} value={answer?.selected ?? selected} disabled={locked} onChange={(value) => onSelectChange(questionId, value)} />}
      {answerData.kind === 'text' && !tcpTask && (
        <input
          aria-label="你的答案"
          className="practice-question__input"
          value={locked ? answer?.selected ?? '' : selected}
          disabled={locked}
          placeholder="输入你的答案"
          onChange={(event) => commit(event.target.value)}
        />
      )}
    </article>
  );
}
