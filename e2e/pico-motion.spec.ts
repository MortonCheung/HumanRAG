import { expect, test, type Page } from '@playwright/test';
import { questionsForSystemNode, resetDemoState, submitPracticeQuestion } from './helpers';

async function findVisibleNode(page: Page) {
  let hit: { x: number; y: number } | null = null;
  for (const y of [240, 290, 340, 390, 440, 490, 540, 590, 640]) {
    for (const x of [480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080]) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(55);
      if (await page.locator('.node-inspector--peek').count()) {
        hit = { x, y };
        break;
      }
    }
    if (hit) break;
  }
  expect(hit).not.toBeNull();
  return hit!;
}

test('Universe 节点点击先启动 Pico，再延迟 Camera Focus，关闭详情后返回 Dock', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await resetDemoState(page);
  await page.goto('/universe');
  const canvas = page.locator('canvas[aria-label="计算机知识关系图"]');
  const workspace = page.locator('.root-workspace');
  await expect(canvas).toBeVisible({ timeout: 12_000 });
  await expect(canvas).toHaveAttribute('data-pico-presence', 'docked');

  const hit = await findVisibleNode(page);
  await page.mouse.click(hit.x, hit.y);
  await expect(workspace).toHaveAttribute('data-pico-presence', 'traveling');
  await page.waitForTimeout(65);
  await expect(page.locator('.node-inspector.is-expanded')).toHaveCount(0);
  await expect(page.locator('.node-inspector.is-expanded')).toBeVisible({ timeout: 2_000 });
  await expect(canvas).toHaveAttribute('data-pico-presence', 'perched', { timeout: 2_000 });

  await page.getByRole('button', { name: '关闭节点详情' }).click();
  await expect(workspace).toHaveAttribute('data-pico-presence', 'returning');
  await expect(workspace).toHaveAttribute('data-pico-presence', 'docked', { timeout: 2_000 });
});

test('低动态模式不创建 World travel，节点功能仍正常', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await resetDemoState(page);
  await page.goto('/universe');
  const workspace = page.locator('.root-workspace');
  await expect(page.locator('canvas[aria-label="计算机知识关系图"]')).toBeVisible({ timeout: 12_000 });
  const hit = await findVisibleNode(page);
  await page.mouse.click(hit.x, hit.y);
  await expect(page.locator('.node-inspector.is-expanded')).toBeVisible();
  await expect(workspace).toHaveAttribute('data-pico-presence', 'docked');
});

test('训练提交后 Pico 给出短反馈，随后恢复安静', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/library/computer/tree/tree-408/point/knowledge-linear-list/practice');
  const stem = (await page.locator('.practice-question__stem').textContent())?.trim();
  const question = questionsForSystemNode().find((candidate) => candidate.stem === stem);
  expect(question).toBeDefined();
  await submitPracticeQuestion(page, question!.id, 'wrong');
  const actor = page.locator('.pico-actor-host');
  await expect(actor).toHaveAttribute('data-pico-face', 'error');
  await expect(actor).toHaveAttribute('data-pico-motion', 'wobble');
  await expect(actor).toHaveAttribute('data-pico-face', 'idle', { timeout: 2_000 });
  await expect(actor).toHaveAttribute('data-pico-motion', 'idle');
});
