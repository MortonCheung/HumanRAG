# HumanRAG V11 比赛最终收口施工手册

基线：

```text
Repository: MortonCheung/HumanRAG
Branch: feat/v11-humanrag-competition-final
Baseline commit: 963070bb30fbf6abdfb77abcd9a5e6894cd80586
```

---

# 0. 先记住这 8 条。后面所有代码都服从它们

这是本轮施工最重要的部分。

## 0.1 系统知识空间只有一套坐标

**Universe、知识库里的系统知识树、知识树左侧预览，必须使用同一套 canonical coordinates。**

系统树不再重新布局。

```text
knowledgeGraph.basePosition
        ↓
canonicalPosition()
        ↓
Universe
Library system tree
KnowledgeTree workspace
```

只能做：

- 整体平移
- 整体缩放 framing
- 整体缓慢旋转

不能改变节点之间的相对位置。

---

## 0.2 Opening 从第一帧开始就是完整 Universe

正确画面：

```text
完整 Universe 已经存在
↓
大部分节点和连线非常暗
↓
少量 Seed 节点亮着
↓
Camera 聚焦这一小片
↓
点击进入
↓
Seed → 连线 → 下一节点 → 连线 → 下一节点
↓
知识网络向周围醒来
↓
Camera 同时缓慢拉开
↓
完整 Universe
```

任何时候都不要：

```text
生成一棵临时小树
→ 移动节点
→ 再把节点飞回原位置
```

Opening 只控制：

```text
brightness
strength
alpha
reveal progress
camera framing
```

**不控制 topology。**

---

## 0.3 Opening 与目标提取共用一套 Reveal Engine

新增：

```text
src/scene/reveal/graphReveal.ts
```

它只负责回答：

```text
哪个节点先亮？
哪条边先亮？
几点亮？
```

Opening 用它。

HumanRAG 目标提取也用它。

不要再做两套“逐渐点亮”。

---

## 0.4 整个 Spatial Experience 永远只有一个 CameraController

保留：

```text
src/scene/CameraController.tsx
```

删除目标提取自己创建 CameraControls 的逻辑。

Camera ownership：

```text
Opening
Universe
Goal Extraction
Node Focus
```

全部归 `CameraController`。

这样才能彻底解决：

- 大范围翻镜头
- Camera owner 切换
- handoff 突跳
- 控制器状态丢失

---

## 0.5 系统树和用户树明确分开

```text
System Tree
= Universe canonical topology
= 禁止 layoutCustomTree()

User Tree
= 用户自己创建 / HumanRAG 目标生成
= 可以 layoutCustomTree()
```

不要混。

---

## 0.6 `/path` 和 `/verify` 左侧模型是展示品

它：

- 自动慢速旋转
- 可以跟随右侧选择高亮

但是：

- 不能拖
- 不能转
- 不能缩放
- 不能点击节点
- 不能响应滚轮
- 不能响应触控

右侧才是主界面。

桌面比例：

```text
左 38%
右 62%
```

---

## 0.7 UI 文案只说人话

UI 中统一：

```text
学习路径 → 学习
能力验证 → 测验
验证掌握 → 测验
重新验证 → 再测一次
学习证据 → 学习记录
```

不要再用系统设计术语教育用户。

---

## 0.8 两个实验项目正式采用

### Morphicons

只用于两个真正存在 A/B 状态的地方：

```text
全屏 ↔ 退出全屏
折叠 ↔ 展开
```

其他图标继续 Phosphor。

### Archify

不进入 runtime。

它只负责：

```text
Before architecture
After architecture
Opening sequence
Goal extraction sequence
Architecture Delta
```

---

# 1. 开工前建立基线

先执行：

```bash
git status
git branch --show-current
git rev-parse HEAD
npm install
npm run typecheck
npm test
npm run build
```

确认当前本地修改。

**若本地 HEAD 比 `963070b` 更新，以本地为准，不允许 reset 覆盖。**

然后：

```bash
mkdir -p docs/architecture/v11-final
```

保存当前版本的 Architecture 图，作为 Before。

Archify 如果已经安装直接使用。

否则：

```bash
npx skills add tt-a1i/archify -g
```

Before 图要求只画真实运行结构：

```text
AppRouter
SpatialExperienceShell
GlobalNav
NavigationSlots
SpatialStageCanvas
CameraController
NodePointField
BatchedKnowledgeEdges
KnowledgeGraph
Domain Registry
LibraryPreviewUniverseScene
GoalTreeTransitionStore
KnowledgeTreeWorkspace
```

输出：

```text
docs/architecture/v11-final/before-runtime.architecture.json
docs/architecture/v11-final/before-runtime.architecture.html
docs/architecture/v11-final/before-runtime.architecture.svg
docs/architecture/v11-final/before-runtime.architecture.png
```

质量门：

```bash
--quality showcase
```

不要修改代码迎合 Archify。

---

# 2. 第一刀：统一 canonical space

## 2.1 新建

```text
src/graph/canonicalSpace.ts
```

直接写：

```ts
export const SPACE_SCALE = [1.22, 1.08, 1.22] as const;

export type Position3 = readonly [number, number, number];

export function canonicalPosition(
  position: Position3,
): [number, number, number] {
  return [
    position[0] * SPACE_SCALE[0],
    position[1] * SPACE_SCALE[1],
    position[2] * SPACE_SCALE[2],
  ];
}

export function canonicalPositionMap<
  T extends { id: string; position: [number, number, number] }
>(points: readonly T[]) {
  return new Map(
    points.map((point) => [
      point.id,
      canonicalPosition(point.position),
    ]),
  );
}
```

---

## 2.2 修改

```text
src/graph/relevance.ts
```

删除本地：

```ts
const SPACE_SCALE = ...
```

删除：

```ts
function getStablePosition(...)
```

改成：

```ts
import { canonicalPosition } from './canonicalSpace';
```

原来：

```ts
const displayPosition = getStablePosition(node);
```

改为：

```ts
const displayPosition = canonicalPosition(node.basePosition);
```

到这里 Universe 行为不能发生任何视觉变化。

---

# 3. 系统知识树和 Universe 使用完全相同的结构

修改：

```text
src/features/library/scene/PreviewTreeGroup.tsx
```

## 3.1 重写 `buildPreviewTreeGraph`

当前不能再无条件：

```ts
nodes.map(node => ({
  ...node,
  position: undefined,
}))

layoutCustomTree(...)
```

改成下面这种明确分支。

```ts
import { canonicalPositionMap } from '../../../graph/canonicalSpace';

export function buildPreviewTreeGraph(
  tree: KnowledgeTree,
  points: KnowledgePoint[],
  relations: KnowledgeRelation[],
): PreviewTreeGraph {
  const pointIds = new Set(points.map((point) => point.id));

  const nodes = toCustomNodes(points);

  const edges = toCustomEdges(relations, pointIds);

  const positions =
    tree.ownerType === 'system'
      ? canonicalPositionMap(points)
      : layoutCustomTree(
          nodes.map((node) => ({
            ...node,
            position: undefined,
          })),
          edges,
        );

  return {
    tree,
    nodes,
    edges,
    positions,
    offset: customTreeFrame(
      positions,
      1,
      1,
      true,
    ).offset,
  };
}
```

这里非常重要：

```text
System tree:
point.position
→ canonicalPosition()
→ renderer

User tree:
pointIds
→ layoutCustomTree()
→ renderer
```

系统树只允许 `offset` 把整个模型放到 Preview anchor。

节点相对坐标禁止变。

---

## 3.2 `tree-408` 验收

写测试：

```text
src/features/library/scene/systemTreeGeometry.test.ts
```

核心：

