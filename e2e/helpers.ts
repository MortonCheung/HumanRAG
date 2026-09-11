import { expect, type Locator, type Page } from '@playwright/test';
import type { Question } from '../src/data/v6/schemas/questionSchema';
import { contentRepository } from '../src/services/content/ContentRepository';

export const SYSTEM_UNIT_ID = 'tu-knowledge-linear-list';
export const SYSTEM_NODE_ID = 'knowledge-linear-list';

export async function resetDemoState(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

function chooseWrongOption(question: Question): string[] {
  const answer = question.answer;
  if (answer.kind === 'choice') {
    const optionIds = (question.options ?? []).map((option) => option.id);
    const wrong = optionIds.find((id) => !answer.optionIds.includes(id));
    if (wrong) return [wrong];
    return answer.optionIds.length > 1 ? [answer.optionIds[0]] : [];
  }
  if (answer.kind === 'ordering') return [...answer.optionIds].reverse();
  if (answer.kind === 'boolean') return [String(!answer.value)];
  return ['确定错误的 E2E 答案'];
}

function chooseCorrectOption(question: Question): string[] {
  const answer = question.answer;
  if (answer.kind === 'choice' || answer.kind === 'ordering') return answer.optionIds;
  if (answer.kind === 'boolean') return [String(answer.value)];
  return [answer.value];
}

async function fillQuestionCard(card: Locator, question: Question, mode: 'correct' | 'wrong') {
  const values = mode === 'correct' ? chooseCorrectOption(question) : chooseWrongOption(question);
  const answer = question.answer;

  if (answer.kind === 'text') {
    await card.getByPlaceholder('输入你的答案').fill(values[0]);
    return;
  }

  if (answer.kind === 'boolean') {
    await card.getByRole('button', { name: values[0] === 'true' ? '正确' : '错误' }).click();
    return;
  }

  const options = question.options ?? [];
  for (const optionId of values) {
    const index = options.findIndex((option) => option.id === optionId);
    expect(index, `题目 ${question.id} 应包含选项 ${optionId}`).toBeGreaterThanOrEqual(0);
    await card.getByRole('button').nth(index).click();
  }
}

export async function submitTeachingStep(
  page: Page,
  questionIds: string[],
  mode: 'correct' | 'wrong',
) {
  const cards = page.locator('article.question-card');
  await expect(cards).toHaveCount(questionIds.length);
  for (let index = 0; index < questionIds.length; index += 1) {
    const question = contentRepository.getQuestion(questionIds[index]);
    expect(question, `教学题目 ${questionIds[index]} 应存在`).toBeDefined();
    await fillQuestionCard(cards.nth(index), question!, mode);
  }
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByText('本步作答已记录', { exact: true })).toBeVisible();
  await expect(cards.locator('button:enabled, input:enabled')).toHaveCount(0);
}

export async function submitPracticeQuestion(
  page: Page,
  questionId: string,
  mode: 'correct' | 'wrong' = 'correct',
) {
  const question = contentRepository.getQuestion(questionId);
  expect(question, `练习题目 ${questionId} 应存在`).toBeDefined();
  const card = page.locator('.practice-stage article');
  await fillQuestionCard(card, question!, mode);
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByText(mode === 'correct' ? '本题正确' : '本题未通过', { exact: true })).toBeVisible();
}

export function systemUnit() {
  const unit = contentRepository.getTeachingUnit(SYSTEM_UNIT_ID);
  expect(unit, `系统教学单元 ${SYSTEM_UNIT_ID} 应存在`).toBeDefined();
  return unit!;
}

export function questionsForSystemNode() {
  const questions = contentRepository.getQuestionsForNode(SYSTEM_NODE_ID).slice(0, 12);
  expect(questions.length).toBeGreaterThan(0);
  return questions;
}
