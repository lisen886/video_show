const express = require('express');
const jwt = require('jsonwebtoken');
const {
  readAllStudents,
  findStudentById,
  findStudentByUsername,
  createStudent,
  updateStudent,
  deleteStudent,
  verifyStudentPassword,
} = require('../storage/students');
const { authenticateToken } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }
    const student = await verifyStudentPassword(username, password);
    if (!student) {
      // 检查是否是未审批的学生
      const studentRecord = await findStudentByUsername(username);
      if (studentRecord && studentRecord.status === 'pending') {
        return res.status(403).json({ message: '账号待审批，请等待老师审批' });
      }
      if (studentRecord && studentRecord.status === 'rejected') {
        return res.status(403).json({ message: '账号已被拒绝，请联系老师' });
      }
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    const token = jwt.sign(
      { id: student.id, username: student.username, role: 'student' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({
      message: '登录成功',
      token,
      student: {
        id: student.id,
        username: student.username,
        name: student.name,
        grade: student.grade,
      },
    });
  } catch (error) {
    console.error('学生登录错误:', error);
    res.status(500).json({ message: '登录失败，请重试' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: '权限不足' });
    }
    const student = await findStudentById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: '学生不存在' });
    }
    const { password: _, ...studentWithoutPassword } = student;
    res.json(studentWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: '获取信息失败' });
  }
});

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const students = await readAllStudents();
    const studentsWithoutPassword = students.map((s) => {
      const { password: _, ...rest } = s;
      return rest;
    });
    res.json({ students: studentsWithoutPassword });
  } catch (error) {
    next(error);
  }
});

// 学生注册接口（不需要认证）
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, name, grade } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    // 注册时状态为pending，需要老师审批
    const student = await createStudent(username, password, name, grade, 'pending');
    res.status(201).json({
      ...student,
      message: '注册成功，请等待老师审批',
    });
  } catch (error) {
    if (error.message === '用户名已存在' || error.message.includes('已注册')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// 管理员添加学生（直接approved）
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const { username, password, name, grade } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    // 管理员添加的学生直接approved
    const student = await createStudent(username, password, name, grade, 'approved');
    res.status(201).json(student);
  } catch (error) {
    if (error.message === '用户名已存在') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const { name, grade, password, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (grade !== undefined) updates.grade = grade;
    if (password !== undefined) updates.password = password;
    if (status !== undefined) updates.status = status;
    const updated = await updateStudent(req.params.id, updates);
    res.json(updated);
  } catch (error) {
    if (error.message === '学生不存在') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

// 审批学生
router.post('/:id/approve', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const updated = await updateStudent(req.params.id, { status: 'approved' });
    res.json({ ...updated, message: '审批成功' });
  } catch (error) {
    if (error.message === '学生不存在') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

// 拒绝学生
router.post('/:id/reject', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const updated = await updateStudent(req.params.id, { status: 'rejected' });
    res.json({ ...updated, message: '已拒绝' });
  } catch (error) {
    if (error.message === '学生不存在') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    await deleteStudent(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    if (error.message === '学生不存在') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

module.exports = router;