```ts
import { describe, expect, it } from 'vitest';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { canonicalPosition } from '../../../graph/canonicalSpace';
import { buildPreviewTreeGraph } from './PreviewTreeGroup';

describe('system tree canonical geometry', () => {
  it('tree-408 与 Universe 使用同一套节点坐标', () => {
    const domain = migrateV9();

    const tree = domain.trees.find(
      (item) => item.id === 'tree-408',
    );

    expect(tree).toBeTruthy();

    const points = domain.points.filter((point) =>
      tree!.pointIds.includes(point.id),
    );

    const graph = buildPreviewTreeGraph(
      tree!,
      points,
      domain.relations,
    );

    for (const point of points) {
      expect(graph.positions.get(point.id)).toEqual(
        canonicalPosition(point.position),
      );
    }
  });
});
```

再锁顶层节点：

```ts
expect(tree!.pointIds).toContain('goal-cs-graduate');
expect(tree!.pointIds).toContain('direction-408');
```

这两个不允许再消失。

---

# 4. 重写 Opening Preset：Preset 只决定“谁亮”

把：

```text
src/scene/intro/constellationPresets.ts
```

改成真正的 Opening Seed 配置。

不再保存临时坐标。

直接定义真实节点：

```ts
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
```

---

## 4.1 不用 Math.random

同一 session 里按顺序轮换。

```ts
const PRESET_KEY = 'humanrag:opening-preset';

export function pickOpeningPreset(): OpeningPreset {
  let previous = -1;

  try {
    previous = Number(
      sessionStorage.getItem(PRESET_KEY) ?? '-1',
    );
  } catch {
    // storage unavailable
  }

  const next =
    Number.isFinite(previous)
      ? (previous + 1) % OPENING_PRESETS.length
      : 0;

  try {
    sessionStorage.setItem(
      PRESET_KEY,
      String(next),
    );
  } catch {
    // storage unavailable
  }

  return OPENING_PRESETS[next];
}
```

测试时可直接指定 preset。

不存在随机行为。

---

# 5. 新增真正的 Graph Reveal Engine

新建：

```text
src/scene/reveal/graphReveal.ts
```

这是 Opening 和 HumanRAG 提取共用的核心。

---

## 5.1 数据结构

```ts
import type {
  SceneEdge,
  SceneModel,
} from '../../graph/types';

export interface GraphRevealPlan {
  seedNodeIds: ReadonlySet<string>;
  seedEdgeIds: ReadonlySet<string>;

  nodeDelay: ReadonlyMap<string, number>;
  edgeDelay: ReadonlyMap<string, number>;

  duration: number;
}

const RELATION_PRIORITY: Record<
  SceneEdge['relationType'],
  number
> = {
  hierarchy: 0,
  prerequisite: 1,
  practice_for: 2,
  related: 3,
};
```

---

## 5.2 传播算法

目标不是“按层一起亮”。

需要：

```text
node
→ edge
→ node
```

而且排序固定。

实现：

```ts
export function buildGraphRevealPlan(
  model: SceneModel,
  seedIds: readonly string[],
  allowedNodeIds?: ReadonlySet<string>,
): GraphRevealPlan {
  const allowed =
    allowedNodeIds ??
    new Set(model.nodes.map((node) => node.id));

  const seeds = [...new Set(seedIds)]
    .filter((id) => allowed.has(id))
    .sort();

  const adjacency = new Map<
    string,
    Array<{
      nodeId: string;
      edge: SceneEdge;
    }>
  >();

  for (const edge of model.edges) {
    if (
      !allowed.has(edge.source) ||
      !allowed.has(edge.target)
    ) {
      continue;
    }

    const add = (
      from: string,
      nodeId: string,
    ) => {
      const list = adjacency.get(from) ?? [];

      list.push({
        nodeId,
        edge,
      });

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

  for (
    let cursor = 0;
    cursor < queue.length;
    cursor += 1
  ) {
    const current = queue[cursor];

    const currentDepth =
      depth.get(current) ?? 0;

    for (const next of adjacency.get(current) ?? []) {
      if (depth.has(next.nodeId)) {
        continue;
      }

      depth.set(
        next.nodeId,
        currentDepth + 1,
      );

      parentEdge.set(
        next.nodeId,
        next.edge.id,
      );

      queue.push(next.nodeId);
    }
  }

  /*
   * 每个 depth 是一层传播。
   *
   * 同一层不是一起亮，而是在一个很短的时间窗内
   * 依次错开。
   */
  const byDepth = new Map<
    number,
    string[]
  >();

  for (const [id, value] of depth) {
    const list = byDepth.get(value) ?? [];

    list.push(id);

    byDepth.set(value, list);
  }

  const nodeDelay = new Map<string, number>();

  const edgeDelay = new Map<string, number>();

  const LEVEL_GAP = 0.19;
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
          : (index / (ids.length - 1)) *
            LEVEL_SPREAD;

      const nodeAt =
        level * LEVEL_GAP + spread;

      nodeDelay.set(id, nodeAt);

      const edgeId =
        parentEdge.get(id);

      if (edgeId) {
        edgeDelay.set(
          edgeId,
          Math.max(
            0,
            nodeAt - EDGE_LEAD,
          ),
        );
      }
    });
  }

  /*
   * 非 BFS 主干边：
   * 两端都出现以后再补上。
   */
  for (const edge of model.edges) {
    if (
      !allowed.has(edge.source) ||
      !allowed.has(edge.target)
    ) {
      continue;
    }

    if (edgeDelay.has(edge.id)) {
      continue;
    }

    const sourceAt =
      nodeDelay.get(edge.source);

    const targetAt =
      nodeDelay.get(edge.target);

    if (
      sourceAt === undefined ||
      targetAt === undefined
    ) {
      continue;
    }

    edgeDelay.set(
      edge.id,
      Math.max(
        sourceAt,
        targetAt,
      ) + 0.025,
    );
  }

  const seedSet =
    new Set(seeds);

  const seedEdgeIds =
    new Set(
      model.edges
        .filter(
          (edge) =>
            seedSet.has(edge.source) &&
            seedSet.has(edge.target),
        )
        .map((edge) => edge.id),
    );

  const duration = Math.max(
    0,
    ...nodeDelay.values(),
    ...edgeDelay.values(),
  ) + 0.18;

  return {
    seedNodeIds: seedSet,
    seedEdgeIds,
    nodeDelay,
    edgeDelay,
    duration,
  };
}
```

这套算法必须是纯函数。

同样输入永远得到同样结果。

---

# 6. Opening model 不再裁剪节点

仍然放在：

```text
src/scene/intro/constellationPresets.ts
```

增加：

```ts
import type {
  SceneModel,
} from '../../graph/types';

import type {
  GraphRevealPlan,
} from '../reveal/graphReveal';

export function buildIntroScene(
  model: SceneModel,
  reveal: GraphRevealPlan,
): SceneModel {
  return {
    ...model,

    nodes: model.nodes.map((node) => {
      const active =
        reveal.seedNodeIds.has(node.id);

      return {
        ...node,

        /*
         * 坐标原封不动。
         */
        displayPosition:
          node.displayPosition,

        visualState:
          active
            ? 'lensActive'
            : 'dormant',

        relevance:
          active
            ? 1
            : 0.02,

        labelVisible: false,

        propagationDelay:
          reveal.nodeDelay.get(node.id) ??
          reveal.duration,
      };
    }),

    edges: model.edges.map((edge) => {
      const active =
        reveal.seedEdgeIds.has(edge.id);

      return {
        ...edge,

        visualState:
          active
            ? 'lensActive'
            : 'background',

        propagationDelay:
          reveal.edgeDelay.get(edge.id) ??
          reveal.duration,
      };
    }),
  };
}
```

重点：

```ts
nodes: model.nodes.map(...)
```

绝不能再：

```ts
model.nodes.filter(...)
```

---

# 7. `SpatialStageCanvas` 接入 Opening Plan

修改：

```text
src/features/spatial/SpatialStageCanvas.tsx
```

删除：

```ts
Math.random()
openingOrigins
buildConstellationScene(...)
withAwakeningDelays(...)
```

加入：

