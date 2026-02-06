import * as lark from '@larksuiteoapi/node-sdk';
import config from '../config';
import logger from '../utils/logger';

/**
 * 飞书客户端
 */
class LarkClient {
  private client: lark.Client;

  constructor() {
    this.client = new lark.Client({
      appId: config.feishu.appId,
      appSecret: config.feishu.appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
  }

  /**
   * 更新 Bitable 记录
   */
  async updateBitableRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<void> {
    try {
      const response = await this.client.bitable.appTableRecord.update({
        path: {
          app_token: appToken,
          table_id: tableId,
          record_id: recordId,
        },
        data: {
          fields,
        },
      });

      if (response.code !== 0) {
        throw new Error(`更新记录失败: ${response.msg || response.code}`);
      }

      logger.debug('Bitable 记录更新成功', {
        appToken,
        tableId,
        recordId,
        fields: Object.keys(fields),
      });
    } catch (error) {
      logger.error('Bitable 记录更新失败', {
        error: error instanceof Error ? error.message : String(error),
        appToken,
        tableId,
        recordId,
      });
      throw error;
    }
  }
}

// 导出单例
export const larkClient = new LarkClient();
