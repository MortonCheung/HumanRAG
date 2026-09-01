import type { BranchId, KnowledgeEdge, KnowledgeGraphData, KnowledgeNode, NodeType } from '../graph/types';

const LAYER_Y: Record<NodeType, 20 | 10 | 0 | -10 | -20> = {
  goal: 20,
  direction: 10,
  skill: 0,
  course: 0,
  knowledge: -10,
  practice: -20,
};

const BRANCH_ANCHORS: Record<BranchId, [number, number]> = {
  '408': [-16, -8],
  ai: [16, -8],
  game: [-16, 12],
  frontend: [16, 12],
};

const TYPE_RADIUS: Record<NodeType, number> = {
  goal: 0,
  direction: 0,
  course: 5.8,
  skill: 5.8,
  knowledge: 8.8,
  practice: 11.4,
};

const GOAL_ALIASES = {
  'direction-408': ['计算机考研408', '计算机408', '考研408', '408', '计算机研究生'],
  'direction-ai-engineering': ['AI', 'AI工程', 'AI工程师', '人工智能工程', '机器学习工程师', 'LLM应用工程'],
  'direction-game-development': ['游戏', '游戏开发', '游戏开发工程师', '游戏工程师', '游戏引擎开发'],
  'direction-frontend-development': ['前端', '前端开发', '前端工程师', 'Web前端', 'React前端'],
} as const;

const DEMO_CONTENT: Record<string, Partial<KnowledgeNode>> = {
  'goal-cs-graduate': {
    description: '建立面向计算机研究生入学与后续学习的系统知识基础，并能够把分散课程连接成可复习、可验证的完整结构。',
    recommendedContent: ['目标拆解与科目范围', '阶段性知识地图'],
  },
  'direction-408': {
    description: '围绕数据结构、计算机组成原理、操作系统和计算机网络构建统一知识网络，强调概念之间的前置关系与综合分析。',
    recommendedContent: ['四科核心概念框架', '跨科综合分析方法', '典型题型关系梳理'],
  },
  'course-data-structures': {
    description: '研究数据的组织、存储与操作方式，是理解算法效率、内存访问和复杂问题建模的基础课程。',
    recommendedContent: ['线性结构与树图结构', '查找与排序方法', '复杂度分析练习'],
  },
  'knowledge-linear-list': {
    description: '线性表是元素按一对一前后关系组织的逻辑结构，可用顺序存储或链式存储实现，是树、图和更复杂数据组织方式的基础。',
    recommendedContent: ['顺序表与链表对比', '插入删除边界条件', '链表操作题'],
  },
  'practice-linked-list': {
    description: '通过创建、插入、删除、反转和边界情况分析，验证对链式存储结构与指针连接关系的理解。',
    recommendedContent: ['单链表基础操作', '双指针链表问题', '异常输入检查'],
  },
};

