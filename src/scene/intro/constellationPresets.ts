import type { SceneModel } from '../../graph/types';
import type { GraphRevealPlan } from '../reveal/graphReveal';

/** Opening 只决定"谁先亮"，不再保存临时坐标。 */
export interface OpeningPreset {
  id: string;
  seedNodeIds: readonly string[];
}

export const OPENING_PRESETS: OpeningPreset[] = [
  {
    id: '408-foundation',
    seedNodeIds: [
      'goal-cs-graduate',
      'direction-408',
      'course-data-structures',
      'knowledge-tree',
      'course-computer-networks',
      'knowledge-tcp',
    ],
  },
  {
    id: 'ai-foundation',
    seedNodeIds: [
      'goal-ai-engineer',
      'direction-ai-engineering',
      'course-machine-learning',
      'knowledge-supervised-learning',
      'course-llm-engineering',
      'knowledge-rag',
    ],
  },
  {
    id: 'frontend-foundation',
    seedNodeIds: [
      'goal-frontend-engineer',
      'direction-frontend-development',
      'course-web-foundation',
      'knowledge-css-layout',
      'course-react-engineering',
      'knowledge-react-state',
    ],
  },
];

const PRESET_KEY = 'humanrag:opening-preset';

/** 同一 session 里按顺序轮换，不存在随机行为。 */
export function pickOpeningPreset(): OpeningPreset {
  let previous = -1;

  try {
    previous = Number(sessionStorage.getItem(PRESET_KEY) ?? '-1');
  } catch {
    // storage unavailable
  }

  const next = Number.isFinite(previous)
    ? (previous + 1) % OPENING_PRESETS.length
    : 0;

  try {
    sessionStorage.setItem(PRESET_KEY, String(next));
  } catch {
    // storage unavailable
  }

  return OPENING_PRESETS[next];
}

/**
 * Opening model 不裁剪节点：坐标原封不动，只改变视觉状态与传播延迟。
 * 永远是 `nodes: model.nodes.map(...)`，绝不 `filter(...)`。
 */
export function buildIntroScene(
  model: SceneModel,
  reveal: GraphRevealPlan,
): SceneModel {
  return {
    ...model,

    nodes: model.nodes.map((node) => {
      const active = reveal.seedNodeIds.has(node.id);

      return {
        ...node,

        displayPosition: node.displayPosition,

        visualState: active ? 'lensActive' : 'dormant',

        relevance: active ? 1 : 0.02,

        labelVisible: false,

        propagationDelay:
          reveal.nodeDelay.get(node.id) ?? reveal.duration,
      };
    }),

    edges: model.edges.map((edge) => {
      const active = reveal.seedEdgeIds.has(edge.id);

      return {
        ...edge,

        visualState: active ? 'lensActive' : 'background',

        propagationDelay:
          reveal.edgeDelay.get(edge.id) ?? reveal.duration,
      };
    }),
  };
}