```ts
const preset = useRef(
  pickOpeningPreset(),
).current;

const openingReveal =
  useMemo(
    () =>
      buildGraphRevealPlan(
        model,
        preset.seedNodeIds,
      ),
    [model, preset.seedNodeIds],
  );

const introModel =
  useMemo(
    () =>
      buildIntroScene(
        model,
        openingReveal,
      ),
    [model, openingReveal],
  );

const awakeningModel =
  useMemo(
    () => ({
      ...model,

      nodes: model.nodes.map(
        (node) => ({
          ...node,

          propagationDelay:
            openingReveal.nodeDelay.get(
              node.id,
            ) ??
            openingReveal.duration,
        }),
      ),

      edges: model.edges.map(
        (edge) => ({
          ...edge,

          propagationDelay:
            openingReveal.edgeDelay.get(
              edge.id,
            ) ??
            openingReveal.duration,
        }),
      ),
    }),
    [model, openingReveal],
  );
```

然后：

```ts
const visibleModel =
  experiencePhase === 'intro'
    ? introModel
    : experiencePhase === 'awakening' ||
        experiencePhase === 'settling'
      ? awakeningModel
      : model;
```

完整节点数始终一致。

---

# 8. NodePointField：暗着，不是不存在

修改：

```text
src/scene/NodePointField.tsx
```

彻底删除：

```ts
openingOrigins
```

位置初始化统一：

```ts
positions.setXYZ(
  index,
  ...node.displayPosition,
);

positionTargets.current[index] =
  node.displayPosition;

canonicalPositions.current[index] =
  node.displayPosition;
```

Opening 不再改 position。

---

## 8.1 Intro 初始亮度

加入：

```ts
const INTRO_DIM_STRENGTH = 0.035;
const INTRO_DIM_SIZE = 0.72;
```

初始化 appearance 时：

```ts
const isOpening =
  experiencePhase === 'intro';

const isSeed =
  isOpening &&
  node.propagationDelay === 0;

const visibility =
  isSeed
    ? 1
    : isOpening
      ? INTRO_DIM_STRENGTH
      : 1;

sizes.setX(
  index,
  appearance.size *
    (isSeed
      ? 1
      : isOpening
        ? INTRO_DIM_SIZE
        : 1),
);

strengths.setX(
  index,
  appearance.strength *
    visibility,
);
```

删掉当前这种逻辑：

```ts
if (experiencePhase === 'intro')
  appearance.strength =
    Math.max(0.9, appearance.strength);
```

因为它会把所有 Intro 节点强行变亮。

---

## 8.2 Awakening

`useFrame` 中：

```ts
const opening =
  experiencePhase === 'awakening' ||
  experiencePhase === 'settling';

const delay =
  model.nodes[index]
    ?.propagationDelay ?? 0;

const reveal =
  opening
    ? THREE.MathUtils.smoothstep(
        revealTime.current,
        delay,
        delay + 0.12,
      )
    : 1;

const openingFloor =
  delay === 0
    ? 1
    : INTRO_DIM_STRENGTH;

const visibility =
  opening
    ? THREE.MathUtils.lerp(
        openingFloor,
        1,
        reveal,
      )
    : 1;

const sizeFloor =
  delay === 0
    ? 1
    : INTRO_DIM_SIZE;

const desiredSize =
  target.size *
  (
    opening
      ? THREE.MathUtils.lerp(
          sizeFloor,
          1,
          reveal,
        )
      : 1
  );

const desiredStrength =
  target.strength *
  visibility *
  relevanceStrength;
```

视觉就是：

```text
暗节点
→ 与它连接的边经过
→ 节点变亮
```

不是：

```text
节点突然生成
```

---

# 9. BatchedKnowledgeEdges：让线先于节点亮

修改：

```text
src/scene/BatchedKnowledgeEdges.tsx
```

现有：

```glsl
float reveal =
  mix(1.0, grown, uOpening);
```

改：

```glsl
uniform float uRevealFloor;
```

然后：

```glsl
float openingReveal =
  mix(
    uRevealFloor,
    1.0,
    grown
  );

float reveal =
  mix(
    1.0,
    openingReveal,
    uOpening
  );
```

uniform：

```ts
const uniforms = useMemo(
  () => ({
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uRevealTime: { value: 10 },
    uOpening: { value: 0 },
    uRevealFloor: { value: 0.08 },
    uDetach: { value: -1 },
    uUniverseExit: { value: 1 },
  }),
  [],
);
```

这样未点亮的边仍有非常弱的轮廓。

不是彻底消失。

---

# 10. Camera：Opening 聚焦 Seed，而不是搬 Seed

修改：

```text
src/scene/CameraController.tsx
```

新增 prop：

```ts
openingSeedIds:
  ReadonlySet<string>;
```

找到：

```ts
const all =
  current.current.model.nodes;
```

增加：

```ts
const openingNodes =
  all.filter((node) =>
    openingSeedIds.has(node.id),
  );

const introNodes =
  openingNodes.length
    ? openingNodes
    : all;
```

Intro sphere：

```ts
const introSphere =
  new THREE.Box3()
    .setFromPoints(
      introNodes.map(
        (node) =>
          new THREE.Vector3(
            ...node.displayPosition,
          ),
      ),
    )
    .getBoundingSphere(
      new THREE.Sphere(),
    );
```

Intro Camera：

```ts
if (experiencePhase === 'intro') {
  const target =
    introSphere.center.clone();

  const direction =
    new THREE.Vector3(
      0.68,
      0.38,
      0.76,
    ).normalize();

  const distance =
    THREE.MathUtils.clamp(
      introSphere.radius * 3.1,
      13,
      46,
    );

  void instance.setFocalOffset(
    0,
    0,
    0,
    false,
  );

  apply(
    target
      .clone()
      .addScaledVector(
        direction,
        distance,
      ),
    target,
  );

  return;
}
```

Camera 去找 Seed。

Seed 不找 Camera。

---

# 11. Opening → Universe 不允许改变观察方向

重写：

```text
src/scene/entryShot.ts
```

当前 Quaternion 旋转不再需要。

直接：

```ts
import gsap from 'gsap';
import * as THREE from 'three';

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export function createEntryShot(
  from: CameraPose,
  toTarget: THREE.Vector3,
  toDistance: number,
  apply: (pose: CameraPose) => void,
  complete: () => void,
) {
  const direction =
    from.position
      .clone()
      .sub(from.target)
      .normalize();

  const fromDistance =
    from.position.distanceTo(
      from.target,
    );

  const shot = {
    progress: 0,
  };

  const pose = {
    position:
      new THREE.Vector3(),

    target:
      new THREE.Vector3(),
  };

  return gsap
    .timeline({
      onComplete: complete,
    })
    .to(shot, {
      progress: 1,

      duration: 2.15,

      ease:
        'power3.out',

      onUpdate: () => {
        pose.target.lerpVectors(
          from.target,
          toTarget,
          shot.progress,
        );

        const distance =
          Math.exp(
            THREE.MathUtils.lerp(
              Math.log(
                Math.max(
                  0.01,
                  fromDistance,
                ),
              ),
              Math.log(
                Math.max(
                  0.01,
                  toDistance,
                ),
              ),
              shot.progress,
            ),
          );

        pose.position
          .copy(direction)
          .multiplyScalar(
            distance,
          )
          .add(
            pose.target,
          );

        apply(pose);
      },
    });
}
```

这段的核心就是：

```text
direction 固定
target 移动
distance 变化
```

因此不会绕场转半圈。

---

# 12. CameraController 计算最终 Universe framing

在完整 Universe sphere 已有逻辑基础上：

```ts
const fullSphere =
  new THREE.Box3()
    .setFromPoints(
      all.map(
        (node) =>
          new THREE.Vector3(
            ...node.displayPosition,
          ),
      ),
    )
    .getBoundingSphere(
      new THREE.Sphere(),
    );

const fullDistance =
  THREE.MathUtils.clamp(
    fullSphere.radius * 2.0,
    42,
    165,
  );
```