const BRANCHES: Array<{
  branchId: BranchId;
  goal: [string, string];
  direction: [string, string];
  courses: Array<[string, string, NodeType]>;
  knowledge: Array<[string, string]>;
  practices: Array<[string, string]>;
}> = [
  {
    branchId: '408',
    goal: ['goal-cs-graduate', '计算机研究生'],
    direction: ['direction-408', '考研408'],
    courses: [
      ['course-data-structures', '数据结构', 'course'],
      ['course-computer-organization', '计算机组成原理', 'course'],
      ['course-operating-systems', '操作系统', 'course'],
      ['course-computer-networks', '计算机网络', 'course'],
      ['skill-408-integration', '408综合分析', 'skill'],
    ],
    knowledge: [
      ['knowledge-linear-list', '线性表'], ['knowledge-tree', '树与二叉树'], ['knowledge-graph', '图'],
      ['knowledge-search', '查找'], ['knowledge-sort', '排序'], ['knowledge-data-representation', '数据表示与运算'],
      ['knowledge-memory-system', '存储系统'], ['knowledge-instruction-system', '指令系统'], ['knowledge-process-thread', '进程与线程'],
      ['knowledge-memory-management', '内存管理'], ['knowledge-tcp', 'TCP可靠传输'], ['knowledge-http', 'HTTP与应用层'],
    ],
    practices: [
      ['practice-linked-list', '链表操作题'], ['practice-tree-traversal', '二叉树遍历题'], ['practice-graph-algorithm', '图算法综合题'],
      ['practice-cache-mapping', 'Cache地址映射题'], ['practice-process-scheduling', '进程调度题'], ['practice-tcp-state', 'TCP状态分析题'],
    ],
  },
  {
    branchId: 'ai',
    goal: ['goal-ai-engineer', 'AI工程师'],
    direction: ['direction-ai-engineering', 'AI工程'],
    courses: [
      ['course-python-engineering', 'Python工程基础', 'course'], ['course-machine-learning', '机器学习', 'course'],
      ['course-deep-learning', '深度学习', 'course'], ['course-data-engineering', '数据工程', 'course'],
      ['course-llm-engineering', 'LLM应用工程', 'course'],
    ],
    knowledge: [
      ['knowledge-python-data-model', 'Python数据模型'], ['knowledge-async-concurrency', '异步与并发'],
      ['knowledge-supervised-learning', '监督学习'], ['knowledge-model-evaluation', '模型评估'], ['knowledge-feature-engineering', '特征工程'],
      ['knowledge-neural-network', '神经网络基础'], ['knowledge-transformer', 'Transformer'], ['knowledge-data-cleaning', '数据清洗'],
      ['knowledge-vector-database', '向量数据库'], ['knowledge-prompt-design', '提示设计'], ['knowledge-rag', '检索增强生成'],
      ['knowledge-model-serving', '模型服务与评估'],
    ],
    practices: [
      ['practice-data-pipeline', '数据处理管道'], ['practice-classifier-evaluation', '分类模型评估'], ['practice-backpropagation', '反向传播推导'],
      ['practice-transformer-shape', 'Transformer张量推演'], ['practice-rag-pipeline', 'RAG检索链路'], ['practice-model-service', '模型服务评测'],
    ],
  },
  {
    branchId: 'game',
    goal: ['goal-game-engineer', '游戏开发工程师'],
    direction: ['direction-game-development', '游戏开发'],
    courses: [
      ['course-game-programming', '游戏编程基础', 'course'], ['course-game-math', '游戏数学', 'course'], ['course-game-engine', '游戏引擎', 'course'],
      ['course-game-systems', '游戏系统', 'course'], ['course-graphics-performance', '图形与性能', 'course'],
    ],
    knowledge: [
      ['knowledge-memory-structure', '程序结构与内存'], ['knowledge-event-state-machine', '事件与状态机'], ['knowledge-vector-coordinate', '向量与坐标系'],
      ['knowledge-matrix-transform', '矩阵与变换'], ['knowledge-collision-detection', '碰撞检测'], ['knowledge-scene-entity', '场景与实体'],
      ['knowledge-input-system', '输入系统'], ['knowledge-animation-system', '动画系统'], ['knowledge-game-loop', '游戏循环'],
      ['knowledge-resource-management', '资源管理'], ['knowledge-rendering-pipeline', '渲染管线'], ['knowledge-performance-profiling', '性能分析'],
    ],
    practices: [
      ['practice-player-controller', '角色控制器'], ['practice-coordinate-transform', '坐标变换练习'], ['practice-collision-response', '碰撞响应练习'],
      ['practice-character-state', '角色状态机'], ['practice-resource-loading', '资源加载流程'], ['practice-draw-call', 'Draw Call分析'],
    ],
  },
  {
    branchId: 'frontend',
    goal: ['goal-frontend-engineer', '前端工程师'],
    direction: ['direction-frontend-development', '前端开发'],
    courses: [
      ['course-web-foundation', 'Web基础', 'course'], ['course-js-ts', 'JavaScript与TypeScript', 'course'], ['course-react-engineering', 'React工程', 'course'],
      ['course-browser-network', '浏览器与网络', 'course'], ['course-frontend-quality', '前端质量', 'course'],
    ],
    knowledge: [
      ['knowledge-semantic-html', '语义化HTML'], ['knowledge-css-layout', 'CSS布局'], ['knowledge-responsive-design', '响应式设计'],
      ['knowledge-event-loop', 'JavaScript事件循环'], ['knowledge-type-system', 'TypeScript类型系统'], ['knowledge-react-state', 'React状态与渲染'],
      ['knowledge-component-design', '组件设计'], ['knowledge-routing-fetching', '路由与数据请求'], ['knowledge-browser-rendering', '浏览器渲染流程'],
      ['knowledge-http-cache', 'HTTP与缓存'], ['knowledge-accessibility', 'Web可访问性'], ['knowledge-web-performance', '测试与Web性能'],
    ],
    practices: [
      ['practice-accessible-page', '可访问页面练习'], ['practice-responsive-layout', '响应式布局练习'], ['practice-typescript-model', 'TypeScript数据建模'],
      ['practice-react-state', 'React状态设计'], ['practice-api-cache', '请求与缓存练习'], ['practice-performance-audit', 'Web性能审计'],
    ],
  },
];

