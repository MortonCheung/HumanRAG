import type { KnowledgeNode } from '../../../graph/types';

/**
 * 模板化教学内容的句子块。所有句子经过人工审查，生成器只做参数替换，不现场造句。
 * 深度演示节点的教学内容在手写文件中覆盖这些模板。
 */

export function objectiveText(node: KnowledgeNode): string {
  return `理解「${node.name}」在所属体系中的位置，能独立完成围绕它的判断、推导与操作，并说清它与前置和后续知识的关系。`;
}

export function intuitionText(node: KnowledgeNode): string {
  return `${node.description}先建立一句话直觉：它解决什么问题、代价是什么，再用相邻知识验证这个直觉是否成立。`;
}

export function formalText(node: KnowledgeNode): string {
  const focus = node.keywords[0] ?? node.name;
  return `正式地看，「${node.name}」围绕${focus}展开：先明确它的定义与边界条件，再确认它成立的前提，最后指出它的适用范围。`;
}

export function applicationText(node: KnowledgeNode): string {
  const content = node.recommendedContent[0] ?? `${node.name}核心概念`;
  const second = node.recommendedContent[1] ?? `${node.name}关系梳理`;
  return `在考试与工程场景中，「${node.name}」常以${content}与${second}的形式出现。先识别问题类型，再决定使用哪条路径，避免把记忆的结论直接套到变式上。`;
}

export function diagnosticIntro(node: KnowledgeNode): string {
  return `开始讲解前，先用三道题确认你对「${node.name}」的前置知识掌握情况。诊断结果决定这一节从哪里讲起：基础不稳就先补基础，基础扎实就直接进入新知识。`;
}

export function workedExampleIntro(node: KnowledgeNode): string {
  return `下面两个示范围绕「${node.name}」展开。注意示范的步骤顺序：先明确已知条件，再选择方法，最后验证结果。`;
}

export function guidedPracticeIntro(node: KnowledgeNode): string {
  return `接下来做四道引导练习。每道题都可以先看提示再作答；答错时系统会指出具体误区并给出对应的前置知识。`;
}

export function independentCheckIntro(node: KnowledgeNode): string {
  return `最后独立完成三道检查题，检验你是否能在没有提示的情况下正确运用「${node.name}」。达到 80% 才算掌握，否则进入补救讲解。`;
}

export function summaryText(node: KnowledgeNode): string {
  return `本节围绕「${node.name}」完成了一次完整闭环：先诊断前置知识，再分三种视角讲解，经过示范与练习，最后用独立检查确认掌握。掌握证据已写回知识图谱，你可以回到知识空间查看它的上下游状态变化。`;
}

export function templateDiagram(node: KnowledgeNode): {
  kind: 'diagram';
  caption: string;
  nodes: string[];
  edges: Array<[string, string]>;
} {
  const parentName = node.type === 'knowledge' ? '所属课程' : '所属方向';
  const nextName = '后续知识';
  return {
    kind: 'diagram' as const,
    caption: `「${node.name}」在知识结构中的位置`,
    nodes: [parentName, node.name, nextName],
    edges: [
      [parentName, node.name],
      [node.name, nextName],
    ],
  };
}

export function templateWorkedExamples(node: KnowledgeNode): Array<{ title: string; prompt: string; walkthrough: string[] }> {
  return [
    {
      title: `示例一：识别「${node.name}」的适用条件`,
      prompt: `给出一个典型场景，判断它是否适合使用「${node.name}」，并说明理由。`,
      walkthrough: [
        '第一步：写出场景中的已知条件与目标。',
        `第二步：对照「${node.name}」的定义，检查场景是否满足前提条件。`,
        '第三步：如果满足，说明使用路径；如果不满足，指出缺少的条件并给出替代方案。',
      ],
    },
    {
      title: `示例二：用变式验证理解`,
      prompt: `把示例一的场景做一个参数变化，重新判断结论是否仍然成立。`,
      walkthrough: [
        '第一步：只改变一个参数，保持其余条件不变。',
        '第二步：重新对照定义推导结论。',
        '第三步：比较两次结论的差异，说清参数如何影响结果，避免死记结论。',
      ],
    },
  ];
}