Awakening：

```ts
if (
  experiencePhase ===
  'awakening'
) {
  const currentPosition =
    instance.getPosition(
      new THREE.Vector3(),
      false,
    );

  const currentTarget =
    instance.getTarget(
      new THREE.Vector3(),
      false,
    );

  timeline.current =
    createEntryShot(
      {
        position:
          currentPosition,

        target:
          currentTarget,
      },

      fullSphere.center,

      fullDistance,

      ({ position, target }) =>
        apply(
          position,
          target,
        ),

      () =>
        current.current
          .onEntryComplete(),
    );

  return;
}
```

---

# 13. Opening phase 时间跟 Camera 对齐

修改：

```text
src/features/spatial/SpatialExperienceShell.tsx
```

不要再让：

```text
reveal 还没结束
Camera 就宣布 universe
```

Opening reveal 的最长时间应小于 Camera 结束时间。

目标：

```text
Reveal ≈ 1.4–1.9s
Camera = 2.15s
```

`settling` 可以仍在中间出现。

例如：

```ts
useEffect(() => {
  if (
    phase !== 'awakening'
  ) {
    return;
  }

  const timer =
    window.setTimeout(
      () =>
        setPhase('settling'),
      1050,
    );

  return () =>
    window.clearTimeout(timer);
}, [phase]);
```

Camera `onComplete` 才进入：

```text
universe
```

这条保留。

---

# 14. HumanRAG 目标提取：给 GoalTreeDraft 增加真正的 Seed

修改：

```text
src/ai/knowledge-tree/GoalTreeComposer.ts
```

接口：

```ts
export interface GoalTreeDraft {
  name: string;
  description: string;

  pointIds: string[];

  /*
   * 自然语言最直接命中的起点。
   * Reveal 从这里出发。
   */
  seedPointIds: string[];

  reasons:
    Record<string, string[]>;
}
```

`composeGoalTree()` 已经有：

```ts
const seedIds = ...
```

所以最终直接返回：

```ts
return {
  name:
    createTreeName(
      selectedPoints,
      query,
    ),

  description:
    `根据“${query.original}”整理，共 ${pointIds.length} 个知识点。`,

  pointIds,

  seedPointIds:
    seedIds.filter(
      (id) =>
        selected.has(id),
    ),

  reasons,
};
```

不要再重新猜起点。

Composer 自己已经知道自然语言最直接命中了谁。

---

# 15. 目标提取也生成 Reveal Plan

在：

```text
SpatialStageCanvas.tsx
```

增加：

```ts
const extractionReveal =
  useMemo(() => {
    if (!extractionDraft) {
      return null;
    }

    return buildGraphRevealPlan(
      model,

      extractionDraft
        .seedPointIds,

      new Set(
        extractionDraft
          .pointIds,
      ),
    );
  }, [
    model,
    extractionDraft,
  ]);
```

这就是目标提取“找到相关节点”的动画来源。

---

# 16. 目标提取的正确时间线

保留状态机，但时间改成更干脆。

修改：

```text
goalTreeTransitionStore.ts
```

建议：

```ts
export function extractionPhaseDurationMs(
  phase: ExtractionPhase,
  motionAllowed: boolean,
): number {
  if (!motionAllowed) {
    return phase === 'forming'
      ? 80
      : 45;
  }

  return {
    highlighting: 820,

    detaching: 360,

    receding: 320,

    forming: 620,

    connecting: 420,

    idle: 0,

    ready: 0,

    handoff: 0,
  }[phase];
}
```

整体：

```text
0.00s
输入完成

0.00–0.82
相关知识沿关系逐渐点亮

0.82–1.18
旧关系从中间断开

1.18–1.50
其他节点后退变暗

1.50–2.12
选中节点整理为新树

2.12–2.54
新边逐条生成

2.54
handoff
```

总时长约 2.5 秒。

---

# 17. 删除目标提取第二套 CameraControls

现在：

```text
GoalTreeExtraction.tsx
```

里的：

```ts
GoalTreeExtractionCamera
```

整段删掉。

包括：

```ts
<CameraControls ... />
```

不要留下。

`GoalTreeExtraction` 只负责：

```text
节点
边
label
```

Camera 不属于它。

---

# 18. 增加“沿当前观察方向重新 framing”的 Camera helper

修改：

```text
src/scene/cameraFraming.ts
```

新增：

```ts
export function frameSphereAlongView(
  camera:
    THREE.PerspectiveCamera,

  currentPosition:
    THREE.Vector3,

  currentTarget:
    THREE.Vector3,

  sphere:
    THREE.Sphere,

  padding = 1.28,
) {
  const direction =
    currentPosition
      .clone()
      .sub(currentTarget)
      .normalize();

  const verticalFov =
    THREE.MathUtils.degToRad(
      camera.fov,
    );

  const horizontalFov =
    2 *
    Math.atan(
      Math.tan(
        verticalFov / 2,
      ) *
        Math.max(
          0.1,
          camera.aspect,
        ),
    );

  const limitingFov =
    Math.min(
      verticalFov,
      horizontalFov,
    );

  const distance =
    THREE.MathUtils.clamp(
      sphere.radius /
        Math.sin(
          limitingFov / 2,
        ) *
        padding,

      8,

      320,
    );

  const target =
    sphere.center.clone();

  const position =
    target
      .clone()
      .addScaledVector(
        direction,
        distance,
      );

  return {
    position,
    target,
  };
}
```

这一段以后专门解决：

```text
需要重新构图
但不能转向
```

---

# 19. Goal Extraction Camera 交给 CameraController

给 `CameraController` 增加：

```ts
extractionFrame?: {
  active: boolean;

  positions:
    ReadonlyMap<
      string,
      [
        number,
        number,
        number,
      ]
    >;
};
```

在 normal intent 逻辑前面：

```ts
if (
  extractionFrame?.active
) {
  const points =
    [
      ...extractionFrame
        .positions
        .values(),
    ].map(
      (position) =>
        new THREE.Vector3(
          ...position,
        ),
    );

  const sphere =
    new THREE.Box3()
      .setFromPoints(points)
      .getBoundingSphere(
        new THREE.Sphere(),
      );

  const currentPosition =
    instance.getPosition(
      new THREE.Vector3(),
      false,
    );

  const currentTarget =
    instance.getTarget(
      new THREE.Vector3(),
      false,
    );

  const frame =
    frameSphereAlongView(
      camera as THREE.PerspectiveCamera,

      currentPosition,

      currentTarget,

      sphere,

      1.3,
    );

  apply(
    frame.position,
    frame.target,
    true,
  );

  return;
}
```

CameraControls：

```tsx
<CameraControls
  ref={controls}

  enabled={
    experiencePhase ===
      'universe' &&
    !extractionFrame?.active
  }

  ...
/>
```

提取时用户也不能抢 Camera。

---

# 20. Goal Extraction highlighting 使用同一 Reveal Engine

`NodeExtractionState` 增加：

```ts
reveal?: GraphRevealPlan;
```

在 `highlighting` 时：

```ts
const revealDelay =
  extraction?.reveal
    ?.nodeDelay
    .get(
      model.nodes[index]?.id,
    ) ?? 0;

const elapsed =
  extractionPhase
    ? (
        Date.now() -
        extraction.phaseStartedAt
      ) /
      1000
    : 0;

const localReveal =
  extractionPhase ===
    'highlighting'
    ? THREE.MathUtils
        .smoothstep(
          elapsed,
          revealDelay,
          revealDelay +
            0.11,
        )
    : 1;
```

然后：

```ts
const highlighted =
  extractionPhase ===
    'highlighting'
    ? localReveal
    : extractionPhase ===
        'idle'
      ? 0
      : 1;
```

结果：

```text
不是所有目标节点同时亮
```

而是：

```text
自然语言命中点
→ 关系线
→ 相关节点
→ 关系线
→ 下一个节点
```

