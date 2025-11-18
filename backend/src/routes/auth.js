const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }

    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    let passwordMatch = false;
    if (ADMIN_PASSWORD.startsWith('$2a$') || ADMIN_PASSWORD.startsWith('$2b$') || ADMIN_PASSWORD.startsWith('$2y$')) {
      passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
      passwordMatch = password === ADMIN_PASSWORD;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: '登录成功',
      token,
      username,
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '登录失败，请重试' });
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未登录' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: '登录已过期' });
    }
    // 检查是否有role字段，如果没有说明是旧token，需要重新登录
    if (!user.role) {
      return res.status(401).json({ message: '请重新登录以获取最新权限' });
    }
    res.json({ username: user.username, authenticated: true, role: user.role });
  });
});

module.exports = router;

