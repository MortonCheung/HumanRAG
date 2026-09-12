import { describe, expect, it } from 'vitest';
import type { KnowledgePoint, KnowledgeRelation } from '../../domain/knowledge/types';
import { filterTreePoints, groupTreePoints } from './treePointGroups';

function point(id: string, name: string, kind: KnowledgePoint['kind'] = 'knowledge'): KnowledgePoint {
  return { id, name, kind, description: '', content: '', color: '#fff', position: [0, 0, 0], tags: ['网络'], learningObjectives: [], misconceptions: [], recommendedContent: [] };
}

const course = point('networks', '计算机网络', 'course');
const tcp = point('tcp', 'TCP 可靠传输');
const empty = point('empty', '待补充知识点');
const practice = point('tcp-task', 'TCP 状态分析', 'practice');
const points = [tcp, empty, practice];
const allPoints = new Map([course, ...points].map((item) => [item.id, item]));
const relations: KnowledgeRelation[] = [
  { id: 'r1', sourcePointId: course.id, targetPointId: tcp.id, type: 'hierarchy' },
  { id: 'r2', sourcePointId: tcp.id, targetPointId: practice.id, type: 'practice_for' },
];

describe('knowledge tree point grouping', () => {
  it('uses real ancestors and keeps cyclic or ungrouped points once', () => {
    expect(groupTreePoints(points, allPoints, relations).map((group) => [group.name, group.points.map((item) => item.id)]))
      .toEqual([['计算机网络', ['tcp', 'tcp-task']], ['知识点', ['empty']]]);
    expect(groupTreePoints([empty], allPoints, [{ id: 'cycle', sourcePointId: empty.id, targetPointId: empty.id, type: 'hierarchy' }])[0].points)
      .toEqual([empty]);
  });

  it('normalizes full-width, multi-word searches across names and tags', () => {
    expect(filterTreePoints(points, 'ＴＣＰ　网络')).toEqual([tcp, practice]);
    expect(filterTreePoints(points, '不存在')).toEqual([]);
  });
});
