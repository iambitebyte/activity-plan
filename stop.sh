#!/bin/bash

# 停止并移除 pm2 中的 qecon-tool 实例
cd "$(dirname "$0")"

if pm2 describe qecon-tool > /dev/null 2>&1; then
  pm2 stop qecon-tool
  pm2 delete qecon-tool
  pm2 save
  echo "[stop] ✓ qecon-tool 已停止并移除"
else
  echo "[stop] qecon-tool 未在运行"
fi
