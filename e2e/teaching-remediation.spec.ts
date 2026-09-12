import { expect, test } from '@playwright/test';
import { resetDemoState, submitTeachingStep, systemUnit, SYSTEM_UNIT_ID } from './helpers';
import { contentRepository } from '../src/services/content/ContentRepository';

test.describe('教学复教、重测与终止', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('弱诊断先进入包含前置知识补充的正式讲解', async ({ page }) => {
    const unit = systemUnit();
    const steps = unit.stepIds.map((id) => contentRepository.getTeachingStep(id)!);
    const diagnostic = steps.find((step) => step.kind === 'diagnostic')!;
    const explanation = steps.find((step) => step.kind === 'explanation')!;

    await page.goto(`/teach/${SYSTEM_UNIT_ID}`);
    await page.getByRole('button', { name: /下一步/ }).click();
    await expect(page.getByRole('heading', { name: diagnostic.title })).toBeVisible();
    await submitTeachingStep(page, diagnostic.questionIds ?? [], 'wrong');
    await page.getByRole('button', { name: /下一步/ }).click();

    await expect(page.getByRole('heading', { name: explanation.title })).toBeVisible();
    await expect(page.getByText(/前置知识补充/)).toBeVisible();
    await expect(page.getByRole('heading', { name: '独立检查' })).toHaveCount(0);
  });

  test('独立检查连续失败后终止，不播放掌握完成反馈', async ({ page }) => {
    const unit = systemUnit();
    const steps = unit.stepIds.map((id) => contentRepository.getTeachingStep(id)!);
    const diagnostic = steps.find((step) => step.kind === 'diagnostic')!;
    const guided = steps.find((step) => step.kind === 'guided-practice')!;
    const independent = steps.find((step) => step.kind === 'independent-check')!;

    await page.goto(`/teach/${SYSTEM_UNIT_ID}`);
    await expect(page.getByRole('heading', { name: '学习目标' })).toBeVisible();
    await page.getByRole('button', { name: /下一步/ }).click();

    await expect(page.getByRole('heading', { name: diagnostic.title })).toBeVisible();
    await submitTeachingStep(page, diagnostic.questionIds ?? [], 'correct');
    await page.getByRole('button', { name: /下一步/ }).click();

    for (const kind of ['explanation', 'worked-example'] as const) {
      const step = steps.find((entry) => entry.kind === kind)!;
      await expect(page.getByRole('heading', { name: step.title })).toBeVisible();
      await page.getByRole('button', { name: /下一步/ }).click();
    }

    await expect(page.getByRole('heading', { name: guided.title })).toBeVisible();
    await submitTeachingStep(page, guided.questionIds ?? [], 'correct');
    await page.getByRole('button', { name: /下一步/ }).click();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await expect(page.getByRole('heading', { name: independent.title })).toBeVisible();
      if (attempt > 1) await expect(page.getByText(`第 ${attempt} 次独立验证`)).toBeVisible();
      await submitTeachingStep(page, independent.questionIds ?? [], 'wrong');
      await page.getByRole('button', { name: /下一步/ }).click();

      if (attempt < 3) {
        await expect(page.getByRole('heading', { name: /补救|纠错/ })).toBeVisible();
        await page.getByRole('button', { name: /下一步/ }).click();
      }
    }

    await expect(page.getByRole('heading', { name: '建议先补前置知识' })).toBeVisible();
    await expect(page.getByText('本轮不记为掌握完成')).toBeVisible();
    await expect(page.getByLabel(/教学单元完成/)).toHaveCount(0);
  });
});
