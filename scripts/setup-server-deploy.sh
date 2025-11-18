#!/bin/bash

# 服务器部署设置脚本
# 此脚本用于在独立服务器上部署时，创建 frontend 目录的符号链接
# 这样既兼容 GitHub Pages（使用 docs 目录），又兼容服务器部署（使用 frontend 目录）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DOCS_DIR="$PROJECT_ROOT/docs"

echo "🔧 设置服务器部署环境..."

# 检查 docs 目录是否存在
if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ 错误: docs 目录不存在！"
    exit 1
fi

# 如果 frontend 目录已存在且不是符号链接，询问是否删除
if [ -e "$FRONTEND_DIR" ] && [ ! -L "$FRONTEND_DIR" ]; then
    echo "⚠️  警告: frontend 目录已存在且不是符号链接"
    read -p "是否删除并重新创建符号链接？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$FRONTEND_DIR"
    else
        echo "❌ 操作已取消"
        exit 1
    fi
fi

# 如果 frontend 是符号链接，先删除
if [ -L "$FRONTEND_DIR" ]; then
    rm "$FRONTEND_DIR"
fi

# 创建符号链接
ln -s docs "$FRONTEND_DIR"

echo "✅ 成功创建 frontend -> docs 符号链接"
echo "📁 现在可以使用 frontend 目录进行服务器部署了"
echo ""
echo "💡 提示:"
echo "   - GitHub Pages 会自动使用 docs 目录"
echo "   - 服务器部署可以使用 frontend 目录（指向 docs）"
echo "   - 两个目录指向同一份文件，无需维护两份代码"

