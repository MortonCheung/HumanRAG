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

  test('未答完也能结束，未作答单独统计且不算错误', async ({ page }) => {
    const questions = questionsForSystemNode();
    await page.goto(`/practice/session/node:${SYSTEM_NODE_ID}`);
    const navigation = page.getByRole('navigation', { name: '题目导航' });
    await page.getByRole('button', { name: '下一题' }).click();
    await expect(navigation.getByRole('button', { name: '第 2 题，未作答', exact: true })).toHaveAttribute('aria-current', 'step');
    await navigation.getByRole('button', { name: `第 ${questions.length} 题，未作答`, exact: true }).click();
    await submitPracticeQuestion(page, questions.at(-1)!.id);
    await page.getByRole('button', { name: '完成训练' }).click();
    await expect(page.getByRole('heading', { name: /练习「/ })).toBeVisible();
    const metrics = page.locator('.practice-result__score-row');
    await expect(metrics.locator('div').filter({ hasText: '回答正确' }).getByText('1', { exact: true })).toBeVisible();
    await expect(metrics.locator('div').filter({ hasText: '回答错误' }).getByText('0', { exact: true })).toBeVisible();
    await expect(metrics.locator('div').filter({ hasText: '未作答' }).getByText(String(questions.length - 1), { exact: true })).toBeVisible();
    await expect(metrics.locator('div').filter({ hasText: '本次题量' }).getByText(String(questions.length), { exact: true })).toBeVisible();
  });

  test('全部作答后显示正确率、错因和再次练习入口', async ({ page }) => {
    const questions = questionsForSystemNode();
    await page.goto(`/practice/session/node:${SYSTEM_NODE_ID}`);

    for (let index = 0; index < questions.length; index += 1) {
      await submitPracticeQuestion(page, questions[index].id, index === 0 ? 'wrong' : 'correct');
      await page.getByRole('button', { name: index === questions.length - 1 ? '完成训练' : '下一题' }).click();
    }

    await expect(page.getByRole('heading', { name: /练习「/ })).toBeVisible();
    await expect(page.getByText('正确率', { exact: true })).toBeVisible();
    await expect(page.getByText('错因分布', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '带我学' })).toBeVisible();
    await expect(page.getByRole('button', { name: /再练一遍/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v7:progress-delta')))).toBe(true);
  });
});
