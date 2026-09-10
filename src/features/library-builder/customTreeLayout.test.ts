import { describe, expect, it } from 'vitest';
import type { CustomNode } from '../../store/libraryStore';
import { layoutCustomTree, reconcileTreePositions, type TreePositionMap } from './customTreeLayout';

const node = (id: string, position?: [number, number, number]): CustomNode => ({ id, name: id, kind: 'knowledge', description: '', x: 0, y: 0, position });

describe('知识树稳定布局', () => {
  it('零坐标是有效手工位置，新增/改关系不重新布局已放置节点', () => {
    const a = node('a', [0, 0, 0]);
    const b = node('b', [4, 2, 6]);
    expect(layoutCustomTree([a, b, node('c')], [{ id: 'b-a', source: 'b', target: 'a', relationType: 'prerequisite' }]).get('a')).toEqual([0, 0, 0]);
    expect(layoutCustomTree([a, b], []).get('b')).toEqual([4, 2, 6]);
  });

  it('只有数值变化的权威坐标能覆盖显示值，数组换引用不会清除待保存位置', () => {
    const previous = layoutCustomTree([node('a', [0, 0, 0]), node('b', [2, 2, 2])], []);
    const displayed: TreePositionMap = new Map(previous);
    displayed.set('a', [7, 8, 9]);
    const same = layoutCustomTree([node('a', [0, 0, 0]), node('b', [2, 2, 2])], []);
    expect(reconcileTreePositions(displayed, previous, same)).toBe(displayed);
    const changed = new Map(same);
    changed.set('a', [1, 2, 3]);
    expect(reconcileTreePositions(displayed, same, changed).get('a')).toEqual([1, 2, 3]);
    expect(reconcileTreePositions(displayed, same, changed, 'a').get('a')).toEqual([7, 8, 9]);
  });

  it('增加缺失节点/移除删除节点，保留旧自动布局与拖动预览', () => {
    const previous = layoutCustomTree([node('a'), node('b')], []);
    const displayed = new Map(previous);
    displayed.set('a', [9, 1, -3]);
    const incoming = layoutCustomTree([node('a'), node('b'), node('c')], []);
    const result = reconcileTreePositions(displayed, previous, incoming, undefined, new Set());
    expect(result.get('a')).toEqual([9, 1, -3]);
    expect(result.get('b')).toEqual(previous.get('b'));
    expect(result.has('c')).toBe(true);
    const removed = reconcileTreePositions(result, incoming, layoutCustomTree([node('a'), node('c')], []), undefined, new Set());
    expect(removed.has('b')).toBe(false);
    expect(removed.get('a')).toEqual([9, 1, -3]);
  });
});
