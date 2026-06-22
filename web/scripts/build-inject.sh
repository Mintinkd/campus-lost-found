#!/bin/sh
# Cloudflare Pages 构建命令: sh scripts/build-inject.sh
# 环境变量在构建时可用，通过 sed 注入到静态文件中

set -e

echo "=== 构建时环境变量注入 ==="

API_BASE="${API_BASE:-/api/v1}"
APP_NAME="${APP_NAME:-校园失物招领}"
RECOGNITION_PROVIDER="${RECOGNITION_PROVIDER:-tensorflow}"
NOTIFICATION_PROVIDER="${NOTIFICATION_PROVIDER:-email}"

echo "API_BASE=${API_BASE}"
echo "APP_NAME=${APP_NAME}"

# 方式1: 生成 config.js 文件（构建时生成静态JS）
cat > config.js << EOF
window.__APP_CONFIG__ = {
  API_BASE: "${API_BASE}",
  APP_NAME: "${APP_NAME}",
  RECOGNITION_PROVIDER: "${RECOGNITION_PROVIDER}",
  NOTIFICATION_PROVIDER: "${NOTIFICATION_PROVIDER}"
};
EOF

echo "✓ config.js 已生成"

# 方式2: 替换 index.html 中的占位符
if [ -f index.html ]; then
  sed -i.bak \
    -e "s|__API_BASE__|${API_BASE}|g" \
    -e "s|__APP_NAME__|${APP_NAME}|g" \
    index.html
  rm -f index.html.bak
  echo "✓ index.html 占位符已替换"
fi

# 方式3: 替换 api.js 中的占位符
if [ -f api.js ]; then
  sed -i.bak \
    -e "s|__API_BASE__|${API_BASE}|g" \
    api.js
  rm -f api.js.bak
  echo "✓ api.js 占位符已替换"
fi

echo "=== 构建完成 ==="