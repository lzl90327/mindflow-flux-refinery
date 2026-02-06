import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';
import { QueueTask, TaskType } from '../types';

/**
 * Redis 队列服务
 */
export class RedisQueue {
  private client: Redis;
  private readonly streamKey = 'mindflow:tasks';

  constructor() {
    this.client = new Redis(config.redis);

    this.client.on('connect', () => {
      logger.info('Redis 连接成功');
    });

    this.client.on('error', (error) => {
      logger.error('Redis 连接错误', { error: error.message });
    });
  }

  /**
   * 测试连接
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping 失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 消费任务（阻塞读取）
   */
  async consumeTask(
    groupName: string,
    consumerName: string,
    blockMs: number = 5000
  ): Promise<QueueTask | null> {
    try {
      // 确保消费者组存在
      await this.ensureGroup(groupName);

      // 从 Stream 读取消息
      const results: any = await (this.client as any).xreadgroup(
        'GROUP',
        groupName,
        consumerName,
        'BLOCK',
        blockMs,
        'COUNT',
        1,
        'STREAMS',
        this.streamKey,
        '>'
      );

      if (!results || results.length === 0) {
        return null;
      }

      const [streamKey, messages] = results[0];
      if (messages.length === 0) {
        return null;
      }

      const [messageId, fields] = messages[0];
      const taskData = this.parseMessage(fields);

      // 确认消息
      await this.client.xack(this.streamKey, groupName, messageId);

      logger.debug('消费任务成功', {
        messageId,
        type: taskData.type,
      });

      return taskData;
    } catch (error) {
      logger.error('消费任务失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 确保消费者组存在
   */
  private async ensureGroup(groupName: string): Promise<void> {
    try {
      await this.client.xgroup('CREATE', this.streamKey, groupName, '0', 'MKSTREAM');
      logger.debug(`消费者组创建成功: ${groupName}`);
    } catch (error: any) {
      // BUSYGROUP 错误表示组已存在，忽略
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  /**
   * 解析消息
   */
  private parseMessage(fields: string[]): QueueTask {
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    return {
      type: data.type as TaskType,
      data: JSON.parse(data.data),
      timestamp: parseInt(data.timestamp || '0', 10),
      retryCount: parseInt(data.retryCount || '0', 10),
    };
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis 连接已关闭');
  }
}

// 导出单例
export const redisQueue = new RedisQueue();
