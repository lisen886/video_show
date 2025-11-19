#!/bin/bash

# 检查后端服务器是否可用的脚本

BACKEND_URL="${1:-http://8.138.149.208:4000}"

echo "🔍 检查后端服务器连接..."
echo "📍 目标地址: $BACKEND_URL"
echo ""

# 检查健康端点
echo "1. 检查健康端点 ($BACKEND_URL/health)..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 5 "$BACKEND_URL/health" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 服务器响应正常 (HTTP $HTTP_CODE)"
    echo "📄 响应内容: $BODY"
else
    echo "❌ 服务器响应异常 (HTTP $HTTP_CODE)"
    echo "📄 响应内容: $BODY"
fi

echo ""

# 检查 API 配置端点
echo "2. 检查 API 配置端点 ($BACKEND_URL/api/config)..."
CONFIG_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 5 "$BACKEND_URL/api/config" 2>&1)
CONFIG_HTTP_CODE=$(echo "$CONFIG_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
CONFIG_BODY=$(echo "$CONFIG_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$CONFIG_HTTP_CODE" = "200" ]; then
    echo "✅ API 配置端点正常 (HTTP $CONFIG_HTTP_CODE)"
    echo "📄 响应内容: $CONFIG_BODY"
else
    echo "⚠️  API 配置端点响应: HTTP $CONFIG_HTTP_CODE"
    echo "📄 响应内容: $CONFIG_BODY"
fi

echo ""
echo "💡 提示:"
echo "   - 如果连接超时，请检查："
echo "     1. 服务器是否正在运行"
echo "     2. 防火墙是否开放了 4000 端口"
echo "     3. 服务器安全组是否允许访问"
echo "     4. 后端服务是否监听在 0.0.0.0:4000（而不是 127.0.0.1:4000）"

