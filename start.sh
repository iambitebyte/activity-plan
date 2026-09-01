#!/bin/bash
set -e

# 切换到脚本所在目录（项目根）
cd "$(dirname "$0")"

# ===== 1. 读取 .env =====
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "[start] .env 已加载"
else
  echo "[start] ⚠️ 未找到 .env，语音输入(STT)等依赖 API key 的功能将不可用" >&2
fi

# ===== 2. Node.js 最大内存 1024MB（构建与运行均生效）=====
export NODE_OPTIONS="--max-old-space-size=1024"

# ===== 3. 构建 =====
pnpm run build

# ===== 4. pm2 运行 =====
export PORT="${PORT:-10034}"
# 重复部署时先移除旧实例，避免 pm2 报名冲突
pm2 delete qecon-tool >/dev/null 2>&1 || true
pm2 start pnpm --name "qecon-tool" -- run start
pm2 save
echo "[start] ✓ qecon-tool 已启动，端口 ${PORT}（NODE_OPTIONS=${NODE_OPTIONS}）"
