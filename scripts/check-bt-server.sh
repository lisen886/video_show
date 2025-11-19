#!/bin/bash

# 宝塔服务器环境检查脚本

echo "🔍 宝塔服务器环境检查"
echo "===================="
echo ""

# 检查 Node.js
echo "1. 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js 已安装: $NODE_VERSION"
else
    echo "❌ Node.js 未安装"
    echo "   请在宝塔面板「软件商店」中安装 Node.js"
fi

# 检查 PM2
echo ""
echo "2. 检查 PM2..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo "✅ PM2 已安装: v$PM2_VERSION"
    
    # 检查后端服务
    if pm2 list | grep -q "video-show-backend"; then
        echo "✅ 后端服务正在运行"
        pm2 list | grep "video-show-backend"
    else
        echo "⚠️  后端服务未运行"
        echo "   运行: cd backend && pm2 start ecosystem.config.js"
    fi
else
    echo "❌ PM2 未安装"
    echo "   请在宝塔面板「软件商店」中安装 PM2"
fi

# 检查端口
echo ""
echo "3. 检查端口 4000..."
if netstat -tlnp 2>/dev/null | grep -q ":4000" || ss -tlnp 2>/dev/null | grep -q ":4000"; then
    echo "✅ 端口 4000 正在监听"
    netstat -tlnp 2>/dev/null | grep ":4000" || ss -tlnp 2>/dev/null | grep ":4000"
else
    echo "❌ 端口 4000 未监听"
    echo "   请检查后端服务是否启动"
fi

# 检查本地连接
echo ""
echo "4. 检查本地服务连接..."
LOCAL_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 2 http://localhost:4000/health 2>&1)
HTTP_CODE=$(echo "$LOCAL_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 本地服务响应正常"
    echo "   响应: $(echo "$LOCAL_RESPONSE" | sed '/HTTP_CODE/d')"
else
    echo "❌ 本地服务无响应 (HTTP $HTTP_CODE)"
fi

# 检查防火墙
echo ""
echo "5. 检查防火墙..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "4000"; then
        echo "✅ UFW 防火墙已开放 4000 端口"
    else
        echo "⚠️  UFW 防火墙未开放 4000 端口"
        echo "   运行: sudo ufw allow 4000/tcp"
    fi
elif command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --list-ports 2>/dev/null | grep -q "4000"; then
        echo "✅ Firewalld 已开放 4000 端口"
    else
        echo "⚠️  Firewalld 未开放 4000 端口"
        echo "   请在宝塔面板「安全」中开放 4000 端口"
    fi
else
    echo "⚠️  未检测到防火墙工具"
    echo "   请手动检查宝塔面板「安全」设置"
fi

# 检查项目目录
echo ""
echo "6. 检查项目目录..."
if [ -d "/www/wwwroot/video-show" ]; then
    echo "✅ 项目目录存在: /www/wwwroot/video-show"
    
    if [ -f "/www/wwwroot/video-show/backend/package.json" ]; then
        echo "✅ backend 目录存在"
    else
        echo "❌ backend 目录不存在或 package.json 缺失"
    fi
    
    if [ -d "/www/wwwroot/video-show/backend/node_modules" ]; then
        echo "✅ node_modules 已安装"
    else
        echo "⚠️  node_modules 未安装"
        echo "   运行: cd /www/wwwroot/video-show/backend && npm install"
    fi
else
    echo "⚠️  项目目录不存在: /www/wwwroot/video-show"
    echo "   请先上传项目文件"
fi

# 检查环境变量
echo ""
echo "7. 检查环境变量配置..."
if [ -f "/www/wwwroot/video-show/backend/.env" ]; then
    echo "✅ .env 文件存在"
    if grep -q "HOST=0.0.0.0" /www/wwwroot/video-show/backend/.env 2>/dev/null; then
        echo "✅ HOST 已设置为 0.0.0.0"
    else
        echo "⚠️  HOST 未设置为 0.0.0.0"
        echo "   请在 .env 中添加: HOST=0.0.0.0"
    fi
else
    echo "⚠️  .env 文件不存在（可选）"
    echo "   建议创建 .env 文件配置环境变量"
fi

echo ""
echo "===================="
echo "💡 提示："
echo "   - 如果端口未监听，检查 PM2 服务状态: pm2 status"
echo "   - 查看 PM2 日志: pm2 logs video-show-backend"
echo "   - 宝塔面板「安全」中需要开放 4000 端口"
echo "   - 阿里云安全组也需要开放 4000 端口"
echo "   - 确保后端监听在 0.0.0.0:4000 而不是 127.0.0.1:4000"