---

# 21. Goal Extraction 原 Universe 不要消失太早

当前 `BatchedKnowledgeEdges` 在 extraction 后期可以继续做：

```text
中间断开
→ alpha 降低
```

这套效果保留。

但：

```text
highlighting
```

阶段必须完整保留 Universe。

也就是：

```ts
highlighting:
uUniverseExit = 1
```

然后：

```text
detaching
```

再开始退出。

这个顺序不能反。

---

# 22. User Tree 形成后再使用 layoutCustomTree

`buildGoalTreeExtractionLayout()` 可以继续：

```ts
layoutCustomTree(...)
```

因为这是一棵新形成的用户树。

不要改成 canonical layout。

这是 System / User Tree 的明确边界。

---

# 23. 目标生成后的 Library Preview 必须和提取最后一帧一致

因为二者现在都使用：

```text
layoutCustomTree()
customTreeFrame()
treeRotationPhase()
```

所以继续保证：

```text
GoalTreeExtraction
→ Library user tree preview
```

共用：

```text
buildGoalTreeExtractionLayout()
buildPreviewTreeGraph()
```

的同一套布局规则。

如果两边还有坐标差异：

**抽公共 helper。**

不要各自调参数。

---

# 24. 所有小模型树持续慢速旋转

修改：

```text
LibraryPreviewUniverseScene.tsx
```

当前不能只在 Library 模式旋转。

改成：

```tsx
<PreviewTreeGroup
  ...
  autoRotate
/>
```

也就是说：

```text
Library 小模型：旋转
Path 左侧模型：旋转
Verify 左侧模型：旋转
```

---

## 24.1 Render Clock

当前：

```tsx
{mode === 'library' &&
 motionAllowed &&
 <PreviewAnimationClock />}
```

改：

```tsx
{motionAllowed &&
 <PreviewAnimationClock />}
```

保持 24fps 足够。

不需要 60fps。

---

# 25. Path / Verify 左侧彻底 readonly

给：

```text
LibraryPreviewUniverseScene
```

增加：

```ts
readOnly:
  boolean;
```

PreviewTreeGroup：

```tsx
interactive={
  mode === 'tree' &&
  !readOnly &&
  graph.tree.id ===
    selectedTreeId
}
```

LibraryPreviewCamera：

```tsx
<CameraControls
  ...

  enabled={
    mode === 'tree' &&
    !readOnly
  }
/>
```

---

# 26. `SpatialExperienceShell` 决定 readOnly

直接由 URL 判断。

```ts
const treeWorkspaceReadOnly =
  Boolean(
    spatialTreeMatch &&
    (
      location.pathname
        .endsWith('/path') ||
      location.pathname
        .endsWith('/verify')
    ),
  );
```

传给：

```tsx
<SpatialStageCanvas
  ...
  treeReadOnly={
    treeWorkspaceReadOnly
  }
/>
```

再传：

```text
SpatialSceneRouter
↓
LibraryPreviewUniverseScene
```

不要让 Library Scene 自己猜 URL。

---

# 27. Path / Verify 左右改成 38 : 62

修改：

```text
knowledge-tree-workspace.css
```

把：

```css
grid-template-columns:
  minmax(0, 1.62fr)
  minmax(340px, .72fr);
```

替换为：

```css
.knowledge-tree-workspace__body {
  height:
    calc(
      100dvh -
      var(--it-nav-height)
    );

  display: grid;

  grid-template-columns:
    minmax(320px, 38%)
    minmax(0, 1fr);
}
```

1024 附近：

```css
@media
  (max-width: 1100px) {

  .knowledge-tree-workspace__body {
    grid-template-columns:
      minmax(300px, 36%)
      minmax(0, 1fr);
  }
}
```

移动端保持上下布局。

---

# 28. 右侧信息密度收紧

原：

```css
.tree-panel,
.tree-point-detail {
  padding:
    clamp(34px, 5vh, 58px)
    clamp(24px, 3.2vw, 46px)
    56px;
}
```

右侧现在更宽后可以稍微克制：

```css
.tree-panel,
.tree-point-detail {
  min-height: 100%;

  padding:
    clamp(28px, 4vh, 44px)
    clamp(24px, 3vw, 42px)
    48px;
}
```

Heading：

```css
.tree-panel__header h1,
.tree-point-detail h1 {
  font-size:
    clamp(
      25px,
      2.25vw,
      36px
    );
}
```

不要再做 43px 大标题。

这是工具工作区，不是 Hero。

---

# 29. 导航栏重新做成 viewport anchors

当前 Grid 不再作为定位基础。

修改：

```text
context-navigation.css
```

`.context-nav`：

```css
.context-nav {
  position: fixed;

  inset:
    0
    0
    auto;

  z-index: 30;

  height:
    var(
      --it-nav-height,
      64px
    );

  border-bottom:
    1px solid
    var(--it-rule);

  background:
    rgb(
      11 14 20 / .92
    );

  backdrop-filter:
    blur(20px);

  -webkit-backdrop-filter:
    blur(20px);

  color:
    var(--it-text);

  font-size:
    14px;

  view-transition-name:
    context-nav;
}
```

---

## 29.1 左边钉死

```css
.context-nav__leading {
  position: absolute;

  top: 50%;

  left: 32px;

  display: flex;

  align-items: center;

  gap: 8px;

  max-width:
    calc(
      50vw -
      170px
    );

  transform:
    translateY(-50%);
}
```

---

## 29.2 中间钉死

```css
.context-nav__center {
  position: absolute;

  top: 50%;

  left: 50%;

  width:
    min(
      32vw,
      420px
    );

  min-width: 0;

  text-align: center;

  transform:
    translate(
      -50%,
      -50%
    );

  pointer-events: none;
}
```

title slot：

```css
.context-nav__title-slot {
  display: flex;

  align-items: center;

  justify-content: center;

  gap: 12px;

  min-width: 0;

  pointer-events: auto;
}
```

---

## 29.3 右边钉死

```css
.context-nav__trailing {
  position: absolute;

  top: 50%;

  right: 32px;

  display: flex;

  align-items: center;

  gap: 6px;

  transform:
    translateY(-50%);
}
```

primary：

```css
.context-nav__primary-slot {
  display: flex;

  align-items: center;

  flex-shrink: 0;

  min-width: 44px;

  min-height: 44px;
}
```

---

# 30. 次要操作统一进 `...`

这是解决导航挤压最关键的一刀。

现在 desktop 也显示：

```text
...
```

secondary actions 不再直接铺开。

修改 `GlobalNav.tsx`。

原：

```tsx
hidden={
  !wide &&
  !actionsOpen
}
```

改：

```tsx
hidden={!actionsOpen}
```

也就是说：

```tsx
<div
  ref={hosts.actions}

  id="context-nav-actions"

  className=
    "context-nav__actions-slot"

  aria-label=
    "当前页面操作"

  hidden={!actionsOpen}
/>
```

---

## 30.1 `...` 桌面也显示

删除：

```css
.context-nav__more {
  display: none;
}
```

改：

```css
.context-nav__more {
  display: inline-flex;
}
```

当 actions slot 为空时已经有：

```css
.context-nav__overflow:
  has(
    .context-nav__actions-slot:
    empty
  ) {
  visibility: hidden;
}
```

保留。

---

## 30.2 actions dropdown 全尺寸统一

不要只在：

```css
@media (max-width: 767px)
```

定义 dropdown。

提到全局：

```css
.context-nav__actions-slot {
  position: absolute;

  top:
    calc(
      100% + 8px
    );

  right: 0;

  min-width: 200px;

  max-width:
    min(
      320px,
      calc(
        100vw -
        32px
      )
    );

  display: flex;

  flex-direction: column;

  align-items: stretch;

  gap: 4px;

  padding: 8px;

  border:
    1px solid
    var(
      --it-rule-strong
    );

  border-radius:
    12px;

  background:
    var(
      --it-surface,
      #101518
    );

  box-shadow:
    0 14px 36px
    rgb(0 0 0 / .24);
}

.context-nav__actions-slot
  > :is(button, a) {
  justify-content:
    flex-start;

  width: 100%;
}
```

