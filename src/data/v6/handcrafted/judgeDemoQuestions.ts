import type { BranchId } from '../../../graph/types';
import type { QuestionMaterial, QuestionType } from '../schemas/questionSchema';
import { SeededRandom } from '../generators/seededRandom';
import { buildChoice, buildNumericChoice, buildOrdering } from '../generators/questionBuilders';
import { DEEP_NODE_IDS_BY_NAME } from './deepNodes';

export interface DeepBlueprintDef {
  nodeId: string;
  branchId: BranchId;
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  sourceLabel: string;
  materialize(variantSeed: number): QuestionMaterial;
}

const rng = (salt: string, variantSeed: number) => new SeededRandom(`${salt}:v${variantSeed}`);

const DEEP_408: DeepBlueprintDef[] = [
  {
    nodeId: 'knowledge-linear-list',
    branchId: '408',
    type: 'single-choice',
    difficulty: 2,
    sourceLabel: '408 · 数据结构',
    materialize(variantSeed) {
      const r = rng('deep-linear-list', variantSeed);
      const n = r.int(8, 15);
      const i = r.int(2, n - 1);
      return buildNumericChoice({
        rng: r,
        stem: `长度为 ${n} 的顺序表，在第 ${i} 个位置（从 1 开始计数）插入一个新元素，需要向后移动多少个元素？`,
        correct: n - i + 1,
        wrong: [
          { value: n - i, misconception: '少算一个：第 i 到第 n 位共 n-i+1 个元素都要后移。' },
          { value: n - i + 2, misconception: '多算一个：插入位置本身不需要移动。' },
          { value: i, misconception: '把插入位置的序号当成了移动数量。' },
        ],
        explanation: `插入到第 i 位时，原第 ${i} 到第 ${n} 个元素（共 ${n - i + 1} 个）都要依次向后移动一个位置。`,
      });
    },
  },
  {
    nodeId: 'knowledge-tree',
    branchId: '408',
    type: 'single-choice',
    difficulty: 2,
    sourceLabel: '408 · 数据结构',
    materialize(variantSeed) {
      const r = rng('deep-tree-null', variantSeed);
      const n = r.int(6, 20);
      return buildNumericChoice({
        rng: r,
        stem: `一棵有 ${n} 个结点的二叉树采用二叉链表存储，空指针域的数量是多少？`,
        correct: n + 1,
        wrong: [
          { value: n, misconception: '忘记补上“多出来的那一个”：空指针数 = 2n - (n-1)。' },
          { value: n - 1, misconception: '把分支数当成了空指针数。' },
          { value: 2 * n, misconception: '只算了总指针数，没有减去实际使用的分支。' },
        ],
        explanation: `${n} 个结点共有 ${2 * n} 个指针域，其中 ${n - 1} 个被分支占用，因此空指针域为 ${2 * n} - (${n} - 1) = ${n + 1} 个。`,
      });
    },
  },
  {
    nodeId: 'knowledge-graph',
    branchId: '408',
    type: 'single-choice',
    difficulty: 2,
    sourceLabel: '408 · 数据结构',
    materialize(variantSeed) {
      const r = rng('deep-graph-edges', variantSeed);
      const n = r.int(5, 12);
      const edges = (n * (n - 1)) / 2;
      return buildNumericChoice({
        rng: r,
        stem: `含有 ${n} 个顶点的无向完全图，共有多少条边？`,
        correct: edges,
        wrong: [
          { value: n * n, misconception: '把顶点有序对个数当成了边数，忘了每条边只计一次。' },
          { value: (n * (n + 1)) / 2, misconception: '边数公式记成了 n(n+1)/2。' },
          { value: n * (n - 1), misconception: '按有序对计数，忽略了无向边不区分方向。' },
        ],
        explanation: `无向完全图每对顶点之间恰好一条边，共 C(${n}, 2) = ${n}×${n - 1}/2 = ${edges} 条。`,
      });
    },
  },
  {
    nodeId: 'knowledge-sort',
    branchId: '408',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '408 · 数据结构',
    materialize(variantSeed) {
      const r = rng('deep-sort-swap', variantSeed);
      const n = r.int(5, 9);
      const swaps = (n * (n - 1)) / 2;
      return buildNumericChoice({
        rng: r,
        stem: `对初始为严格递减（完全逆序）的 ${n} 个元素数组执行冒泡排序（每次交换相邻逆序对），总交换次数是多少？`,
        correct: swaps,
        wrong: [
          { value: n, misconception: '只统计了趟数，不是交换次数。' },
          { value: (n * (n + 1)) / 2, misconception: '逆序对数量算成了 n(n+1)/2。' },
          { value: n - 1, misconception: '误以为每趟只交换一次。' },
        ],
        explanation: `完全逆序数组的逆序对数量为 C(${n}, 2) = ${swaps}，冒泡排序每交换一次消除一个逆序对，因此总交换 ${swaps} 次。`,
      });
    },
  },
  {
    nodeId: 'knowledge-memory-system',
    branchId: '408',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '408 · 计算机组成原理',
    materialize(variantSeed) {
      const r = rng('deep-cache-block', variantSeed);
      const addr = r.int(1000, 65535);
      const block = Math.floor(addr / 64);
      return buildNumericChoice({
        rng: r,
        stem: `某 Cache 采用直接映射，块大小为 64 B。主存地址 ${addr}（十进制）对应的块号是多少？`,
        correct: block,
        wrong: [
          { value: addr % 64, misconception: '把块内偏移当成了块号。' },
          { value: Math.floor(addr / 1024), misconception: '块大小按 1 KB 计算了。' },
          { value: addr % 512, misconception: '把“Cache 总块数取模”当成了块号计算方式。' },
        ],
        explanation: `块号 = ⌊地址 ÷ 块大小⌋ = ⌊${addr} ÷ 64⌋ = ${block}；地址低 6 位（${addr % 64}）是块内偏移。`,
      });
    },
  },
  {
    nodeId: 'knowledge-process-thread',
    branchId: '408',
    type: 'single-choice',
    difficulty: 3,
    sourceLabel: '408 · 操作系统',
    materialize(variantSeed) {
      const r = rng('deep-thread-resource', variantSeed);
      const askShared = r.bool();
      const sharedPool = ['代码段与数据段', '堆空间', '打开的文件描述符', '进程地址空间整体'];
      const privatePool = ['线程栈与寄存器上下文', '程序计数器', '线程局部存储'];
      const stem = askShared
        ? '同一进程内的两个线程，下列哪一项是它们共享的资源？'
        : '同一进程内的两个线程，下列哪一项是每个线程私有的资源？';
      const correct = askShared ? r.pick(sharedPool) : r.pick(privatePool);
      const wrongPool = askShared ? privatePool : sharedPool;
      return buildChoice({
        rng: r,
        stem,
        correct,
        wrong: r.pickMany(wrongPool, 3).map((text) => ({
          text,
          misconception: '线程共享进程的地址空间、代码段、数据段、堆和打开文件；私有的是栈、寄存器上下文、程序计数器和线程局部存储。',
        })),
        explanation: '线程共享所属进程的代码段、数据段、堆和打开的文件；私有的只有栈、寄存器上下文、程序计数器与线程局部存储。',
      });
    },
  },
  {
    nodeId: 'knowledge-memory-management',
    branchId: '408',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '408 · 操作系统',
    materialize(variantSeed) {
      const r = rng('deep-page-number', variantSeed);
      const addr = r.int(100000, 400000000);
      const page = Math.floor(addr / 4096);
      return buildNumericChoice({
        rng: r,
        stem: `某系统采用分页存储，页面大小为 4 KB。虚拟地址 ${addr}（十进制）对应的页号是多少？`,
        correct: page,
        wrong: [
          { value: addr % 4096, misconception: '把页内偏移当成了页号。' },
          { value: Math.floor(addr / 1024), misconception: '页面大小按 1 KB 计算了。' },
          { value: Math.floor(addr / 65536), misconception: '页面大小按 64 KB 计算了。' },
        ],
        explanation: `页号 = ⌊地址 ÷ 页大小⌋ = ⌊${addr} ÷ 4096⌋ = ${page}；低 12 位（${addr % 4096}）是页内偏移。`,
      });
    },
  },
  {
    nodeId: DEEP_NODE_IDS_BY_NAME['操作系统 · 死锁与同步'],
    branchId: '408',
    type: 'single-choice',
    difficulty: 3,
    sourceLabel: '408 · 操作系统',
    materialize(variantSeed) {
      const r = rng('deep-deadlock-cond', variantSeed);
      const necessary = ['互斥访问', '占有并等待', '不可抢占', '循环等待'];
      const notNecessary = ['时间片轮转调度', '先来先服务调度', '多级反馈队列调度'];
      return buildChoice({
        rng: r,
        stem: '下列哪一项不是死锁成立的必要条件？',
        correct: r.pick(notNecessary),
        wrong: r.pickMany(necessary, 3).map((text) => ({
          text,
          misconception: '该项是死锁四个必要条件（互斥、占有并等待、不可抢占、循环等待）之一，属于必要条件。',
        })),
        explanation: '死锁的四个必要条件是：互斥访问、占有并等待、不可抢占、循环等待；调度算法本身不是必要条件。',
      });
    },
  },
  {
    nodeId: 'knowledge-tcp',
    branchId: '408',
    type: 'code-trace',
    difficulty: 4,
    sourceLabel: '408 · 计算机网络',
    materialize(variantSeed) {
      const r = rng('deep-tcp-cwnd', variantSeed);
      const t = r.int(3, 6);
      return buildNumericChoice({
        rng: r,
        stem: `TCP 拥塞控制处于慢启动阶段，拥塞窗口从 1 MSS 开始，每个 RTT 后翻倍且未达到门限值。经过 ${t} 个 RTT 后拥塞窗口是多少（MSS）？`,
        correct: 2 ** t,
        wrong: [
          { value: t + 1, misconception: '把指数增长当成了线性增长（拥塞避免阶段的行为）。' },
          { value: 2 * t, misconception: '把翻倍误当成每次加 2 MSS。' },
          { value: 2 ** (t - 1), misconception: '少算了一轮翻倍。' },
        ],
        explanation: `慢启动阶段每个 RTT 拥塞窗口翻倍：1→2→4→…，经过 ${t} 个 RTT 后为 2^${t} = ${2 ** t} MSS。`,
      });
    },
  },
  {
    nodeId: 'knowledge-http',
    branchId: '408',
    type: 'single-choice',
    difficulty: 2,
    sourceLabel: '408 · 计算机网络',
    materialize(variantSeed) {
      const r = rng('deep-http-status', variantSeed);
      const codes = [
        { code: 301, meaning: '资源已永久移动到新 URL' },
        { code: 302, meaning: '资源临时移动到其他 URL' },
        { code: 304, meaning: '资源未修改，可继续使用本地缓存副本' },
        { code: 403, meaning: '服务器理解请求但拒绝执行' },
        { code: 404, meaning: '请求的资源不存在' },
        { code: 502, meaning: '网关从上游收到无效响应' },
      ];
      const target = r.pick(codes);
      const others = r.pickMany(
        codes.filter((entry) => entry.code !== target.code),
        3,
      );
      return buildChoice({
        rng: r,
        stem: `HTTP 状态码 ${target.code} 的标准含义是什么？`,
        correct: target.meaning,
        wrong: others.map((entry) => ({
          text: entry.meaning,
          misconception: `把 ${target.code} 与 ${entry.code} 的语义混淆了。3xx 表示重定向与缓存协商，4xx 是客户端错误，5xx 是服务端错误。`,
        })),
        explanation: `${target.code} 表示：${target.meaning}。状态码按类别记忆：3xx 重定向与缓存、4xx 客户端错误、5xx 服务端错误。`,
      });
    },
  },
];

