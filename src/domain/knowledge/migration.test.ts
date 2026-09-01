import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeTreeName,
  checkDuplicateTreeName,
  generateAnonymousTreeName,
} from './migration';
import type { KnowledgeTree } from './types';

beforeEach(() => {
  // localStorage not available in test env; migration falls back to graph build
});

describe('normalizeTreeName', () => {
  it('trims and lowercases Chinese', () => {
    expect(normalizeTreeName('  前端开发  ')).toBe('前端开发');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeTreeName('前端  开发')).toBe('前端 开发');
  });
});

describe('checkDuplicateTreeName', () => {
  const trees: KnowledgeTree[] = [
    { id: 't1', libraryId: 'computer', name: '前端开发', description: '', color: '', ownerType: 'system', pointIds: [], createdAt: '', updatedAt: '' },
    { id: 't2', libraryId: 'computer', name: 'AI工程', description: '', color: '', ownerType: 'system', pointIds: [], createdAt: '', updatedAt: '' },
  ];

  it('returns true for exact duplicate', () => {
    expect(checkDuplicateTreeName('前端开发', trees)).toBe(true);
  });

  it('returns false for unique name', () => {
    expect(checkDuplicateTreeName('后端开发', trees)).toBe(false);
  });

  it('excludes current tree when editing', () => {
    expect(checkDuplicateTreeName('前端开发', trees, 't1')).toBe(false);
  });
});

describe('generateAnonymousTreeName', () => {
  it('generates first anonymous name', () => {
    const trees: KnowledgeTree[] = [];
    expect(generateAnonymousTreeName(trees)).toBe('未命名知识树 01');
  });

  it('skips occupied names', () => {
    const trees: KnowledgeTree[] = [
      { id: 't1', libraryId: 'computer', name: '未命名知识树 01', description: '', color: '', ownerType: 'user', pointIds: [], createdAt: '', updatedAt: '' },
    ];
    expect(generateAnonymousTreeName(trees)).toBe('未命名知识树 02');
  });
});