---

# 31. 移动端 anchors

```css
@media
  (max-width: 767px) {

  .context-nav__leading {
    left: 16px;

    max-width:
      calc(
        50vw -
        70px
      );
  }

  .context-nav__trailing {
    right: 16px;
  }

  .context-nav__center {
    width:
      min(
        34vw,
        210px
      );
  }
}
```

小于 390：

```css
@media
  (max-width: 390px) {

  .context-nav__leading {
    left: 12px;
  }

  .context-nav__trailing {
    right: 12px;
  }

  .context-nav__center {
    width: 30vw;
  }
}
```

主按钮绝对不能 `display:none`。

宁可标题截断。

---

# 32. 标题做轻微 fade + blur + accent → white

修改：

```text
WorkspaceHeader.tsx
```

导入：

```ts
import {
  motion,
  useReducedMotion,
} from 'motion/react';
```

新增：

```tsx
function AnimatedNavigationTitle({
  title,
}: {
  title: string;
}) {
  const reducedMotion =
    Boolean(
      useReducedMotion(),
    );

  return (
    <motion.strong
      key={title}

      className=
        "context-nav__title"

      title={title}

      initial={
        reducedMotion
          ? false
          : {
              opacity: 0,

              filter:
                'blur(4px)',

              color:
                'var(--it-accent)',
            }
      }

      animate={{
        opacity: 1,

        filter:
          'blur(0px)',

        color:
          'var(--it-text)',
      }}

      transition={{
        duration:
          reducedMotion
            ? 0
            : 0.26,

        ease: [
          0.16,
          1,
          0.3,
          1,
        ],
      }}
    >
      {title}
    </motion.strong>
  );
}
```

然后：

```tsx
<NavigationSlot name="title">
  <AnimatedNavigationTitle
    title={
      title ??
      breadcrumbs.at(-1) ??
      ''
    }
  />

  {modes}
</NavigationSlot>
```

不移动导航栏。

不移动 Logo。

不移动按钮。

只有标题自己淡入。

---

# 33. Morphicons 正式接入

执行：

```bash
npm install morphicons lucide
```

Phosphor 保留。

Morphicons 只接两个地方。

---

# 34. FullscreenButton 用 Morphicons

修改：

```text
src/components/navigation/FullscreenButton.tsx
```

删除：

```ts
CornersIn
CornersOut
```

加入：

```ts
import {
  MorphIcon,
} from 'morphicons/react';

import {
  Maximize2,
  Minimize2,
} from 'lucide';
```

按钮图标：

```tsx
<MorphIcon
  icon={
    active
      ? Minimize2
      : Maximize2
  }

  size={18}

  strokeWidth={1.8}

  spring="snappy"

  reducedMotion="user"
/>
```

其他逻辑全部不动。

---

# 35. PointGroup 展开/折叠用 Morphicons

修改：

```text
src/features/knowledge-tree/components/PointGroup.tsx
```

删除：

```ts
CaretDown
```

加入：

```ts
import {
  MorphIcon,
} from 'morphicons/react';

import {
  ChevronDown,
  ChevronRight,
} from 'lucide';
```

按钮末尾：

```tsx
<MorphIcon
  icon={
    open
      ? ChevronDown
      : ChevronRight
  }

  size={15}

  strokeWidth={1.8}

  spring="snappy"

  reducedMotion="user"
/>
```

CSS 删除旋转：

```css
transform:
  rotate(-90deg);
```

以及：

```css
transform:
  rotate(0);
```

只保留颜色 transition。

这就是 Morphicons 的全部接入范围。

不要扩大。

---

# 36. Path 页面直接改成“学习”

修改：

```text
TreeLocalNav.tsx
```

直接：

```tsx
<NavigationModes
  label="知识树页面"

  items={[
    {
      to:
        ROUTES.treePath(
          libraryId,
          treeId,
        ),

      label:
        '学习',
    },

    {
      to:
        ROUTES.treeVerify(
          libraryId,
          treeId,
        ),

      label:
        '测验',
    },
  ]}
/>
```

---

# 37. TreeLearningPathPanel 清理

顶部直接收缩成：

```tsx
<header className="tree-panel__header">
  <h1>学习</h1>

  {recommendation &&
   recommendedPoint && (
    <button
      className="tree-recommendation"

      type="button"

      onClick={() =>
        selectPoint(
          recommendation.pointId,
        )
      }
    >
      <span>
        建议先学
      </span>

      <strong>
        {recommendedPoint.name}
      </strong>

      <small>
        {recommendation.reasons
          .slice(0, 2)
          .join(' ')}
      </small>

      <ArrowRight
        size={17}
        aria-hidden="true"
      />
    </button>
  )}

  <label className="tree-panel-search">
    <MagnifyingGlass
      size={16}
      aria-hidden="true"
    />

    <input
      type="search"
      value={query}
      onChange={(event) =>
        setQuery(
          event.target.value,
        )
      }
      aria-label="搜索知识点"
      placeholder="搜索知识点"
    />
  </label>
</header>
```

删除：

```text
学习路径
沿知识关系前进
从课程脉络中选择……
```

---

# 38. Verify 页面直接改成“测验”

`TreeVerificationPanel.tsx`

Header：

```tsx
<header className="tree-panel__header">
  <h1>测验</h1>

  <button
    className=
      "tree-verify-panel__start"

    type="button"

    disabled={
      questionCount === 0
    }

    onClick={...}
  >
    <Exam
      size={18}
      aria-hidden="true"
    />

    开始测验
  </button>

  <label className="tree-panel-search">
    <MagnifyingGlass
      size={16}
      aria-hidden="true"
    />

    <input
      type="search"
      value={query}
      onChange={(event) =>
        setQuery(
          event.target.value,
        )
      }
      aria-label=
        "搜索知识点"

      placeholder=
        "搜索知识点"
    />
  </label>
</header>
```

列表：

```tsx
<small>有题目</small>
```

不要：

```text
能力验证
检验整棵知识树
可独立验证
```

---

# 39. TreePointDetailPanel 清理

`KnowledgeTreeWorkspace.tsx`

description：

原：

```tsx
<p>
  {point.description ||
    '这个知识点还没有补充说明。'}
</p>
```

改：

```tsx
{point.description && (
  <p className=
    "tree-point-detail__description"
  >
    {point.description}
  </p>
)}
```

没有说明就什么都不显示。

---

按钮：

```text
自主学习 → 学习
带我学 → 带我学
验证掌握 → 测验
```

第三个：

```tsx
<button
  type="button"
  aria-label="测验"
  ...
>
  <SealCheck
    size={18}
    aria-hidden="true"
  />

  <span>
    <strong>
      测验
    </strong>

    {recommendedAction ===
      'verify' && (
      <small>
        建议
      </small>
    )}
  </span>
</button>
```

删除：

```text
HumanRAG 引导
当前建议
```

可以统一成：

```text
建议
```

---

# 40. 删除自动生成的“废话 description”

修改：

```text
src/data/knowledgeGraph.ts
```

这是用户明确指出的来源之一。

当前通用 description 不再生成一句万能话。

`makeDescription()` 改成：

```ts
const makeDescription = (
  _name: string,
  _type: NodeType,
) => '';
```

已有：

```text
DEMO_CONTENT
```

中的人工说明继续保留。

---

## 40.1 Extension description

当前类似：

```text
“xxx”是 xxx 中的关键连接点……
```

也不要。

直接：

```ts
description: '',
```

没有真正内容，就不要伪造内容。

---

# 41. 学习记录页面改人话

`ProgressPage.tsx`

Header：

```tsx
<WorkspaceHeader
  title="学习记录"
  ...
/>
```

