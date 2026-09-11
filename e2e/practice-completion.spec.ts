import { expect, test } from '@playwright/test';
import {
  questionsForSystemNode,
  resetDemoState,
  submitPracticeQuestion,
  SYSTEM_NODE_ID,
} from './helpers';

test.describe('刷题完成规则与结果回写', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('未答完全部题目时不能从最后一题结束', async ({ page }) => {
    const questions = questionsForSystemNode();
    await page.goto(`/practice/session/node:${SYSTEM_NODE_ID}`);
    const navigation = page.getByRole('navigation', { name: '题目导航' });
    await navigation.getByRole('button', { name: `第 ${questions.length} 题，未作答`, exact: true }).click();
    await submitPracticeQuestion(page, questions.at(-1)!.id);
    await page.getByRole('button', { name: '完成练习' }).click();
    await expect(page.getByText(new RegExp(`还有 ${questions.length - 1} 道题未作答`))).toBeVisible();
    await expect(page.getByRole('heading', { name: /练习「/ })).toHaveCount(0);
  });

  test('全部作答后显示正确率、错因和再次练习入口', async ({ page }) => {
    const questions = questionsForSystemNode();
    await page.goto(`/practice/session/node:${SYSTEM_NODE_ID}`);

    for (let index = 0; index < questions.length; index += 1) {
      await submitPracticeQuestion(page, questions[index].id, index === 0 ? 'wrong' : 'correct');
      await page.getByRole('button', { name: index === questions.length - 1 ? '完成练习' : '下一题' }).click();
    }

    await expect(page.getByRole('heading', { name: /练习「/ })).toBeVisible();
    await expect(page.getByText('正确率', { exact: true })).toBeVisible();
    await expect(page.getByText('错因分布', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /去教学/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /再练一遍/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v7:progress-delta')))).toBe(true);
  });
});
