import { describe, expect, it } from 'vitest';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { canonicalPosition } from '../../../graph/canonicalSpace';
import { buildPreviewTreeGraph } from './PreviewTreeGroup';

describe('system tree canonical geometry', () => {
  it('tree-408 与 Universe 使用同一套节点坐标', () => {
    const domain = migrateV9();

    const tree = domain.trees.find((item) => item.id === 'tree-408');

    expect(tree).toBeTruthy();

    const points = domain.points.filter((point) =>
      tree!.pointIds.includes(point.id),
    );

    const graph = buildPreviewTreeGraph(
      tree!,
      points,
      domain.relations,
    );

    for (const point of points) {
      expect(graph.positions.get(point.id)).toEqual(
        canonicalPosition(point.position),
      );
    }
  });

  it('tree-408 顶层节点不允许消失', () => {
    const domain = migrateV9();
    const tree = domain.trees.find((item) => item.id === 'tree-408');
    expect(tree).toBeTruthy();
    expect(tree!.pointIds).toContain('goal-cs-graduate');
    expect(tree!.pointIds).toContain('direction-408');
  });
});
