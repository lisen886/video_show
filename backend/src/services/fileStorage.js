const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const OSS = require('ali-oss');
const {
  STORAGE_DRIVER,
  UPLOAD_DIR,
  OSS_CONFIG,
} = require('../config');

const FILE_SIZE_LIMIT = 500 * 1024 * 1024;

const normalizeDriver = (driver) => (driver || '').toLowerCase();

function generateFilename(originalName) {
  const ext = path.extname(originalName || '').substring(0, 8);
  return `${Date.now()}-${uuidv4()}${ext}`;
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const normalizedDriver = normalizeDriver(STORAGE_DRIVER);
let ossClient = null;

if (normalizedDriver === 'oss') {
  const requiredKeys = [
    'region',
    'bucket',
    'accessKeyId',
    'accessKeySecret',
  ];
  const missing = requiredKeys.filter((key) => !OSS_CONFIG[key]);
  if (missing.length) {
    throw new Error(
      `OSS 存储配置缺少必要字段: ${missing.join(', ')}`
    );
  }
  ossClient = new OSS({
    region: OSS_CONFIG.region,
    bucket: OSS_CONFIG.bucket,
    accessKeyId: OSS_CONFIG.accessKeyId,
    accessKeySecret: OSS_CONFIG.accessKeySecret,
    endpoint: OSS_CONFIG.endpoint || undefined,
  });
} else {
  ensureUploadDir();
}

const diskStorage =
  normalizedDriver === 'local'
    ? multer.diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          cb(null, generateFilename(file.originalname));
        },
      })
    : null;

const upload = multer({
  storage: normalizedDriver === 'oss' ? multer.memoryStorage() : diskStorage,
  limits: {
    fileSize: FILE_SIZE_LIMIT,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持上传视频文件'));
    }
  },
});

function buildOssKey(filename) {
  const prefix = (OSS_CONFIG.prefix || 'videos').replace(/^\/+|\/+$/g, '');
  const sanitizedPrefix = prefix ? `${prefix}/` : '';
  return `${sanitizedPrefix}${filename}`;
}

async function persistUploadedFile(file) {
  if (!file) {
    throw new Error('未找到上传文件');
  }

  if (normalizedDriver === 'oss') {
    const storedName = generateFilename(file.originalname);
    const objectKey = buildOssKey(storedName);
    await ossClient.put(objectKey, file.buffer, {
      mime: file.mimetype,
    });
    return {
      storageType: 'oss',
      storedName,
      ossKey: objectKey,
      bucket: OSS_CONFIG.bucket,
      region: OSS_CONFIG.region,
      baseUrl: OSS_CONFIG.baseUrl || '',
    };
  }

  return {
    storageType: 'local',
    storedName: file.filename,
  };
}

function resolveLocalFilePath(video) {
  const storageInfo = video?.storage || {};
  const storedName =
    storageInfo.storedName || video?.storedName;
  if (!storedName) {
    return null;
  }
  return path.join(UPLOAD_DIR, storedName);
}

function isOssVideo(video) {
  const storageInfo = video?.storage || {};
  const storageType =
    storageInfo.storageType || video?.storageType || 'local';
  return storageType === 'oss';
}

async function getOssStreamUrl(video) {
  const storageInfo = video?.storage || {};
  const ossKey = storageInfo.ossKey || video?.ossKey;
  if (!ossKey) {
    throw new Error('OSS 视频缺少对象 Key');
  }

  if (!ossClient) {
    throw new Error('OSS 客户端未初始化');
  }

  if (storageInfo.baseUrl || OSS_CONFIG.baseUrl) {
    const base =
      storageInfo.baseUrl || OSS_CONFIG.baseUrl;
    return `${base.replace(/\/$/, '')}/${ossKey}`;
  }

  return ossClient.signatureUrl(ossKey, {
    expires: OSS_CONFIG.signedUrlExpires || 3600,
  });
}

module.exports = {
  upload,
  persistUploadedFile,
  resolveLocalFilePath,
  isOssVideo,
  getOssStreamUrl,
};

