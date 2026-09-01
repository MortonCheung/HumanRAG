import type { LearnerProfile } from '../schemas/progressSchema';

/** 24 个演示画像，默认画像含 90 天学习时间线。 */
export const LEARNER_PROFILES: LearnerProfile[] = [
  { id: 'learner-001', name: '演示学习者', major: '计算机科学与技术', identity: '大三', goal: '计算机考研408', branchId: '408', isDefault: true },
  { id: 'learner-002', name: '陈之遥', major: '软件工程', identity: '大三', goal: '计算机考研408', branchId: '408', isDefault: false },
  { id: 'learner-003', name: '林晚舟', major: '计算机科学与技术', identity: '大二', goal: '考研408', branchId: '408', isDefault: false },
  { id: 'learner-004', name: '周砚秋', major: '网络工程', identity: '大四', goal: '计算机408', branchId: '408', isDefault: false },
  { id: 'learner-005', name: '吴一帆', major: '信息安全', identity: '大三', goal: '计算机研究生', branchId: '408', isDefault: false },
  { id: 'learner-006', name: '沈星河', major: '人工智能', identity: '大三', goal: 'AI工程师', branchId: 'ai', isDefault: false },
  { id: 'learner-007', name: '顾清让', major: '数据科学', identity: '研一', goal: '机器学习工程师', branchId: 'ai', isDefault: false },
  { id: 'learner-008', name: '苏见夏', major: '自动化', identity: '大四', goal: 'LLM应用工程', branchId: 'ai', isDefault: false },
  { id: 'learner-009', name: '何知微', major: '数学与应用数学', identity: '大三', goal: 'AI工程', branchId: 'ai', isDefault: false },
  { id: 'learner-010', name: '孟流萤', major: '智能科学', identity: '研二', goal: 'AI工程师', branchId: 'ai', isDefault: false },
  { id: 'learner-011', name: '季白露', major: '数字媒体技术', identity: '大三', goal: '游戏开发工程师', branchId: 'game', isDefault: false },
  { id: 'learner-012', name: '谢云帆', major: '计算机科学与技术', identity: '大二', goal: '游戏引擎开发', branchId: 'game', isDefault: false },
  { id: 'learner-013', name: '闻人朔', major: '电子信息', identity: '大四', goal: '游戏工程师', branchId: 'game', isDefault: false },
  { id: 'learner-014', name: '阮青梧', major: '软件工程', identity: '研一', goal: '游戏开发', branchId: 'game', isDefault: false },
  { id: 'learner-015', name: '姜叙白', major: '数字媒体艺术', identity: '大三', goal: '游戏开发工程师', branchId: 'game', isDefault: false },
  { id: 'learner-016', name: '池墨言', major: '软件工程', identity: '大三', goal: '前端工程师', branchId: 'frontend', isDefault: false },
  { id: 'learner-017', name: '傅明夜', major: '计算机科学与技术', identity: '大四', goal: 'React前端', branchId: 'frontend', isDefault: false },
  { id: 'learner-018', name: '盛千树', major: '电子商务', identity: '大二', goal: 'Web前端', branchId: 'frontend', isDefault: false },
  { id: 'learner-019', name: '宁初霁', major: '信息管理', identity: '大三', goal: '前端开发', branchId: 'frontend', isDefault: false },
  { id: 'learner-020', name: '屈向晚', major: '软件工程', identity: '研一', goal: '前端工程师', branchId: 'frontend', isDefault: false },
  { id: 'learner-021', name: '段可颂', major: '计算机科学与技术', identity: '大二', goal: '计算机考研408', branchId: '408', isDefault: false },
  { id: 'learner-022', name: '路望舒', major: '通信工程', identity: '大三', goal: 'AI工程', branchId: 'ai', isDefault: false },
  { id: 'learner-023', name: '邵聿修', major: '物联网工程', identity: '大四', goal: '游戏开发', branchId: 'game', isDefault: false },
  { id: 'learner-024', name: '岑语冰', major: '视觉传达', identity: '大三', goal: 'Web前端', branchId: 'frontend', isDefault: false },
];

export const DEFAULT_LEARNER = LEARNER_PROFILES[0];
