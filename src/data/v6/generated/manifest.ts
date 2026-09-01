import { knowledgeGraph } from '../../knowledgeGraph';
import { SYSTEM_LIBRARY_DEFS, UNIVERSITY_TEMPLATES } from '../catalogs/knowledgeBaseCatalog';
import { QUESTION_COUNTS, getQuestion, listQuestionIdsByBranch, MOCK_PAPERS } from '../generators/generateQuestionVariants';
import { TEACHING_UNIT_COUNT, TEACHING_CONTENT_BLOCK_COUNT, TEACHING_UNITS_BY_NODE_ID } from '../generators/generateTeachingUnit';
import { DEMO_HISTORY_COUNTS } from '../generators/generateDemoHistory';
import { DEEP_NODE_COUNT } from '../handcrafted/deepNodes';
import { MISCONCEPTIONS } from '../catalogs/misconceptionCatalog';

/**
 * 数据域总清单：只做汇总与轻量索引。
 * 题目实例按需物化（getQuestion），索引仅保存 id 字符串。
 */

export const DATA_MANIFEST = {
  knowledgeNodes: knowledgeGraph.nodes.length,
  knowledgeEdges: knowledgeGraph.edges.length,
  teachingUnits: TEACHING_UNIT_COUNT,
  teachingContentBlocks: TEACHING_CONTENT_BLOCK_COUNT,
  deepDemoNodes: DEEP_NODE_COUNT,
  questions: QUESTION_COUNTS,
  misconceptions: MISCONCEPTIONS.length,
  systemLibraries: SYSTEM_LIBRARY_DEFS.length,
  universityTemplates: UNIVERSITY_TEMPLATES.length,
  mockPapers: MOCK_PAPERS.length,
  demoHistory: DEMO_HISTORY_COUNTS,
} as const;

export { getQuestion, listQuestionIdsByBranch, MOCK_PAPERS, TEACHING_UNITS_BY_NODE_ID };
