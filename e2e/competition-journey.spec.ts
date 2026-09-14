import { expect, test } from '@playwright/test';
import { TCP_TASKS } from '../src/data/v6/handcrafted/tcpLesson';
import { fillTcpResponse, clickPageAction, expectPageAction, resetDemoState } from './helpers';

test('比赛主流程从 408 目标经 TCP 误区补教到独立验证证据', async ({ page }) => {
  test.setTimeout(120_000);
  await resetDemoState(page);
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 12_000 });
  const openingCanvas = await page.locator('[data-spatial-stage] canvas').evaluateHandle((canvas) => canvas);
  await page.getByRole('button', { name: '进入知识空间' }).click();
  await expect(page.locator('.spatial-experience--universe')).toBeVisible({ timeout: 8_000 });
  await expectPageAction(page, '选择目标');
  expect(await openingCanvas.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
  await clickPageAction(page, '选择目标');
  await page.getByLabel('你现在想做什么？').fill('准备408，网络比较薄弱，数据结构还可以。');
  await page.getByRole('button', { name: '生成知识树' }).click();
  await expect(page).toHaveURL(/\/library$/, { timeout: 12_000 });
  await expect(page.getByRole('option', { selected: true })).toContainText('考研408 · 定向学习');

  await page.getByRole('button', { name: '进入知识树' }).click();
  await expect(page).toHaveURL(/\/tree\/[^/]+\/path$/);
  const generatedTreeId = page.url().match(/\/tree\/([^/]+)/)?.[1];
  expect(generatedTreeId).toBeTruthy();
  await page.getByRole('searchbox', { name: '搜索知识点' }).fill('TCP可靠传输');
  await page.getByRole('button', { name: /TCP可靠传输/ }).last().click();
  await expect(page.getByRole('heading', { name: 'TCP可靠传输', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '测验' }).click();

  const firstPair = TCP_TASKS.filter((task) => task.role === 'predict' || task.role === 'observe').slice(0, 2);
  await fillTcpResponse(page, firstPair[0], 'growth-error');
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.getByRole('button', { name: '下一题' }).click();
  await fillTcpResponse(page, firstPair[1]);
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.getByRole('button', { name: '完成验证' }).click();

  await expect(page.getByRole('heading', { name: '练习「TCP可靠传输」', exact: true })).toBeVisible();
  await expect(page.getByText('倍增与固定相加')).toBeVisible();
  await page.getByRole('button', { name: '带我学' }).click();
  await expect(page.getByRole('heading', { name: '每轮变化取决于上一轮' })).toBeVisible();

  await page.getByLabel('下一轮窗口预测').fill('4');
  await page.getByRole('button', { name: '验证这一步' }).click();
  await page.getByRole('button', { name: '暂停' }).click();
  await page.getByRole('button', { name: '继续播放' }).click();
  await expect(page.getByRole('img', { name: /第 1 轮，4 MSS/ })).toBeVisible();
  await page.getByRole('button', { name: '自己试一次' }).click();
  const guided = TCP_TASKS.find((task) => task.role === 'guided')!;
  await fillTcpResponse(page, guided);
  await page.getByRole('button', { name: '提交判断' }).click();
  await expect(page.getByText('本题正确', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '继续' }).click();

  const freshPair = TCP_TASKS.filter((task) => task.role === 'predict' || task.role === 'observe').slice(2, 4);
  for (let index = 0; index < freshPair.length; index += 1) {
    await fillTcpResponse(page, freshPair[index]);
    await page.getByRole('button', { name: '提交判断' }).click();
    await expect(page.getByText('本题正确', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: index === 0 ? '下一项任务' : '查看本轮结果' }).click();
  }

  await expect(page.getByText('已掌握', { exact: true })).toBeVisible();
  await clickPageAction(page, '学习记录');
  const verified = page.getByRole('heading', { name: '已掌握' }).locator('..');
  await expect(verified).toContainText('TCP可靠传输');
  const nextAction = page.locator('.evidence-next');
  await expect(nextAction.locator('strong')).toBeVisible();
  await expect(nextAction).not.toContainText('TCP可靠传输');
  const latestEvidence = page.locator('.learning-record').first();
  await latestEvidence.getByText('查看作答与依据').click();
  await expect(latestEvidence.getByRole('link', { name: 'RFC 5681 §3.1 · 逐 RTT 简化教学模型' })).toBeVisible();

  await page.goto(`/library/computer/tree/${generatedTreeId}/path`);
  await expect(page.locator('.tree-recommendation')).toBeVisible();
  await expect(page.locator('.tree-recommendation')).not.toContainText('TCP可靠传输');
  await page.getByRole('searchbox', { name: '搜索知识点' }).fill('TCP可靠传输');
  await expect(page.getByRole('button', { name: 'TCP可靠传输 已掌握' })).toBeVisible();
  await page.goto('/universe');
  await clickPageAction(page, '搜索');
  await page.getByRole('textbox', { name: '搜索输入' }).fill('TCP可靠传输');
  await page.getByRole('button', { name: 'TCP可靠传输 概念' }).click();
  await expect(page.getByRole('heading', { name: '学习状态' }).locator('..')).toContainText('已掌握');
});
