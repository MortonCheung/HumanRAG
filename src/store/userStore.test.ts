// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DOMAIN_KEYS, SCHEMA_VERSION } from '../services/persistence/demoPersistence';

async function loadStore() {
  return (await import('./userStore')).useUserStore;
}

function readUserData() {
  return JSON.parse(localStorage.getItem(DOMAIN_KEYS.user) ?? '{}').data;
}

describe('userStore profile overrides', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('兼容没有 profileOverrides 的旧 V7 用户数据', async () => {
    localStorage.setItem(DOMAIN_KEYS.user, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      updatedAt: '2026-09-01T00:00:00.000Z',
      data: { activeProfileId: 'learner-002' },
    }));
    const store = await loadStore();
    expect(store.getState().activeProfileId).toBe('learner-002');
    expect(store.getState().profileOverrides).toEqual({});
  });

  it('保存覆盖后可跨模块重载恢复，且不改写学习历史域', async () => {
    const history = { answerRecords: [{ id: 'answer-1', learnerId: 'learner-001' }] };
    localStorage.setItem(DOMAIN_KEYS.progress, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      updatedAt: '2026-09-01T00:00:00.000Z',
      data: history,
    }));
    const historyBefore = localStorage.getItem(DOMAIN_KEYS.progress);
    const first = await loadStore();
    first.getState().updateProfile('learner-001', { name: '小林', goal: '准备复试' });
    expect(readUserData()).toEqual({
      activeProfileId: 'learner-001',
      profileOverrides: { 'learner-001': { name: '小林', goal: '准备复试' } },
    });
    expect(localStorage.getItem(DOMAIN_KEYS.progress)).toBe(historyBefore);

    vi.resetModules();
    const reloaded = await loadStore();
    expect(reloaded.getState().profileOverrides['learner-001']).toEqual({ name: '小林', goal: '准备复试' });
  });

  it('恢复默认只删除当前学习者覆盖并保留其他画像', async () => {
    const store = await loadStore();
    store.getState().updateProfile('learner-001', { name: '小林' });
    store.getState().updateProfile('learner-002', { name: '小陈' });
    store.getState().resetProfileOverride('learner-001');
    expect(store.getState().profileOverrides).toEqual({ 'learner-002': { name: '小陈' } });
    expect(readUserData().profileOverrides).toEqual({ 'learner-002': { name: '小陈' } });
  });
});
