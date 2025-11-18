const fs = require('fs/promises');
const path = require('path');
const { ROOT_DIR } = require('../config');

const VIEW_RECORDS_FILE = path.join(ROOT_DIR, 'data', 'viewRecords.json');

async function ensureViewRecordsFile() {
  try {
    await fs.access(VIEW_RECORDS_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dir = path.dirname(VIEW_RECORDS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(VIEW_RECORDS_FILE, JSON.stringify([], null, 2));
    } else {
      throw error;
    }
  }
}

async function readAllViewRecords() {
  await ensureViewRecordsFile();
  try {
    const buffer = await fs.readFile(VIEW_RECORDS_FILE, 'utf-8');
    const data = JSON.parse(buffer);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn('读取观看记录失败:', error.message);
    return [];
  }
}

async function writeAllViewRecords(records) {
  await ensureViewRecordsFile();
  await fs.writeFile(VIEW_RECORDS_FILE, JSON.stringify(records, null, 2));
  return records;
}

async function addViewRecord(studentId, videoId, watchedTime, totalDuration) {
  const records = await readAllViewRecords();
  const record = {
    id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId,
    videoId,
    watchedTime: Math.round(watchedTime),
    totalDuration: Math.round(totalDuration),
    progress: totalDuration > 0 ? Math.round((watchedTime / totalDuration) * 100) : 0,
    viewedAt: new Date().toISOString(),
  };
  records.push(record);
  await writeAllViewRecords(records);
  return record;
}

async function updateViewRecord(recordId, watchedTime, totalDuration) {
  const records = await readAllViewRecords();
  const idx = records.findIndex((r) => r.id === recordId);
  if (idx === -1) {
    return null;
  }
  // 更新时，watchedTime取最大值（记录这次观看的最大时间点）
  records[idx].watchedTime = Math.max(records[idx].watchedTime, Math.round(watchedTime));
  records[idx].totalDuration = Math.max(records[idx].totalDuration, Math.round(totalDuration));
  records[idx].progress = records[idx].totalDuration > 0 
    ? Math.round((records[idx].watchedTime / records[idx].totalDuration) * 100) 
    : 0;
  records[idx].lastUpdatedAt = new Date().toISOString();
  await writeAllViewRecords(records);
  return records[idx];
}

async function findViewRecordsByStudent(studentId) {
  const records = await readAllViewRecords();
  return records.filter((r) => r.studentId === studentId);
}

async function findViewRecordsByVideo(videoId) {
  const records = await readAllViewRecords();
  return records.filter((r) => r.videoId === videoId);
}

async function findViewRecordsByStudentAndVideo(studentId, videoId) {
  const records = await readAllViewRecords();
  return records.filter((r) => r.studentId === studentId && r.videoId === videoId);
}

async function getViewStatistics() {
  const records = await readAllViewRecords();
  const stats = {};
  
  records.forEach((record) => {
    const key = `${record.studentId}_${record.videoId}`;
    if (!stats[key]) {
      stats[key] = {
        studentId: record.studentId,
        videoId: record.videoId,
        viewCount: 0,
        totalWatchedTime: 0,
        maxWatchedTime: 0,
        totalDuration: 0,
        lastViewedAt: null,
      };
    }
    stats[key].viewCount++;
    stats[key].totalWatchedTime += record.watchedTime;
    stats[key].maxWatchedTime = Math.max(stats[key].maxWatchedTime, record.watchedTime);
    // 使用最大的totalDuration（视频长度是固定的，取最大值）
    if (record.totalDuration > 0) {
      stats[key].totalDuration = Math.max(stats[key].totalDuration, record.totalDuration);
    }
    // 记录最后观看时间
    if (!stats[key].lastViewedAt || record.viewedAt > stats[key].lastViewedAt) {
      stats[key].lastViewedAt = record.viewedAt;
    }
  });
  
  // 计算观看进度和是否看完
  return Object.values(stats).map((stat) => {
    const progress = stat.totalDuration > 0 
      ? Math.round((stat.maxWatchedTime / stat.totalDuration) * 100) 
      : 0;
    const isCompleted = stat.totalDuration > 0 && stat.maxWatchedTime >= stat.totalDuration * 0.95;
    return {
      ...stat,
      progress,
      isCompleted,
    };
  });
}

module.exports = {
  addViewRecord,
  updateViewRecord,
  findViewRecordsByStudent,
  findViewRecordsByVideo,
  findViewRecordsByStudentAndVideo,
  getViewStatistics,
  readAllViewRecords,
};

