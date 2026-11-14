#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 offline/serve.py
fi
printf '需要 Python 3。安装后再双击启动，或用任意静态服务器打开 dist 文件夹。\n'
read -r answer
