/**
 * 深度分析结果
 */
export interface DeepAnalysisResult {
  keyPoints: string; // 核心要点（200-300 字）
  tags: string[]; // 智能标签（2-4 个）
  category: string; // 内容分类
  quotes: string; // 金句摘录（精选 2-3 句）
  relatedDocs: string; // 关联文档建议
}

/**
 * 任务类型
 */
export enum TaskType {
  ARTICLE_ANALYSIS = 'article_analysis',
}

/**
 * 文章分析任务数据
 */
export interface ArticleAnalysisTaskData {
  url: string;
  title: string;
  content: string;
  author: string;
  publishTime: string | null;
  recordId: string;
  messageId?: string;
}

/**
 * 队列任务
 */
export interface QueueTask {
  type: TaskType;
  data: ArticleAnalysisTaskData;
  timestamp?: number;
  retryCount?: number;
}
