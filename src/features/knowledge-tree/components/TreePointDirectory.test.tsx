// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { initRegistry } from '../../../domain/knowledge/selectors';
import type { KnowledgePoint, KnowledgeRelation, KnowledgeTree } from '../../../domain/knowledge/types';
import { filterTreePoints, groupTreePoints, TreePointDirectory } from './TreePointDirectory';

vi.mock('../../workspace/WorkspaceHeader', () => ({ WorkspaceActions: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../../services/content/ContentRepository', () => ({ contentRepository: {
  getTeachingUnitForNode: (id: string) => id === 'tcp' ? { id: 'tu-tcp' } : undefined,
  getQuestionsForNode: (id: string) => id === 'tcp' ? [{ id: 'tcp-1' }, { id: 'tcp-2' }] : [],
} }));

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
const tree: KnowledgeTree = { id: 'tree-408', libraryId: 'computer', name: '考研408', ownerType: 'system', description: '', color: '#fff', createdAt: '', updatedAt: '', pointIds: [...allPoints.keys()] };

beforeEach(() => { initRegistry({ libraries: new Map(), trees: new Map([[tree.id, tree]]), points: allPoints, relations, memberships: [] }); });
afterEach(() => cleanup());

function openDirectory(mode: 'learn' | 'practice', initialPointFilterId?: string) {
  const router = createMemoryRouter([
    { path: '/library/:libraryId/tree/:treeId/:mode', element: <TreePointDirectory mode={mode} points={points} initialPointFilterId={initialPointFilterId} /> },
    { path: '/library/:libraryId/tree/:treeId/point/:pointId/:mode', element: <p>共享工作区</p> },
  ], { initialEntries: [`/library/computer/tree/tree-408/${mode}`] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('知识树学习与题库目录', () => {
  it('按真实上级分组，练习沿 practice_for 归组；循环和未分组节点不丢失、不重复', () => {
    const groups = groupTreePoints(points, allPoints, relations);
    expect(groups.map((group) => [group.name, group.points.map((item) => item.id)])).toEqual([
      ['计算机网络', ['tcp', 'tcp-task']], ['知识点', ['empty']],
    ]);
    expect(groupTreePoints([empty], allPoints, [{ id: 'cycle', sourcePointId: empty.id, targetPointId: empty.id, type: 'hierarchy' }])[0].points).toEqual([empty]);
  });

  it('支持全角、多词和标签搜索；空结果明确显示且不会删除原知识点', () => {
    expect(filterTreePoints(points, 'ＴＣＰ　网络')).toEqual([tcp, practice]);
    openDirectory('learn');
    const search = screen.getByRole('searchbox', { name: '搜索本树知识点' });
    fireEvent.change(search, { target: { value: '不存在' } });
    expect(screen.getByText('没有匹配的知识点。')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('0 / 3 个知识点');
    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect((screen.getByRole('button', { name: /待补充知识点/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each(['learn', 'practice'] as const)('%s 仍进入同一个知识点工作区并保留返回来源', async (mode) => {
    const router = openDirectory(mode, tcp.id);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(mode === 'learn' ? '学习' : '题库');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /TCP 可靠传输/ }));
    await screen.findByText('共享工作区');
    expect(router.state.location.pathname).toBe((mode === 'learn' ? ROUTES.pointLearn : ROUTES.pointPractice)('computer', 'tree-408', tcp.id));
    expect(router.state.location.state).toEqual({ origin: { kind: 'tree', libraryId: 'computer', treeId: 'tree-408' } });
  });
});
