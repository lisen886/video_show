// PM2 配置文件（宝塔面板推荐使用 PM2 管理 Node.js 应用）

module.exports = {
  apps: [{
    name: 'video-show-backend',
    script: './src/server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: '0.0.0.0', // 重要：监听所有网络接口
      // 根据需要设置其他环境变量
      // CLIENT_ORIGIN: 'http://your-domain.com,https://your-domain.com',
      // STORAGE_DRIVER: 'local',
      // ADMIN_USERNAME: 'admin',
      // ADMIN_PASSWORD: 'your-password',
      // JWT_SECRET: 'your-secret-key',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};

