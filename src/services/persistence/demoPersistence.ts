/** 本地演示数据持久化：统一前缀 iteach:v7:*，损坏域只重置自身（蓝图 §17.3）。 */

export const SCHEMA_VERSION = 7;

export interface PersistedEnvelope<T> {
  schemaVersion: 7;
  updatedAt: string;
  data: T;
}

/** V6 旧格式封装，仅用于一次性迁移。 */
interface V6Envelope<T> {
  schemaVersion: number;
  updatedAt: string;
  data: T;
}

/** 无 window（如 Vitest Node 环境）时返回 null，存储操作静默降级为内存态。 */
function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** V6 → V7 键映射：只迁移 V6 真正持久化过的域。 */
const V6_TO_V7_KEYS: Record<string, string> = {
  'iteach:v6:user': 'iteach:v7:user',
  'iteach:v6:libraries': 'iteach:v7:libraries',
  'iteach:v6:teaching': 'iteach:v7:teaching-session',
};

/** V7 键不存在时，尝试从 V6 键读取并迁移，成功后移除旧键。 */
function migrateFromV6<T>(v7Key: string): T | null {
  const storage = safeStorage();
  if (!storage) return null;
  const v6Key = Object.keys(V6_TO_V7_KEYS).find((key) => V6_TO_V7_KEYS[key] === v7Key);
  if (!v6Key) return null;
  try {
    const raw = storage.getItem(v6Key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as V6Envelope<T>;
    if (parsed.schemaVersion !== 6) {
      // V6 数据损坏：重置旧键，避免反复迁移。
      storage.removeItem(v6Key);
      return null;
    }
    storage.removeItem(v6Key);
    return parsed.data;
  } catch {
    storage.removeItem(v6Key);
    return null;
  }
}

export function loadDomain<T>(key: string): T | null {
  const storage = safeStorage();
  if (!storage) return null;
  // 优先读取 V7 键；版本不符或解析失败时只重置该域。
  try {
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedEnvelope<T>;
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed.data;
      storage.removeItem(key);
    }
  } catch {
    storage.removeItem(key);
  }
  // V7 无数据时回退到 V6 迁移，迁移成功后回写 V7 键。
  const migrated = migrateFromV6<T>(key);
  if (migrated !== null) {
    saveDomain(key, migrated);
    return migrated;
  }
  return null;
}

export function saveDomain<T>(key: string, data: T): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const envelope: PersistedEnvelope<T> = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      data,
    };
    storage.setItem(key, JSON.stringify(envelope));
  } catch {
    // 存储不可用时静默降级为内存态。
  }
}

/** Critical learning writes must report failure; legacy callers keep their existing semantics. */
export function trySaveDomain<T>(key: string, data: T): boolean {
  if (typeof window === 'undefined') return true;
  try {
    window.localStorage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), data }));
    return true;
  } catch { return false; }
}

export function removeDomain(key: string): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // 忽略存储异常。
  }
}

export const DOMAIN_KEYS = {
  user: 'iteach:v7:user',
  knowledge: 'iteach:v7:knowledge',
  libraries: 'iteach:v7:libraries',
  libraryDraft: 'iteach:v7:library-draft',
  teaching: 'iteach:v7:teaching-session',
  practice: 'iteach:v7:practice-session',
  progress: 'iteach:v7:progress-delta',
} as const;
