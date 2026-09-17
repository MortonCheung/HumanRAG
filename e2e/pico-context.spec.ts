import { expect, test, type Page } from '@playwright/test';
import type { ChatRequest } from '../src/ai/chat/contracts';
import { expectNoHorizontalOverflow, questionsForSystemNode, resetDemoState, submitVerificationQuestion } from './helpers';

async function sendPico(page: Page, message: string) {
  await page.getByLabel('问当前内容').fill(message);
  const send = page.getByRole('button', { name: '发送给 Pico' });
  await expect(send).toBeEnabled({ timeout: 3_000 });
  await send.click();
  await expect(page.locator('.pico-message--assistant').last()).toBeVisible();
}

test('Study 与 Teaching 自己注册上下文，问问 Pico 只打开 Dock 不自动请求', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/chat', async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '已收到。', source: 'live' }) });
  });
  await resetDemoState(page);
  await page.goto('/library/computer/tree/tree-408/point/knowledge-linear-list/study');
  await page.getByRole('button', { name: '问问 Pico：线性表' }).click();
  const dock = page.getByRole('complementary', { name: 'Pico 学习伙伴' });
  await expect(dock).toBeVisible();
  await expect(dock).toHaveAttribute('data-page-context-key', 'study:knowledge-linear-list');
  await expect(dock).toHaveAttribute('data-explicit-context-type', 'knowledge');
  await expect(page.getByLabel('问当前内容')).toBeFocused();
  expect(requests).toBe(0);

  await page.getByRole('link', { name: '带我学', exact: true }).first().click();
  await expect(page).toHaveURL(/knowledge-linear-list\/teach$/);
  await expect(dock).toBeVisible();
  await expect(dock.locator('.pico-context-change').last()).toContainText('已切换到');
  await page.locator('.pico-context-block .ask-pico-button').first().click();
  await expect(dock).toHaveAttribute('data-explicit-context-type', 'content');
  expect(requests).toBe(0);
});

test('Practice 未提交请求不含答案，提交后才发送复盘字段', async ({ page }) => {
  const bodies: ChatRequest[] = [];
  await page.route('**/api/chat', async (route) => {
    bodies.push(route.request().postDataJSON() as ChatRequest);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '按当前题目继续思考。', source: 'live' }) });
  });
  await resetDemoState(page);
  await page.goto('/library/computer/tree/tree-408/point/knowledge-linear-list/verify');
  const beforeButton = page.getByRole('button', { name: /^问问 Pico：第 1 题$/ });
  await beforeButton.click();
  await sendPico(page, '给我一步提示');
  expect(bodies).toHaveLength(1);
  const before = bodies[0] as Extract<ChatRequest, { mode: 'pico' }>;
  expect(before.explicitContext).toMatchObject({ type: 'question', answerPolicy: 'hint-only' });
  expect(JSON.stringify(before)).not.toContain('expectedAnswer');
  expect(JSON.stringify(before)).not.toContain('explanation');

  const stem = (await page.locator('.practice-question__stem').textContent())?.trim();
  const question = questionsForSystemNode().find((candidate) => candidate.stem === stem);
  expect(question).toBeDefined();
  await submitVerificationQuestion(page, question!.id, 'correct');
  await page.getByRole('button', { name: /^问问 Pico · 这道题：第 1 题$/ }).click();
  await sendPico(page, '帮我复盘');
  expect(bodies).toHaveLength(2);
  const after = bodies[1] as Extract<ChatRequest, { mode: 'pico' }>;
  expect(after.explicitContext).toMatchObject({ type: 'question', answerPolicy: 'review' });
  expect(after.explicitContext).toHaveProperty('userAnswer');
  expect(after.explicitContext).toHaveProperty('expectedAnswer');
  expect(after.explicitContext).toHaveProperty('explanation');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
  test(`Pico Dock 在 ${viewport.width}×${viewport.height} 为共享 Canvas 留出真实空间`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await resetDemoState(page);
    await page.goto('/universe');
    const canvas = page.locator('[data-spatial-stage] canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: '打开 Pico' }).click();
    const dock = page.getByRole('complementary', { name: 'Pico 学习伙伴' });
    await expect(dock).toBeVisible();
    await expect.poll(async () => {
      const canvasBox = await canvas.boundingBox();
      const dockBox = await dock.boundingBox();
      return canvasBox && dockBox ? Math.abs(canvasBox.x + canvasBox.width - dockBox.x) : Infinity;
    }).toBeLessThan(2);
    await expectNoHorizontalOverflow(page);
  });
}
