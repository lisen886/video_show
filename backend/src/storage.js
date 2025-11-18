const fs = require('fs/promises');
const { DATA_FILE } = require('./config');

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(DATA_FILE, JSON.stringify([]));
    } else {
      throw error;
    }
  }
}

async function readAllVideos() {
  await ensureDataFile();
  const buffer = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    const data = JSON.parse(buffer);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    return [];
  }
}

async function writeAllVideos(videos) {
  await fs.writeFile(DATA_FILE, JSON.stringify(videos, null, 2));
  return videos;
}

async function addVideo(video) {
  const videos = await readAllVideos();
  videos.push(video);
  await writeAllVideos(videos);
  return video;
}

async function findVideoById(id) {
  const videos = await readAllVideos();
  return videos.find((item) => item.id === id);
}

async function updateVideo(id, updater) {
  const videos = await readAllVideos();
  const idx = videos.findIndex((item) => item.id === id);
  if (idx === -1) {
    return null;
  }
  const updated = updater({ ...videos[idx] });
  videos[idx] = { ...videos[idx], ...updated };
  await writeAllVideos(videos);
  return videos[idx];
}

async function incrementViewCount(id) {
  return updateVideo(id, (video) => ({
    views: (video.views || 0) + 1,
    lastViewedAt: new Date().toISOString(),
  }));
}

module.exports = {
  readAllVideos,
  addVideo,
  findVideoById,
  updateVideo,
  incrementViewCount,
};

