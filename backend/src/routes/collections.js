const express = require('express');
const {
  readAllCollections,
  findCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  getVisibleCollections,
} = require('../storage/collections');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取所有合集（管理员）
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const collections = await readAllCollections();
    res.json({ collections });
  } catch (error) {
    next(error);
  }
});

// 获取可见合集（学生端）
router.get('/visible', async (_req, res, next) => {
  try {
    const collections = await getVisibleCollections();
    res.json({ collections });
  } catch (error) {
    next(error);
  }
});

// 创建合集（管理员）
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: '合集名称不能为空' });
    }
    const collection = await createCollection(name, description);
    res.status(201).json(collection);
  } catch (error) {
    if (error.message === '合集名称已存在') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// 更新合集（管理员）
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const { name, description, visible } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (typeof visible === 'boolean') updates.visible = visible;
    const updated = await updateCollection(req.params.id, updates);
    res.json(updated);
  } catch (error) {
    if (error.message === '合集不存在' || error.message === '合集名称已存在') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// 删除合集（管理员）
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    await deleteCollection(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    if (error.message === '合集不存在') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

module.exports = router;

