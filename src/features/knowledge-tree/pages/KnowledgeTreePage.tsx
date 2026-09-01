import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getTree } from '../../../domain/knowledge/selectors';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { KnowledgeTreeShell } from '../components/KnowledgeTreeShell';

export function KnowledgeTreePage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();

  const tree = useMemo(() => {
    if (!treeId) return null;
    migrateV9();
    return getTree(treeId);
  }, [treeId]);

  if (!tree) {
    return (
      <div className="knowledge-tree-page">
        <p>知识树不存在</p>
      </div>
    );
  }

  return <KnowledgeTreeShell treeName={tree.name} ownerType={tree.ownerType} />;
}
