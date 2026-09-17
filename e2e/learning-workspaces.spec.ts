import { expect, test } from '@playwright/test';
import { clickPageAction, expectNoHorizontalOverflow, openProductArea, questionsForSystemNode, resetDemoState, submitVerificationQuestion, SYSTEM_NODE_ID } from './helpers';

const pointPath = (action: 'study' | 'teach' | 'verify', pointId = SYSTEM_NODE_ID) => `/library/computer/tree/tree-408/point/${pointId}/${action}`;

test.describe('学习、带我学与测验分工', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('学习打开知识工作台，并保留可操作材料与三条后续路径', async ({ page }) => {
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

  test('知识树测验使用考试模式，并在移动宽度保持完整视区', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library/computer/tree/tree-408/practice/session');
    await expect(page.getByRole('banner', { name: '页面导航' })).toContainText('考试');
    await expectNoHorizontalOverflow(page);
    const layout = await page.evaluate(() => {
      const nav = document.querySelector('.practice-nav')?.getBoundingClientRect();
      const stage = document.querySelector('.practice-stage')?.getBoundingClientRect();
      return nav && stage ? { navWidth: nav.width, navBottom: nav.bottom, stageTop: stage.top } : null;
    });
    expect(layout).not.toBeNull();
    expect(layout!.navWidth).toBeGreaterThanOrEqual(388);
    expect(layout!.stageTop).toBeGreaterThanOrEqual(layout!.navBottom - 1);
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('iteach:v7:practice-session') ?? '{}') as { data?: { mode?: string } });
    expect(persisted.data?.mode).toBe('exam');
  });

  test('一次测验错答会同时改变学习记录、知识树和 Universe 的下一步', async ({ page }) => {
    const question = questionsForSystemNode()[0];
    await page.goto(pointPath('verify'));
    await submitVerificationQuestion(page, question.id, 'wrong');

    await openProductArea(page, '我的学习');
    await expect(page.getByRole('banner', { name: '页面导航' })).toContainText('我的学习');
    await expect(page.getByText('作答', { exact: true }).locator('..')).toContainText('129');
    await expect(page.getByRole('link', { name: '带我巩固' })).toHaveAttribute('href', pointPath('teach'));

    await page.goto('/library/computer/tree/tree-408/path');
    await expect(page.getByRole('button', { name: /建议先学 线性表.*需要巩固/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '线性表 需要巩固' })).toBeVisible();

    await page.goto('/universe');
    await clickPageAction(page, '搜索');
    await page.getByRole('textbox', { name: '搜索输入' }).fill('线性表');
    await page.getByRole('button', { name: '线性表 概念' }).click();
    await expect(page.getByRole('heading', { name: '学习状态' }).locator('..')).toContainText('需要巩固');
    await expect(page.getByRole('heading', { name: '建议' }).locator('..')).toContainText('最近作答尚未通过');
  });

  test('学习可以留下具体问题，并由同一推荐带回对应知识点', async ({ page }) => {
    await page.goto(pointPath('study', 'knowledge-tcp'));
    const question = '为什么窗口达到门限后不再翻倍？';
    await page.getByRole('textbox', { name: '仍然没想通什么？' }).fill(question);
    await page.getByRole('button', { name: '留下一个问题' }).click();
    await expect(page.getByLabel('知识点上下文')).toContainText(question);

    await page.goto('/library/computer/tree/tree-408/path');
    await expect(page.getByRole('button', { name: /建议先学 TCP可靠传输.*尚未解决的问题/ })).toBeVisible();

    await page.goto(pointPath('study', 'knowledge-tcp'));
    await page.getByRole('button', { name: '标记已解决' }).click();
    await expect(page.getByLabel('知识点上下文')).toContainText('当前没有待解决问题');
  });
});
