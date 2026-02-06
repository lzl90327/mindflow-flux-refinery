import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 根据环境加载对应的 .env 文件
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  console.log(`📁 加载配置文件: ${envFile} (${env})`);
  dotenv.config({ path: envPath });
} else {
  console.log(`⚠️  未找到 ${envFile}，使用默认 .env`);
  dotenv.config();
}

/**
 * Redis 配置
 */
export const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

/**
 * 飞书配置
 */
export const feishu = {
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
};

/**
 * 多维表格配置
 */
export const bitable = {
  appToken: process.env.BITABLE_APP_TOKEN || '',
  tableId: process.env.BITABLE_TABLE_ID || '',
};

/**
 * DeepSeek API 配置
 */
export const deepseek = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
};

/**
 * Worker 配置
 */
export const worker = {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
  pollInterval: parseInt(process.env.POLL_INTERVAL || '5000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
};

/**
 * 日志配置
 */
export const logging = {
  level: process.env.LOG_LEVEL || 'info',
};

/**
 * 环境配置
 */
export const env_config = {
  isDevelopment: env === 'development',
  isProduction: env === 'production',
  nodeEnv: env,
};

// 校验必需的环境变量
function validateConfig() {
  const required = [
    'REDIS_HOST',
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET',
    'BITABLE_APP_TOKEN',
    'BITABLE_TABLE_ID',
    'DEEPSEEK_API_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ 缺少必需的环境变量: ${missing.join(', ')}`);
    console.error(`请检查 .env 文件或环境变量配置`);
    process.exit(1);
  }

  console.log('✅ 环境变量校验通过');
}

// 开发环境下校验配置
if (!env_config.isProduction) {
  validateConfig();
}

export default {
  redis,
  feishu,
  bitable,
  deepseek,
  worker,
  logging,
  env: env_config,
};
