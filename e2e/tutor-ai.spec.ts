import { expect, test, type Page } from '@playwright/test';
import type { ChatRequest } from '../src/ai/chat/contracts';
import { resetDemoState } from './helpers';

async function sendTutor(page: Page, message: string, expectedAssistantCount: number) {
  await page.getByLabel('输入问题').fill(message);
  const send = page.getByRole('button', { name: '发送给 AI 导师' });
  await expect(send).toBeEnabled({ timeout: 3_000 });
  await send.click();
  await expect(page.locator('.tutor-message--assistant')).toHaveCount(expectedAssistantCount);
}

test('AI 导师按 Router 只发送需要的 Context，进入页面不调用 API', async ({ page }) => {
  const bodies: ChatRequest[] = [];
  let statusRequests = 0;
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() === 'GET') {
      statusRequests += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: false, mode: 'mock' }) });
      return;
    }
    bodies.push(route.request().postDataJSON() as ChatRequest);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '这是测试回答。', source: 'live' }) });
  });
  await resetDemoState(page);
  await page.goto('/tutor');
  await expect(page.getByRole('heading', { name: 'AI导师' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开 Pico' })).toHaveCount(0);
  await expect.poll(() => statusRequests).toBe(1);
  expect(bodies).toHaveLength(0);

  await sendTutor(page, 'Transformer 是什么', 1);
  await sendTutor(page, '我哪里最薄弱', 2);
  await sendTutor(page, '我下一步学什么', 3);

  expect(bodies).toHaveLength(3);
  expect((bodies[0] as Extract<ChatRequest, { mode: 'tutor' }>).contextBlocks).toHaveLength(0);
  expect((bodies[1] as Extract<ChatRequest, { mode: 'tutor' }>).contextBlocks.map((block) => block.type)).toEqual(['mistakes']);
  expect((bodies[2] as Extract<ChatRequest, { mode: 'tutor' }>).contextBlocks.map((block) => block.type)).toEqual(['recommendation', 'mistakes']);
  await expect(page.locator('.tutor-message--assistant').nth(1)).toContainText('参考：薄弱项');
});

test('AI Gateway 503 时导师仍返回有标识的演示回复', async ({ page }) => {
  await page.route('**/api/chat', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'AI_NOT_CONFIGURED' }) }));
  await resetDemoState(page);
  await page.goto('/tutor');
  await sendTutor(page, '我哪里最薄弱', 1);
  await expect(page.locator('.tutor-message--assistant')).toContainText('演示回复');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Dashboard 只在点击时生成洞察，并按同一快照复用缓存', async ({ page }) => {
  const bodies: ChatRequest[] = [];
  await page.route('**/api/chat', async (route) => {
    bodies.push(route.request().postDataJSON() as ChatRequest);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '先处理重复误区，再完成一次独立验证。', source: 'live' }) });
  });
  await resetDemoState(page);
  await page.goto('/progress');
  expect(bodies).toHaveLength(0);
  const trigger = page.getByRole('button', { name: '生成学习洞察' });
  await trigger.click();
  await expect(page.locator('.learning-dashboard__insight')).toContainText('先处理重复误区');
  await expect(page.locator('.pico-actor-host')).toHaveAttribute('data-pico-face', 'success');
  await expect(page.locator('.pico-actor-host')).toHaveAttribute('data-pico-motion', 'turn');
  expect(bodies).toHaveLength(1);
  const request = bodies[0] as Extract<ChatRequest, { mode: 'insight' }>;
  expect(request.mode).toBe('insight');
  expect(request.contextBlocks.length).toBeLessThanOrEqual(2);
  await expect(trigger).toBeEnabled({ timeout: 3_000 });
  await trigger.click();
  expect(bodies).toHaveLength(1);
});
