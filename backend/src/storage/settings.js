const fs = require('fs/promises');
const path = require('path');
const { ROOT_DIR } = require('../config');

const SETTINGS_FILE = path.join(ROOT_DIR, 'data', 'settings.json');
const DEFAULT_SETTINGS = {
  allowPlaybackSeek: false,
};

async function ensureSettingsFile() {
  try {
    await fs.access(SETTINGS_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dir = path.dirname(SETTINGS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    } else {
      throw error;
    }
  }
}

async function readSettings() {
  await ensureSettingsFile();
  try {
    const buffer = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const data = JSON.parse(buffer);
    return {
      allowPlaybackSeek:
        typeof data.allowPlaybackSeek === 'boolean'
          ? data.allowPlaybackSeek
          : DEFAULT_SETTINGS.allowPlaybackSeek,
    };
  } catch (error) {
    console.warn('读取设置失败，使用默认值:', error.message);
    return { ...DEFAULT_SETTINGS };
  }
}

async function writeSettings(settings) {
  if (typeof settings !== 'object' || settings === null) {
    throw new Error('设置必须是对象');
  }
  await ensureSettingsFile();
  const current = await readSettings();
  const updated = { ...current, ...settings };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

module.exports = {
  readSettings,
  writeSettings,
};

