import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DOMAIN_KEYS,
  SCHEMA_VERSION,
  loadDomain,
  saveDomain,
} from './demoPersistence';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function installStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
  return storage;
}

describe('demoPersistence：V7 读写与迁移', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('保存后按原键读取，封装带 V7 版本号', () => {
    const storage = installStorage();
    saveDomain(DOMAIN_KEYS.user, { activeProfileId: 'p1' });
    expect(loadDomain(DOMAIN_KEYS.user)).toEqual({ activeProfileId: 'p1' });
    const raw = storage.getItem(DOMAIN_KEYS.user)!;
    expect(JSON.parse(raw).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('V6 数据迁移到 V7 并回写，二次读取稳定', () => {
    const storage = installStorage();
    storage.setItem(
      'iteach:v6:user',
      JSON.stringify({
        schemaVersion: 6,
        updatedAt: '2026-08-29T00:00:00.000Z',
        data: { activeProfileId: 'old' },
      }),
    );
    expect(loadDomain(DOMAIN_KEYS.user)).toEqual({ activeProfileId: 'old' });
    expect(storage.getItem('iteach:v6:user')).toBeNull();
    // 迁移已回写 V7 键，二次读取仍能恢复。
    expect(loadDomain(DOMAIN_KEYS.user)).toEqual({ activeProfileId: 'old' });
    expect(JSON.parse(storage.getItem(DOMAIN_KEYS.user)!).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('V7 数据损坏只重置自身域，不影响其他域', () => {
    const storage = installStorage();
    saveDomain(DOMAIN_KEYS.user, { activeProfileId: 'p1' });
    saveDomain(DOMAIN_KEYS.libraries, [{ id: 'lib-1' }]);
    storage.setItem(DOMAIN_KEYS.user, '{broken json');
    expect(loadDomain(DOMAIN_KEYS.user)).toBeNull();
    expect(storage.getItem(DOMAIN_KEYS.user)).toBeNull();
    expect(loadDomain(DOMAIN_KEYS.libraries)).toEqual([{ id: 'lib-1' }]);
  });

  it('版本不符的 V7 数据视为损坏并重置', () => {
    const storage = installStorage();
    storage.setItem(
      DOMAIN_KEYS.user,
      JSON.stringify({ schemaVersion: 99, updatedAt: 'x', data: { activeProfileId: 'p1' } }),
    );
    expect(loadDomain(DOMAIN_KEYS.user)).toBeNull();
    expect(storage.getItem(DOMAIN_KEYS.user)).toBeNull();
  });

  it('无 V6 对应键的域不触发迁移', () => {
    installStorage();
    expect(loadDomain(DOMAIN_KEYS.libraryDraft)).toBeNull();
    expect(loadDomain(DOMAIN_KEYS.progress)).toBeNull();
  });
});
