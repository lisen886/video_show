const express = require('express');
const { getViewStatistics } = require('../storage/viewRecords');
const { findVideoById } = require('../storage');
const { findStudentById, readAllStudents } = require('../storage/students');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const stats = await getViewStatistics();
    const students = await readAllStudents();
    const studentMap = {};
    students.forEach((s) => {
      studentMap[s.id] = { name: s.name, username: s.username, grade: s.grade };
    });
    const videos = {};
    const enrichedStats = await Promise.all(
      stats.map(async (stat) => {
        if (!videos[stat.videoId]) {
          const video = await findVideoById(stat.videoId);
          videos[stat.videoId] = video
            ? { originalName: video.originalName, grade: video.grade }
            : null;
        }
        return {
          ...stat,
          student: studentMap[stat.studentId] || { name: '未知', username: '未知', grade: null },
          video: videos[stat.videoId] ? {
            ...videos[stat.videoId],
            totalDuration: stat.totalDuration || null,
          } : null,
        };
      })
    );
    res.json({ statistics: enrichedStats });
  } catch (error) {
    next(error);
  }
});

router.get('/by-student/:studentId', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const { findViewRecordsByStudent } = require('../storage/viewRecords');
    const records = await findViewRecordsByStudent(req.params.studentId);
    const student = await findStudentById(req.params.studentId);
    const videos = {};
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        if (!videos[record.videoId]) {
          const video = await findVideoById(record.videoId);
          videos[record.videoId] = video
            ? { originalName: video.originalName, grade: video.grade }
            : null;
        }
        return {
          ...record,
          video: videos[record.videoId],
        };
      })
    );
    res.json({
      student: student ? { id: student.id, name: student.name, username: student.username, grade: student.grade } : null,
      records: enrichedRecords,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/by-video/:videoId', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    const { findViewRecordsByVideo } = require('../storage/viewRecords');
    const records = await findViewRecordsByVideo(req.params.videoId);
    const video = await findVideoById(req.params.videoId);
    const students = await readAllStudents();
    const studentMap = {};
    students.forEach((s) => {
      studentMap[s.id] = { name: s.name, username: s.username, grade: s.grade };
    });
    const enrichedRecords = records.map((record) => ({
      ...record,
      student: studentMap[record.studentId] || { name: '未知', username: '未知', grade: null },
    }));
    res.json({
      video: video ? { id: video.id, originalName: video.originalName, grade: video.grade } : null,
      records: enrichedRecords,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

