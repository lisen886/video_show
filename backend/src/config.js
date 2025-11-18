const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseCommaList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAccessTokenMap(value) {
  if (!value) {
    return {};
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [grade, token] = pair.split(':').map((part) => part.trim());
      if (grade && token) {
        acc[grade] = token;
      }
      return acc;
    }, {});
}

function normalizeDriver(driver) {
  return (driver || 'local').toLowerCase();
}

const DEFAULT_GRADES = ['七年级', '八年级', '九年级'];

const STORAGE_DRIVER = normalizeDriver(process.env.STORAGE_DRIVER);
let ALLOWED_GRADES = parseCommaList(process.env.ALLOWED_GRADES);
if (!ALLOWED_GRADES.length) {
  ALLOWED_GRADES = DEFAULT_GRADES;
}

const gradeAccessTokensRaw = parseAccessTokenMap(
  process.env.GRADE_ACCESS_TOKENS
);
const GRADE_ACCESS_TOKENS = Object.fromEntries(
  Object.entries(gradeAccessTokensRaw).filter(([grade]) =>
    ALLOWED_GRADES.includes(grade)
  )
);

const OSS_CONFIG = {
  region: process.env.OSS_REGION || '',
  bucket: process.env.OSS_BUCKET || '',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  endpoint: process.env.OSS_ENDPOINT || '',
  baseUrl: process.env.OSS_BASE_URL || '',
  prefix: process.env.OSS_PREFIX || 'videos',
  signedUrlExpires: parsePositiveInt(
    process.env.OSS_SIGNED_URL_EXPIRES,
    3600
  ),
};

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const str = String(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

const ALLOW_PLAYBACK_SEEK = parseBoolean(process.env.ALLOW_PLAYBACK_SEEK, false);

module.exports = {
  PORT: process.env.PORT || 4000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '',
  ROOT_DIR,
  UPLOAD_DIR: path.join(ROOT_DIR, 'uploads'),
  DATA_FILE: path.join(ROOT_DIR, 'data', 'videos.json'),
  STUDENT_REFRESH_INTERVAL_MS: parsePositiveInt(
    process.env.STUDENT_REFRESH_INTERVAL_MS,
    5000
  ),
  STORAGE_DRIVER,
  OSS_CONFIG,
  ALLOWED_GRADES,
  GRADE_ACCESS_TOKENS,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ALLOW_PLAYBACK_SEEK,
};

