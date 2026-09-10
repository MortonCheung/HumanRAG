import { useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { NavigationModes } from '../../../components/navigation/NavigationModes';

export function TreeLocalNav() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  if (!libraryId || !treeId) return null;

  return (
    <NavigationModes label="知识树模式" items={[
      { to: ROUTES.tree(libraryId, treeId), label: '总览' },
      { to: ROUTES.treeLearn(libraryId, treeId), label: '学习' },
      { to: ROUTES.treePractice(libraryId, treeId), label: '题库' },
    ]} />
  );
}
