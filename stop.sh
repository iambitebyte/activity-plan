#!/bin/bash

if pm2 describe qecon-tool > /dev/null 2>&1; then
  pm2 stop qecon-tool
  pm2 delete qecon-tool
  echo "qecon-tool stopped"
else
  echo "qecon-tool is not running"
fi
