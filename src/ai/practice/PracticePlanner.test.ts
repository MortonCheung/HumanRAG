import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTree, migrateV9 } from '../../domain/knowledge/migration';
import { planForSession } from './PracticePlanner';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  });
});

describe('PracticePlanner 知识树范围', () => {
  it('按普通 KnowledgeTree 的 pointIds 聚合题目，支持用户树 ID', () => {
    const { library } = migrateV9();
    const tree = createTree(library.id, {
      identity: { name: '网络薄弱巩固', description: '', color: '#b1d8ca' },
      pointIds: ['course-computer-networks', 'knowledge-tcp', 'practice-tcp-state'],
    });
    const plan = planForSession(`tree:${tree.id}`, 'learner-408');

    expect(plan).not.toBeNull();
    expect(plan?.title).toBe('网络薄弱巩固综合练习');
    expect(plan?.sourceLabel).toBe('知识树 · 网络薄弱巩固');
    expect(plan?.questionIds.length).toBeGreaterThan(0);
  });
});
