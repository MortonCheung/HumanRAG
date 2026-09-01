import { knowledgeGraph } from '../../knowledgeGraph';
import type { BranchId } from '../../../graph/types';

/** 32 个深度手写节点：比赛演示主路径，内容在各 handcrafted 文件中维护。 */
export const DEEP_NODE_NAMES: Record<BranchId, string[]> = {
  '408': [
    '线性表',
    '树与二叉树',
    '图',
    '排序',
    '存储系统',
    '进程与线程',
    '内存管理',
    '操作系统 · 死锁与同步',
    'TCP可靠传输',
    'HTTP与应用层',
  ],
  ai: [
    '监督学习',
    '神经网络基础',
    'Transformer',
    '深度学习 · 注意力机制',
    '检索增强生成',
    '向量数据库',
    '模型服务与评估',
    '异步与并发',
  ],
  game: [
    '游戏循环',
    '矩阵与变换',
    '碰撞检测',
    '渲染管线',
    '输入系统',
    '游戏数学 · 四元数旋转',
    '游戏引擎 · ECS架构',
  ],
  frontend: [
    'JavaScript事件循环',
    'React状态与渲染',
    '浏览器渲染流程',
    '测试与Web性能',
    'HTTP与缓存',
    'CSS布局',
    'TypeScript类型系统',
  ],
};

function resolveByName(name: string): string {
  const node = knowledgeGraph.nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`深度节点不存在：${name}`);
  return node.id;
}

export const DEEP_NODE_IDS_BY_BRANCH: Record<BranchId, string[]> = {
  '408': DEEP_NODE_NAMES['408'].map(resolveByName),
  ai: DEEP_NODE_NAMES.ai.map(resolveByName),
  game: DEEP_NODE_NAMES.game.map(resolveByName),
  frontend: DEEP_NODE_NAMES.frontend.map(resolveByName),
};

export const DEEP_NODE_IDS: ReadonlySet<string> = new Set(
  Object.values(DEEP_NODE_IDS_BY_BRANCH).flat(),
);

export const DEEP_NODE_IDS_BY_NAME: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(DEEP_NODE_NAMES).flat().map((name) => [name, resolveByName(name)]),
);

export const DEEP_NODE_COUNT = DEEP_NODE_IDS.size;
