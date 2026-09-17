import { Outlet, useParams } from 'react-router-dom';
import { useAppBack } from '../../app/appHistory';
import { ROUTES } from '../../app/routes';
import { migrateV9 } from '../../domain/knowledge/migration';
import { WorkspaceHeader } from '../workspace/WorkspaceHeader';
import { NavigationModes } from '../../components/navigation/NavigationModes';

const SECTIONS = [
  { key: 'structure', label: '节点' },
  { key: 'questions', label: '题目' },
  { key: 'settings', label: '设置' },
];

export function TreeEditorShell() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const domain = migrateV9();
  const tree = [...domain.trees, ...domain.userTrees].find((candidate) => candidate.id === treeId);
  const back = useAppBack({ to: libraryId && treeId ? ROUTES.treePath(libraryId, treeId) : ROUTES.library });

  return (
    <div className="tree-editor-shell">
      <WorkspaceHeader
        title={tree?.name ?? '知识树'}
        backLabel="返回知识树"
        onBack={back}
        modes={libraryId && treeId ? <NavigationModes label="编辑模式" items={SECTIONS.map((section) => ({ to: ROUTES.treeEdit(libraryId, treeId, section.key), label: section.label }))} /> : undefined}
      />
      <div key={treeId} className="tree-editor-shell__content">
        <Outlet />
      </div>
    </div>
  );
}
