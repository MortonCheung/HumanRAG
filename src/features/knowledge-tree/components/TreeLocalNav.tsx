import { useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { NavigationModes } from '../../../components/navigation/NavigationModes';

export function TreeLocalNav() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  if (!libraryId || !treeId) return null;

  return (
    <NavigationModes label="知识树页面" items={[
      { to: ROUTES.treePath(libraryId, treeId), label: '学习' },
      { to: ROUTES.treeVerify(libraryId, treeId), label: '测验' },
    ]} />
  );
}
