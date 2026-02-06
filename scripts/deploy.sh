#!/bin/bash

#================================================================
# MindFlow-Flux Refinery 部署脚本
#================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器配置
REMOTE_HOST="lizuolin_cloud@100.117.165.59"
REMOTE_DIR="/Users/lizuolin_cloud/mindflow-flux-refinery"
SERVICE_NAME="mindflow-refinery"

echo ""
echo "========================================"
echo "  MindFlow-Flux Refinery 部署脚本"
echo "  环境: production"
echo "========================================"
echo ""

#----------------------------------------------------------------
# 步骤 1: 本地构建检查
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 1/7: 本地构建检查..."
echo -e "${BLUE}[INFO]${NC}   编译 TypeScript..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK]${NC}   构建成功"
else
    echo -e "${RED}[ERROR]${NC} 构建失败"
    exit 1
fi

#----------------------------------------------------------------
# 步骤 2: 同步代码到云服务器
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 2/7: 同步代码到云服务器..."

# 创建远程目录
ssh $REMOTE_HOST "mkdir -p $REMOTE_DIR"

# 同步文件（排除 node_modules 和 logs）
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'logs' \
    --exclude '.git' \
    --exclude '.env.development' \
    --exclude '.env.local' \
    --exclude '*.log' \
    ./ $REMOTE_HOST:$REMOTE_DIR/

echo -e "${GREEN}[OK]${NC}   代码同步完成"

#----------------------------------------------------------------
# 步骤 3: 复制环境变量（如果不存在）
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 3/7: 检查环境变量..."

ssh $REMOTE_HOST << 'EOF'
cd /Users/lizuolin_cloud/mindflow-flux-refinery
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production 不存在，从 .env.example 复制"
    cp .env.example .env.production
    echo "📝 请编辑 .env.production 填入正确的配置："
    echo "   vim /Users/lizuolin_cloud/mindflow-flux-refinery/.env.production"
    exit 1
fi
EOF

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[WARN]${NC} 需要先配置环境变量"
    echo ""
    echo "请在服务器上执行："
    echo "  ssh $REMOTE_HOST"
    echo "  vim $REMOTE_DIR/.env.production"
    echo ""
    echo "配置完成后，重新运行此脚本"
    exit 1
fi

echo -e "${GREEN}[OK]${NC}   环境变量已配置"

#----------------------------------------------------------------
# 步骤 4: 远程安装依赖
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 4/7: 远程安装依赖..."

ssh $REMOTE_HOST << 'EOF'
cd /Users/lizuolin_cloud/mindflow-flux-refinery
npm install
EOF

echo -e "${GREEN}[OK]${NC}   依赖安装完成"

#----------------------------------------------------------------
# 步骤 5: 远程构建
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 5/7: 远程构建..."

ssh $REMOTE_HOST << 'EOF'
cd /Users/lizuolin_cloud/mindflow-flux-refinery
npm run build
EOF

echo -e "${GREEN}[OK]${NC}   远程构建完成"

#----------------------------------------------------------------
# 步骤 6: 创建日志目录
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 6/7: 创建日志目录..."

ssh $REMOTE_HOST << 'EOF'
cd /Users/lizuolin_cloud/mindflow-flux-refinery
mkdir -p logs
EOF

echo -e "${GREEN}[OK]${NC}   日志目录已创建"

#----------------------------------------------------------------
# 步骤 7: 启动/重启服务
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 7/7: 启动服务..."

# 检查服务是否已存在
SERVICE_EXISTS=$(ssh $REMOTE_HOST "pm2 list | grep -c '$SERVICE_NAME' || true")

if [ "$SERVICE_EXISTS" -gt 0 ]; then
    echo "服务已存在，执行重启..."
    ssh $REMOTE_HOST << EOF
cd /Users/lizuolin_cloud/mindflow-flux-refinery
NODE_ENV=production pm2 restart $SERVICE_NAME
pm2 save
EOF
    echo -e "${GREEN}[OK]${NC}   服务已重启"
else
    echo "首次部署，启动新服务..."
    ssh $REMOTE_HOST << EOF
cd /Users/lizuolin_cloud/mindflow-flux-refinery
NODE_ENV=production pm2 start ecosystem.config.js
pm2 save
EOF
    echo -e "${GREEN}[OK]${NC}   服务已启动"
fi

#----------------------------------------------------------------
# 步骤 8: 健康检查
#----------------------------------------------------------------
echo -e "${BLUE}[INFO]${NC} 步骤 8/7: 健康检查..."
echo ""

sleep 3

echo -e "${BLUE}[INFO]${NC} PM2 服务状态:"
ssh $REMOTE_HOST "pm2 list | grep -A 1 '$SERVICE_NAME' || pm2 list"

echo ""
echo -e "${BLUE}[INFO]${NC} 最近日志 (最后 20 行):"
ssh $REMOTE_HOST "pm2 logs $SERVICE_NAME --lines 20 --nostream || tail -20 /Users/lizuolin_cloud/mindflow-flux-refinery/logs/refinery.log"

echo ""
echo "========================================"
echo -e "${GREEN}[OK]${NC} 部署完成！"
echo "========================================"
echo ""
echo "常用命令："
echo "  查看日志:  ssh $REMOTE_HOST 'pm2 logs $SERVICE_NAME'"
echo "  查看状态:  ssh $REMOTE_HOST 'pm2 status'"
echo "  重启服务:  ssh $REMOTE_HOST 'pm2 restart $SERVICE_NAME'"
echo "  停止服务:  ssh $REMOTE_HOST 'pm2 stop $SERVICE_NAME'"
echo ""
