const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ROOT_DIR } = require('../config');

const COLLECTIONS_FILE = path.join(ROOT_DIR, 'data', 'collections.json');

async function ensureCollectionsFile() {
  try {
    await fs.access(COLLECTIONS_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dataDir = path.dirname(COLLECTIONS_FILE);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(COLLECTIONS_FILE, JSON.stringify([], null, 2));
    } else {
      throw error;
    }
  }
}

async function readAllCollections() {
  await ensureCollectionsFile();
  try {
    const buffer = await fs.readFile(COLLECTIONS_FILE, 'utf-8');
    const data = JSON.parse(buffer);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn('读取合集列表失败:', error.message);
    return [];
  }
}

async function writeAllCollections(collections) {
  await ensureCollectionsFile();
  await fs.writeFile(COLLECTIONS_FILE, JSON.stringify(collections, null, 2));
  return collections;
}

async function findCollectionById(id) {
  const collections = await readAllCollections();
  return collections.find((c) => c.id === id);
}

async function createCollection(name, description = '') {
  const collections = await readAllCollections();
  if (collections.some((c) => c.name === name)) {
    throw new Error('合集名称已存在');
  }
  const collection = {
    id: uuidv4(),
    name: name.trim(),
    description: description.trim() || '',
    visible: false, // 默认对学生不可见
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  collections.push(collection);
  await writeAllCollections(collections);
  return collection;
}

async function updateCollection(id, updates) {
  const collections = await readAllCollections();
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error('合集不存在');
  }
  const updated = {
    ...collections[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  // 确保name和description是字符串
  if (updates.name !== undefined) {
    updated.name = String(updates.name).trim();
  }
  if (updates.description !== undefined) {
    updated.description = String(updates.description).trim();
  }
  // 检查名称是否与其他合集重复
  if (updates.name && collections.some((c, i) => i !== idx && c.name === updated.name)) {
    throw new Error('合集名称已存在');
  }
  collections[idx] = updated;
  await writeAllCollections(collections);
  return updated;
}

async function deleteCollection(id) {
  const collections = await readAllCollections();
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error('合集不存在');
  }
  collections.splice(idx, 1);
  await writeAllCollections(collections);
  return true;
}

async function getVisibleCollections() {
  const collections = await readAllCollections();
  return collections.filter((c) => c.visible === true);
}

module.exports = {
  readAllCollections,
  findCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  getVisibleCollections,
};

