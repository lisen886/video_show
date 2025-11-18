window.APP_CONFIG = window.APP_CONFIG || {};

/**
 * API_BASE_URL 示例：
 *   - 本地开发: http://localhost:4000/api
 *   - 生产环境: https://your-domain.com/api
 *
 * 部署到 GitHub Pages 时，请修改下方地址为您的后端公网地址。
 */
if (!window.APP_CONFIG.API_BASE_URL) {
  window.APP_CONFIG.API_BASE_URL =
    window.APP_DEFAULT_API_BASE_URL || 'http://localhost:4000/api';
}

