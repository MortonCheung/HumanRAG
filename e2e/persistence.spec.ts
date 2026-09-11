import { expect, test } from '@playwright/test';
import {
  questionsForSystemNode,
  resetDemoState,
  submitPracticeQuestion,
  SYSTEM_NODE_ID,
  SYSTEM_UNIT_ID,
} from './helpers';

test.describe('V7 本地持久化', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('刷题会话刷新后恢复题号、答案和反馈', async ({ page }) => {
    const firstQuestion = questionsForSystemNode()[0];
    await page.goto(`/practice/session/node:${SYSTEM_NODE_ID}`);
    await submitPracticeQuestion(page, firstQuestion.id);
    await expect(page.locator('.practice-question__type')).toContainText('1 /');
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v7:practice-session')))).toBe(true);

    await page.reload();
    await expect(page.locator('.practice-question__type')).toContainText('1 /');
    await expect(page.getByText('本题正确', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '下一题' })).toBeVisible();
  });

  test('教学步骤刷新后恢复当前会话', async ({ page }) => {
    await page.goto(`/teach/${SYSTEM_UNIT_ID}`);
    await page.getByRole('button', { name: /下一步/ }).click();
    await expect(page.getByRole('heading', { name: '前置诊断' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v7:teaching-session')))).toBe(true);

    await page.reload();
    await expect(page.getByRole('heading', { name: '前置诊断' })).toBeVisible();
  });

  test('不同域使用独立 V7 存储键', async ({ page }) => {
    await page.goto(`/practice/session/node:${SYSTEM_NODE_ID}`);
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v7:practice-session')))).toBe(true);
    await page.goto(`/teach/${SYSTEM_UNIT_ID}`);
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v7:teaching-session')))).toBe(true);
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('iteach:v7:')).sort());
    expect(keys).toEqual(expect.arrayContaining(['iteach:v7:practice-session', 'iteach:v7:teaching-session']));
  });
});
