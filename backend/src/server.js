const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const videoRoutes = require('./routes/videos');
const authRoutes = require('./routes/auth');
const gradesRoutes = require('./routes/grades');
const settingsRoutes = require('./routes/settings');
const studentsRoutes = require('./routes/students');
const viewStatsRoutes = require('./routes/viewStats');
const collectionsRoutes = require('./routes/collections');
const {
  PORT,
  CLIENT_ORIGIN,
  UPLOAD_DIR,
  DATA_FILE,
  STUDENT_REFRESH_INTERVAL_MS,
  ALLOWED_GRADES,
  GRADE_ACCESS_TOKENS,
  STORAGE_DRIVER,
  ALLOW_PLAYBACK_SEEK,
} = require('./config');

function ensureEnvironment() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const dataDir = path.dirname(DATA_FILE);
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
}

function createApp() {
  ensureEnvironment();

  const app = express();

  const corsOptions = {};
  if (CLIENT_ORIGIN) {
    const origins = CLIENT_ORIGIN.split(',').map((item) => item.trim());
    corsOptions.origin = origins;
  } else {
    corsOptions.origin = '*';
  }

  app.use(cors(corsOptions));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/api/config', async (_req, res) => {
    try {
      const { readGrades } = require('./storage/grades');
      const { readSettings } = require('./storage/settings');
      const grades = await readGrades();
      const settings = await readSettings();
      res.json({
        studentRefreshIntervalMs: STUDENT_REFRESH_INTERVAL_MS,
        allowedGrades: grades,
        requireAccessKey: Object.keys(GRADE_ACCESS_TOKENS).length > 0,
        storageDriver: STORAGE_DRIVER,
        allowPlaybackSeek: settings.allowPlaybackSeek,
      });
    } catch (error) {
      res.json({
        studentRefreshIntervalMs: STUDENT_REFRESH_INTERVAL_MS,
        allowedGrades: ALLOWED_GRADES,
        requireAccessKey: Object.keys(GRADE_ACCESS_TOKENS).length > 0,
        storageDriver: STORAGE_DRIVER,
        allowPlaybackSeek: ALLOW_PLAYBACK_SEEK,
      });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/grades', gradesRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/view-stats', viewStatsRoutes);
  app.use('/api/collections', collectionsRoutes);
  app.use('/api/videos', videoRoutes);

  app.use((err, _req, res, _next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: '文件过大，最大500MB' });
    }
    if (err && err.message === '仅支持上传视频文件') {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({
      message: '服务器内部错误',
    });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  // 监听所有网络接口，允许外部访问（重要：宝塔/云服务器部署必须）
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`🚀 视频服务已启动，地址: http://${HOST}:${PORT}`);
  });
}

module.exports = { createApp };