Intro：

```tsx
<header className=
  "learning-records__intro"
>
  <h1>
    学习记录
  </h1>

  <p>
    这里记录你的作答、提示使用和需要巩固的内容。
  </p>
</header>
```

---

`SOURCE`：

```ts
const SOURCE = {
  diagnostic: '尝试',

  'guided-practice':
    '练习',

  'independent-check':
    '测验',

  practice: '练习',
};
```

---

Status：

```ts
const STATUS_GROUPS = [
  {
    title: '已掌握',
    ...
  },

  {
    title: '需要巩固',
    ...
  },

  {
    title: '提示后完成',
    ...
  },

  {
    title: '待测验',
    ...
  },
];
```

---

动作：

```text
重新验证 → 再测一次
```

---

section：

```text
最近形成的证据 → 最近记录
```

empty：

```text
还没有可核验的作答证据。
```

改：

```text
还没有学习记录。
```

---

# 42. GlobalNav fallback 文案

`GlobalNav.tsx`

改：

```ts
const fallbackTitle =
  pathname === ROUTES.library
    ? '知识库'

    : pathname ===
        ROUTES.progress
      ? '学习记录'

      : pathname ===
          ROUTES.universe
        ? '知识空间'

        : '';
```

---

# 43. Library 操作文案

`LibraryHomePage.tsx`

当前：

```text
能力验证
```

改：

```text
测验
```

按钮：

```tsx
<button
  type="button"
  className=
    "context-nav__button"

  onClick={() =>
    navigate(
      ROUTES.libraryPractice(
        domain.library.id,
      ),
    )
  }
>
  <Exam
    size={16}
    aria-hidden="true"
  />

  测验
</button>
```

---

# 44. Extraction Status 改人话

`SpatialExperienceShell.tsx`

改成：

```ts
const extractionStatus = {
  highlighting:
    '找到相关知识了',

  detaching:
    '正在整理关系',

  receding:
    '正在收起其他内容',

  forming:
    '正在整理成树',

  connecting:
    '正在补上关系',

  ready:
    '知识树已生成',
}[
  extractionPhase as
    Exclude<
      typeof extractionPhase,
      'idle' |
      'handoff'
    >
];
```

---

# 45. Goal 输入按钮改直接

`GoalLensDrawer.tsx`

建议：

```text
学习目标 → 目标
整理相关知识 → 生成知识树
```

保留：

```text
你现在想做什么？
```

这是好的。

Hint 可以改成：

```text
可以补充你的基础、兴趣、擅长或薄弱内容。
```

不要再扩文案。

---

# 46. 全站 Copy Audit

代码改完后运行：

```bash
rg \
'学习路径|能力验证|验证掌握|学习证据|可独立验证|重新验证|不是.*而是|这是知识网络中的一个关键节点|围绕.*建立.*连接|HumanRAG 引导' \
src e2e
```

逐个处理。

注意：

内部：

```text
verify
evidence
learningPath
```

这些变量名可以保留。

用户看不见。

不要为了改文案做无意义的大规模重命名。

---

# 47. Archify：施工后正式生成四份图

本轮必须真正用。

## 47.1 Runtime Architecture

Agent 提示词直接用：

```text
Analyze the current HumanRAG repository after the V11 final polish.

Use Archify Architecture.

Only include runtime components verified from source.

Use these as the intended semantic grouping, but verify every connection from code before authoring it:

1. AppRouter
2. SpatialExperienceShell
3. GlobalNav + NavigationSlots
4. SpatialStageCanvas
5. GraphRevealPlan
6. CameraController
7. KnowledgeGraph + CanonicalSpace
8. GoalTreeComposer + GoalTreeTransitionStore
9. LibraryPreviewUniverseScene
10. KnowledgeTreeWorkspace
11. Domain Registry
12. Learning / Progress stores

The primary story should be:

Route
→ persistent SpatialExperience
→ canonical knowledge graph
→ one Canvas
→ reveal / camera / tree views

Show clearly that:
- system trees reuse canonical coordinates;
- user trees use custom layout;
- one CameraController owns the spatial experience;
- GraphRevealPlan is reused by Opening and Goal Extraction.

Do not invent services that do not exist.

Use zh-CN.
Use a restrained dark presentation.
Validate at showcase quality.
```

输出：

```text
after-runtime.architecture.json
after-runtime.architecture.html
after-runtime.architecture.svg
after-runtime.architecture.png
```

---

# 48. Archify：Opening Sequence

直接要求：

```text
Use Archify Sequence to document the real Opening → Universe interaction.

Participants:

User
LandingPage
SpatialExperienceShell
OpeningPreset
GraphRevealPlan
SpatialStageCanvas
NodePointField
BatchedKnowledgeEdges
CameraController

Sequence:

1. OpeningPreset selects stable seed node IDs.
2. GraphRevealPlan calculates deterministic node and edge delays.
3. SpatialStageCanvas renders the complete canonical SceneModel.
4. Seed nodes and seed edges start bright; all remaining graph elements stay dim but mounted.
5. CameraController frames the real seed positions.
6. User chooses Enter Knowledge Space.
7. Reveal begins from the current seeds.
8. Edge activates before its receiving node.
9. NodePointField progressively raises node strength.
10. BatchedKnowledgeEdges grows the corresponding edge.
11. CameraController preserves view direction while increasing distance and moving target toward the full Universe center.
12. SpatialExperienceShell enters universe only after the entry shot completes.

Do not show any temporary constellation geometry because none should exist after this refactor.
```

输出：

```text
opening-universe.sequence.*
```

---

# 49. Archify：Goal Extraction Sequence

```text
Use Archify Sequence.

Participants:

User
GoalLensDrawer
GoalTreeComposer
GoalTreeTransitionStore
GraphRevealPlan
NodePointField
BatchedKnowledgeEdges
CameraController
GoalTreeExtraction
Domain Registry
LibraryPreviewUniverseScene

Show:

natural-language goal
→ composer seedPointIds + pointIds
→ reveal selected knowledge in the existing Universe
→ detach old relationships
→ recede non-selected nodes
→ custom-layout selected points
→ connect the new tree
→ persist user tree
→ handoff to Library preview

Important:
CameraController remains the only camera owner throughout the sequence.
```

输出：

```text
goal-extraction.sequence.*
```

---

# 50. Architecture Delta

使用：

```text
before-runtime.architecture.json
after-runtime.architecture.json
```

生成：

```bash
node archify/bin/archify.mjs compare \
  architecture \
  docs/architecture/v11-final/before-runtime.architecture.json \
  docs/architecture/v11-final/after-runtime.architecture.json \
  docs/architecture/v11-final/v11-final-delta.html \
  --json
```

若本地 Archify 安装路径不同，用实际安装路径。

Delta 应能清楚看到：

```text
新增 CanonicalSpace
新增 GraphRevealPlan

Camera owner:
multiple
→ one

System Tree layout:
custom relayout
→ canonical

Opening:
temporary subgraph
→ complete graph + reveal state
```

---

# 51. Opening Unit Test

新增：

```text
src/scene/reveal/graphReveal.test.ts
```

至少：

```ts
describe(
  'GraphRevealPlan',
  () => {
    it(
      '相同输入生成完全相同的传播计划',
      () => {
        const first =
          buildGraphRevealPlan(
            model,
            seeds,
          );

        const second =
          buildGraphRevealPlan(
            model,
            seeds,
          );

        expect(
          [...first.nodeDelay],
        ).toEqual(
          [...second.nodeDelay],
        );

        expect(
          [...first.edgeDelay],
        ).toEqual(
          [...second.edgeDelay],
        );
      },
    );

    it(
      'seed 节点从 0 开始',
      () => {
        const plan =
          buildGraphRevealPlan(
            model,
            seeds,
          );

        for (
          const seed of seeds
        ) {
          expect(
            plan.nodeDelay.get(
              seed,
            ),
          ).toBe(0);
        }
      },
    );

    it(
      '接收节点不会早于负责传播的边',
      () => {
        const plan =
          buildGraphRevealPlan(
            model,
            seeds,
          );

        for (
          const edge of
          model.edges
        ) {
          const edgeAt =
            plan.edgeDelay.get(
              edge.id,
            );

          if (
            edgeAt === undefined
          ) {
            continue;
          }

          const latestNodeAt =
            Math.max(
              plan.nodeDelay.get(
                edge.source,
              ) ?? 0,

              plan.nodeDelay.get(
                edge.target,
              ) ?? 0,
            );

          expect(edgeAt)
            .toBeLessThanOrEqual(
              latestNodeAt +
                0.03,
            );
        }
      },
    );
  },
);
```

