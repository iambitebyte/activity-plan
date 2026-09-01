export const STAGES = [
  "需求规划",
  "架构设计",
  "编码",
  "代码评审",
  "测试",
  "发布",
  "运维",
] as const;

export type Stage = (typeof STAGES)[number];

/** 无阶段标签的演讲（组织/全周期话题） */
export const NO_STAGE = "全周期·组织";

export interface StageMeta {
  name: string;
  /** 徽章样式（浅色） */
  badge: string;
  /** 实心块样式（可视化主色块） */
  solid: string;
  /** 条形图填充色 */
  bar: string;
  /** 深色文字 */
  text: string;
  /** 图标（emoji） */
  icon: string;
  /** 阶段的一句话作用描述（用于可视化页） */
  role: string;
}

export const STAGE_META: Record<string, StageMeta> = {
  需求规划: {
    name: "需求规划",
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
    solid: "bg-violet-500 text-white",
    bar: "bg-violet-500",
    text: "text-violet-700",
    icon: "📋",
    role: "意图→规格：Spec-Driven、需求智能体",
  },
  架构设计: {
    name: "架构设计",
    badge: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    solid: "bg-cyan-500 text-white",
    bar: "bg-cyan-500",
    text: "text-cyan-700",
    icon: "🏗️",
    role: "AI 友好架构与架构治理",
  },
  编码: {
    name: "编码",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    solid: "bg-blue-500 text-white",
    bar: "bg-blue-500",
    text: "text-blue-700",
    icon: "⌨️",
    role: "AI Coding、多智能体协作、Harness",
  },
  代码评审: {
    name: "代码评审",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    solid: "bg-amber-500 text-white",
    bar: "bg-amber-500",
    text: "text-amber-700",
    icon: "🔍",
    role: "代码质量门禁、技术债与安全治理",
  },
  测试: {
    name: "测试",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    solid: "bg-emerald-500 text-white",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    icon: "🧪",
    role: "智能测试、评测体系、质量保障",
  },
  发布: {
    name: "发布",
    badge: "bg-orange-50 text-orange-700 border border-orange-200",
    solid: "bg-orange-500 text-white",
    bar: "bg-orange-500",
    text: "text-orange-700",
    icon: "🚀",
    role: "交付闭环、门禁与发版决策",
  },
  运维: {
    name: "运维",
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    solid: "bg-rose-500 text-white",
    bar: "bg-rose-500",
    text: "text-rose-700",
    icon: "🛠️",
    role: "AgentOps、SRE、故障定位与快恢",
  },
  [NO_STAGE]: {
    name: NO_STAGE,
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    solid: "bg-gray-400 text-white",
    bar: "bg-gray-400",
    text: "text-gray-600",
    icon: "🌐",
    role: "横跨全周期的组织与度量话题",
  },
};

export function getStageMeta(stage: string): StageMeta {
  return STAGE_META[stage] ?? STAGE_META[NO_STAGE];
}

/** 筛选选项：7 阶段 + 全周期·组织 */
export const STAGE_FILTER_OPTIONS: string[] = [...STAGES, NO_STAGE];
