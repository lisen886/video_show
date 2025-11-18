const express = require('express');
const { readSettings, writeSettings } = require('../storage/settings');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const settings = await readSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.put('/', authenticateToken, async (req, res, next) => {
  try {
    const { allowPlaybackSeek } = req.body;
    if (typeof allowPlaybackSeek !== 'boolean') {
      return res.status(400).json({ message: 'allowPlaybackSeek 必须是布尔值' });
    }
    const updated = await writeSettings({ allowPlaybackSeek });
    res.json({ ...updated, message: '设置更新成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

