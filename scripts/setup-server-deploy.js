#!/usr/bin/env node

/**
 * 服务器部署设置脚本（Node.js 版本）
 * 此脚本用于在独立服务器上部署时，创建 frontend 目录的符号链接
 * 这样既兼容 GitHub Pages（使用 docs 目录），又兼容服务器部署（使用 frontend 目录）
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

console.log('🔧 设置服务器部署环境...');

// 检查 docs 目录是否存在
if (!fs.existsSync(DOCS_DIR)) {
  console.error('❌ 错误: docs 目录不存在！');
  process.exit(1);
}

// 如果 frontend 目录已存在且不是符号链接
if (fs.existsSync(FRONTEND_DIR)) {
  try {
    const stats = fs.lstatSync(FRONTEND_DIR);
    if (!stats.isSymbolicLink()) {
      console.log('⚠️  警告: frontend 目录已存在且不是符号链接');
      console.log('💡 提示: 请手动删除 frontend 目录后重新运行此脚本');
      process.exit(1);
    } else {
      // 是符号链接，先删除
      fs.unlinkSync(FRONTEND_DIR);
      console.log('🔄 删除旧的符号链接');
    }
  } catch (error) {
    console.error('❌ 检查 frontend 目录时出错:', error.message);
    process.exit(1);
  }
}

// 创建符号链接
try {
  // 使用相对路径创建符号链接，这样更便携
  const relativePath = path.relative(path.dirname(FRONTEND_DIR), DOCS_DIR);
  fs.symlinkSync(relativePath, FRONTEND_DIR, 'dir');
  console.log('✅ 成功创建 frontend -> docs 符号链接');
  console.log('📁 现在可以使用 frontend 目录进行服务器部署了');
  console.log('');
  console.log('💡 提示:');
  console.log('   - GitHub Pages 会自动使用 docs 目录');
  console.log('   - 服务器部署可以使用 frontend 目录（指向 docs）');
  console.log('   - 两个目录指向同一份文件，无需维护两份代码');
} catch (error) {
  console.error('❌ 创建符号链接失败:', error.message);
  if (process.platform === 'win32') {
    console.error('💡 Windows 系统可能需要管理员权限来创建符号链接');
    console.error('   或者使用: mklink /D frontend docs');
  }
  process.exit(1);
}