const DIRECTION_CHILDREN: Record<string, string[]> = {
  'direction-408': ['course-data-structures', 'course-computer-organization', 'course-operating-systems', 'course-computer-networks', 'skill-408-integration'],
  'direction-ai-engineering': ['course-python-engineering', 'course-machine-learning', 'course-deep-learning', 'course-data-engineering', 'course-llm-engineering'],
  'direction-game-development': ['course-game-programming', 'course-game-math', 'course-game-engine', 'course-game-systems', 'course-graphics-performance'],
  'direction-frontend-development': ['course-web-foundation', 'course-js-ts', 'course-react-engineering', 'course-browser-network', 'course-frontend-quality'],
};

const COURSE_KNOWLEDGE_CHILDREN: Record<string, string[]> = {
  'course-data-structures': ['knowledge-linear-list', 'knowledge-tree', 'knowledge-graph'],
  'course-computer-organization': ['knowledge-data-representation', 'knowledge-memory-system', 'knowledge-instruction-system'],
  'course-operating-systems': ['knowledge-process-thread', 'knowledge-memory-management'],
  'course-computer-networks': ['knowledge-tcp', 'knowledge-http'],
  'skill-408-integration': ['knowledge-search', 'knowledge-sort'],
  'course-python-engineering': ['knowledge-python-data-model', 'knowledge-async-concurrency'],
  'course-machine-learning': ['knowledge-supervised-learning', 'knowledge-model-evaluation', 'knowledge-feature-engineering'],
  'course-deep-learning': ['knowledge-neural-network', 'knowledge-transformer'],
  'course-data-engineering': ['knowledge-data-cleaning', 'knowledge-vector-database'],
  'course-llm-engineering': ['knowledge-prompt-design', 'knowledge-rag', 'knowledge-model-serving'],
  'course-game-programming': ['knowledge-memory-structure', 'knowledge-event-state-machine'],
  'course-game-math': ['knowledge-vector-coordinate', 'knowledge-matrix-transform'],
  'course-game-engine': ['knowledge-collision-detection', 'knowledge-scene-entity', 'knowledge-input-system'],
  'course-game-systems': ['knowledge-animation-system', 'knowledge-game-loop', 'knowledge-resource-management'],
  'course-graphics-performance': ['knowledge-rendering-pipeline', 'knowledge-performance-profiling'],
  'course-web-foundation': ['knowledge-semantic-html', 'knowledge-css-layout', 'knowledge-responsive-design'],
  'course-js-ts': ['knowledge-event-loop', 'knowledge-type-system'],
  'course-react-engineering': ['knowledge-react-state', 'knowledge-component-design', 'knowledge-routing-fetching'],
  'course-browser-network': ['knowledge-browser-rendering', 'knowledge-http-cache'],
  'course-frontend-quality': ['knowledge-accessibility', 'knowledge-web-performance'],
};

const PRACTICE_SOURCES: Record<string, string[]> = {
  'practice-linked-list': ['knowledge-linear-list'], 'practice-tree-traversal': ['knowledge-tree'], 'practice-graph-algorithm': ['knowledge-graph'],
  'practice-cache-mapping': ['knowledge-memory-system'], 'practice-process-scheduling': ['knowledge-process-thread'], 'practice-tcp-state': ['knowledge-tcp'],
  'practice-data-pipeline': ['knowledge-data-cleaning'], 'practice-classifier-evaluation': ['knowledge-model-evaluation'], 'practice-backpropagation': ['knowledge-neural-network'],
  'practice-transformer-shape': ['knowledge-transformer'], 'practice-rag-pipeline': ['knowledge-vector-database', 'knowledge-rag'], 'practice-model-service': ['knowledge-model-serving'],
  'practice-player-controller': ['knowledge-input-system', 'knowledge-game-loop'], 'practice-coordinate-transform': ['knowledge-vector-coordinate', 'knowledge-matrix-transform'],
  'practice-collision-response': ['knowledge-collision-detection'], 'practice-character-state': ['knowledge-event-state-machine'], 'practice-resource-loading': ['knowledge-resource-management'],
  'practice-draw-call': ['knowledge-rendering-pipeline', 'knowledge-performance-profiling'], 'practice-accessible-page': ['knowledge-semantic-html', 'knowledge-accessibility'],
  'practice-responsive-layout': ['knowledge-css-layout', 'knowledge-responsive-design'], 'practice-typescript-model': ['knowledge-type-system'], 'practice-react-state': ['knowledge-react-state'],
  'practice-api-cache': ['knowledge-routing-fetching', 'knowledge-http-cache'], 'practice-performance-audit': ['knowledge-browser-rendering', 'knowledge-web-performance'],
};

