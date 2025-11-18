const express = require('express');
const { readGrades, writeGrades } = require('../storage/grades');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const grades = await readGrades();
    res.json({ grades });
  } catch (error) {
    next(error);
  }
});

router.put('/', authenticateToken, async (req, res, next) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades)) {
      return res.status(400).json({ message: '年级列表必须是数组' });
    }
    const updated = await writeGrades(grades);
    
    try {
      const videoRoutes = require('./videos');
      if (videoRoutes.clearGradesCache) {
        videoRoutes.clearGradesCache();
      }
    } catch (err) {
      console.warn('清除年级缓存失败:', err.message);
    }
    
    res.json({ grades: updated, message: '年级列表更新成功' });
  } catch (error) {
    if (error.message === '年级列表不能为空') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

module.exports = router;

