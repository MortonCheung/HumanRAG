import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, questionsForSystemNode, resetDemoState, submitVerificationQuestion, SYSTEM_NODE_ID } from './helpers';

const pointPath = (action: 'study' | 'teach' | 'verify', pointId = SYSTEM_NODE_ID) => `/library/computer/tree/tree-408/point/${pointId}/${action}`;

test.describe('自主学习、带我学与能力验证分工', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('自主学习打开知识工作台，并保留可操作材料与三条后续路径', async ({ page }) => {
    await page.goto(pointPath('study', 'knowledge-tcp'));
    await expect(page.getByRole('heading', { name: 'TCP可靠传输', level: 1 })).toBeVisible();
    await expect(page.getByText('为什么发送方不能无限增加发送速率？')).toBeVisible();
    await expect(page.getByRole('region', { name: 'TCP 窗口示范' })).toBeVisible();
    await expect(page.getByRole('link', { name: '用新题验证' })).toHaveAttribute('href', pointPath('verify', 'knowledge-tcp'));
    await expect(page.getByRole('link', { name: '需要引导' })).toHaveAttribute('href', pointPath('teach', 'knowledge-tcp'));
    await expect(page.getByRole('navigation', { name: '带我学的五个阶段' })).toHaveCount(0);
  });

  test('带我学只显示五个稳定阶段，并解释当前安排', async ({ page }) => {
    await page.goto(pointPath('teach'));
    const phases = page.getByRole('navigation', { name: '带我学的五个阶段' });
    await expect(phases).toBeVisible();
    for (const label of ['诊断', '理解', '示范', '尝试', '独立验证']) await expect(phases.getByText(label, { exact: true })).toBeVisible();
    await expect(page.getByText('为什么现在做这一步', { exact: true })).toBeVisible();
    await expect(phases.locator('button')).toHaveCount(0);
  });

  test('独立验证提交后只显示已记录，不在交卷前泄露正误或讲解', async ({ page }) => {
    await page.goto(pointPath('verify'));
    await page.locator('.practice-question__options .question-option').first().click();
    await page.getByRole('button', { name: '提交答案' }).click();

    await expect(page.getByText('已记录', { exact: true })).toBeVisible();
    await expect(page.locator('.practice-answer-feedback')).toHaveCount(0);
    await expect(page.getByText('本题正确', { exact: true })).toHaveCount(0);
    await expect(page.getByText('本题未通过', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '第 1 题，已记录', exact: true })).toBeVisible();
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('iteach:v7:practice-session') ?? '{}') as { data?: { mode?: string } });
    expect(persisted.data?.mode).toBe('verify');
    const evidenceSource = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('iteach:v7:progress-delta') ?? '{}') as { data?: { evidenceRecords?: Array<{ source: string }> } };
      return state.data?.evidenceRecords?.at(-1)?.source;
    });
    expect(evidenceSource).toBe('independent-check');
  });

  test('知识树能力验证使用考试模式，并在移动宽度保持完整视区', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library/computer/tree/tree-408/practice/session');
    await expect(page.getByRole('banner', { name: '页面导航' })).toContainText('考试');
    await expectNoHorizontalOverflow(page);
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('iteach:v7:practice-session') ?? '{}') as { data?: { mode?: string } });
    expect(persisted.data?.mode).toBe('exam');
  });

  test('一次独立验证错答会同时改变学习证据、知识树和 Universe 的下一步', async ({ page }) => {
    const question = questionsForSystemNode()[0];
    await page.goto(pointPath('verify'));
    await submitVerificationQuestion(page, question.id, 'wrong');

    await page.getByRole('link', { name: '学习证据' }).click();
    await expect(page.getByRole('heading', { name: '提示后做对，不等于独立掌握。' })).toBeVisible();
    await expect(page.getByRole('link', { name: '线性表 巩固' })).toBeVisible();
    await expect(page.getByRole('link', { name: '带我巩固' })).toHaveAttribute('href', pointPath('teach'));

    await page.goto('/library/computer/tree/tree-408/path');
    await expect(page.getByRole('button', { name: /当前建议 线性表.*需要巩固/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '线性表 需要巩固' })).toBeVisible();

    await page.goto('/universe');
    await page.getByRole('button', { name: '搜索' }).click();
    await page.getByRole('textbox', { name: '搜索输入' }).fill('线性表');
    await page.getByRole('button', { name: '线性表 概念' }).click();
    await expect(page.getByRole('heading', { name: '学习状态' }).locator('..')).toContainText('需要巩固');
    await expect(page.getByRole('heading', { name: '为什么建议从这里继续' }).locator('..')).toContainText('最近作答尚未通过');
  });

  test('自主学习可以留下具体问题，并由同一推荐带回对应知识点', async ({ page }) => {
    await page.goto(pointPath('study', 'knowledge-tcp'));
    const question = '为什么窗口达到门限后不再翻倍？';
    await page.getByRole('textbox', { name: '仍然没想通什么？' }).fill(question);
    await page.getByRole('button', { name: '留下一个问题' }).click();
    await expect(page.getByLabel('知识点上下文')).toContainText(question);

    await page.goto('/library/computer/tree/tree-408/path');
    await expect(page.getByRole('button', { name: /当前建议 TCP可靠传输.*尚未解决的问题/ })).toBeVisible();

    await page.goto(pointPath('study', 'knowledge-tcp'));
    await page.getByRole('button', { name: '标记已解决' }).click();
    await expect(page.getByLabel('知识点上下文')).toContainText('当前没有待解决问题');
  });
});
