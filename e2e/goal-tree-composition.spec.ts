import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test('自然语言目标整理为一棵可学习、可练习的普通知识树', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/universe');
  await page.getByRole('button', { name: '选择目标' }).click();

  const prompt = '我要准备 408，网络基础比较弱，数据结构还可以，也对 AI 感兴趣。';
  await page.getByLabel('你现在想做什么？').fill(prompt);
  await page.getByRole('button', { name: '整理相关知识' }).click();

  await expect(page).toHaveURL(/\/library$/);
  const selectedTree = page.getByRole('option', { selected: true });
  await expect(selectedTree).toContainText('考研408 · 定向学习');
  await expect(selectedTree).toContainText(/\d+ 个节点 · 个人/);
  const stored = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('iteach:v9:domain') ?? '{}') as {
      userTrees?: Array<{ name: string; ownerType: string; pointIds: string[] }>;
    };
    return state.userTrees?.at(-1);
  });
  expect(stored?.ownerType).toBe('user');
  expect(stored?.pointIds).toContain('course-computer-networks');
  expect(stored?.pointIds).toContain('knowledge-tcp');

  await page.getByRole('button', { name: '进入知识树' }).click();
  await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-/);
  await page.getByRole('navigation', { name: '知识树模式' }).getByRole('link', { name: '题库' }).click();
  const wholeTreePractice = page.getByRole('button', { name: '整树练习' });
  await expect(wholeTreePractice).toBeEnabled();
  await wholeTreePractice.click();
  await expect(page.getByText('本次练习', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: '暂无可用题目' })).toHaveCount(0);
});