const DEEP_AI: DeepBlueprintDef[] = [
  {
    nodeId: 'knowledge-supervised-learning',
    branchId: 'ai',
    type: 'code-trace',
    difficulty: 2,
    sourceLabel: 'AI 工程 · 机器学习',
    materialize(variantSeed) {
      const r = rng('deep-supervised-split', variantSeed);
      const n = r.int(200, 900);
      const train = Math.round(n * 0.8);
      return buildNumericChoice({
        rng: r,
        stem: `一个监督学习数据集共有 ${n} 条样本，按 80% / 20% 划分训练集与测试集，训练集包含多少条样本？`,
        correct: train,
        wrong: [
          { value: Math.round(n * 0.2), misconception: '训练集与测试集的比例颠倒了。' },
          { value: Math.round(n * 0.9), misconception: '把常见但不同的 90/10 划分当成题设比例。' },
          { value: Math.floor(n / 2), misconception: '误按对半划分。' },
        ],
        explanation: `训练集 = 80% × ${n} = ${train} 条，测试集为 ${n - train} 条。划分必须固定随机种子保证可复现。`,
      });
    },
  },
  {
    nodeId: 'knowledge-neural-network',
    branchId: 'ai',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: 'AI 工程 · 深度学习',
    materialize(variantSeed) {
      const r = rng('deep-nn-update', variantSeed);
      const w0 = r.pick([1.0, 2.0, 3.5, 0.5]);
      const lr = r.pick([0.1, 0.2, 0.5]);
      const grad = r.pick([0.4, 0.8, 1.2]);
      const w1 = Math.round((w0 - lr * grad) * 100) / 100;
      return buildNumericChoice({
        rng: r,
        stem: `梯度下降参数更新公式为 w ← w - lr × grad。若当前 w = ${w0}，学习率 lr = ${lr}，梯度 grad = ${grad}，更新后的 w 是多少？`,
        correct: w1,
        wrong: [
          { value: Math.round((w0 + lr * grad) * 100) / 100, misconception: '更新方向反了：应沿负梯度方向下降。' },
          { value: Math.round(lr * grad * 100) / 100, misconception: '把更新量当成了新参数值，忘了在原值上做减法。' },
          { value: Math.round((w0 - grad) * 100) / 100, misconception: '漏乘了学习率。' },
        ],
        explanation: `w₁ = ${w0} - ${lr} × ${grad} = ${w1}。学习率过大时这一步会越过极小点造成震荡。`,
      });
    },
  },
  {
    nodeId: 'knowledge-transformer',
    branchId: 'ai',
    type: 'code-trace',
    difficulty: 4,
    sourceLabel: 'AI 工程 · Transformer',
    materialize(variantSeed) {
      const r = rng('deep-transformer-softmax', variantSeed);
      const a = r.pick([1, 2, 3, 4]);
      const e = Math.exp(a);
      const p = Math.round((e / (e + 1)) * 100) / 100;
      return buildNumericChoice({
        rng: r,
        stem: `注意力权重由打分经 softmax 得到。若两个位置的打分为 [${a}, 0]，第一个位置得到的权重约是多少（保留两位小数）？`,
        correct: p,
        wrong: [
          { value: Math.round((1 - p) * 100) / 100, misconception: '把两个位置的权重弄反了。' },
          { value: Math.round((a / (a + 1)) * 100) / 100, misconception: '没有先做指数运算，直接对原始打分做归一化。' },
          { value: 0.5, misconception: '忽略了打分差异，认为任意打分都得到均匀分布。' },
        ],
        explanation: `softmax([${a}, 0]) = [e^${a}, 1] / (e^${a} + 1) ≈ [${p}, ${Math.round((1 - p) * 100) / 100}]。指数放大了打分差异，因此第一个位置权重更高。`,
      });
    },
  },
  {
    nodeId: DEEP_NODE_IDS_BY_NAME['深度学习 · 注意力机制'],
    branchId: 'ai',
    type: 'single-choice',
    difficulty: 3,
    sourceLabel: 'AI 工程 · 深度学习',
    materialize(variantSeed) {
      const r = rng('deep-attention-uniform', variantSeed);
      return buildChoice({
        rng: r,
        stem: '自注意力中三个位置的打分完全相同（例如 [2, 2, 2]），经 softmax 后每个位置的权重是多少？',
        correct: '各约 0.33（均匀分布）',
        wrong: [
          { text: '各约 0.5', misconception: '按两个位置均分计算了，但这里是三个位置。' },
          { text: '各为 1.0', misconception: 'softmax 输出总和必须为 1，三个位置不可能各为 1。' },
          { text: '由位置编码决定', misconception: 'softmax 只看打分本身；打分相同就得到均匀分布，位置编码只影响打分的来源。' },
        ],
        explanation: 'softmax 对相同输入给出均匀分布：e^2/(3e^2) = 1/3 ≈ 0.33。这说明 softmax 保留的是相对差异，相同打分就没有差异。',
      });
    },
  },
  {
    nodeId: 'knowledge-rag',
    branchId: 'ai',
    type: 'ordering',
    difficulty: 3,
    sourceLabel: 'AI 工程 · LLM 应用',
    materialize(variantSeed) {
      const r = rng('deep-rag-pipeline', variantSeed);
      return buildOrdering({
        rng: r,
        stem: '把一次 RAG 检索问答的完整链路按执行顺序排列：',
        items: ['查询改写与向量化', '向量检索 top-k 文档', '重排与过滤', '组装上下文与提示', '模型生成回答', '引用与校验'],
        explanation: 'RAG 链路：先把用户查询改写并向量化，再从向量库检索 top-k，重排过滤后拼入上下文交给模型生成，最后做引用校验。整个过程中模型参数不变。',
        misconception: '顺序错乱通常来自把“生成”或“重排”提前。',
      });
    },
  },
  {
    nodeId: 'knowledge-vector-database',
    branchId: 'ai',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: 'AI 工程 · 数据工程',
    materialize(variantSeed) {
      const r = rng('deep-vector-cosine', variantSeed);
      const pool: Array<[[number, number], [number, number]]> = [
        [[3, 4], [4, 3]],
        [[1, 0], [0, 1]],
        [[2, 0], [3, 0]],
        [[1, 1], [2, 0]],
        [[3, 4], [3, 0]],
      ];
      const [[a1, a2], [b1, b2]] = r.pick(pool);
      const dot = a1 * b1 + a2 * b2;
      const normA = Math.sqrt(a1 * a1 + a2 * a2);
      const normB = Math.sqrt(b1 * b1 + b2 * b2);
      const cos = Math.round((dot / (normA * normB)) * 100) / 100;
      return buildNumericChoice({
        rng: r,
        stem: `两个二维向量 A = [${a1}, ${a2}] 与 B = [${b1}, ${b2}] 的余弦相似度约是多少（保留两位小数）？`,
        correct: cos,
        wrong: [
          { value: Math.round((dot / normA) * 100) / 100, misconception: '只除了一个向量的模，漏除了另一个。' },
          { value: dot, misconception: '把点积当成了余弦相似度，忘记归一化。' },
          { value: Math.round((dot / (normA * normB * 2)) * 100) / 100, misconception: '模的乘积多算了一个因子 2。' },
        ],
        explanation: `cos θ = (A·B)/(|A||B|) = ${dot} / (${normA.toFixed(2)} × ${normB.toFixed(2)}) ≈ ${cos}。余弦相似度只保留方向信息，与向量长度无关。`,
      });
    },
  },
  {
    nodeId: 'knowledge-model-serving',
    branchId: 'ai',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: 'AI 工程 · 模型服务',
    materialize(variantSeed) {
      const r = rng('deep-serving-p90', variantSeed);
      const latencies = Array.from({ length: 20 }, () => r.int(20, 200));
      const sorted = [...latencies].sort((a, b) => a - b);
      const p90 = sorted[Math.ceil(0.9 * 20) - 1];
      return buildNumericChoice({
        rng: r,
        stem: `某推理服务 20 次请求的延迟（ms）为：${latencies.join(', ')}。按最近邻法计算的 P90 延迟是多少（ms）？`,
        correct: p90,
        unit: ' ms',
        wrong: [
          { value: sorted[sorted.length - 1], misconception: '把 P90 当成了最大值（P100）。' },
          { value: Math.round(latencies.reduce((sum, value) => sum + value, 0) / 20), misconception: '把平均值当成了分位数。' },
          { value: sorted[9], misconception: '取了中位数（P50）附近的顺序统计量。' },
        ],
        explanation: `最近邻法：P90 = 第 ⌈0.9 × 20⌉ = 18 个顺序统计量 = ${p90} ms。平均数 ${Math.round(latencies.reduce((sum, value) => sum + value, 0) / 20)} ms 不能反映长尾。`,
      });
    },
  },
  {
    nodeId: 'knowledge-async-concurrency',
    branchId: 'ai',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: 'AI 工程 · Python 工程',
    materialize(variantSeed) {
      const r = rng('deep-async-gather', variantSeed);
      const durations = r.pickMany([1, 2, 3, 4, 5, 6], 3);
      const names = ['任务甲', '任务乙', '任务丙'];
      const pairs = names.map((name, index) => ({ name, duration: durations[index] }));
      const correctOrder = [...pairs].sort((a, b) => a.duration - b.duration);
      return buildOrdering({
        rng: r,
        stem: 'asyncio.gather 同时启动三个协程，它们的耗时分别为：' +
          pairs.map((pair) => `${pair.name} ${pair.duration} 秒`).join('、') +
          '。按完成先后排序：',
        items: correctOrder.map((pair) => `${pair.name}（${pair.duration} 秒）`),
        explanation: `并发执行时完成顺序由耗时决定：${correctOrder.map((pair) => pair.name).join(' → ')}。并发缩短的是总等待时间，不是单个任务的计算时间。`,
        misconception: '完成顺序容易按启动顺序排，而不是按耗时排。',
      });
    },
  },
];

