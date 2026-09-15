import type { SceneEdge, SceneModel } from '../../graph/types';

export interface GraphRevealPlan {
  seedNodeIds: ReadonlySet<string>;
  seedEdgeIds: ReadonlySet<string>;

  nodeDelay: ReadonlyMap<string, number>;
  edgeDelay: ReadonlyMap<string, number>;

  duration: number;
}

const RELATION_PRIORITY: Record<SceneEdge['relationType'], number> = {
  hierarchy: 0,
  prerequisite: 1,
  practice_for: 2,
  related: 3,
};

/**
 * 从 seed 出发的 BFS 传播：node → edge → node，排序固定，纯函数。
 * 同一层节点在一个很短的时间窗内依次错开，不是按层一起亮。
 */
export function buildGraphRevealPlan(
  model: SceneModel,
  seedIds: readonly string[],
  allowedNodeIds?: ReadonlySet<string>,
): GraphRevealPlan {
  const allowed =
    allowedNodeIds ?? new Set(model.nodes.map((node) => node.id));

  const seeds = [...new Set(seedIds)]
    .filter((id) => allowed.has(id))
    .sort();

  const adjacency = new Map<
    string,
    Array<{ nodeId: string; edge: SceneEdge }>
  >();

  for (const edge of model.edges) {
    if (!allowed.has(edge.source) || !allowed.has(edge.target)) {
      continue;
    }

    const add = (from: string, nodeId: string) => {
      const list = adjacency.get(from) ?? [];
      list.push({ nodeId, edge });
      adjacency.set(from, list);
    };

    add(edge.source, edge.target);
    add(edge.target, edge.source);
  }

  for (const [id, list] of adjacency) {
    list.sort(
      (a, b) =>
        RELATION_PRIORITY[a.edge.relationType] -
          RELATION_PRIORITY[b.edge.relationType] ||
        a.edge.id.localeCompare(b.edge.id),
    );

    adjacency.set(id, list);
  }

  const depth = new Map<string, number>();
  const parentEdge = new Map<string, string>();
  const queue = [...seeds];

  for (const seed of seeds) {
    depth.set(seed, 0);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const currentDepth = depth.get(current) ?? 0;

    for (const next of adjacency.get(current) ?? []) {
      if (depth.has(next.nodeId)) {
        continue;
      }

      depth.set(next.nodeId, currentDepth + 1);
      parentEdge.set(next.nodeId, next.edge.id);
      queue.push(next.nodeId);
    }
  }

  const byDepth = new Map<number, string[]>();

  for (const [id, value] of depth) {
    const list = byDepth.get(value) ?? [];
    list.push(id);
    byDepth.set(value, list);
  }

  const nodeDelay = new Map<string, number>();
  const edgeDelay = new Map<string, number>();

  /*
   * 唤醒波必须在入场镜头（2.15s）结束前走完整张图，否则最后一批节点会在镜头停下
   * 之后才补亮。手册第 13 章要求 Reveal ≈ 1.4–1.9s；手册第 5.2 章给的 LEVEL_GAP=0.19
   * 在这张 336 节点 / 646 关系的图上会把 408 preset 拖到 2.41s（实测），违反该验收。
   * 取 0.14 后：408/ai = 1.86s，frontend = 1.44s，三个 preset 全部落进区间。
   * LEVEL_SPREAD / EDGE_LEAD 保持手册原值。
   */
  const LEVEL_GAP = 0.14;
  const LEVEL_SPREAD = 0.14;
  const EDGE_LEAD = 0.085;

  for (const [level, ids] of byDepth) {
    ids.sort();

    ids.forEach((id, index) => {
      if (level === 0) {
        nodeDelay.set(id, 0);
        return;
      }

      const spread =
        ids.length <= 1
          ? 0
          : (index / (ids.length - 1)) * LEVEL_SPREAD;

      const nodeAt = level * LEVEL_GAP + spread;

      nodeDelay.set(id, nodeAt);

      const edgeId = parentEdge.get(id);

      if (edgeId) {
        edgeDelay.set(edgeId, Math.max(0, nodeAt - EDGE_LEAD));
      }
    });
  }

  // 非 BFS 主干边：两端都出现以后再补上。
  for (const edge of model.edges) {
    if (!allowed.has(edge.source) || !allowed.has(edge.target)) {
      continue;
    }

    if (edgeDelay.has(edge.id)) {
      continue;
    }

    const sourceAt = nodeDelay.get(edge.source);
    const targetAt = nodeDelay.get(edge.target);

    if (sourceAt === undefined || targetAt === undefined) {
      continue;
    }

    edgeDelay.set(
      edge.id,
      Math.max(sourceAt, targetAt) + 0.025,
    );
  }

  const seedSet = new Set(seeds);

  const seedEdgeIds = new Set(
    model.edges
      .filter(
        (edge) =>
          seedSet.has(edge.source) && seedSet.has(edge.target),
      )
      .map((edge) => edge.id),
  );

  const duration =
    Math.max(0, ...nodeDelay.values(), ...edgeDelay.values()) +
    0.18;

  return {
    seedNodeIds: seedSet,
    seedEdgeIds,
    nodeDelay,
    edgeDelay,
    duration,
  };
}