---

# 52. Opening Scene 测试

必须保证：

```ts
expect(
  introModel.nodes.length,
).toBe(
  model.nodes.length,
);

expect(
  introModel.edges.length,
).toBe(
  model.edges.length,
);
```

以及：

```ts
for (
  const original of
  model.nodes
) {
  const intro =
    introModel.nodes.find(
      (node) =>
        node.id ===
        original.id,
    );

  expect(
    intro?.displayPosition,
  ).toEqual(
    original.displayPosition,
  );
}
```

这条测试一旦存在，Opening 就不可能再回到“临时小树”。

---

# 53. Camera 测试

`entryShot.test.ts`

必须测：

```text
from direction
==
中途 direction
==
final direction
```

误差：

```text
< 0.5°
```

不要只检查最后 position。

---

# 54. Nav E2E

给：

```text
390
768
1024
1440
```

分别检查。

核心：

```ts
const box =
  await page
    .locator(
      '#context-nav-primary',
    )
    .boundingBox();

expect(box).not.toBeNull();

expect(box!.x)
  .toBeGreaterThanOrEqual(0);

expect(
  box!.x +
    box!.width,
).toBeLessThanOrEqual(
  viewport.width,
);
```

Title：

```ts
const title =
  await page
    .locator(
      '#context-nav-title',
    )
    .boundingBox();

expect(
  Math.abs(
    title!.x +
      title!.width / 2 -
      viewport.width / 2,
  ),
).toBeLessThan(3);
```

---

# 55. Path / Verify readonly E2E

进入：

```text
/library/computer/tree/tree-408/path
```

记录：

```ts
const before =
  await canvas.getAttribute(
    'data-preview-camera',
  );
```

对 Canvas：

```ts
wheel
pointer drag
touch
```

然后：

```ts
const after =
  await canvas.getAttribute(
    'data-preview-camera',
  );

expect(after).toBe(before);
```

同时：

```ts
expect(
  selectedPointId
).not.toChange
```

但树的：

```text
previewTreeRotation
```

应该随着时间变化。

也就是：

```text
tree rotates
camera does not
selection does not
```

---

# 56. Goal Extraction Camera E2E

生成树以前记录：

```text
camera position
camera target
```

生成过程中记录：

```text
direction =
normalize(position - target)
```

前后夹角必须：

```text
< 8°
```

正常目标：

```text
< 3°
```

不再接受几十度大翻转。

---

# 57. 性能检查

这轮不要用“动画缩短了，所以不卡了”作为结论。

Chrome Performance / Playwright instrumentation 检查：

```text
Opening
Goal Extraction
Library switching
Path model rotation
```

重点看：

```text
是否出现第二个 CameraControls
是否重复创建 Canvas
是否重新创建大量 geometry
是否每 frame React setState
是否 60fps setInterval 永久存在
```

最终要求：

```text
Canvas count = 1
CameraControls owner = 1
```

Path/Verify 的 Preview clock：

```text
24fps
```

足够。

---

# 58. 不要在这轮做的东西

这轮不继续：

```text
video-shotcraft
OpenMAIC
更多 Learning Scene
新的产品模块
新的聊天 AI
新的视觉体系
新的 3D renderer
```

它们与这次问题无关。

---

# 59. 完整门禁

按这个顺序：

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

然后单独跑：

```text
spatial-entry
goal-tree-composition
learning-workspaces
navigation-continuity
visual-acceptance
competition-journey
```

所有旧测试中：

```text
学习路径
能力验证
学习证据
```

这些 selector 要同步改成新文案。

不要因为 selector 失败而改回旧文案。

---

# 60. 最终人工验收路线

必须实际打开浏览器完整走一遍：

## 路线 A

```text
/
↓
Opening
↓
进入知识空间
↓
Universe
```

看：

```text
完整树从第一帧就在
Seed 没有移动
传播从 Seed 出发
线先亮
节点后亮
Camera 只拉开
```

---

## 路线 B

```text
/universe
↓
输入目标
↓
生成知识树
↓
/library
```

看：

```text
相关节点逐步点亮
Camera 不翻
其他节点后退
原关系断开
目标节点重组
新边生成
Library 接最后一帧
```

---

## 路线 C

```text
/library
↓
切换 tree-408 / AI / user tree
```

看：

```text
所有小树持续旋转
Camera 平滑横移
Tree A / Tree B 不闪
系统树结构与 Universe 一样
```

---

## 路线 D

```text
/library/computer/tree/tree-408/path
↓
/verify
```

看：

```text
左 38%
右 62%

左边自动旋转
但完全不能操作

右边正常学习 / 测验

文案没有 AI 味
```

---

# 61. 最终报告格式

完成后不要写“已完成”。

按下面格式：

```text
# V11 Final Polish Report

## Opening
改了什么
最终行为
录屏路径

## Camera
原 Camera ownership
现在 Camera ownership
最大 orientation change

## System Tree
tree-408 节点数
Universe 对齐方式
坐标一致测试

## Goal Extraction
Reveal 方式
阶段时间
性能数据
Camera 数据

## Navigation
390
768
1024
1440
按钮 bounding box

## Copy
删除的主要模板文案
替换术语

## Morphicons
接入位置
bundle 差异

## Archify
Before
After
Opening Sequence
Extraction Sequence
Delta

## Tests
unit:
e2e:
build:
typecheck:

## Remaining
仍然存在的问题
```

---

# 最后再次锁死最重要的验收标准

如果下面任何一条不成立，这轮就不能算完成。

### 1

Opening 第一帧：

```text
完整 Universe 在场。
```

不是一棵临时小树。

### 2

Opening 全过程：

```text
节点位置永远不变。
```

变化的只有明暗、传播和 Camera。

### 3

传播必须看得出：

```text
节点
→ 连线
→ 下一个节点
```

### 4

目标提取必须从：

```text
GoalTreeComposer.seedPointIds
```

开始传播。

不能重新猜 Seed。

### 5

整个 Spatial Experience：

```text
只有 CameraController
拥有 CameraControls。
```

### 6

系统知识树：

```text
Universe canonical coordinates
===
Library system tree coordinates
```

绝不重新 `layoutCustomTree()`。

### 7

用户知识树：

```text
仍然允许 custom layout。
```

不要为了统一系统树破坏用户树。

### 8

Path / Verify：

```text
左 38%
右 62%

tree rotates
camera locked
interaction locked
```

### 9

导航：

```text
左固定
中真正居中
右固定
次要操作进 ...
```

任何 viewport 都不允许主按钮被卡掉。

### 10

Morphicons：

```text
Fullscreen
PointGroup
```

只有这两处。

不要扩散。

### 11

Archify 必须真实生成：

```text
Before Architecture
After Architecture
Opening Sequence
Goal Extraction Sequence
Architecture Delta
```

### 12

最终体验应该是：

```text
Opening 是同一个世界慢慢醒来。

Universe、Library、Knowledge Tree
是同一个知识空间的不同观察尺度。

HumanRAG 从已有知识中找到目标，
然后在用户眼前把它整理成一棵树。

整个过程中没有换世界，
没有突然翻镜头，
没有重新生成一个假的空间。
```

这就是本轮施工的最终标准。