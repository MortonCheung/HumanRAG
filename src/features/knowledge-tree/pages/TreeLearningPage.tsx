import { useParams } from 'react-router-dom';
import { getPointsForTree, isPointActionable } from '../../../domain/knowledge/selectors';
import { TreePointDirectory } from '../components/TreePointDirectory';

export function TreeLearningPage() {
  const { treeId } = useParams<{ treeId: string }>();
  const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];

  return <TreePointDirectory key={treeId} mode="learn" points={points} />;
}