const DEEP_GAME: DeepBlueprintDef[] = [
  {
    nodeId: 'knowledge-game-loop',
    branchId: 'game',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '游戏开发 · 游戏系统',
    materialize(variantSeed) {
      const r = rng('deep-game-loop-fixed', variantSeed);
      const deltas = [r.int(10, 25), r.int(10, 25), r.int(10, 25)];
      const total = deltas.reduce((sum, value) => sum + value, 0);
      const steps = Math.floor(total / 16);
      return buildNumericChoice({
        rng: r,
        stem: `固定时间步游戏循环的物理步长为 16 ms，连续三帧的帧时间为 ${deltas.join(' ms、')} ms（累加器机制，余量保留到下一帧）。这三帧共执行多少个物理步？`,
        correct: steps,
        wrong: [
          { value: Math.ceil(total / 16), misconception: '向上取整会把不足一个步长的余量提前消费，造成模拟超前。' },
          { value: steps + 1, misconception: '多算了一步：余量必须留到下一帧。' },
          { value: 3, misconception: '误以为每帧固定执行一个物理步；固定步长与帧率解耦。' },
        ],
        explanation: `累计帧时间 ${total} ms，⌊${total} / 16⌋ = ${steps} 步，剩余 ${total % 16} ms 进入下一帧的累加器。物理用固定步长保证确定性，渲染用插值平滑。`,
      });
    },
  },
  {
    nodeId: 'knowledge-matrix-transform',
    branchId: 'game',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '游戏开发 · 游戏数学',
    materialize(variantSeed) {
      const r = rng('deep-matrix-rotate', variantSeed);
      const x = r.pick([1, 2, 3, 4, -2, -3]);
      const y = r.pick([1, 2, 3, 4, -1, -4]);
      return buildChoice({
        rng: r,
        stem: `把点 (${x}, ${y}) 绕原点逆时针旋转 90° 后的坐标是：`,
        correct: `(${-y}, ${x})`,
        wrong: [
          { text: `(${y}, ${-x})`, misconception: '旋转方向反了：顺时针 90° 的结果。' },
          { text: `(${x}, ${-y})`, misconception: '做的是关于 x 轴的镜像，不是旋转。' },
          { text: `(${-x}, ${-y})`, misconception: '旋转了 180°，多转了一个象限。' },
        ],
        explanation: `逆时针 90° 的旋转矩阵作用为 (x, y) → (-y, x)，因此 (${x}, ${y}) → (${-y}, ${x})。矩阵乘法不满足交换律，组合变换时顺序不能交换。`,
      });
    },
  },
  {
    nodeId: 'knowledge-collision-detection',
    branchId: 'game',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '游戏开发 · 游戏引擎',
    materialize(variantSeed) {
      const r = rng('deep-collision-aabb', variantSeed);
      const ax1 = r.int(0, 6);
      const ax2 = ax1 + r.int(6, 12);
      const bx1 = ax1 + r.int(2, 8);
      const bx2 = bx1 + r.int(4, 10);
      const overlap = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
      return buildNumericChoice({
        rng: r,
        stem: `两个 AABB 在数轴上的投影区间分别为 [${ax1}, ${ax2}] 与 [${bx1}, ${bx2}]，重叠区间的长度是多少？`,
        correct: overlap,
        wrong: [
          { value: Math.max(ax2, bx2) - Math.min(ax1, bx1), misconception: '算了两个区间的外包长度，只有重叠时才等于重叠长度。' },
          { value: bx2 - bx1, misconception: '只算了第二个区间自己的长度。' },
          { value: Math.abs(ax2 - bx1), misconception: '端点相减与重叠长度没有直接关系。' },
        ],
        explanation: `重叠长度 = min(${ax2}, ${bx2}) - max(${ax1}, ${bx1}) = ${overlap}。二维 AABB 相交要求两个轴上的投影区间都重叠。`,
      });
    },
  },
  {
    nodeId: 'knowledge-rendering-pipeline',
    branchId: 'game',
    type: 'ordering',
    difficulty: 3,
    sourceLabel: '游戏开发 · 图形与性能',
    materialize(variantSeed) {
      const r = rng('deep-render-pipeline', variantSeed);
      return buildOrdering({
        rng: r,
        stem: '把 GPU 渲染管线的阶段按数据流动顺序排列：',
        items: ['顶点着色', '图元装配', '光栅化', '片段着色', '输出合并'],
        explanation: '管线是固定的硬件结构：顶点着色 → 图元装配 → 光栅化 → 片段着色 → 输出合并。着色器只在允许的阶段插入逻辑，不能调整阶段顺序。',
        misconception: '把光栅化放在图元装配之前是常见错误：先有图元才能被扫描转换。',
      });
    },
  },
  {
    nodeId: 'knowledge-input-system',
    branchId: 'game',
    type: 'single-choice',
    difficulty: 2,
    sourceLabel: '游戏开发 · 游戏引擎',
    materialize(variantSeed) {
      const r = rng('deep-input-polling', variantSeed);
      return buildChoice({
        rng: r,
        stem: '关于游戏中输入的轮询与事件两种处理方式，正确的说法是：',
        correct: '按住方向键持续移动适合轮询，离散按键触发适合事件回调。',
        wrong: [
          { text: '所有输入都必须用事件回调处理，轮询已被淘汰。', misconception: '轮询适合连续动作：每帧读取按键状态才能得到“按住中”的持续语义。' },
          { text: '轮询会漏掉任何按键，事件不会。', misconception: '轮询读取的是当前状态，与漏按键无关；漏按键通常与采样率有关。' },
          { text: '输入方式的选择与交互类型无关。', misconception: '连续量与离散事件对输入模式的要求不同。' },
        ],
        explanation: '轮询每帧读取当前状态，适合“按住”这类连续语义；事件在状态变化时触发一次，适合“按下/抬起”这类离散语义。按交互类型选择。',
      });
    },
  },
  {
    nodeId: DEEP_NODE_IDS_BY_NAME['游戏数学 · 四元数旋转'],
    branchId: 'game',
    type: 'single-choice',
    difficulty: 3,
    sourceLabel: '游戏开发 · 游戏数学',
    materialize(variantSeed) {
      const r = rng('deep-quaternion', variantSeed);
      return buildChoice({
        rng: r,
        stem: '游戏引擎中用四元数而不是欧拉角表示旋转的主要原因是什么？',
        correct: '避免万向节锁，并且旋转插值更平滑稳定。',
        wrong: [
          { text: '让旋转矩阵的乘法满足交换律。', misconception: '三维旋转本身不可交换，任何表示法都无法改变这一点。' },
          { text: '把存储开销减少到 2 个浮点数。', misconception: '四元数需要 4 个分量，比欧拉角的 3 个还多一个。' },
          { text: '让旋转计算速度比矩阵更快。', misconception: '选择四元数是为了避免奇点与插值质量，不是为了单次计算速度。' },
        ],
        explanation: '欧拉角在万向节锁处丢失一个自由度且插值不均匀；四元数没有奇点、可球面插值（slerp），组合旋转也更稳定。',
      });
    },
  },
  {
    nodeId: DEEP_NODE_IDS_BY_NAME['游戏引擎 · ECS架构'],
    branchId: 'game',
    type: 'single-choice',
    difficulty: 3,
    sourceLabel: '游戏开发 · 游戏引擎',
    materialize(variantSeed) {
      const r = rng('deep-ecs', variantSeed);
      return buildChoice({
        rng: r,
        stem: '关于 ECS（实体-组件-系统）架构，正确的描述是：',
        correct: '实体只是标识，数据放在组件、行为放在系统，用组合代替继承。',
        wrong: [
          { text: 'ECS 用更深的继承树组织游戏对象。', misconception: 'ECS 的动机恰恰是摆脱继承树：深继承导致组合爆炸与缓存不友好。' },
          { text: '把数据和行为都塞进单个实体对象。', misconception: '数据和行为的分离是 ECS 的核心：系统批量处理同类组件。' },
          { text: 'ECS 的主要作用是减少 Draw Call。', misconception: 'ECS 是代码组织方式；Draw Call 优化靠合批与实例化。' },
        ],
        explanation: 'ECS 中实体只是 id，组件是纯数据，系统是处理某类组件集合的逻辑。组合代替继承提高了复用性和缓存局部性。',
      });
    },
  },
];

