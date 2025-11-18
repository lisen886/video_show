const fs = require('fs/promises');
const path = require('path');
const { ROOT_DIR } = require('../config');

const GRADES_FILE = path.join(ROOT_DIR, 'data', 'grades.json');
const DEFAULT_GRADES = ['七年级', '八年级', '九年级'];

async function ensureGradesFile() {
  try {
    await fs.access(GRADES_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dir = path.dirname(GRADES_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(GRADES_FILE, JSON.stringify(DEFAULT_GRADES, null, 2));
    } else {
      throw error;
    }
  }
}

async function readGrades() {
  await ensureGradesFile();
  try {
    const buffer = await fs.readFile(GRADES_FILE, 'utf-8');
    const data = JSON.parse(buffer);
    if (Array.isArray(data) && data.length > 0) {
      return data.filter((grade) => grade && typeof grade === 'string' && grade.trim());
    }
    return [...DEFAULT_GRADES];
  } catch (error) {
    console.warn('读取年级列表失败，使用默认值:', error.message);
    return [...DEFAULT_GRADES];
  }
}

async function writeGrades(grades) {
  if (!Array.isArray(grades)) {
    throw new Error('年级列表必须是数组');
  }
  const sanitized = grades
    .map((grade) => String(grade).trim())
    .filter((grade) => grade.length > 0);
  if (sanitized.length === 0) {
    throw new Error('年级列表不能为空');
  }
  await ensureGradesFile();
  await fs.writeFile(GRADES_FILE, JSON.stringify(sanitized, null, 2));
  return sanitized;
}

module.exports = {
  readGrades,
  writeGrades,
};

