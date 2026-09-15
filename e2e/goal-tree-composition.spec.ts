import { expect, test } from '@playwright/test';
import { clickPageAction, resetDemoState } from './helpers';

test('自然语言目标整理为一棵可学习、可练习的普通知识树', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/universe');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const pointIdsBefore = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('iteach:v9:domain') ?? '{}') as { points?: Array<{ id: string }> };
    return state.points?.map((point) => point.id) ?? [];
  });
  const stage = page.locator('[data-spatial-stage] canvas');
  await expect(stage).toBeVisible({ timeout: 12_000 });
  const stageIdentity = await stage.evaluateHandle((canvas) => canvas);
  await clickPageAction(page, '选择目标');

  const prompt = '我要准备 408，网络基础比较弱，数据结构还可以，也对 AI 感兴趣。';
  await page.getByLabel('你现在想做什么？').fill(prompt);
  await page.evaluate(() => {
    (window as unknown as { __goalTreeReadyAt?: number }).__goalTreeReadyAt = 0;
    const recordReady = () => {
      if (document.querySelector('[data-extraction-phase="ready"]')) {
        (window as unknown as { __goalTreeReadyAt?: number }).__goalTreeReadyAt ||= performance.now();
      }
    };
    new MutationObserver(recordReady).observe(document.body, { attributes: true, childList: true, subtree: true });
  });
  await page.getByRole('button', { name: '生成知识树' }).click();

  await expect(page.getByRole('status')).toContainText('正在整理…');
  await expect(page).toHaveURL(/\/universe$/);
  await expect.poll(async () => page.evaluate(() => performance.getEntriesByType('resource').some((entry) => /LibraryHomePage-.*\.js/.test(entry.name)))).toBe(true);

  await expect(page).toHaveURL(/\/library$/);
  const stableFrameMs = await page.evaluate(() => performance.now() - ((window as unknown as { __goalTreeReadyAt?: number }).__goalTreeReadyAt ?? performance.now()));
  expect(stableFrameMs).toBeGreaterThanOrEqual(180);
  expect(stableFrameMs).toBeLessThan(1_000);
  expect(await page.evaluate(() => history.state?.usr?.fromGoalExtraction)).toBe(true);
  expect(await stageIdentity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
  const selectedTree = page.getByRole('option', { selected: true });
  await expect(selectedTree).toContainText('考研408 · 定向学习');
  await expect(selectedTree).toContainText('个人');
  await expect(selectedTree).not.toContainText(/个节点|系统/);
  const stored = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('iteach:v9:domain') ?? '{}') as {
      userTrees?: Array<{ name: string; ownerType: string; pointIds: string[] }>;
      points?: Array<{ id: string }>;
    };
    return { tree: state.userTrees?.at(-1), pointIds: state.points?.map((point) => point.id) ?? [] };
  });
  expect(stored.tree?.ownerType).toBe('user');
  expect(stored.tree?.pointIds).toContain('course-computer-networks');
  expect(stored.tree?.pointIds).toContain('knowledge-tcp');
  expect(stored.tree?.pointIds.every((pointId) => pointIdsBefore.includes(pointId))).toBe(true);
  expect(stored.pointIds).toEqual(pointIdsBefore);

  await page.getByRole('button', { name: '进入知识树' }).click();
  await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-.*\/path$/);
  await page.getByRole('searchbox', { name: '搜索知识点' }).fill('TCP可靠传输');
  await page.getByRole('button', { name: /TCP可靠传输/ }).last().click();
  await page.getByRole('button', { name: '刷题' }).click();
  await expect(page.getByText('验证进度', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: '暂无可用题目' })).toHaveCount(0);
});

test('同一个目标重复整理复用同一棵树，不会失败', async ({ page }) => {
  await resetDemoState(page);
  // 低动态模式让相位瞬间走完，这个用例只验证「可重复」这个结果。
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const prompt = '我要准备 408，网络基础比较弱';
  const userTreeIds = () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('iteach:v9:domain') ?? '{}') as { userTrees?: Array<{ id: string }> };
    return state.userTrees?.map((tree) => tree.id) ?? [];
  });
  const compose = async () => {
    await page.goto('/universe');
    await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 });
    await clickPageAction(page, '选择目标');
    await page.getByLabel('你现在想做什么？').fill(prompt);
    await page.getByRole('button', { name: '生成知识树' }).click();
    await expect(page).toHaveURL(/\/library$/, { timeout: 15_000 });
    await page.waitForTimeout(600);
  };

  await compose();
  const first = await userTreeIds();
  expect(first).toHaveLength(1);

  await compose();
  // 第二次整理同一个目标必须复用那棵树，而不是撞同名失败或新建第二棵。
  expect(await userTreeIds()).toEqual(first);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('option', { selected: true })).toContainText('考研408');
});

test('自动建树失败时回到完整 Universe，并保留原始输入供重试', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/universe');
  await clickPageAction(page, '选择目标');
  const prompt = '我要准备 408，网络基础比较弱';
  await page.getByLabel('你现在想做什么？').fill(prompt);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'iteach:v9:domain') throw new Error('test storage failure');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '生成知识树' }).click();

  await expect(page.getByRole('alert')).toHaveText('没能整理这棵知识树。保留了你的输入，可以再试一次。');
  await expect(page.getByLabel('你现在想做什么？')).toHaveValue(prompt);
  await expect(page).toHaveURL(/\/universe$/);
  await expect(page.locator('.goal-extraction-status')).toHaveCount(0);
  expect(await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('iteach:v9:domain') ?? '{}') as { userTrees?: unknown[] };
    return state.userTrees?.length ?? 0;
  })).toBe(0);
});