const EVENT_LOOP_SCENARIOS = [
  {
    code: 'console.log("a");\nPromise.resolve().then(() => console.log("b"));\nsetTimeout(() => console.log("c"), 0);\nconsole.log("d");',
    correct: 'a, d, b, c',
    wrong: ['a, d, c, b', 'a, b, d, c', 'd, a, b, c'],
  },
  {
    code: 'setTimeout(() => console.log("x"), 0);\nPromise.resolve().then(() => console.log("y"));\nconsole.log("z");',
    correct: 'z, y, x',
    wrong: ['z, x, y', 'y, z, x', 'x, y, z'],
  },
  {
    code: 'console.log("1");\nsetTimeout(() => console.log("2"), 0);\nnew Promise((resolve) => { console.log("3"); resolve(); }).then(() => console.log("4"));\nconsole.log("5");',
    correct: '1, 3, 5, 4, 2',
    wrong: ['1, 3, 4, 5, 2', '1, 3, 5, 2, 4', '1, 2, 3, 4, 5'],
  },
  {
    code: 'Promise.resolve().then(() => { console.log("p"); return Promise.resolve(); }).then(() => console.log("q"));\nsetTimeout(() => console.log("r"), 0);',
    correct: 'p, r, q',
    wrong: ['p, q, r', 'r, p, q', 'q, p, r'],
  },
] as const;

