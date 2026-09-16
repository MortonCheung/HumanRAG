import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

/**
 * 手册第 0.2 / 第 11 / 第 13 章：Opening 是同一个世界慢慢醒来。
 * 节点位置永远不变，变化的只有明暗、传播和 Camera；入场镜头方向固定、target 移动、
 * distance 变化（缓慢拉开），Node Reveal ≈ 1.4–1.9s；Camera 在 2.15s 落位，
 * 等待全局 Line Sweep 与 Pulse Gate 后约 2.70s 交接 Universe。
 *
 * 探针依赖 CameraController 逐帧发布的 `data-spatial-camera`：只在 CameraControls 的 rest
 * 事件上发布会读到入场开始时的静止旧值（入场期间 controls.enabled 为 false，永不 rest），
 * 见 src/scene/CameraController.tsx 的 publishCameraPose 注释。
 */

interface OpeningSample { t: number; distance: number; direction: number[] }
interface OpeningTrace { phases: { t: number; cls: string }[]; samples: OpeningSample[] }

const TRACE_WINDOW_MS = 3_800;

function directionCosine(a: number[], b: number[]) {
  return Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
}

test('入场镜头从 seed 取景缓慢拉开到完整 Universe，方向不翻', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await resetDemoState(page);
  await page.goto('/');
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 12_000 });

  await page.evaluate(() => {
    const window_ms = 3400;
    const experience = document.querySelector('.spatial-experience')!;
    const canvas = document.querySelector('[data-spatial-stage] canvas');
    const phases: { t: number; cls: string }[] = [];
    const samples: { t: number; distance: number; direction: number[] }[] = [];
    const startedAt = performance.now();
    const record = () => phases.push({ t: Math.round(performance.now() - startedAt), cls: experience.className });
    record();
    new MutationObserver(record).observe(experience, { attributes: true, attributeFilter: ['class'] });
    const capture = () => {
      const value = canvas?.getAttribute('data-spatial-camera');
      if (!value) return;
      const [px, py, pz, tx, ty, tz] = value.split(',').map(Number);
      const length = Math.hypot(px - tx, py - ty, pz - tz) || 1;
      samples.push({
        t: Math.round(performance.now() - startedAt),
        distance: length,
        direction: [(px - tx) / length, (py - ty) / length, (pz - tz) / length],
      });
    };
    // 同步抓一帧 seed 取景的静止位姿（点击之前），把入场基线与 rAF 节奏解耦：
    // 点击后的第一帧落在哪一刻取决于主线程负载，不能拿它当基线。
    capture();
    const tick = () => {
      capture();
      if (performance.now() - startedAt < window_ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    (window as unknown as Record<string, unknown>).__opening = { phases, samples };
  });

  await page.getByRole('button', { name: '进入知识空间' }).click();
  await page.waitForTimeout(TRACE_WINDOW_MS + 200);

  const trace = (await page.evaluate(() => (window as unknown as Record<string, unknown>).__opening)) as OpeningTrace;

  // 阶段顺序：intro → awakening → settling → universe，且入场合计约 2.70s。
  const order = ['intro', 'awakening', 'settling', 'universe'];
  const seen = order.map((name) => trace.phases.find((entry) => entry.cls.endsWith(`--${name}`)));
  seen.forEach((entry, index) => expect(entry, `缺少阶段 ${order[index]}`).toBeDefined());
  for (let index = 1; index < seen.length; index += 1) {
    expect(seen[index]!.t).toBeGreaterThan(seen[index - 1]!.t);
  }
  const entryDuration = seen[3]!.t - seen[1]!.t;
  expect(entryDuration).toBeGreaterThan(2_450);
  expect(entryDuration).toBeLessThan(3_050);

  // 相机真的在动：入场期间必须出现多个不同距离，而不是一个静止值。
  const entry = trace.samples.filter((sample) => sample.t >= seen[1]!.t && sample.t <= seen[3]!.t);
  expect(new Set(entry.map((sample) => Math.round(sample.distance * 2))).size).toBeGreaterThan(4);

  // 方向固定：整段入场不允许绕圈（手册第 11 章）。
  const incoming = entry[0].direction;
  for (const sample of entry) {
    expect((Math.acos(directionCosine(incoming, sample.direction)) * 180) / Math.PI).toBeLessThan(8);
  }

  // 缓慢拉开：距离单调不回头，且最终明显大于 seed 取景。
  for (let index = 1; index < entry.length; index += 1) {
    expect(entry[index].distance).toBeGreaterThan(entry[index - 1].distance - 0.5);
  }
  const last = entry[entry.length - 1].distance;
  // 拉开幅度用整段轨迹的范围衡量（含点击前同步抓到的 seed 位姿），
  // 不用 entry[0]——它取决于入场后第一帧落在哪一刻。
  const seedDistance = Math.min(...trace.samples.map((sample) => sample.distance));
  const peakDistance = Math.max(...trace.samples.map((sample) => sample.distance));
  expect(peakDistance / seedDistance).toBeGreaterThan(1.5);

  // 落位后不再漂移：universe 之后相机必须已经停在终点附近。
  for (const sample of trace.samples.filter((item) => item.t > seen[3]!.t)) {
    expect(Math.abs(sample.distance - last)).toBeLessThan(4);
  }
});
