const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const { ROOT_DIR } = require('../config');

const STUDENTS_FILE = path.join(ROOT_DIR, 'data', 'students.json');

async function ensureStudentsFile() {
  try {
    await fs.access(STUDENTS_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dir = path.dirname(STUDENTS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(STUDENTS_FILE, JSON.stringify([], null, 2));
    } else {
      throw error;
    }
  }
}

async function readAllStudents() {
  await ensureStudentsFile();
  try {
    const buffer = await fs.readFile(STUDENTS_FILE, 'utf-8');
    const data = JSON.parse(buffer);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn('读取学生列表失败:', error.message);
    return [];
  }
}

async function writeAllStudents(students) {
  await ensureStudentsFile();
  await fs.writeFile(STUDENTS_FILE, JSON.stringify(students, null, 2));
  return students;
}

async function findStudentByUsername(username) {
  const students = await readAllStudents();
  return students.find((s) => s.username === username);
}

async function findStudentById(id) {
  const students = await readAllStudents();
  return students.find((s) => s.id === id);
}

async function createStudent(username, password, name, grade, status = 'pending') {
  const students = await readAllStudents();
  const existing = students.find((s) => s.username === username);
  if (existing) {
    if (existing.status === 'pending') {
      throw new Error('该用户名已注册，正在等待审批');
    }
    throw new Error('用户名已存在');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const student = {
    id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username,
    password: hashedPassword,
    name: name || username,
    grade: grade || null,
    status: status || 'pending', // pending, approved, rejected
    createdAt: new Date().toISOString(),
  };
  students.push(student);
  await writeAllStudents(students);
  return { ...student, password: undefined };
}

async function updateStudent(id, updates) {
  const students = await readAllStudents();
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error('学生不存在');
  }
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
  }
  students[idx] = { ...students[idx], ...updates, password: students[idx].password };
  await writeAllStudents(students);
  const updated = { ...students[idx] };
  delete updated.password;
  return updated;
}

async function deleteStudent(id) {
  const students = await readAllStudents();
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error('学生不存在');
  }
  students.splice(idx, 1);
  await writeAllStudents(students);
  return true;
}

async function verifyStudentPassword(username, password) {
  const student = await findStudentByUsername(username);
  if (!student) {
    return null;
  }
  const match = await bcrypt.compare(password, student.password);
  if (!match) {
    return null;
  }
  // 只允许已审批的学生登录
  if (student.status !== 'approved') {
    return null;
  }
  const { password: _, ...studentWithoutPassword } = student;
  return studentWithoutPassword;
}

module.exports = {
  readAllStudents,
  findStudentByUsername,
  findStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  verifyStudentPassword,
};

