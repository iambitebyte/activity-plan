#!/bin/bash
set -e

npm run build
PORT=10034 pm2 start npm --name "qecon-tool" -- start
