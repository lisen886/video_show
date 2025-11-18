(() => {
    const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || '').replace(/\/$/, '');

    const elements = {
        gradeSelect: document.querySelector('#grade-select'),
        applyGradeButton: document.querySelector('#apply-grade'),
        gradeStatus: document.querySelector('#grade-status'),
        videoList: document.querySelector('#video-list'),
        playerSection: document.querySelector('#player-section'),
        playerTitle: document.querySelector('#player-title'),
        videoPlayer: document.querySelector('#video-player'),
        metaName: document.querySelector('#meta-name'),
        metaUpload: document.querySelector('#meta-upload'),
        metaGrade: document.querySelector('#meta-grade'),
        metaLastView: document.querySelector('#meta-last-view'),
        metaSize: document.querySelector('#meta-size'),
        studentInfo: document.querySelector('#student-info'),
        studentName: document.querySelector('#student-name'),
        logoutButton: document.querySelector('#logout-button'),
    };

    const DEFAULT_GRADES = ['一年级', '二年级', '三年级'];

    let allowedGrades = [...DEFAULT_GRADES];
    let currentGrade = '';
    let videosCache = [];
    let currentVideoId = null;
    let viewRecorded = false;
    let refreshTimer = null;
    let refreshIntervalMs = 5000;
    let isFetching = false;
    let allowPlaybackSeek = false;
    let lastPlayTime = 0;
    let wasPlaying = false;
    let studentToken = null;
    let studentInfo = null;
    let viewRecordTimer = null;
    let visibleCollections = [];

    function formatBytes(bytes = 0) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString();
    }

    function formatGrade(grade) {
        return grade || '未分配';
    }

    function setStatus(message, type = 'info') {
        elements.gradeStatus.textContent = message || '';
        elements.gradeStatus.dataset.status = type;
    }

    function populateGradeOptions() {
        elements.gradeSelect.innerHTML = '';
        allowedGrades.forEach((grade, index) => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            if (index === 0) {
                option.selected = true;
            }
            elements.gradeSelect.appendChild(option);
        });
    }

    async function loadConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`);
            if (!response.ok) {
                throw new Error(`配置加载失败: ${response.status}`);
            }
            const data = await response.json();
            if (Array.isArray(data.allowedGrades) && data.allowedGrades.length) {
                allowedGrades = data.allowedGrades;
            }
            if (
                typeof data.studentRefreshIntervalMs === 'number' &&
                data.studentRefreshIntervalMs > 0
            ) {
                refreshIntervalMs = data.studentRefreshIntervalMs;
            }
            if (typeof data.allowPlaybackSeek === 'boolean') {
                allowPlaybackSeek = data.allowPlaybackSeek;
            }
        } catch (error) {
            console.warn(error.message);
            allowedGrades = [...DEFAULT_GRADES];
        } finally {
            populateGradeOptions();
        }
    }

    function saveSelection() {
        if (!currentGrade) {
            localStorage.removeItem('studentGrade');
            return;
        }
        localStorage.setItem('studentGrade', currentGrade);
    }

    function restoreSelection() {
        const storedGrade = localStorage.getItem('studentGrade');
        if (storedGrade && allowedGrades.includes(storedGrade)) {
            elements.gradeSelect.value = storedGrade;
            currentGrade = storedGrade;
            return true;
        }
        return false;
    }

    function stopAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        if (!currentGrade) return;
        refreshTimer = setInterval(() => {
            fetchVideos({ silent: true });
        }, refreshIntervalMs);
    }

    async function loadVisibleCollections() {
        try {
            const response = await fetch(`${API_BASE_URL}/collections/visible`);
            if (!response.ok) {
                throw new Error('加载合集列表失败');
            }
            const data = await response.json();
            visibleCollections = data.collections || [];
            return visibleCollections;
        } catch (error) {
            console.warn('加载合集列表失败:', error);
            visibleCollections = [];
            return [];
        }
    }

    function getCollectionName(collectionId) {
        if (!collectionId) return null;
        const collection = visibleCollections.find((c) => c.id === collectionId);
        return collection ? collection.name : null;
    }

    function renderVideoList() {
        if (!videosCache.length) {
            elements.videoList.innerHTML = '<li class="video-item">当前年级暂无视频。</li>';
            return;
        }

        elements.videoList.innerHTML = '';

        // 按合集分组
        const videosByCollection = {};
        const videosWithoutCollection = [];

        videosCache.forEach((video) => {
            if (video.collectionId) {
                if (!videosByCollection[video.collectionId]) {
                    videosByCollection[video.collectionId] = [];
                }
                videosByCollection[video.collectionId].push(video);
            } else {
                videosWithoutCollection.push(video);
            }
        });

        // 渲染有合集的视频
        Object.keys(videosByCollection).forEach((collectionId) => {
            const collectionName = getCollectionName(collectionId);
            if (!collectionName) return; // 如果合集不可见，跳过

            const collectionHeader = document.createElement('li');
            collectionHeader.className = 'video-item';
            collectionHeader.style.cssText = 'background: rgba(59, 130, 246, 0.1); font-weight: 500; padding: 0.75rem 1rem; cursor: default;';
            collectionHeader.innerHTML = `<div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>📁 ${collectionName}</span>
                <span style="font-size: 0.875rem; color: var(--text-secondary); font-weight: normal;">(${videosByCollection[collectionId].length} 个视频)</span>
            </div>`;
            elements.videoList.appendChild(collectionHeader);

            videosByCollection[collectionId].forEach((video) => {
                const item = createVideoItem(video);
                elements.videoList.appendChild(item);
            });
        });

        // 渲染没有合集的视频
        if (videosWithoutCollection.length > 0) {
            if (Object.keys(videosByCollection).length > 0) {
                const otherHeader = document.createElement('li');
                otherHeader.className = 'video-item';
                otherHeader.style.cssText = 'background: rgba(59, 130, 246, 0.1); font-weight: 500; padding: 0.75rem 1rem; cursor: default; margin-top: 1rem;';
                otherHeader.innerHTML = `<div>其他视频 (${videosWithoutCollection.length} 个)</div>`;
                elements.videoList.appendChild(otherHeader);
            }
            videosWithoutCollection.forEach((video) => {
                const item = createVideoItem(video);
                elements.videoList.appendChild(item);
            });
        }
    }

    function createVideoItem(video) {
        const item = document.createElement('li');
        item.className = 'video-item';
        item.dataset.id = video.id;

        if (video.id === currentVideoId) {
            item.classList.add('active');
        }

        const title = document.createElement('div');
        title.className = 'video-item-title';
        title.innerHTML = `<span>${video.originalName}</span><span>${formatBytes(
            video.size
        )}</span>`;

        const meta = document.createElement('div');
        meta.className = 'video-item-meta';
        meta.innerHTML = `
        <span>上传：${formatDate(video.uploadAt)}</span>
        <span>最后观看：${formatDate(video.lastViewedAt)}</span>
      `;

        item.appendChild(title);
        item.appendChild(meta);

        item.addEventListener('click', () => {
            selectVideo(video.id);
        });

        return item;
    }

    function updateActiveListItem() {
        document.querySelectorAll('.video-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.id === currentVideoId);
        });
    }

    function renderMeta(video) {
        elements.playerTitle.textContent = video.originalName;
        elements.metaName.textContent = video.originalName;
        elements.metaUpload.textContent = formatDate(video.uploadAt);
        elements.metaGrade.textContent = formatGrade(video.grade);
        elements.metaLastView.textContent = formatDate(video.lastViewedAt);
        elements.metaSize.textContent = formatBytes(video.size);
    }

    function buildStreamUrl(video) {
        const url = new URL(`${API_BASE_URL}/videos/${video.id}/stream`);
        if (currentGrade) {
            url.searchParams.set('grade', currentGrade);
        }
        url.searchParams.set('t', Date.now());
        return url.toString();
    }

    async function fetchVideos({ showLoading = false, silent = false } = {}) {
        if (!currentGrade) {
            elements.videoList.innerHTML = '<li class="video-item">请选择年级后查看视频。</li>';
            return { success: false, status: 400 };
        }
        if (isFetching) {
            return { success: false };
        }
        isFetching = true;
        if (showLoading) {
            elements.videoList.innerHTML = '<li class="video-item">加载中...</li>';
        }
        try {
            const url = new URL(
                `${API_BASE_URL}/videos/by-grade/${encodeURIComponent(currentGrade)}`
            );

            const response = await fetch(url.toString());
            if (!response.ok) {
                let message = `加载失败：${response.status}`;
                try {
                    const payload = await response.json();
                    if (payload?.message) {
                        message = payload.message;
                    }
                } catch (parseError) {
                    const text = await response.text();
                    if (text) {
                        message = text;
                    }
                }
                if (!silent) {
                    setStatus(message, 'error');
                }
                elements.videoList.innerHTML = `<li class="video-item">${message}</li>`;
                return { success: false, status: response.status, message };
            }

            const data = await response.json();
            videosCache = data.sort(
                (a, b) => new Date(b.uploadAt) - new Date(a.uploadAt)
            );
            await loadVisibleCollections();
            renderVideoList();
            if (!silent) {
                setStatus(`已加载 ${videosCache.length} 个视频`, 'success');
            }
            return { success: true };
        } catch (error) {
            const message = error.message || '加载失败，请稍后重试';
            if (!silent) {
                setStatus(message, 'error');
            }
            elements.videoList.innerHTML = `<li class="video-item">${message}</li>`;
            return { success: false, message };
        } finally {
            isFetching = false;
        }
    }

    function selectVideo(id) {
        const video = videosCache.find((item) => item.id === id);
        if (!video) return;

        stopViewRecordTimer();
        currentVideoId = id;
        viewRecorded = false;
        lastPlayTime = 0;
        wasPlaying = false;
        elements.playerSection.hidden = false;
        elements.videoPlayer.src = buildStreamUrl(video);
        renderMeta(video);
        updateActiveListItem();
    }

    function getAuthToken() {
        return localStorage.getItem('studentToken');
    }

    function checkAuth() {
        const token = getAuthToken();
        if (!token) {
            window.location.href = 'student-login.html';
            return false;
        }
        studentToken = token;
        const infoStr = localStorage.getItem('studentInfo');
        if (infoStr) {
            try {
                studentInfo = JSON.parse(infoStr);
                if (elements.studentInfo && elements.studentName) {
                    elements.studentInfo.style.display = 'block';
                    elements.studentName.textContent = `当前用户：${studentInfo.name || studentInfo.username}`;
                }
            } catch (e) {
                console.warn('解析学生信息失败:', e);
            }
        }
        return true;
    }

    async function recordView(id, isNewView = false) {
        const video = videosCache.find((item) => item.id === id);
        if (!video) return;

        try {
            const url = new URL(`${API_BASE_URL}/videos/${id}/view`);
            if (currentGrade) {
                url.searchParams.set('grade', currentGrade);
            }
            const headers = {};
            if (studentToken) {
                headers['Authorization'] = `Bearer ${studentToken}`;
            }
            const watchedTime = elements.videoPlayer.currentTime || 0;
            const totalDuration = elements.videoPlayer.duration || 0;
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({ watchedTime, totalDuration, isNewView }),
            });
            if (!response.ok) {
                throw new Error('记录观看失败');
            }
            const updated = await response.json();
            videosCache = videosCache.map((item) =>
                item.id === id ? { ...item, ...updated } : item
            );
            renderMeta(updated);
            renderVideoList();
        } catch (error) {
            console.warn(error.message);
        }
    }

    function startViewRecordTimer() {
        if (viewRecordTimer) {
            clearInterval(viewRecordTimer);
        }
        viewRecordTimer = setInterval(() => {
            if (currentVideoId && !elements.videoPlayer.paused && viewRecorded) {
                // 定时器记录时，明确标记为更新而非新观看
                recordView(currentVideoId, false);
            }
        }, 30000);
    }

    function stopViewRecordTimer() {
        if (viewRecordTimer) {
            clearInterval(viewRecordTimer);
            viewRecordTimer = null;
        }
    }

    async function handleApplyGrade(event) {
        event.preventDefault();
        const selectedGrade = elements.gradeSelect.value;
        if (!selectedGrade) {
            setStatus('请选择年级', 'error');
            return;
        }

        currentGrade = selectedGrade;
        currentVideoId = null;
        elements.playerSection.hidden = true;
        setStatus('正在加载视频...', 'info');

        const result = await fetchVideos({ showLoading: true });
        if (result.success) {
            saveSelection();
            startAutoRefresh();
        } else if (result.status === 403) {
            setStatus(result.message || '访问未授权', 'error');
        }
    }

    function setupVideoPlayerControls() {
        if (!allowPlaybackSeek) {
            let seekBlocked = false;
            let restoreTimer = null;

            elements.videoPlayer.addEventListener('timeupdate', () => {
                if (!elements.videoPlayer.seeking && !seekBlocked) {
                    lastPlayTime = elements.videoPlayer.currentTime;
                }
            });

            elements.videoPlayer.addEventListener('seeking', () => {
                if (!allowPlaybackSeek) {
                    seekBlocked = true;
                    wasPlaying = !elements.videoPlayer.paused;

                    if (restoreTimer) {
                        clearTimeout(restoreTimer);
                    }

                    const targetTime = lastPlayTime;
                    restoreTimer = setTimeout(() => {
                        if (Math.abs(elements.videoPlayer.currentTime - targetTime) > 0.1) {
                            elements.videoPlayer.currentTime = targetTime;
                        }
                    }, 50);
                }
            });

            elements.videoPlayer.addEventListener('seeked', () => {
                if (!allowPlaybackSeek && seekBlocked) {
                    seekBlocked = false;
                    const targetTime = lastPlayTime;

                    if (restoreTimer) {
                        clearTimeout(restoreTimer);
                        restoreTimer = null;
                    }

                    if (Math.abs(elements.videoPlayer.currentTime - targetTime) > 0.1) {
                        elements.videoPlayer.currentTime = targetTime;
                    }

                    if (wasPlaying) {
                        setTimeout(() => {
                            if (elements.videoPlayer.paused) {
                                const playPromise = elements.videoPlayer.play();
                                if (playPromise !== undefined) {
                                    playPromise.catch(() => {
                                        console.warn('自动播放失败');
                                    });
                                }
                            }
                        }, 150);
                    }
                }
            });

            elements.videoPlayer.addEventListener('play', () => {
                if (!allowPlaybackSeek && seekBlocked) {
                    seekBlocked = false;
                }
            });
        }
    }

    function setupEventListeners() {
        elements.applyGradeButton.addEventListener('click', handleApplyGrade);
        elements.logoutButton.addEventListener('click', () => {
            localStorage.removeItem('studentToken');
            localStorage.removeItem('studentInfo');
            window.location.href = 'student-login.html';
        });
        elements.videoPlayer.addEventListener('play', () => {
            if (currentVideoId && !viewRecorded) {
                viewRecorded = true;
                recordView(currentVideoId, true); // 标记为新观看
            }
            startViewRecordTimer();
        });
        elements.videoPlayer.addEventListener('pause', () => {
            if (currentVideoId && viewRecorded) {
                // 只有在已经开始观看后才记录暂停时的进度，且明确标记为更新而非新观看
                recordView(currentVideoId, false);
            }
            stopViewRecordTimer();
        });
        elements.videoPlayer.addEventListener('ended', () => {
            if (currentVideoId && viewRecorded) {
                // 只有在已经开始观看后才记录结束时的进度，且明确标记为更新而非新观看
                recordView(currentVideoId, false);
            }
            stopViewRecordTimer();
        });
        setupVideoPlayerControls();
    }

    async function init() {
        if (!checkAuth()) {
            return;
        }
        await loadConfig();
        await loadVisibleCollections();
        const restored = restoreSelection();
        setupEventListeners();

        if (restored) {
            setStatus('正在为您加载上次选择的年级...', 'info');
            const result = await fetchVideos({ showLoading: true });
            if (result.success) {
                startAutoRefresh();
            }
        } else {
            setStatus('请选择年级后开始观看。', 'info');
        }
    }

    init();
})();

