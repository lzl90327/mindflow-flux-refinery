import { redisQueue } from './services/redis-queue';
import { articleAnalyzer } from './analyzers/article-analyzer';
import { bitableUpdater } from './utils/bitable-updater';
import logger from './utils/logger';
import config from './config';
import { TaskType, ArticleAnalysisTaskData } from './types';

/**
 * MindFlow-Flux 知识提炼 Worker
 * 从 Redis 队列消费任务，执行深度分析，并更新 Bitable
 */
export class MindFlowRefineryWorker {
  private readonly consumerGroup = 'mindflow-refinery-group';
  private readonly consumerName: string;
  private isRunning = false;

  constructor() {
    this.consumerName = `worker-${process.pid}`;
  }

  /**
   * 启动 Worker
   */
  async start(): Promise<void> {
    this.isRunning = true;

    logger.info('========================================');
    logger.info('  MindFlow-Flux 知识提炼服务');
    logger.info('========================================');
    logger.info('Worker 启动', {
      consumerGroup: this.consumerGroup,
      consumerName: this.consumerName,
      concurrency: config.worker.concurrency,
    });

    // 检查 Redis 连接
    const isConnected = await redisQueue.ping();
    if (!isConnected) {
      logger.error('Redis 连接失败，Worker 无法启动');
      throw new Error('Redis 连接失败');
    }

    logger.info('✅ Redis 连接正常');
    logger.info('✅ 等待任务...');
    logger.info('');

    // 主循环
    while (this.isRunning) {
      try {
        await this.processNextTask();
      } catch (error) {
        logger.error('处理任务时发生错误', {
          error: error instanceof Error ? error.message : String(error),
        });

        // 短暂休息后继续
        await this.sleep(config.worker.pollInterval);
      }
    }

    logger.info('Worker 已停止');
  }

  /**
   * 停止 Worker
   */
  stop(): void {
    logger.info('正在停止 Worker...');
    this.isRunning = false;
  }

  /**
   * 处理下一个任务
   */
  private async processNextTask(): Promise<void> {
    // 从队列获取任务（阻塞 5 秒）
    const task = await redisQueue.consumeTask(
      this.consumerGroup,
      this.consumerName,
      config.worker.pollInterval
    );

    if (!task) {
      // 没有任务，继续等待
      return;
    }

    logger.info('🎯 开始处理任务', {
      type: task.type,
      recordId: task.data.recordId,
      title: task.data.title,
    });

    try {
      if (task.type === TaskType.ARTICLE_ANALYSIS) {
        await this.handleArticleAnalysis(task.data);
      } else {
        logger.warn('未知任务类型', { type: task.type });
      }
    } catch (error) {
      logger.error('任务处理失败', {
        error: error instanceof Error ? error.message : String(error),
        task,
      });

      // 标记为失败
      await bitableUpdater.markAsFailed(
        task.data.recordId,
        error instanceof Error ? error.message : '未知错误'
      );
    }
  }

  /**
   * 处理文章深度分析任务
   */
  private async handleArticleAnalysis(data: ArticleAnalysisTaskData): Promise<void> {
    const startTime = Date.now();

    logger.info('📖 开始深度分析', { title: data.title });

    // 执行深度分析
    const result = await articleAnalyzer.analyze(data.title, data.content, data.author);

    logger.info('💡 分析结果', {
      keyPointsLength: result.keyPoints.length,
      tagsCount: result.tags.length,
      category: result.category,
    });

    // 更新 Bitable
    await bitableUpdater.updateAnalysisResult(data.recordId, result);

    const elapsedTime = Date.now() - startTime;

    logger.info('✅ 任务完成', {
      recordId: data.recordId,
      title: data.title,
      elapsedMs: elapsedTime,
    });
    logger.info('');
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 主入口
 */
async function main() {
  logger.info('正在启动 MindFlow-Flux Refinery...');
  logger.info('');

  const worker = new MindFlowRefineryWorker();

  // 处理退出信号
  process.on('SIGINT', () => {
    logger.info('收到 SIGINT 信号');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('收到 SIGTERM 信号');
    worker.stop();
    process.exit(0);
  });

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.error('未处理的 Promise 拒绝', { reason });
    process.exit(1);
  });

  try {
    await worker.start();
  } catch (error) {
    logger.error('Worker 启动失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// 如果直接运行此文件，则启动 Worker
if (require.main === module) {
  main();
}

export { MindFlowRefineryWorker };