const DEEP_FRONTEND: DeepBlueprintDef[] = [
  {
    nodeId: 'knowledge-event-loop',
    branchId: 'frontend',
    type: 'code-trace',
    difficulty: 4,
    sourceLabel: '前端开发 · JavaScript',
    materialize(variantSeed) {
      const r = rng('deep-event-loop', variantSeed);
      const scenario = EVENT_LOOP_SCENARIOS[variantSeed % EVENT_LOOP_SCENARIOS.length];
      return buildChoice({
        rng: r,
        stem: `以下代码的输出顺序是什么？\n\n${scenario.code}`,
        correct: scenario.correct,
        wrong: scenario.wrong.map((order) => ({
          text: order,
          misconception: '每轮事件循环先执行同步代码与一个宏任务，再清空整个微任务队列；Promise 回调是微任务，setTimeout 回调是宏任务。',
        })),
        explanation: '同步代码先执行；随后清空微任务队列（Promise then）；然后才取出下一个宏任务（setTimeout）。输出为 ' + scenario.correct + '。',
      });
    },
  },
  {
    nodeId: 'knowledge-react-state',
    branchId: 'frontend',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '前端开发 · React 工程',
    materialize(variantSeed) {
      const r = rng('deep-react-batch', variantSeed);
      const k = r.int(2, 4);
      return buildNumericChoice({
        rng: r,
        stem: `React 18 中，一次点击的事件处理函数里连续调用了 ${k} 次 setState（更新 ${k} 个不同状态），组件会重新渲染多少次？`,
        correct: 1,
        wrong: [
          { value: k, misconception: '把 React 18 之前的经典行为当成了当前行为：那时事件外的每次调用都可能触发一次渲染。' },
          { value: k + 1, misconception: '把首次渲染也计入了；批处理更新只算一次重渲染。' },
          { value: 0, misconception: '自动批处理不等于不渲染：状态确实更新并触发一次渲染。' },
        ],
        explanation: `React 18 起在事件处理函数内外都会自动批处理：${k} 次 setState 合并为一次重渲染。批处理影响的是渲染次数，不影响最终状态。`,
      });
    },
  },
  {
    nodeId: 'knowledge-browser-rendering',
    branchId: 'frontend',
    type: 'ordering',
    difficulty: 3,
    sourceLabel: '前端开发 · 浏览器与网络',
    materialize(variantSeed) {
      const r = rng('deep-browser-critical', variantSeed);
      return buildOrdering({
        rng: r,
        stem: '把浏览器从收到 HTML 到首次呈现的关键渲染路径按顺序排列：',
        items: ['解析 HTML 构建 DOM', '解析 CSS 构建 CSSOM', '合成渲染树', '布局计算', '绘制', '合成显示'],
        explanation: '关键渲染路径：DOM → CSSOM → 渲染树 → 布局 → 绘制 → 合成。CSSOM 未就绪会阻塞渲染，这是关键 CSS 内联的原因。',
        misconception: '把布局放在渲染树合成之前是常见错误：没有渲染树就没有可布局的元素集合。',
      });
    },
  },
  {
    nodeId: 'knowledge-web-performance',
    branchId: 'frontend',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '前端开发 · 前端质量',
    materialize(variantSeed) {
      const r = rng('deep-webperf-lcp', variantSeed);
      const candidates = Array.from({ length: 4 }, () => r.int(400, 4200));
      const lcp = Math.max(...candidates);
      return buildNumericChoice({
        rng: r,
        stem: `页面四个 LCP 候选元素的出现时间（ms）为 ${candidates.join('、')}。该页面的 LCP 约是多少 ms？`,
        correct: lcp,
        unit: ' ms',
        wrong: [
          { value: Math.min(...candidates), misconception: 'LCP 取最大候选而不是最小候选。' },
          { value: Math.round(candidates.reduce((sum, value) => sum + value, 0) / 4), misconception: 'LCP 不是平均值，是最大内容元素的绘制时间。' },
          { value: [...candidates].sort((a, b) => b - a)[1], misconception: '取了第二大值；LCP 就是最大候选的绘制时间。' },
        ],
        explanation: `LCP 是视口内最大内容元素完成绘制的时间，直接取最大候选：${lcp} ms。`,
      });
    },
  },
  {
    nodeId: 'knowledge-http-cache',
    branchId: 'frontend',
    type: 'single-choice',
    difficulty: 3,
    sourceLabel: '前端开发 · 浏览器与网络',
    materialize(variantSeed) {
      const r = rng('deep-http-cache', variantSeed);
      const maxAge = r.pick([3600, 86400, 604800]);
      const age = r.int(Math.floor(maxAge / 6), maxAge * 2);
      const fresh = age < maxAge;
      return buildChoice({
        rng: r,
        stem: `资源响应头为 Cache-Control: max-age=${maxAge}，本地副本的 Age 为 ${age} 秒。再次请求该资源时，浏览器的行为是：`,
        correct: fresh
          ? '命中强缓存，浏览器不发起网络请求，直接使用本地副本'
          : '发起协商缓存请求，服务器判定未变则返回 304 继续使用本地副本',
        wrong: fresh
          ? [
              { text: '发起协商缓存请求，可能返回 304', misconception: '强缓存未过期时根本不发起请求；只有过期后才走协商。' },
              { text: '直接下载新资源，不发起任何请求', misconception: '“下载新资源”本身就伴随请求；且未过期时两者都不会发生。' },
              { text: '丢弃本地副本并清除缓存', misconception: '缓存条目在有效期内会继续使用，不存在主动清除行为。' },
            ]
          : [
              { text: '命中强缓存，不发起网络请求', misconception: `Age（${age}）已超过 max-age（${maxAge}），强缓存已过期。` },
              { text: '直接下载新资源，不发起任何请求', misconception: '过期后浏览器会先发起协商请求，服务器确认变化才重新下载。' },
              { text: '丢弃本地副本并清除缓存', misconception: '过期不等于清除：304 时本地副本继续使用。' },
            ],
        explanation: `Age（${age} 秒）${fresh ? '小于' : '已超过'} max-age（${maxAge} 秒），因此${fresh ? '命中强缓存，不发请求' : '强缓存过期，发起协商请求，未变则 304'}。`,
      });
    },
  },
  {
    nodeId: 'knowledge-css-layout',
    branchId: 'frontend',
    type: 'single-choice',
    difficulty: 2,
    sourceLabel: '前端开发 · Web 基础',
    materialize(variantSeed) {
      const r = rng('deep-css-flex', variantSeed);
      return buildChoice({
        rng: r,
        stem: '关于 Flexbox 中 flex-direction: row 的主轴与对齐属性，正确的说法是：',
        correct: '主轴是水平方向，justify-content 控制主轴对齐，align-items 控制交叉轴对齐。',
        wrong: [
          { text: 'justify-content 控制交叉轴（垂直）对齐。', misconception: 'justify-content 永远作用于主轴；row 时主轴是水平的。' },
          { text: 'align-items 控制主轴对齐。', misconception: 'align-items 永远作用于交叉轴，与 justify-content 正好相反。' },
          { text: '主轴方向固定为垂直方向。', misconception: '主轴方向由 flex-direction 决定，row 为水平、column 为垂直。' },
        ],
        explanation: 'flex-direction 决定主轴方向：row 时主轴水平。justify-content 沿主轴分布，align-items 沿交叉轴对齐，两个属性不随书写方向交换。',
      });
    },
  },
  {
    nodeId: 'knowledge-type-system',
    branchId: 'frontend',
    type: 'code-trace',
    difficulty: 3,
    sourceLabel: '前端开发 · TypeScript',
    materialize(variantSeed) {
      const r = rng('deep-ts-narrow', variantSeed);
      const input = r.pick([['"abc"', 3], ['"hello"', 5], ['42', 42], ['7', 7]] as const);
      const isString = input[0].startsWith('"');
      const correct = isString ? input[1] : Number(input[0]);
      const code = 'function f(x: string | number) {\n  if (typeof x === "string") return x.length;\n  return x;\n}';
      return buildChoice({
        rng: r,
        stem: `以下 TypeScript 代码的返回值是什么？\n\n${code}\n\n调用 f(${input[0]})：`,
        correct: String(correct),
        wrong: [
          { text: 'undefined', misconception: '两个分支都有返回值，不存在 undefined。' },
          { text: String(correct + 1), misconception: '字符串分支返回长度，数值分支原样返回；多加一没有依据。' },
          { text: '0', misconception: '需要按传入类型走对应分支。' },
        ],
        explanation: isString
          ? `x 是字符串，走 typeof x === "string" 分支，返回 x.length = ${correct}。`
          : `x 是数字，跳过字符串分支，原样返回 ${correct}。类型收窄让每个分支内的 x 类型明确。`,
      });
    },
  },
];

export const DEEP_BLUEPRINT_DEFS: DeepBlueprintDef[] = [...DEEP_408, ...DEEP_AI, ...DEEP_GAME, ...DEEP_FRONTEND];

export const DEEP_BLUEPRINTS_BY_NODE_ID: ReadonlyMap<string, DeepBlueprintDef> = new Map(
  DEEP_BLUEPRINT_DEFS.map((def) => [def.nodeId, def]),
);