const PREREQUISITES: Array<[string, string]> = [
  ['knowledge-linear-list', 'knowledge-tree'], ['knowledge-tree', 'knowledge-graph'], ['knowledge-data-representation', 'knowledge-memory-system'],
  ['knowledge-process-thread', 'knowledge-memory-management'], ['knowledge-tcp', 'knowledge-http'], ['knowledge-python-data-model', 'knowledge-async-concurrency'],
  ['knowledge-supervised-learning', 'knowledge-model-evaluation'], ['knowledge-neural-network', 'knowledge-transformer'], ['knowledge-data-cleaning', 'knowledge-vector-database'],
  ['knowledge-prompt-design', 'knowledge-rag'], ['knowledge-vector-database', 'knowledge-rag'], ['knowledge-memory-structure', 'knowledge-game-loop'],
  ['knowledge-vector-coordinate', 'knowledge-matrix-transform'], ['knowledge-matrix-transform', 'knowledge-collision-detection'], ['knowledge-event-state-machine', 'knowledge-animation-system'],
  ['knowledge-scene-entity', 'knowledge-resource-management'], ['knowledge-semantic-html', 'knowledge-accessibility'], ['knowledge-css-layout', 'knowledge-responsive-design'],
  ['knowledge-event-loop', 'knowledge-react-state'], ['knowledge-type-system', 'knowledge-component-design'], ['knowledge-http-cache', 'knowledge-routing-fetching'],
  ['knowledge-browser-rendering', 'knowledge-web-performance'],
];

