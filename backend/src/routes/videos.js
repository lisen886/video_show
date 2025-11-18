const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  addVideo,
  readAllVideos,
  findVideoById,
  updateVideo,
  incrementViewCount,
} = require('../storage');
const {
  upload,
  persistUploadedFile,
  resolveLocalFilePath,
  isOssVideo,
  getOssStreamUrl,
} = require('../services/fileStorage');
const { ALLOWED_GRADES, GRADE_ACCESS_TOKENS } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { addViewRecord, updateViewRecord, findViewRecordsByStudentAndVideo } = require('../storage/viewRecords');

const router = express.Router();

let allowedGradeSet = new Set(ALLOWED_GRADES);
let gradesCacheTime = 0;
const CACHE_TTL = 5000;

async function refreshAllowedGrades(force = false) {
  const now = Date.now();
  if (!force && now - gradesCacheTime < CACHE_TTL) {
    return;
  }
  try {
    const { readGrades } = require('../storage/grades');
    const grades = await readGrades();
    allowedGradeSet = new Set(grades);
    gradesCacheTime = now;
  } catch (error) {
    console.warn('刷新年级列表失败，使用默认值:', error.message);
    allowedGradeSet = new Set(ALLOWED_GRADES);
    gradesCacheTime = now;
  }
}

function clearGradesCache() {
  gradesCacheTime = 0;
}

function sanitizeGrade(value) {
  if (!value) {
    return '';
  }
  return String(value).trim();
}

async function isGradeAllowed(grade) {
  if (!grade) {
    return false;
  }
  await refreshAllowedGrades();
  if (!allowedGradeSet.size) {
    return true;
  }
  return allowedGradeSet.has(grade);
}

function getAccessKeyFromRequest(req) {
  const key =
    req.query.accessKey ||
    req.get('x-access-key') ||
    req.get('X-Access-Key') ||
    '';
  return String(key || '').trim();
}

function verifyGradeAccess(req, grade) {
  if (!isGradeAllowed(grade)) {
    return {
      success: false,
      status: 403,
      message: '该年级暂无访问权限',
    };
  }
  const requiredKey = GRADE_ACCESS_TOKENS[grade];
  if (!requiredKey) {
    return { success: true };
  }
  const provided = getAccessKeyFromRequest(req);
  if (!provided) {
    return {
      success: false,
      status: 403,
      message: '缺少访问口令',
    };
  }
  if (provided !== requiredKey) {
    return {
      success: false,
      status: 403,
      message: '访问口令不正确',
    };
  }
  return { success: true };
}

function decorateVideo(video) {
  const grade = video.grade || null;
  const streamPath =
    grade != null
      ? `/api/videos/${video.id}/stream?grade=${encodeURIComponent(grade)}`
      : `/api/videos/${video.id}/stream`;
  return {
    ...video,
    grade,
    streamPath,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const gradeFilter = sanitizeGrade(req.query?.grade);
    let videos = await readAllVideos();
    if (gradeFilter) {
      videos = videos.filter((video) => (video.grade || '') === gradeFilter);
    }
    res.json(videos.map((video) => decorateVideo(video)));
  } catch (error) {
    next(error);
  }
});

