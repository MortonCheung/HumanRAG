import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test('自然语言目标整理为一棵可学习、可练习的普通知识树', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/universe');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const stage = page.locator('[data-spatial-stage] canvas');
  await expect(stage).toBeVisible({ timeout: 12_000 });
  const stageIdentity = await stage.evaluateHandle((canvas) => canvas);
  await page.getByRole('button', { name: '选择目标' }).click();

  const prompt = '我要准备 408，网络基础比较弱，数据结构还可以，也对 AI 感兴趣。';
  await page.getByLabel('你现在想做什么？').fill(prompt);
  await page.getByRole('button', { name: '整理相关知识' }).click();

  await expect(page.getByRole('status')).toContainText(/已找到相关知识|正在分离原有关系/);
  await expect(page).toHaveURL(/\/universe$/);

  await expect(page).toHaveURL(/\/library$/);
  expect(await stageIdentity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
  const selectedTree = page.getByRole('option', { selected: true });
  await expect(selectedTree).toContainText('考研408 · 定向学习');
  await expect(selectedTree).toContainText('个人');
  await expect(selectedTree).not.toContainText(/个节点|系统/);
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
  await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-.*\/path$/);
  await page.getByRole('navigation', { name: '知识树模式' }).getByRole('link', { name: '能力验证' }).click();
  const verification = page.getByRole('button', { name: /开始能力验证/ });
  await expect(verification).toBeEnabled();
  await verification.click();
  await expect(page.getByText('本次练习', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: '暂无可用题目' })).toHaveCount(0);
});
