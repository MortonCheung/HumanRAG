import { beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { layoutCustomTree } from '../../library-builder/customTreeLayout';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';
import { buildGoalTreeExtractionLayout, treeEdgeBuildShader } from './GoalTreeExtraction';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  });
});

describe('GoalTreeExtraction', () => {
  it('从第一帧就复用正式知识树布局与居中偏移', () => {
    const state = migrateV9();
    const pointIds = ['direction-408', 'course-computer-networks', 'knowledge-tcp', 'practice-tcp-state'];
    const draft = { name: '网络巩固', description: '', pointIds, reasons: {} };
    const result = buildGoalTreeExtractionLayout(draft);
    const nodes = toCustomNodes(pointIds.map((id) => state.points.find((point) => point.id === id)!)).map((node) => ({ ...node, position: undefined }));
    const expected = layoutCustomTree(nodes, toCustomEdges(state.relations, new Set(pointIds)));
    const offset = customTreeFrame(expected, 1, 1, true).offset;

    expect([...result.positions]).toEqual([...expected]);
    expect(result.worldPositions.get('knowledge-tcp')).toEqual(expected.get('knowledge-tcp')?.map((value, index) => value + [offset.x, offset.y, offset.z][index]));
  });

  it('新树关系从两个端点向中间生长', () => {
    expect(treeEdgeBuildShader).toContain('min(vProgress,1.0-vProgress)');
    expect(treeEdgeBuildShader).toContain('smoothstep(uBuild,uBuild+0.08,distanceToEnd)');
  });
});
