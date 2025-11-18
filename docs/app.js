(() => {
    const API_BASE_URL = (window.APP_CONFIG?.API_BASE_URL || '').replace(/\/$/, '');

    function getAuthToken() {
        return localStorage.getItem('adminToken');
    }

    async function checkAuth() {
        const token = getAuthToken();
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        // 验证token是否有效且包含role
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUsername');
                window.location.href = 'login.html';
                return false;
            }
        } catch (error) {
            console.warn('验证token失败:', error);
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUsername');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // checkAuth将在init中异步调用

    const elements = {
        uploadForm: document.querySelector('#upload-form'),
        uploadInput: document.querySelector('#upload-input'),
        uploadButton: document.querySelector('#upload-button'),
        uploadStatus: document.querySelector('#upload-status'),
        fileName: document.querySelector('#file-name'),
        gradeSelect: document.querySelector('#grade-select'),
        gradeFilter: document.querySelector('#grade-filter'),
        progressContainer: document.querySelector('#progress-container'),
        progressBar: document.querySelector('#progress-bar'),
        refreshButton: document.querySelector('#refresh-button'),
        logoutButton: document.querySelector('#logout-button'),
        videoList: document.querySelector('#video-list'),
        playerSection: document.querySelector('#player-section'),
        playerTitle: document.querySelector('#player-title'),
        videoPlayer: document.querySelector('#video-player'),
        metaName: document.querySelector('#meta-name'),
        metaUpload: document.querySelector('#meta-upload'),
        metaGrade: document.querySelector('#meta-grade'),
        metaCollection: document.querySelector('#meta-collection'),
        metaViews: document.querySelector('#meta-views'),
        metaLastView: document.querySelector('#meta-last-view'),
        metaSize: document.querySelector('#meta-size'),
        apiBase: document.querySelector('#api-base'),
        collectionSelect: document.querySelector('#collection-select'),
        toggleCollectionsManager: document.querySelector('#toggle-collections-manager'),
        collectionsManager: document.querySelector('#collections-manager'),
        collectionsList: document.querySelector('#collections-list'),
        collectionsStatus: document.querySelector('#collections-status'),
        addCollectionButton: document.querySelector('#add-collection-button'),
        addCollectionForm: document.querySelector('#add-collection-form'),
        newCollectionName: document.querySelector('#new-collection-name'),
        newCollectionDescription: document.querySelector('#new-collection-description'),
        saveCollectionButton: document.querySelector('#save-collection-button'),
        cancelCollectionButton: document.querySelector('#cancel-collection-button'),
        toggleGradesManager: document.querySelector('#toggle-grades-manager'),
        gradesManager: document.querySelector('#grades-manager'),
        gradesTextarea: document.querySelector('#grades-textarea'),
        saveGradesButton: document.querySelector('#save-grades-button'),
        cancelGradesButton: document.querySelector('#cancel-grades-button'),
        gradesStatus: document.querySelector('#grades-status'),
        fileList: document.querySelector('#file-list'),
        seekToggle: document.querySelector('#seek-toggle'),
        seekStatus: document.querySelector('#seek-status'),
        toggleStudentsManager: document.querySelector('#toggle-students-manager'),
        studentsManager: document.querySelector('#students-manager'),
        studentsList: document.querySelector('#students-list'),
        studentsStatus: document.querySelector('#students-status'),
        studentsBadge: document.querySelector('#students-badge'),
        addStudentButton: document.querySelector('#add-student-button'),
        addStudentForm: document.querySelector('#add-student-form'),
        newStudentUsername: document.querySelector('#new-student-username'),
        newStudentPassword: document.querySelector('#new-student-password'),
        newStudentName: document.querySelector('#new-student-name'),
        newStudentGrade: document.querySelector('#new-student-grade'),
        saveStudentButton: document.querySelector('#save-student-button'),
        cancelStudentButton: document.querySelector('#cancel-student-button'),
        refreshStatsButton: document.querySelector('#refresh-stats-button'),
        exportStatsButton: document.querySelector('#export-stats-button'),
        statsFilterType: document.querySelector('#stats-filter-type'),
        statsFilterLabel: document.querySelector('#stats-filter-label'),
        statsFilterLabelText: document.querySelector('#stats-filter-label-text'),
        statsFilterValue: document.querySelector('#stats-filter-value'),
        statsContent: document.querySelector('#stats-content'),
    };

    const DEFAULT_GRADES = ['七年级', '八年级', '九年级'];

    let allowedGrades = [...DEFAULT_GRADES];
    let videosCache = [];
    let currentVideoId = null;
    let viewRecorded = false;
    let gradeFilterValue = 'all';
    let collectionsCache = [];
    let currentStats = []; // 存储当前显示的统计数据，用于导出
    // 管理员页面不需要进度控制变量，始终允许跳转

    elements.apiBase.textContent = API_BASE_URL;

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

    function resetProgress() {
        elements.progressBar.style.width = '0%';
        elements.progressContainer.hidden = true;
    }

    function updateUploadButtonState() {
        const hasFile = elements.uploadInput.files.length > 0;
        const hasGrade = Boolean(elements.gradeSelect.value);
        elements.uploadButton.disabled = !(hasFile && hasGrade);
    }

    function renderFileList() {
        const files = Array.from(elements.uploadInput.files);
        if (files.length === 0) {
            elements.fileList.hidden = true;
            elements.fileName.textContent = '选择视频文件（可多选）';
            return;
        }

        elements.fileList.hidden = false;
        elements.fileList.innerHTML = '';

        if (files.length === 1) {
            elements.fileName.textContent = files[0].name;
        } else {
            elements.fileName.textContent = `已选择 ${files.length} 个文件`;
        }

        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-list-item';
            item.innerHTML = `
                <span class="file-list-name">${file.name}</span>
                <span class="file-list-size">${formatBytes(file.size)}</span>
            `;
            elements.fileList.appendChild(item);
        });
    }

    function populateGradeOptions() {
        elements.gradeSelect.innerHTML = '';
        elements.gradeFilter.innerHTML = '<option value="all">全部</option>';

        allowedGrades.forEach((grade, index) => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            if (index === 0) {
                option.selected = true;
            }
            elements.gradeSelect.appendChild(option);

            const filterOption = document.createElement('option');
            filterOption.value = grade;
            filterOption.textContent = grade;
            elements.gradeFilter.appendChild(filterOption);
        });

        updateUploadButtonState();
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
            // 管理员页面不需要读取 allowPlaybackSeek 配置，始终允许进度跳转
        } catch (error) {
            console.warn(error.message);
            allowedGrades = [...DEFAULT_GRADES];
        } finally {
            populateGradeOptions();
        }
    }

    async function fetchVideos() {
        elements.videoList.innerHTML = '<li class="video-item">加载中...</li>';
        try {
            const response = await fetch(`${API_BASE_URL}/videos`);
            if (!response.ok) {
                throw new Error(`获取列表失败: ${response.status}`);
            }
            const data = await response.json();
            videosCache = data.sort(
                (a, b) => new Date(b.uploadAt) - new Date(a.uploadAt)
            );
            renderVideoList();
        } catch (error) {
            elements.videoList.innerHTML = `<li class="video-item">加载失败：${error.message}</li>`;
        }
    }

    function renderVideoList() {
        const filteredVideos =
            gradeFilterValue === 'all'
                ? videosCache
                : videosCache.filter((video) => video.grade === gradeFilterValue);

        if (!filteredVideos.length) {
            elements.videoList.innerHTML =
                '<li class="video-item">当前筛选条件下暂无视频。</li>';
            return;
        }

        elements.videoList.innerHTML = '';
        filteredVideos.forEach((video) => {
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
            const collectionName = video.collectionId ? getCollectionName(video.collectionId) : '无';
            meta.innerHTML = `
        <span>年级：${formatGrade(video.grade)}</span>
        <span>合集：${collectionName}</span>
        <span>上传：${formatDate(video.uploadAt)}</span>
        <span>观看：${video.views || 0} 次</span>
      `;

            item.appendChild(title);
            item.appendChild(meta);

            item.addEventListener('click', () => {
                selectVideo(video.id);
            });

            elements.videoList.appendChild(item);
        });
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
        elements.metaCollection.textContent = getCollectionName(video.collectionId);
        elements.metaViews.textContent = `${video.views || 0} 次`;
        elements.metaLastView.textContent = formatDate(video.lastViewedAt);
        elements.metaSize.textContent = formatBytes(video.size);
    }

    function buildStreamUrl(video) {
        const url = new URL(`${API_BASE_URL}/videos/${video.id}/stream`);
        if (video.grade) {
            url.searchParams.set('grade', video.grade);
        }
        url.searchParams.set('t', Date.now());
        return url.toString();
    }

    function selectVideo(id) {
        const video = videosCache.find((item) => item.id === id);
        if (!video) return;

        currentVideoId = id;
        viewRecorded = false;
        elements.playerSection.hidden = false;
        elements.videoPlayer.src = buildStreamUrl(video);
        renderMeta(video);
        updateActiveListItem();
    }

    async function recordView(id) {
        const video = videosCache.find((item) => item.id === id);
        if (!video) return;

        try {
            const url = new URL(`${API_BASE_URL}/videos/${id}/view`);
            if (video.grade) {
                url.searchParams.set('grade', video.grade);
            }
            const response = await fetch(url.toString(), {
                method: 'POST',
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

    async function uploadFile(file, grade, collectionId, fileIndex, totalFiles) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('video', file);
            formData.append('grade', grade);
            if (collectionId) {
                formData.append('collectionId', collectionId);
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE_URL}/videos`);
            const token = getAuthToken();
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            const fileItem = elements.fileList.children[fileIndex];
            if (fileItem) {
                const statusSpan = fileItem.querySelector('.file-list-status') || document.createElement('span');
                statusSpan.className = 'file-list-status';
                statusSpan.textContent = '上传中...';
                if (!fileItem.querySelector('.file-list-status')) {
                    fileItem.appendChild(statusSpan);
                }
            }

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && fileItem) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    const statusSpan = fileItem.querySelector('.file-list-status');
                    if (statusSpan) {
                        statusSpan.textContent = `上传中 ${percent}%`;
                    }
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (fileItem) {
                        const statusSpan = fileItem.querySelector('.file-list-status');
                        if (statusSpan) {
                            statusSpan.textContent = '✓ 成功';
                            statusSpan.style.color = '#28a745';
                        }
                    }
                    resolve({ success: true, file: file.name });
                } else if (xhr.status === 401 || xhr.status === 403) {
                    reject({ error: 'auth', message: '登录已过期，请重新登录' });
                } else {
                    const errorText = xhr.responseText || xhr.status;
                    if (fileItem) {
                        const statusSpan = fileItem.querySelector('.file-list-status');
                        if (statusSpan) {
                            statusSpan.textContent = '✗ 失败';
                            statusSpan.style.color = '#dc3545';
                        }
                    }
                    reject({ error: 'upload', message: errorText, file: file.name });
                }
            });

            xhr.addEventListener('error', () => {
                if (fileItem) {
                    const statusSpan = fileItem.querySelector('.file-list-status');
                    if (statusSpan) {
                        statusSpan.textContent = '✗ 失败';
                        statusSpan.style.color = '#dc3545';
                    }
                }
                reject({ error: 'network', message: '网络错误', file: file.name });
            });

            xhr.send(formData);
        });
    }

    async function uploadFiles(files, grade, collectionId) {
        const totalFiles = files.length;
        let successCount = 0;
        let failCount = 0;
        let authError = false;

        elements.uploadButton.disabled = true;
        elements.progressContainer.hidden = false;
        elements.progressBar.style.width = '0%';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                await uploadFile(file, grade, collectionId, i, totalFiles);
                successCount++;
            } catch (error) {
                failCount++;
                if (error.error === 'auth') {
                    authError = true;
                    break;
                }
            }

            const overallProgress = Math.round(((i + 1) / totalFiles) * 100);
            elements.progressBar.style.width = `${overallProgress}%`;
        }

        if (authError) {
            elements.uploadStatus.textContent = '登录已过期，请重新登录';
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUsername');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            if (successCount === totalFiles) {
                elements.uploadStatus.textContent = `全部上传成功！共 ${successCount} 个文件`;
                elements.uploadStatus.style.color = '#28a745';
            } else {
                elements.uploadStatus.textContent = `上传完成：成功 ${successCount} 个，失败 ${failCount} 个`;
                elements.uploadStatus.style.color = '#ffc107';
            }

            setTimeout(() => {
                elements.uploadForm.reset();
                elements.fileList.hidden = true;
                elements.fileName.textContent = '选择视频文件（可多选）';
                if (allowedGrades.length) {
                    elements.gradeSelect.value = allowedGrades[0];
                }
                updateUploadButtonState();
                resetProgress();
                elements.uploadStatus.textContent = '';
                elements.uploadStatus.style.color = '';
                fetchVideos();
            }, 2000);
        }
    }

    function setupUploadForm() {
        elements.uploadInput.addEventListener('change', () => {
            renderFileList();
            updateUploadButtonState();
        });

        elements.gradeSelect.addEventListener('change', updateUploadButtonState);

        elements.uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const files = Array.from(elements.uploadInput.files);
            const grade = elements.gradeSelect.value;
            const collectionId = elements.collectionSelect.value || null;
            if (files.length === 0 || !grade) return;

            elements.uploadStatus.textContent = '';
            elements.uploadStatus.style.color = '';

            await uploadFiles(files, grade, collectionId);
        });
    }

    async function loadGrades() {
        try {
            const response = await fetch(`${API_BASE_URL}/grades`);
            if (!response.ok) {
                throw new Error('加载年级列表失败');
            }
            const data = await response.json();
            return data.grades || [];
        } catch (error) {
            console.warn('加载年级列表失败:', error);
            return [...allowedGrades];
        }
    }

    async function saveGrades() {
        const text = elements.gradesTextarea.value.trim();
        if (!text) {
            elements.gradesStatus.textContent = '年级列表不能为空';
            elements.gradesStatus.style.color = '#dc3545';
            return;
        }

        const grades = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (grades.length === 0) {
            elements.gradesStatus.textContent = '年级列表不能为空';
            elements.gradesStatus.style.color = '#dc3545';
            return;
        }

        elements.saveGradesButton.disabled = true;
        elements.gradesStatus.textContent = '保存中...';
        elements.gradesStatus.style.color = '#6c757d';

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/grades`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ grades }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || '保存失败');
            }

            const data = await response.json();
            allowedGrades = data.grades;
            populateGradeOptions();
            elements.gradesStatus.textContent = '保存成功！';
            elements.gradesStatus.style.color = '#28a745';
            elements.gradesManager.hidden = true;
            elements.toggleGradesManager.textContent = '管理年级';

            setTimeout(() => {
                elements.gradesStatus.textContent = '';
            }, 2000);
        } catch (error) {
            elements.gradesStatus.textContent = error.message || '保存失败，请重试';
            elements.gradesStatus.style.color = '#dc3545';
        } finally {
            elements.saveGradesButton.disabled = false;
        }
    }

    async function loadSettings() {
        try {
            const response = await fetch(`${API_BASE_URL}/settings`);
            if (!response.ok) {
                throw new Error('加载设置失败');
            }
            const data = await response.json();
            if (typeof data.allowPlaybackSeek === 'boolean') {
                elements.seekToggle.checked = data.allowPlaybackSeek;
                updateSeekStatus(data.allowPlaybackSeek);
            }
        } catch (error) {
            console.warn('加载设置失败:', error);
        }
    }

    async function saveSettings(allowPlaybackSeek) {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ allowPlaybackSeek }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || '保存失败');
            }

            const data = await response.json();
            updateSeekStatus(data.allowPlaybackSeek);
            elements.seekStatus.textContent = '设置已保存';
            elements.seekStatus.style.color = '#28a745';

            setTimeout(() => {
                elements.seekStatus.textContent = '';
                elements.seekStatus.style.color = '';
            }, 2000);
        } catch (error) {
            elements.seekStatus.textContent = error.message || '保存失败，请重试';
            elements.seekStatus.style.color = '#dc3545';
            elements.seekToggle.checked = !allowPlaybackSeek;
        }
    }

    function updateSeekStatus(enabled) {
        if (enabled) {
            elements.seekStatus.textContent = '当前状态：已开启 - 学生可以调整播放进度';
            elements.seekStatus.style.color = '#28a745';
        } else {
            elements.seekStatus.textContent = '当前状态：已关闭 - 学生无法调整播放进度';
            elements.seekStatus.style.color = '#6c757d';
        }
    }

    function setupSeekToggle() {
        elements.seekToggle.addEventListener('change', async (event) => {
            const enabled = event.target.checked;
            elements.seekToggle.disabled = true;
            await saveSettings(enabled);
            elements.seekToggle.disabled = false;
        });
    }

    async function loadStudents() {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/students`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('加载学生列表失败');
            }
            const data = await response.json();
            return data.students || [];
        } catch (error) {
            console.warn('加载学生列表失败:', error);
            return [];
        }
    }

    async function createStudent(username, password, name, grade) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username, password, name, grade: grade || null }),
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '创建失败');
        }
        return await response.json();
    }

    async function deleteStudent(id) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '删除失败');
        }
        return true;
    }

    function getStatusBadge(status) {
        const badges = {
            pending: '<span style="background: #ffc107; color: #000; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">待审批</span>',
            approved: '<span style="background: #28a745; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">已通过</span>',
            rejected: '<span style="background: #dc3545; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">已拒绝</span>',
        };
        return badges[status] || '';
    }

    async function approveStudent(id) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/students/${id}/approve`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '审批失败');
        }
        return await response.json();
    }

    async function rejectStudent(id) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/students/${id}/reject`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '拒绝失败');
        }
        return await response.json();
    }

    function renderStudentsList(students) {
        if (students.length === 0) {
            elements.studentsList.innerHTML = '<p style="color: var(--text-secondary);">暂无学生</p>';
            return;
        }
        elements.studentsList.innerHTML = '';
        students.forEach((student) => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.5rem;';
            const status = student.status || 'pending';
            const actionButtons = status === 'pending'
                ? `
                    <button class="approve-student" data-id="${student.id}" style="background: #28a745; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">审批通过</button>
                    <button class="reject-student" data-id="${student.id}" style="background: #ffc107; color: #000; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">拒绝</button>
                    <button class="delete-student" data-id="${student.id}" style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">删除</button>
                `
                : `
                    <button class="delete-student" data-id="${student.id}" style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">删除</button>
                `;
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                            ${student.name || student.username}
                            ${getStatusBadge(status)}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            用户名：${student.username} ${student.grade ? `| 年级：${student.grade}` : ''}
                            ${student.createdAt ? `| 注册时间：${formatDate(student.createdAt)}` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${actionButtons}
                    </div>
                </div>
            `;
            elements.studentsList.appendChild(item);
        });

        elements.studentsList.querySelectorAll('.approve-student').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    await approveStudent(btn.dataset.id);
                    elements.studentsStatus.textContent = '审批成功';
                    elements.studentsStatus.style.color = '#28a745';
                    await refreshStudentsList();
                    // 确保角标立即更新
                    await checkPendingStudents();
                    setTimeout(() => {
                        elements.studentsStatus.textContent = '';
                    }, 2000);
                } catch (error) {
                    elements.studentsStatus.textContent = error.message;
                    elements.studentsStatus.style.color = '#dc3545';
                }
            });
        });

        elements.studentsList.querySelectorAll('.reject-student').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('确定要拒绝该学生的注册申请吗？')) return;
                try {
                    await rejectStudent(btn.dataset.id);
                    elements.studentsStatus.textContent = '已拒绝';
                    elements.studentsStatus.style.color = '#ffc107';
                    await refreshStudentsList();
                    // 确保角标立即更新
                    await checkPendingStudents();
                    setTimeout(() => {
                        elements.studentsStatus.textContent = '';
                    }, 2000);
                } catch (error) {
                    elements.studentsStatus.textContent = error.message;
                    elements.studentsStatus.style.color = '#dc3545';
                }
            });
        });

        elements.studentsList.querySelectorAll('.delete-student').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('确定要删除该学生吗？')) return;
                try {
                    await deleteStudent(btn.dataset.id);
                    elements.studentsStatus.textContent = '删除成功';
                    elements.studentsStatus.style.color = '#28a745';
                    await refreshStudentsList();
                    // 确保角标立即更新
                    await checkPendingStudents();
                    setTimeout(() => {
                        elements.studentsStatus.textContent = '';
                    }, 2000);
                } catch (error) {
                    elements.studentsStatus.textContent = error.message;
                    elements.studentsStatus.style.color = '#dc3545';
                }
            });
        });
    }

    async function refreshStudentsList() {
        const students = await loadStudents();
        // 按状态排序：pending优先，然后按创建时间倒序
        const sortedStudents = students.sort((a, b) => {
            const statusOrder = { pending: 0, approved: 1, rejected: 2 };
            const aOrder = statusOrder[a.status] ?? 3;
            const bOrder = statusOrder[b.status] ?? 3;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        renderStudentsList(sortedStudents);
        // 更新角标
        updateStudentsBadge(students);
    }

    function updateStudentsBadge(students) {
        if (!elements.studentsBadge) return;
        const pendingCount = students.filter((s) => s.status === 'pending').length;
        if (pendingCount > 0) {
            elements.studentsBadge.textContent = pendingCount > 99 ? '99+' : pendingCount.toString();
            elements.studentsBadge.style.display = 'block';
            // 如果数字超过2位，调整角标宽度
            if (pendingCount > 9) {
                elements.studentsBadge.style.width = 'auto';
                elements.studentsBadge.style.padding = '0 6px';
                elements.studentsBadge.style.borderRadius = '10px';
            } else {
                elements.studentsBadge.style.width = '20px';
                elements.studentsBadge.style.padding = '0';
                elements.studentsBadge.style.borderRadius = '50%';
            }
        } else {
            elements.studentsBadge.style.display = 'none';
        }
    }

    async function checkPendingStudents() {
        try {
            const students = await loadStudents();
            updateStudentsBadge(students);
            // 如果学生管理面板是展开的，也刷新列表
            if (elements.studentsManager && !elements.studentsManager.hidden) {
                await refreshStudentsList();
            }
        } catch (error) {
            console.warn('检查待审批学生失败:', error);
        }
    }

    function setupStudentsManager() {
        elements.toggleStudentsManager.addEventListener('click', async () => {
            if (elements.studentsManager.hidden) {
                await refreshStudentsList();
                populateGradeOptionsForSelect(elements.newStudentGrade);
                elements.studentsManager.hidden = false;
                elements.toggleStudentsManager.textContent = '收起';
            } else {
                elements.studentsManager.hidden = true;
                elements.toggleStudentsManager.textContent = '管理学生';
                elements.studentsStatus.textContent = '';
                elements.addStudentForm.style.display = 'none';
            }
        });

        elements.addStudentButton.addEventListener('click', () => {
            elements.addStudentForm.style.display = elements.addStudentForm.style.display === 'none' ? 'block' : 'none';
        });

        elements.cancelStudentButton.addEventListener('click', () => {
            elements.addStudentForm.style.display = 'none';
            elements.newStudentUsername.value = '';
            elements.newStudentPassword.value = '';
            elements.newStudentName.value = '';
            elements.newStudentGrade.value = '';
        });

        elements.saveStudentButton.addEventListener('click', async () => {
            const username = elements.newStudentUsername.value.trim();
            const password = elements.newStudentPassword.value;
            const name = elements.newStudentName.value.trim();
            const grade = elements.newStudentGrade.value;

            if (!username || !password) {
                elements.studentsStatus.textContent = '用户名和密码不能为空';
                elements.studentsStatus.style.color = '#dc3545';
                return;
            }

            elements.saveStudentButton.disabled = true;
            elements.studentsStatus.textContent = '创建中...';
            elements.studentsStatus.style.color = '#6c757d';

            try {
                await createStudent(username, password, name, grade);
                elements.studentsStatus.textContent = '创建成功！';
                elements.studentsStatus.style.color = '#28a745';
                elements.addStudentForm.style.display = 'none';
                elements.newStudentUsername.value = '';
                elements.newStudentPassword.value = '';
                elements.newStudentName.value = '';
                elements.newStudentGrade.value = '';
                await refreshStudentsList();
                // 确保角标立即更新
                await checkPendingStudents();
                setTimeout(() => {
                    elements.studentsStatus.textContent = '';
                }, 2000);
            } catch (error) {
                if (error.message.includes('权限不足') || error.message.includes('403')) {
                    elements.studentsStatus.textContent = '登录已过期，请重新登录';
                    elements.studentsStatus.style.color = '#dc3545';
                    setTimeout(() => {
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('adminUsername');
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    elements.studentsStatus.textContent = error.message;
                    elements.studentsStatus.style.color = '#dc3545';
                }
            } finally {
                elements.saveStudentButton.disabled = false;
            }
        });
    }

    function populateGradeOptionsForSelect(selectElement) {
        selectElement.innerHTML = '<option value="">不指定</option>';
        allowedGrades.forEach((grade) => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            selectElement.appendChild(option);
        });
    }

    async function loadViewStats() {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/view-stats`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('加载统计失败');
            }
            const data = await response.json();
            return data.statistics || [];
        } catch (error) {
            console.warn('加载统计失败:', error);
            return [];
        }
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function renderViewStats(stats, filterType, filterValue) {
        let filteredStats = stats;
        if (filterType === 'by-student' && filterValue) {
            filteredStats = stats.filter((s) => s.studentId === filterValue);
        } else if (filterType === 'by-video' && filterValue) {
            filteredStats = stats.filter((s) => s.videoId === filterValue);
        }

        // 保存当前显示的统计数据，用于导出
        currentStats = filteredStats;

        if (filteredStats.length === 0) {
            elements.statsContent.innerHTML = '<p style="color: var(--text-secondary);">暂无统计数据</p>';
            return;
        }

        const html = filteredStats.map((stat) => {
            const progressText = stat.totalDuration > 0
                ? `${stat.progress}% (${formatTime(stat.maxWatchedTime)} / ${formatTime(stat.totalDuration)})`
                : '未知';
            const completedBadge = stat.isCompleted
                ? '<span style="background: #28a745; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">已看完</span>'
                : '<span style="background: #ffc107; color: #000; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">未看完</span>';
            return `
                <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="font-weight: 500; margin-bottom: 0.5rem; display: flex; align-items: center;">
                        ${stat.video?.originalName || '未知视频'} - ${stat.student?.name || stat.student?.username || '未知学生'}
                        ${completedBadge}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary); display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
                        <div>观看次数：<strong>${stat.viewCount}</strong></div>
                        <div>观看进度：<strong>${progressText}</strong></div>
                        <div>总观看时长：<strong>${formatTime(stat.totalWatchedTime)}</strong></div>
                        <div>最后观看时间：<strong>${formatDate(stat.lastViewedAt)}</strong></div>
                    </div>
                </div>
            `;
        }).join('');
        elements.statsContent.innerHTML = html;
    }

    function escapeCsvField(field) {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        // 如果包含逗号、引号或换行符，需要用引号包裹，并转义引号
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    function exportStatsToCSV() {
        if (currentStats.length === 0) {
            alert('暂无统计数据可导出');
            return;
        }

        // CSV表头
        const headers = [
            '视频名称',
            '学生姓名',
            '学生用户名',
            '学生年级',
            '观看次数',
            '观看进度(%)',
            '最大观看时长(秒)',
            '视频总时长(秒)',
            '总观看时长(秒)',
            '是否看完',
            '最后观看时间'
        ];

        // 构建CSV内容
        const rows = [headers.map(escapeCsvField).join(',')];

        currentStats.forEach((stat) => {
            const row = [
                stat.video?.originalName || '未知视频',
                stat.student?.name || '',
                stat.student?.username || '未知学生',
                stat.student?.grade || '',
                stat.viewCount || 0,
                stat.progress || 0,
                stat.maxWatchedTime || 0,
                stat.totalDuration || 0,
                stat.totalWatchedTime || 0,
                stat.isCompleted ? '是' : '否',
                formatDate(stat.lastViewedAt) || '—'
            ];
            rows.push(row.map(escapeCsvField).join(','));
        });

        const csvContent = rows.join('\n');

        // 添加BOM以支持Excel正确显示中文
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // 生成文件名（包含当前时间）
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        link.download = `观看统计_${timestamp}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function refreshStudentFilterOptions() {
        const students = await loadStudents();
        // 只显示已通过审批的学生
        const approvedStudents = students.filter((s) => s.status === 'approved');
        const currentValue = elements.statsFilterValue.value; // 保存当前选中的值
        elements.statsFilterValue.innerHTML = '<option value="">全部学生</option>';
        approvedStudents.forEach((s) => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `${s.name || s.username}${s.grade ? ` (${s.grade})` : ''}`;
            elements.statsFilterValue.appendChild(option);
        });
        // 恢复之前选中的值（如果还存在）
        if (currentValue && approvedStudents.some((s) => s.id === currentValue)) {
            elements.statsFilterValue.value = currentValue;
        }
    }

    async function refreshVideoFilterOptions() {
        const currentValue = elements.statsFilterValue.value; // 保存当前选中的值
        elements.statsFilterValue.innerHTML = '<option value="">全部视频</option>';
        videosCache.forEach((v) => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = v.originalName;
            elements.statsFilterValue.appendChild(option);
        });
        // 恢复之前选中的值（如果还存在）
        if (currentValue && videosCache.some((v) => v.id === currentValue)) {
            elements.statsFilterValue.value = currentValue;
        }
    }

    async function setupViewStats() {
        elements.refreshStatsButton.addEventListener('click', async () => {
            const filterType = elements.statsFilterType.value;
            // 如果当前是按学生或按视频筛选，刷新时也更新下拉列表
            if (filterType === 'by-student') {
                await refreshStudentFilterOptions();
            } else if (filterType === 'by-video') {
                await refreshVideoFilterOptions();
            }
            const stats = await loadViewStats();
            const filterValue = elements.statsFilterValue.value;
            renderViewStats(stats, filterType, filterValue);
        });

        elements.exportStatsButton.addEventListener('click', () => {
            exportStatsToCSV();
        });

        elements.statsFilterType.addEventListener('change', async () => {
            const filterType = elements.statsFilterType.value;
            if (filterType === 'all') {
                elements.statsFilterLabel.style.display = 'none';
                const stats = await loadViewStats();
                renderViewStats(stats, 'all', null);
            } else if (filterType === 'by-student') {
                elements.statsFilterLabel.style.display = 'flex';
                elements.statsFilterLabelText.textContent = '选择学生';
                await refreshStudentFilterOptions();
                const stats = await loadViewStats();
                renderViewStats(stats, 'by-student', elements.statsFilterValue.value);
            } else if (filterType === 'by-video') {
                elements.statsFilterLabel.style.display = 'flex';
                elements.statsFilterLabelText.textContent = '选择视频';
                await refreshVideoFilterOptions();
                const stats = await loadViewStats();
                renderViewStats(stats, 'by-video', elements.statsFilterValue.value);
            }
        });

        elements.statsFilterValue.addEventListener('change', async () => {
            const filterType = elements.statsFilterType.value;
            const filterValue = elements.statsFilterValue.value;
            const stats = await loadViewStats();
            renderViewStats(stats, filterType, filterValue);
        });

        const stats = await loadViewStats();
        renderViewStats(stats, 'all', null);
    }

    async function loadCollections() {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/collections`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('加载合集列表失败');
            }
            const data = await response.json();
            collectionsCache = data.collections || [];
            populateCollectionOptions();
            return collectionsCache;
        } catch (error) {
            console.warn('加载合集列表失败:', error);
            collectionsCache = [];
            return [];
        }
    }

    function populateCollectionOptions() {
        elements.collectionSelect.innerHTML = '<option value="">不选择合集</option>';
        collectionsCache.forEach((collection) => {
            const option = document.createElement('option');
            option.value = collection.id;
            option.textContent = collection.name;
            elements.collectionSelect.appendChild(option);
        });
    }

    function getCollectionName(collectionId) {
        if (!collectionId) return '无';
        const collection = collectionsCache.find((c) => c.id === collectionId);
        return collection ? collection.name : '未知合集';
    }

    async function createCollection(name, description) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name, description }),
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '创建失败');
        }
        return await response.json();
    }

    async function updateCollection(id, updates) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/collections/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '更新失败');
        }
        return await response.json();
    }

    async function deleteCollection(id) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/collections/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '删除失败');
        }
        return true;
    }

    function renderCollectionsList(collections) {
        if (collections.length === 0) {
            elements.collectionsList.innerHTML = '<p style="color: var(--text-secondary);">暂无合集</p>';
            return;
        }
        elements.collectionsList.innerHTML = '';
        collections.forEach((collection) => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.5rem;';
            const visibleBadge = collection.visible
                ? '<span style="background: #28a745; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">对学生可见</span>'
                : '<span style="background: #6c757d; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">对学生隐藏</span>';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; display: flex; align-items: center;">
                            ${collection.name}
                            ${visibleBadge}
                        </div>
                        ${collection.description ? `<div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">${collection.description}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <label class="toggle-switch" style="margin-right: 0.5rem;">
                            <input type="checkbox" class="collection-visible-toggle" data-id="${collection.id}" ${collection.visible ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="delete-collection" data-id="${collection.id}" style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">删除</button>
                    </div>
                </div>
            `;
            elements.collectionsList.appendChild(item);
        });

        elements.collectionsList.querySelectorAll('.collection-visible-toggle').forEach((toggle) => {
            toggle.addEventListener('change', async () => {
                try {
                    await updateCollection(toggle.dataset.id, { visible: toggle.checked });
                    elements.collectionsStatus.textContent = '更新成功';
                    elements.collectionsStatus.style.color = '#28a745';
                    await refreshCollectionsList();
                    populateCollectionOptions();
                    setTimeout(() => {
                        elements.collectionsStatus.textContent = '';
                    }, 2000);
                } catch (error) {
                    elements.collectionsStatus.textContent = error.message;
                    elements.collectionsStatus.style.color = '#dc3545';
                    toggle.checked = !toggle.checked; // 恢复原状态
                }
            });
        });

        elements.collectionsList.querySelectorAll('.delete-collection').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('确定要删除该合集吗？删除后，该合集中的视频将不再属于任何合集。')) return;
                try {
                    await deleteCollection(btn.dataset.id);
                    elements.collectionsStatus.textContent = '删除成功';
                    elements.collectionsStatus.style.color = '#28a745';
                    await refreshCollectionsList();
                    populateCollectionOptions();
                    setTimeout(() => {
                        elements.collectionsStatus.textContent = '';
                    }, 2000);
                } catch (error) {
                    elements.collectionsStatus.textContent = error.message;
                    elements.collectionsStatus.style.color = '#dc3545';
                }
            });
        });
    }

    async function refreshCollectionsList() {
        const collections = await loadCollections();
        renderCollectionsList(collections);
    }

    function setupCollectionsManager() {
        elements.toggleCollectionsManager.addEventListener('click', async () => {
            if (elements.collectionsManager.hidden) {
                await refreshCollectionsList();
                elements.collectionsManager.hidden = false;
                elements.toggleCollectionsManager.textContent = '收起';
            } else {
                elements.collectionsManager.hidden = true;
                elements.toggleCollectionsManager.textContent = '管理合集';
                elements.collectionsStatus.textContent = '';
            }
        });

        elements.addCollectionButton.addEventListener('click', () => {
            elements.addCollectionForm.style.display = elements.addCollectionForm.style.display === 'none' ? 'block' : 'none';
        });

        elements.cancelCollectionButton.addEventListener('click', () => {
            elements.addCollectionForm.style.display = 'none';
            elements.newCollectionName.value = '';
            elements.newCollectionDescription.value = '';
        });

        elements.saveCollectionButton.addEventListener('click', async () => {
            const name = elements.newCollectionName.value.trim();
            const description = elements.newCollectionDescription.value.trim();

            if (!name) {
                elements.collectionsStatus.textContent = '合集名称不能为空';
                elements.collectionsStatus.style.color = '#dc3545';
                return;
            }

            elements.saveCollectionButton.disabled = true;
            elements.collectionsStatus.textContent = '创建中...';
            elements.collectionsStatus.style.color = '#6c757d';

            try {
                await createCollection(name, description);
                elements.collectionsStatus.textContent = '创建成功！';
                elements.collectionsStatus.style.color = '#28a745';
                elements.addCollectionForm.style.display = 'none';
                elements.newCollectionName.value = '';
                elements.newCollectionDescription.value = '';
                await refreshCollectionsList();
                populateCollectionOptions();
                setTimeout(() => {
                    elements.collectionsStatus.textContent = '';
                }, 2000);
            } catch (error) {
                elements.collectionsStatus.textContent = error.message;
                elements.collectionsStatus.style.color = '#dc3545';
            } finally {
                elements.saveCollectionButton.disabled = false;
            }
        });
    }

    function setupGradesManager() {
        elements.toggleGradesManager.addEventListener('click', async () => {
            if (elements.gradesManager.hidden) {
                const grades = await loadGrades();
                elements.gradesTextarea.value = grades.join('\n');
                elements.gradesManager.hidden = false;
                elements.toggleGradesManager.textContent = '收起';
            } else {
                elements.gradesManager.hidden = true;
                elements.toggleGradesManager.textContent = '管理年级';
                elements.gradesStatus.textContent = '';
            }
        });

        elements.saveGradesButton.addEventListener('click', saveGrades);

        elements.cancelGradesButton.addEventListener('click', () => {
            elements.gradesManager.hidden = true;
            elements.toggleGradesManager.textContent = '管理年级';
            elements.gradesStatus.textContent = '';
        });
    }

    function setupVideoPlayerControls() {
        // 管理员页面始终允许进度跳转，不受配置限制
        // 此函数为空，不设置任何限制
    }

    function setupEventListeners() {
        elements.refreshButton.addEventListener('click', fetchVideos);
        elements.logoutButton.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUsername');
            window.location.href = 'login.html';
        });
        elements.gradeFilter.addEventListener('change', () => {
            gradeFilterValue = elements.gradeFilter.value;
            renderVideoList();
        });

        elements.videoPlayer.addEventListener('play', () => {
            if (currentVideoId && !viewRecorded) {
                viewRecorded = true;
                recordView(currentVideoId);
            }
        });

        setupVideoPlayerControls();
        setupCollectionsManager();
        setupGradesManager();
        setupSeekToggle();
        setupStudentsManager();
        setupViewStats();
    }

    async function init() {
        if (!(await checkAuth())) {
            return;
        }
        await loadConfig();
        await loadSettings();
        await loadCollections();
        setupUploadForm();
        setupEventListeners();
        await fetchVideos();
        // 初始化时检查待审批学生
        await checkPendingStudents();
        // 定期检查待审批学生（每30秒）
        setInterval(checkPendingStudents, 30000);
        // setupViewStats() 已在 setupEventListeners() 中调用，不需要重复调用
    }

    init();
})();