router.get('/by-grade/:grade', async (req, res, next) => {
  try {
    const grade = sanitizeGrade(req.params.grade);
    if (!grade) {
      return res.status(400).json({ message: '年级参数无效' });
    }
    const access = verifyGradeAccess(req, grade);
    if (!access.success) {
      return res.status(access.status).json({ message: access.message });
    }
    const videos = await readAllVideos();
    // 获取可见合集
    const { getVisibleCollections } = require('../storage/collections');
    const visibleCollections = await getVisibleCollections();
    const visibleCollectionIds = new Set(visibleCollections.map((c) => c.id));
    
    // 过滤：年级匹配，且（没有合集 或 合集可见）
    const filtered = videos
      .filter((video) => {
        if ((video.grade || '') !== grade) return false;
        // 如果没有合集，或者合集可见，则显示
        if (!video.collectionId) return true;
        return visibleCollectionIds.has(video.collectionId);
      })
      .map((video) => decorateVideo(video));
    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const video = await findVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: '未找到视频' });
    }
    res.json(decorateVideo(video));
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传视频文件' });
    }
    const grade = sanitizeGrade(req.body.grade);
    if (!grade) {
      return res.status(400).json({ message: '请选择年级' });
    }
    const gradeAllowed = await isGradeAllowed(grade);
    if (!gradeAllowed) {
      return res.status(400).json({ message: '年级不在允许列表中' });
    }

    // 处理合集ID（可选）
    const collectionId = req.body.collectionId ? String(req.body.collectionId).trim() : null;
    if (collectionId) {
      const { findCollectionById } = require('../storage/collections');
      const collection = await findCollectionById(collectionId);
      if (!collection) {
        return res.status(400).json({ message: '合集不存在' });
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const storageInfo = await persistUploadedFile(req.file);
    storageInfo.grade = grade;

    const videoMetadata = {
      id,
      originalName: req.file.originalname,
      storedName: storageInfo.storedName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadAt: now,
      lastViewedAt: null,
      views: 0,
      storageType: storageInfo.storageType,
      storage: storageInfo,
      grade,
      collectionId: collectionId || null,
    };

    await addVideo(videoMetadata);

    res.status(201).json(decorateVideo(videoMetadata));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/view', async (req, res, next) => {
  try {
    const video = await findVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: '未找到视频' });
    }
    const videoGrade = video.grade || null;
    if (videoGrade) {
      const gradeParam = sanitizeGrade(req.query.grade);
      if (!gradeParam) {
        return res.status(400).json({ message: '缺少年级参数' });
      }
      if (gradeParam !== videoGrade) {
        return res.status(403).json({ message: '年级不匹配' });
      }
      const access = verifyGradeAccess(req, videoGrade);
      if (!access.success) {
        return res.status(access.status).json({ message: access.message });
      }
    }

    // 如果学生已登录，先判断是否是新观看，只有新观看才累加观看次数
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let shouldIncrementView = true; // 默认累加（兼容未登录的情况）
    let updated = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../config');
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'student' && decoded.id) {
          const { watchedTime = 0, totalDuration = 0, isNewView = false } = req.body;
          const existingRecords = await findViewRecordsByStudentAndVideo(decoded.id, req.params.id);
          
          // 判断是否是新观看
          let isNewViewing = false;
          
          if (existingRecords.length > 0) {
            // 已有记录，优先更新现有记录
            const latestRecord = existingRecords[existingRecords.length - 1];
            // 如果明确标记为新观看，或者观看时间倒退很多，说明是新的观看，创建新记录
            const timeDiff = watchedTime - latestRecord.watchedTime;
            if (isNewView || timeDiff < -10) {
              // 明确标记为新观看或观看时间倒退很多，创建新记录
              isNewViewing = true;
              await addViewRecord(decoded.id, req.params.id, watchedTime, totalDuration);
            } else {
              // 继续当前观看，更新记录，不累加观看次数
              await updateViewRecord(latestRecord.id, watchedTime, totalDuration);
              shouldIncrementView = false;
            }
          } else {
            // 没有记录，创建新记录（无论是新观看还是更新，都没有记录时都创建）
            if (isNewView || watchedTime < 5) {
              // 明确标记为新观看或观看时间很小，创建新记录
              isNewViewing = true;
              await addViewRecord(decoded.id, req.params.id, watchedTime, totalDuration);
            } else {
              // 没有记录但观看时间 >= 5秒，可能是第一次记录，创建新记录
              isNewViewing = true;
              await addViewRecord(decoded.id, req.params.id, watchedTime, totalDuration);
            }
          }
        }
      } catch (err) {
        // Token无效或不是学生，忽略，保持默认行为（累加）
      }
    }
    
    // 只有在新观看时才累加观看次数
    if (shouldIncrementView) {
      updated = await incrementViewCount(req.params.id);
    } else {
      // 不累加观看次数，只更新最后观看时间
      updated = await findVideoById(req.params.id);
      if (updated) {
        updated = await updateVideo(req.params.id, (video) => ({
          lastViewedAt: new Date().toISOString(),
        }));
      }
    }
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/stream', async (req, res, next) => {
  try {
    const video = await findVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: '未找到视频' });
    }

    const videoGrade = video.grade || null;
    if (videoGrade) {
      const gradeParam = sanitizeGrade(req.query.grade);
      if (!gradeParam) {
        return res.status(400).json({ message: '缺少年级参数' });
      }
      if (gradeParam !== videoGrade) {
        return res.status(403).json({ message: '年级不匹配' });
      }
      const access = verifyGradeAccess(req, videoGrade);
      if (!access.success) {
        return res.status(access.status).json({ message: access.message });
      }
    }

    if (isOssVideo(video)) {
      const streamUrl = await getOssStreamUrl(video);
      return res.redirect(streamUrl);
    }

    const videoPath = resolveLocalFilePath(video);
    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(410).json({ message: '视频文件已丢失' });
    }

    const stat = await fs.promises.stat(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (start >= fileSize || end >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.mimeType || 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType || 'video/mp4',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.clearGradesCache = clearGradesCache;