const RELATED: Array<[string, string]> = [
  ['knowledge-http', 'knowledge-http-cache'], ['knowledge-async-concurrency', 'knowledge-event-loop'],
  ['knowledge-model-serving', 'knowledge-web-performance'], ['knowledge-performance-profiling', 'knowledge-web-performance'],
];

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('zh-CN').trim().replace(/[\s，。、“”‘’'"：:；;！？!?、/\\()[\]{}<>《》·-]/g, '');

const makeDescription = (name: string, type: NodeType) => {
  const prefix = type === 'practice' ? '通过一个可验证的小练习' : type === 'course' || type === 'skill' ? '这是一段用于建立系统能力的学习模块' : '这是知识网络中的一个关键节点';
  return `${prefix}，围绕“${name}”建立概念、关系与应用之间的连接。`;
};

function createNodes(): KnowledgeNode[] {
  const counters: Record<string, number> = {};
  const result: KnowledgeNode[] = [];
  for (const branch of BRANCHES) {
    const entries: Array<[string, string, NodeType]> = [
      [branch.goal[0], branch.goal[1], 'goal'],
      [branch.direction[0], branch.direction[1], 'direction'],
      ...branch.courses,
      ...branch.knowledge.map(([id, name]) => [id, name, 'knowledge'] as [string, string, NodeType]),
      ...branch.practices.map(([id, name]) => [id, name, 'practice'] as [string, string, NodeType]),
    ];
    for (const [id, name, type] of entries) {
      const index = counters[`${branch.branchId}:${type}`] ?? 0;
      counters[`${branch.branchId}:${type}`] = index + 1;
      const [anchorX, anchorZ] = BRANCH_ANCHORS[branch.branchId];
      const radius = TYPE_RADIUS[type];
      const angle = index * 2.399963 + (type === 'knowledge' ? 0.4 : type === 'practice' ? 0.9 : 0);
      const position: [number, number, number] = radius === 0
        ? [anchorX, LAYER_Y[type], anchorZ]
        : [anchorX + Math.cos(angle) * radius, LAYER_Y[type], anchorZ + Math.sin(angle) * radius];
      const content = DEMO_CONTENT[id] ?? {};
      result.push({
        id, name, type, layer: LAYER_Y[type], branchId: branch.branchId,
        description: content.description ?? makeDescription(name, type),
        keywords: [name, branch.direction[1], branch.goal[1]],
        recommendedContent: content.recommendedContent ?? [`${name}核心概念`, `${name}关系梳理`],
        basePosition: position,
      });
    }
  }

  const parentByChild = new Map<string, string>();
  for (const [direction, courses] of Object.entries(DIRECTION_CHILDREN)) for (const course of courses) parentByChild.set(course, direction);
  for (const [course, knowledge] of Object.entries(COURSE_KNOWLEDGE_CHILDREN)) for (const item of knowledge) parentByChild.set(item, course);
  for (const [practice, sources] of Object.entries(PRACTICE_SOURCES)) parentByChild.set(practice, sources[0]);
  for (const node of result) {
    if (node.type === 'direction') node.parentId = result.find((candidate) => candidate.branchId === node.branchId && candidate.type === 'goal')?.id;
    else node.parentId = parentByChild.get(node.id);
  }
  return result;
}

const EXPANSION_TOPICS: Record<BranchId, string[]> = {
  '408': ['复杂度与摊还', '哈希与冲突处理', '并查集', '递归与分治', '流水线冒险', '虚拟内存', '中断与异常', '死锁与同步', '文件系统', '拥塞控制', '路由协议', '网络安全基础'],
  ai: ['线性代数直觉', '概率分布', '损失函数', '梯度下降', '正则化', '交叉验证', '卷积网络', '注意力机制', '嵌入表示', '数据治理', '特征存储', '模型监控'],
  game: ['向量运算', '四元数旋转', '空间分区', '物理步进', '行为树', '导航网格', 'ECS架构', 'GPU实例化', '光照模型', '动画混合', '资源热更新', '帧时间分析'],
  frontend: ['DOM事件模型', 'CSS层叠', '布局计算', '模块系统', '异步请求', '状态归一化', '服务端渲染', '组件测试', '构建优化', '可访问性树', '缓存策略', '性能指标'],
};

function slugifyTopic(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function createExtendedNodes(seed: KnowledgeNode[]) {
  const courses = seed.filter((node) => node.type === 'course' || node.type === 'skill');
  const extensions: KnowledgeNode[] = [];
  courses.forEach((course, courseIndex) => {
    const topicCount = courseIndex < 4 ? 11 : 12;
    const topics = EXPANSION_TOPICS[course.branchId];
    for (let index = 0; index < topicCount; index += 1) {
      const topic = topics[index];
      const angle = index * 2.399963 + courseIndex * 0.43;
      const radius = 11.8 + (index % 3) * 1.25;
      const id = `knowledge-extension-${course.id}-${slugifyTopic(topic)}`;
      extensions.push({
        id,
        name: `${course.name} · ${topic}`,
        type: 'knowledge',
        layer: -10,
        branchId: course.branchId,
        parentId: course.id,
        description: `“${topic}”是${course.name}中的关键连接点。理解它可以把基础概念、实现约束和实际练习连成可验证的学习路径。`,
        keywords: [topic, course.name, course.branchId],
        recommendedContent: [`${topic}概念图`, `${topic}推导与实现`, `${topic}小练习`],
        basePosition: [
          course.basePosition[0] + Math.cos(angle) * radius,
          -10,
          course.basePosition[2] + Math.sin(angle) * radius,
        ],
      });
    }
  });
  return extensions;
}

const edge = (source: string, target: string, relationType: KnowledgeEdge['relationType']): KnowledgeEdge => ({
  id: `${relationType}:${source}:${target}`, source, target, relationType,
});

function createEdges(extensions: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  for (const branch of BRANCHES) {
    edges.push(edge(branch.goal[0], branch.direction[0], 'hierarchy'));
    for (const course of DIRECTION_CHILDREN[branch.direction[0]]) edges.push(edge(branch.direction[0], course, 'hierarchy'));
  }
  for (const [course, knowledge] of Object.entries(COURSE_KNOWLEDGE_CHILDREN)) for (const item of knowledge) edges.push(edge(course, item, 'hierarchy'));
  for (const [practice, sources] of Object.entries(PRACTICE_SOURCES)) for (const source of sources) edges.push(edge(source, practice, 'practice_for'));
  for (const [source, target] of PREREQUISITES) edges.push(edge(source, target, 'prerequisite'));
  for (const [source, target] of RELATED) { edges.push(edge(source, target, 'related')); edges.push(edge(target, source, 'related')); }
  const extensionsByParent = new Map<string, KnowledgeNode[]>();
  for (const node of extensions) {
    const list = extensionsByParent.get(node.parentId ?? '') ?? [];
    list.push(node);
    extensionsByParent.set(node.parentId ?? '', list);
    if (node.parentId) edges.push(edge(node.parentId, node.id, 'hierarchy'));
  }
  for (const siblings of extensionsByParent.values()) {
    siblings.forEach((node, index) => {
      if (index > 0) edges.push(edge(siblings[index - 1].id, node.id, 'prerequisite'));
      if (index > 2 && index % 3 === 0) edges.push(edge(siblings[index - 3].id, node.id, 'related'));
    });
  }
  return edges;
}

const seedNodes = createNodes();
const extendedNodes = createExtendedNodes(seedNodes);
export const knowledgeGraph: KnowledgeGraphData = { nodes: [...seedNodes, ...extendedNodes], edges: createEdges(extendedNodes) };
export const nodesById = new Map(knowledgeGraph.nodes.map((node) => [node.id, node]));
export const edgesById = new Map(knowledgeGraph.edges.map((item) => [item.id, item]));

export function matchGoal(input: string) {
  const normalized = normalize(input);
  let best: { nodeId: string; alias: string; score: number } | null = null;
  for (const [nodeId, aliases] of Object.entries(GOAL_ALIASES)) {
    for (const alias of aliases) {
      const cleanAlias = normalize(alias);
      const score = normalized === cleanAlias ? 100 : normalized.includes(cleanAlias) && cleanAlias.length >= 3 ? 90 + Math.min(8, cleanAlias.length / 2) : 0;
      const currentBestScore: number = best === null ? 0 : best.score;
      const currentBestAlias: string = best === null ? '' : best.alias;
      if (score > currentBestScore || (score === currentBestScore && cleanAlias.length > normalize(currentBestAlias).length)) best = { nodeId, alias, score };
    }
  }
  const keywordScores: Array<[string, string[], number[]]> = [
    ['direction-408', ['408', '考研'], [70, 30]],
    ['direction-ai-engineering', ['ai', '人工智能', '机器学习', 'llm', '大模型'], [70, 70, 70, 70, 70]],
    ['direction-game-development', ['游戏', '引擎', '开发'], [55, 25, 10]],
    ['direction-frontend-development', ['前端', 'web', 'react', '开发'], [70, 35, 35, 10]],
  ];
  if (!best || best.score < 70) {
    for (const [nodeId, keywords, weights] of keywordScores) {
      const score = keywords.reduce((sum, keyword, index) => normalized.includes(keyword) ? sum + weights[index] : sum, 0);
      if (score > (best?.score ?? 0)) best = { nodeId, alias: keywords.find((keyword) => normalized.includes(keyword)) ?? '', score };
    }
  }
  return best && best.score >= 70 ? { status: 'matched' as const, nodeId: best.nodeId, confidence: Math.min(1, best.score / 100), matchedAlias: best.alias } : { status: 'unmatched' as const, nodeId: null, confidence: 0 };
}

export const getDirectChildren = (nodeId: string) => knowledgeGraph.edges.filter((item) => item.source === nodeId && item.relationType === 'hierarchy').map((item) => nodesById.get(item.target)).filter(Boolean) as KnowledgeNode[];
export const getIncoming = (nodeId: string, relationType?: KnowledgeEdge['relationType']) => knowledgeGraph.edges.filter((item) => item.target === nodeId && (!relationType || item.relationType === relationType));
export const getOutgoing = (nodeId: string, relationType?: KnowledgeEdge['relationType']) => knowledgeGraph.edges.filter((item) => item.source === nodeId && (!relationType || item.relationType === relationType));

export const DEFAULT_408_PATH = [
  'direction-408', 'course-data-structures', 'knowledge-linear-list', 'practice-linked-list', 'knowledge-tree', 'practice-tree-traversal',
  'knowledge-graph', 'practice-graph-algorithm', 'course-computer-organization', 'knowledge-data-representation', 'knowledge-memory-system',
  'practice-cache-mapping', 'course-operating-systems', 'knowledge-process-thread', 'practice-process-scheduling', 'course-computer-networks',
  'knowledge-tcp', 'practice-tcp-state',
];

export const normalizeGoalInput = normalize;
