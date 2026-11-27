/* 分享与当前视频操作 */
        // 分享视频
        const SHARE_LIST_KEY = 'videoShareList';
        const SHARE_LIST_MAX = 100;

        function getShareList() {
            try {
                const raw = localStorage.getItem(SHARE_LIST_KEY);
                const list = raw ? JSON.parse(raw) : [];
                return Array.isArray(list) ? list : [];
            } catch (e) {
                return [];
            }
        }

        function setShareList(list) {
            const safe = Array.isArray(list) ? list : [];
            try {
                localStorage.setItem(SHARE_LIST_KEY, JSON.stringify(safe));
            } catch (e) {
                // ignore storage errors
            }
        }

        async function loadRemoteShares() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) return null;
            try {
                const res = await fetch('/api/user/shares', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                const data = await res.json();
                if (data && data.code === 200 && Array.isArray(data.data)) {
                    const mapped = data.data.map(item => ({
                        id: item.shareId,
                        shareId: item.shareId,
                        url: item.url,
                        allEpisodesUrl: item.allEpisodesUrl || item.url,
                        title: item.title,
                        pic: item.pic || '',
                        source: item.source || '',
                        desc: item.desc || '',
                        class: item.class || '',
                        actor: item.actor || '',
                        year: item.year || '',
                        remarks: item.remarks || '',
                        episodeName: item.episodeName || '',
                        episodeIndex: Number.isFinite(Number(item.episodeIndex)) ? Number(item.episodeIndex) : null,
                        episodeCount: Number.isFinite(Number(item.episodeCount)) ? Number(item.episodeCount) : null,
                        viewCount: Number(item.viewCount || 0),
                        lastViewAt: Number(item.lastViewAt || 0),
                        expireSeconds: Number(item.expireSeconds || 0),
                        expiresAt: Number(item.expiresAt || 0),
                        createdAt: Number(item.createdAt || Date.now()),
                        updatedAt: Number(item.updatedAt || Date.now())
                    }));
                    setShareList(mapped);
                    shareListLoaded = true;
                    refreshLocalStatsDisplay();
                    return mapped;
                }
            } catch (e) {
                // ignore
            }
            return null;
        }

        function base64Url(value) {
            try {
                return btoa(unescape(encodeURIComponent(String(value || ''))))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/g, '');
            } catch (e) {
                return String(Date.now());
            }
        }

        function getShareId(url, title, source = '') {
            const content = (title || '') + (source || '');
            let encrypted = base64Url(content);
            while (encrypted.length < 18) {
                encrypted += Math.random().toString(36).substring(2, 10);
            }
            encrypted = encrypted.substring(0, 18);
            return `s_${encrypted}`;
        }

        function normalizeShareItem(item) {
            if (!item) return null;
            const url = String(item.url || '').trim();
            if (!url) return null;
            const title = String(item.title || '未命名').trim();
            const pic = String(item.pic || '').trim();
            const source = String(item.source || '').trim();
            const allEpisodesUrl = String(item.allEpisodesUrl || url || '').trim();
            // 优先使用 shareId 作为唯一标识，因为后端使用 shareId 查询
            const id = item.shareId || item.id || getShareId(url, title, source);
            const createdAt = Number(item.createdAt || item.timestamp || Date.now());
            const expireSeconds = Number.isFinite(item.expireSeconds) ? item.expireSeconds : 0;
            const expiresAt = Number.isFinite(item.expiresAt)
                ? item.expiresAt
                : (expireSeconds > 0 ? createdAt + expireSeconds * 1000 : 0);
            const viewCountRaw = Number(item.viewCount);
            const viewCount = Number.isFinite(viewCountRaw) ? viewCountRaw : undefined;
            const lastViewAtRaw = Number(item.lastViewAt);
            const lastViewAt = Number.isFinite(lastViewAtRaw) && lastViewAtRaw > 0 ? lastViewAtRaw : undefined;
            const shareUrl = item.shareUrl || buildShareUrl(url, title, pic, source, expireSeconds, id);
            return {
                id,
                shareId: item.shareId || id,
                url,
                allEpisodesUrl,
                title,
                pic,
                source,
                createdAt,
                updatedAt: Number(item.updatedAt || createdAt),
                viewCount,
                lastViewAt,
                desc: String(item.desc || ''),
                class: String(item.class || ''),
                actor: String(item.actor || ''),
                year: String(item.year || ''),
                remarks: String(item.remarks || ''),
                episodeName: String(item.episodeName || ''),
                episodeIndex: Number.isFinite(Number(item.episodeIndex)) ? Number(item.episodeIndex) : null,
                episodeCount: Number.isFinite(Number(item.episodeCount)) ? Number(item.episodeCount) : null,
                expireSeconds,
                expiresAt,
                shareUrl
            };
        }

        function saveShareItem(payload, options = {}) {
            const item = normalizeShareItem(payload);
            if (!item) return;
            let list = getShareList().map(normalizeShareItem).filter(Boolean);
            
            // 查找是否已存在相同ID的分享
            const existingIndex = list.findIndex(entry => entry.id === item.id);
            if (existingIndex >= 0) {
                // 更新现有分享
                list[existingIndex] = { ...list[existingIndex], ...item, updatedAt: Date.now() };
            } else {
                // 添加新分享
                list.unshift({ ...item, updatedAt: Date.now() });
            }
            
            if (list.length > SHARE_LIST_MAX) {
                list.splice(SHARE_LIST_MAX);
            }
            setShareList(list);
            if (sharePanel && !sharePanel.classList.contains('translate-x-full')) {
                renderShareContent(list);
            }
            const token = getUserToken ? getUserToken() : '';
            if (token && !options.skipRemote) {
                fetch('/api/user/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        shareId: item.id,
                        url: item.url,
                        allEpisodesUrl: item.allEpisodesUrl || item.url,
                        title: item.title,
                        pic: item.pic || '',
                        source: item.source || '',
                        desc: item.desc || '',
                        class: item.class || '',
                        actor: item.actor || '',
                        year: item.year || '',
                        remarks: item.remarks || '',
                        episodeName: item.episodeName || '',
                        episodeIndex: item.episodeIndex == null ? null : item.episodeIndex,
                        episodeCount: item.episodeCount == null ? null : item.episodeCount,
                        expireSeconds: item.expireSeconds || 0,
                        expiresAt: item.expiresAt || 0
                    })
                }).catch(() => {});
            }
            updatePanelTabCounts();
        }

        function encodeSharePayload(fields) {
            const payload = (fields || [])
                .map(value => encodeURIComponent(value || ''))
                .join('|');
            return btoa(payload);
        }

        function getShareExpireSeconds() {
            if (!shareExpireSelect) return 0;
            const value = Number(shareExpireSelect.value || 0);
            return Number.isFinite(value) ? value : 0;
        }

        function buildShareUrl(videoUrl, videoTitle, videoPic, sourceLabel, expireSeconds, shareId = '') {
            const now = Date.now();
            const expiresAt = expireSeconds > 0 ? now + expireSeconds * 1000 : 0;
            const pathname = window.location.pathname || '/';
            const isFilePath = pathname.split('/').pop().includes('.');
            const basePath = pathname.endsWith('/')
                ? pathname
                : (isFilePath ? pathname.replace(/[^/]*$/, '') : `${pathname}/`);
            const url = new URL(window.location.origin);
            url.pathname = `${basePath}share`;
            if (shareId) {
                url.searchParams.set('sid', shareId);
            }
            return url.toString();
        }

        function setShareCopyLabel(label) {
            const btn = shareModal ? shareModal.querySelector('button[onclick="copyShareUrl()"]') : null;
            if (btn) {
                btn.innerHTML = `<i class="fa fa-${label.includes('复制') ? 'copy' : 'link'} mr-1"></i> ${label}`;
            }
        }

        function setShareConfirmState(state, isEditMode = false) {
            if (!shareConfirmButton) return;
            if (state === 'ready') {
                shareConfirmButton.disabled = false;
                shareConfirmButton.classList.remove('opacity-60');
                shareConfirmButton.innerHTML = `<i class="fa fa-check mr-1"></i> ${isEditMode ? '确认修改' : '确认生成分享'}`;
            } else if (state === 'done') {
                shareConfirmButton.disabled = true;
                shareConfirmButton.classList.add('opacity-60');
                shareConfirmButton.innerHTML = `<i class="fa fa-check mr-1"></i> ${isEditMode ? '已修改' : '已生成'}`;
            } else if (state === 'loading') {
                shareConfirmButton.disabled = true;
                shareConfirmButton.classList.add('opacity-60');
                shareConfirmButton.innerHTML = `<i class="fa fa-spinner fa-spin mr-1"></i> ${isEditMode ? '修改中...' : '生成中...'}`;
            }
        }

        function getShareEpisodeMode() {
            const radios = document.querySelectorAll('input[name="shareEpisodeMode"]');
            for (const radio of radios) {
                if (radio.checked) return radio.value;
            }
            return 'all';
        }

        // 存储分享集数选择状态
        let shareEpisodeSelections = loadShareEpisodeSelections();

        // 从localStorage加载选择状态
        function loadShareEpisodeSelections() {
            try {
                const raw = localStorage.getItem('shareEpisodeSelections');
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        }

        // 保存选择状态到localStorage
        function saveShareEpisodeSelections() {
            try {
                localStorage.setItem('shareEpisodeSelections', JSON.stringify(shareEpisodeSelections));
            } catch (e) {
                // 忽略存储错误
            }
        }

        function renderShareEpisodeList(episodes) {
            if (!shareEpisodeList) return;
            // 生成唯一键，基于当前视频的URL或标题
            const key = currentSharePayload ? (currentSharePayload.allEpisodesUrl || currentSharePayload.url || currentSharePayload.title) : 'default';
            // 确保当前视频的选择状态存在
            if (!shareEpisodeSelections[key]) {
                // 默认勾选当前正在播放的集数
                shareEpisodeSelections[key] = episodes.map((_, idx) => idx === pendingShareCurrentIndex);
                saveShareEpisodeSelections();
            }
            shareEpisodeList.innerHTML = episodes.map((ep, idx) => `
                <label class="flex items-center space-x-2 text-xs w-full">
                    <input type="checkbox" value="${idx}" ${shareEpisodeSelections[key][idx] ? 'checked' : ''} onchange="updateShareEpisodeSelection(${idx}, this.checked)">
                    <span class="truncate">${ep.name || `第${idx + 1}集`}</span>
                </label>
            `).join('');
        }

        function updateShareEpisodeSelection(index, checked) {
            const key = currentSharePayload ? (currentSharePayload.allEpisodesUrl || currentSharePayload.url || currentSharePayload.title) : 'default';
            if (shareEpisodeSelections[key]) {
                shareEpisodeSelections[key][index] = checked;
                saveShareEpisodeSelections();
            }
        }

        function toggleShareEpisodeList(show) {
            if (!shareEpisodeList) return;
            shareEpisodeList.classList.toggle('hidden', !show);
            const actions = document.getElementById('shareEpisodeActions');
            if (actions) actions.classList.toggle('hidden', !show);
        }

        function setShareEpisodeChecks(checked) {
            if (!shareEpisodeList) return;
            const key = currentSharePayload ? (currentSharePayload.allEpisodesUrl || currentSharePayload.url || currentSharePayload.title) : 'default';
            if (shareEpisodeSelections[key]) {
                // 更新存储的选择状态
                shareEpisodeSelections[key] = shareEpisodeSelections[key].map(() => !!checked);
                saveShareEpisodeSelections();
            }
            // 重新渲染列表以反映更新后的状态
            const episodes = pendingShareEpisodes || [];
            renderShareEpisodeList(episodes);
        }

        function prepareShareSelection(episodes, currentIndex) {
            if (!shareEpisodeSection || !shareEpisodeList) return;
            pendingShareEpisodes = episodes || [];
            pendingShareCurrentIndex = Number.isFinite(currentIndex) ? currentIndex : 0;
            if (pendingShareEpisodes.length <= 1) {
                shareEpisodeSection.classList.add('hidden');
                shareEpisodeList.innerHTML = '';
                return;
            }
            shareEpisodeSection.classList.remove('hidden');
            renderShareEpisodeList(pendingShareEpisodes);
            toggleShareEpisodeList(false);
            const radios = document.querySelectorAll('input[name="shareEpisodeMode"]');
            radios.forEach((radio) => {
                if (radio.value === 'all') radio.checked = true;
            });
            setShareConfirmState('ready');
            currentShareUrl = '';
        }

        function setShareMode(value) {
            const radios = document.querySelectorAll('input[name="shareEpisodeMode"]');
            radios.forEach((radio) => {
                radio.checked = radio.value === value;
            });
            toggleShareEpisodeList(value === 'custom');
        }

        function collectSelectedEpisodes() {
            const mode = getShareEpisodeMode();
            if (pendingShareEpisodes.length <= 1) return pendingShareEpisodes;
            if (mode === 'current') {
                return pendingShareEpisodes[pendingShareCurrentIndex] ? [pendingShareEpisodes[pendingShareCurrentIndex]] : [];
            }
            if (mode === 'custom') {
                const key = currentSharePayload ? (currentSharePayload.allEpisodesUrl || currentSharePayload.url || currentSharePayload.title) : 'default';
                if (shareEpisodeSelections[key]) {
                    // 使用存储的选择状态
                    const indices = shareEpisodeSelections[key].map((checked, idx) => checked ? idx : null).filter(idx => idx !== null);
                    return indices.map(idx => pendingShareEpisodes[idx]).filter(Boolean);
                }
                return [];
            }
            return pendingShareEpisodes;
        }

        function buildEpisodeUrl(episodes) {
            if (!episodes || episodes.length === 0) return '';
            if (episodes.length === 1) return episodes[0].url || '';
            return episodes.map(ep => `${ep.name || ''}$${ep.url || ''}`).join('#');
        }

        function openShareModal(shareUrl) {
            if (!shareModal) return;
            currentShareUrl = shareUrl === 'edit' ? '' : shareUrl;
            shareModal.classList.remove('hidden');
            shareModal.classList.add('flex');
            
            // 根据是否为编辑模式更新标题和按钮文本
            const isEditMode = shareUrl === 'edit';
            const titleElement = shareModal.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = isEditMode ? '修改分享视频' : '分享视频';
            }
            
            // 显示/隐藏"添加到分享墙"按钮（仅管理员可见）
            const addToShareWallButton = document.getElementById('addToShareWallButton');
            if (addToShareWallButton) {
                if (isAdmin()) {
                    addToShareWallButton.classList.remove('hidden');
                } else {
                    addToShareWallButton.classList.add('hidden');
                }
            }
            
            // 显示/隐藏"前往分享墙"按钮（仅在添加到分享墙成功后显示）
            const goToShareWallButton = document.getElementById('goToShareWallButton');
            if (goToShareWallButton) {
                goToShareWallButton.classList.add('hidden');
            }
            
            // 显示视频信息（图片和标题）
            const shareVideoInfo = document.getElementById('shareVideoInfo');
            const shareVideoPic = document.getElementById('shareVideoPic');
            const shareVideoTitle = document.getElementById('shareVideoTitle');
            const shareVideoMeta = document.getElementById('shareVideoMeta');
            
            if (currentSharePayload) {
                // 显示视频信息
                shareVideoInfo.classList.remove('hidden');
                
                // 设置视频封面
                if (shareVideoPic) {
                    shareVideoPic.src = currentSharePayload.pic || '/video/loading.gif';
                    shareVideoPic.onerror = function() {
                        this.src = '/video/loading.gif';
                    };
                }
                
                // 设置视频标题
                if (shareVideoTitle) {
                    shareVideoTitle.textContent = currentSharePayload.title || '视频播放';
                }
                
                // 设置视频元数据
                if (shareVideoMeta) {
                    const metaParts = [];
                    if (currentSharePayload.source) {
                        metaParts.push(`来源: ${currentSharePayload.source}`);
                    }
                    if (currentSharePayload.year) {
                        metaParts.push(`年份: ${currentSharePayload.year}`);
                    }
                    if (currentSharePayload.actor) {
                        metaParts.push(`演员: ${currentSharePayload.actor}`);
                    }
                    shareVideoMeta.textContent = metaParts.join(' | ');
                }
            } else {
                // 隐藏视频信息
                shareVideoInfo.classList.add('hidden');
            }
            
            setShareCopyLabel(currentShareUrl ? '点击复制地址' : '生成分享链接');
            setShareConfirmState(currentShareUrl ? 'done' : 'ready', isEditMode);
            showToast(isEditMode ? '修改面板已打开' : '分享面板已打开');
        }

        function closeShareModal() {
            if (!shareModal) return;
            shareModal.classList.add('hidden');
            shareModal.classList.remove('flex');
            // 关闭悬浮播放器
            closeFloatingPlayer();
            // 重新打开全屏播放器
            const playbackState = sessionStorage.getItem('sharePlaybackState');
            if (playbackState) {
                try {
                    const state = JSON.parse(playbackState);
                    // 打开视频播放器
                    openVideoPlayer(state.url, state.title, state.pic, state.source);
                    // 清除存储的播放状态
                    sessionStorage.removeItem('sharePlaybackState');
                    // 恢复播放位置
                    setTimeout(() => {
                        if (dplayer) {
                            dplayer.seek(state.currentTime);
                        }
                    }, 1000);
                } catch (error) {
                    console.error('恢复播放状态失败:', error);
                }
            }
        }

        async function copyShareUrl() {
            if (!currentShareUrl) {
                showToast('请先点击“确认生成分享”');
                return;
            }
            try {
                navigator.clipboard.writeText(currentShareUrl).then(() => {
                    showToast('分享链接已复制到剪贴板');
                }).catch(() => {
                    prompt('请复制分享链接:', currentShareUrl);
                });
            } catch (err) {
                prompt('请复制分享链接:', currentShareUrl);
            }
        }

        async function addToShareWall() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) {
                showToast('请先登录');
                return;
            }
            
            if (!isAdmin()) {
                showToast('只有管理员可以添加到分享墙');
                return;
            }
            
            if (!currentSharePayload) {
                showToast('无法获取视频信息');
                return;
            }
            
            // 获取按钮元素
            const addToShareWallButton = document.getElementById('addToShareWallButton');
            if (addToShareWallButton) {
                // 保存原始按钮内容
                const originalContent = addToShareWallButton.innerHTML;
                // 修改按钮内容，添加旋转图标
                addToShareWallButton.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> 添加中...';
                addToShareWallButton.disabled = true;
            }
            
            // 如果还没有生成分享链接，先生成
            if (!currentShareUrl) {
                const success = await createShareFromSelection();
                if (!success) {
                    // 恢复按钮状态
                    if (addToShareWallButton) {
                        addToShareWallButton.innerHTML = '<i class="fa fa-th-large mr-1"></i> 添加到分享墙';
                        addToShareWallButton.disabled = false;
                    }
                    showToast('生成分享链接失败，请重试');
                    return;
                }
            }
            
            const urlObj = new URL(currentShareUrl, window.location.origin);
            const shareId = urlObj.searchParams.get('sid');
            if (!shareId) {
                // 恢复按钮状态
                if (addToShareWallButton) {
                    addToShareWallButton.innerHTML = '<i class="fa fa-th-large mr-1"></i> 添加到分享墙';
                    addToShareWallButton.disabled = false;
                }
                showToast('无法获取分享ID');
                return;
            }
            
            const videoData = currentSharePayload;
            
            try {
                const res = await fetch('/api/share-wall', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        Authorization: `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        shareId: shareId,
                        title: videoData.title || '',
                        url: videoData.url || '',
                        pic: videoData.pic || '',
                        source: videoData.source || '',
                        desc: videoData.desc || '',
                        class: videoData.class || '',
                        actor: videoData.actor || '',
                        year: videoData.year || '',
                        remarks: videoData.remarks || '',
                        expireSeconds: videoData.expireSeconds || 0,
                        expiresAt: videoData.expiresAt || 0
                    })
                });
                const data = await res.json();
                if (data && data.code === 200) {
                    showToast('已成功添加到分享墙');
                } else {
                    showToast(data.message || '添加失败');
                }
            } catch (err) {
                console.error('添加到分享墙失败:', err);
                showToast('添加失败，请稍后重试');
            } finally {
                // 显示前往分享墙按钮（无论添加是否成功）
                const goToShareWallButton = document.getElementById('goToShareWallButton');
                if (goToShareWallButton) {
                    goToShareWallButton.classList.remove('hidden');
                }
                // 恢复按钮状态
                if (addToShareWallButton) {
                    addToShareWallButton.innerHTML = '<i class="fa fa-th-large mr-1"></i> 添加到分享墙';
                    addToShareWallButton.disabled = false;
                }
            }
        }

        function goToShareWall() {
            window.open('/shareWall', '_blank');
        }





        async function createShortShare(payload) {
            const token = getUserToken ? getUserToken() : '';
            if (!token) return '';
            try {
                const res = await fetch('/api/user/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        ...payload,
                        apiName: payload.source || ''
                    })
                });
                const data = await res.json();
                if (data && data.code === 200 && data.data && data.data.shareId) {
                    return String(data.data.shareId);
                }
            } catch (e) {
                console.error('创建短链接失败:', e);
            }
            return '';
        }

        async function createShareFromSelection() {
            if (!currentSharePayload) return false;
            const expireSeconds = getShareExpireSeconds();
            const selected = collectSelectedEpisodes();
            if (pendingShareEpisodes.length > 1 && selected.length === 0) {
                showToast('请选择要分享的集数');
                return false;
            }
            const url = selected.length > 0 ? buildEpisodeUrl(selected) : currentSharePayload.url;
            const baseTitle = String(currentSharePayload.title || '').trim();
            const singleEp = selected.length === 1 ? selected[0] : null;
            const shouldAppendEpisode = pendingShareEpisodes.length > 1;
            const title = singleEp && singleEp.name && shouldAppendEpisode
                ? (baseTitle ? `${baseTitle} ${singleEp.name}` : singleEp.name)
                : baseTitle || '分享视频';
            setShareConfirmState('loading', isShareEditing);
            const shareId = currentShareId || getShareId(url, title, currentSharePayload.source || '');
            const shortId = await createShortShare({
                shareId,
                url,
                allEpisodesUrl: currentSharePayload.allEpisodesUrl || currentSharePayload.url,
                title,
                pic: currentSharePayload.pic || '',
                source: currentSharePayload.source || '',
                desc: currentSharePayload.desc || '',
                class: currentSharePayload.class || '',
                actor: currentSharePayload.actor || '',
                year: currentSharePayload.year || '',
                remarks: currentSharePayload.remarks || '',
                episodeName: currentSharePayload.episodeName || '',
                episodeIndex: Number.isFinite(Number(currentSharePayload.episodeIndex)) ? Number(currentSharePayload.episodeIndex) : null,
                episodeCount: Number.isFinite(Number(currentSharePayload.episodeCount)) ? Number(currentSharePayload.episodeCount) : null,
                expireSeconds,
                expiresAt: expireSeconds > 0 ? Date.now() + expireSeconds * 1000 : 0
            });
            if (!shortId) {
                showToast('生成短链失败，请稍后重试');
                setShareConfirmState('ready', isShareEditing);
                return false;
            }
            // 在编辑模式下，保持原来的分享ID不变
            const finalShareId = isShareEditing ? currentShareId : shortId;
            currentShareId = finalShareId;
            currentShareUrl = buildShareUrl(url, title, currentSharePayload.pic || '', currentSharePayload.source || '', expireSeconds, finalShareId);
            const expiresAt = expireSeconds > 0 ? Date.now() + expireSeconds * 1000 : 0;
            // 更新currentSharePayload，确保包含最新的过期时间信息
            currentSharePayload.expireSeconds = expireSeconds;
            currentSharePayload.expiresAt = expiresAt;
            saveShareItem({
                id: finalShareId,
                url,
                allEpisodesUrl: currentSharePayload.allEpisodesUrl || currentSharePayload.url,
                title,
                pic: currentSharePayload.pic || '',
                source: currentSharePayload.source || '',
                desc: currentSharePayload.desc || '',
                class: currentSharePayload.class || '',
                actor: currentSharePayload.actor || '',
                year: currentSharePayload.year || '',
                remarks: currentSharePayload.remarks || '',
                episodeName: currentSharePayload.episodeName || '',
                episodeIndex: Number.isFinite(Number(currentSharePayload.episodeIndex)) ? Number(currentSharePayload.episodeIndex) : null,
                episodeCount: Number.isFinite(Number(currentSharePayload.episodeCount)) ? Number(currentSharePayload.episodeCount) : null,
                expireSeconds,
                expiresAt,
                shareUrl: currentShareUrl,
                createdAt: Date.now()
            }, { skipRemote: true });
            setShareCopyLabel('点击复制地址');
            setShareConfirmState('done', isShareEditing);
            return true;
        }

        async function confirmShareSelection() {
            if (currentShareUrl) {
                showToast('已生成分享链接');
                return;
            }
            await createShareFromSelection();
        }

        async function shareVideo(videoUrl, videoTitle, videoPic = '', sourceLabel = '', currentIndex = 0, videoDesc = '', videoClass = '', videoActor = '', videoYear = '', videoRemarks = '') {
            // 保存完整的URL，不进行分割
            const fullVideoUrl = videoUrl;
            const expireSeconds = getShareExpireSeconds();
            const token = getUserToken ? getUserToken() : '';
            if (!token) {
                showToast('分享需登录后使用');
                openAuthModal();
                return;
            }
            const episodes = parsePlayUrls(videoUrl);
            const activeIndex = Number(currentIndex);
            const activeEpisode = Number.isFinite(activeIndex) ? episodes[activeIndex] : null;
            currentSharePayload = {
                url: fullVideoUrl,
                allEpisodesUrl: fullVideoUrl, // 保存全部集数的原始URL
                title: videoTitle,
                pic: videoPic || '',
                source: sourceLabel || '',
                desc: videoDesc || '',
                class: videoClass || '',
                actor: videoActor || '',
                year: videoYear || '',
                remarks: videoRemarks || '',
                episodeName: (activeEpisode && activeEpisode.name) || '',
                episodeIndex: Number.isFinite(activeIndex) ? activeIndex : null,
                episodeCount: episodes.length || null,
                expireSeconds: getShareExpireSeconds(),
                expiresAt: 0
            };
            prepareShareSelection(episodes, currentIndex);
            currentShareUrl = '';
            currentShareId = '';
            isShareEditing = false;
            openShareModal('');
        }

        function refreshShareUrlFromSelection() {
            if (!currentSharePayload || !currentShareId) return;
            const expireSeconds = getShareExpireSeconds();
            currentShareUrl = buildShareUrl(
                currentSharePayload.url,
                currentSharePayload.title,
                currentSharePayload.pic || '',
                currentSharePayload.source || '',
                expireSeconds,
                currentShareId
            );
            if (currentShareId) {
                updateShareExpire(currentShareId, expireSeconds);
            }
        }

        function openShareEditModal(itemId) {
            const list = getShareList().map(normalizeShareItem).filter(Boolean);
            const item = list.find(entry => entry.id === itemId);
            if (!item) {
                showToast('分享记录不存在');
                return;
            }
            currentSharePayload = {
                url: item.url,
                allEpisodesUrl: item.allEpisodesUrl || item.url,
                title: item.title,
                pic: item.pic || '',
                source: item.source || '',
                desc: item.desc || '',
                class: item.class || '',
                actor: item.actor || '',
                year: item.year || '',
                remarks: item.remarks || '',
                episodeName: item.episodeName || '',
                episodeIndex: Number.isFinite(Number(item.episodeIndex)) ? Number(item.episodeIndex) : null,
                episodeCount: Number.isFinite(Number(item.episodeCount)) ? Number(item.episodeCount) : null,
                expireSeconds: item.expireSeconds || 0,
                expiresAt: item.expiresAt || 0
            };
            currentShareId = item.shareId || item.id;
            currentShareUrl = '';
            isShareEditing = true;
            if (shareExpireSelect) {
                const value = String(item.expireSeconds || 0);
                Array.from(shareExpireSelect.options).forEach(opt => {
                    opt.selected = opt.value === value;
                });
            }
            // 使用 allEpisodesUrl 解析集数，这样可以看到所有集数
            const episodes = parsePlayUrls(item.allEpisodesUrl || item.url);
            // 解析分享的URL，确定哪些集数被分享了
            const sharedEpisodes = parsePlayUrls(item.url);
            prepareShareSelection(episodes, 0);
            if (episodes.length > 1) {
                setShareMode('custom');
                // 生成唯一键
                const key = currentSharePayload ? (currentSharePayload.allEpisodesUrl || currentSharePayload.url || currentSharePayload.title) : 'default';
                // 根据分享的内容更新选择状态
                if (sharedEpisodes.length === 1) {
                    // 如果只分享了一集，找到对应的索引并勾选
                    const sharedUrl = sharedEpisodes[0].url;
                    const sharedIndex = episodes.findIndex(ep => ep.url === sharedUrl);
                    if (sharedIndex !== -1) {
                        shareEpisodeSelections[key] = episodes.map((_, idx) => idx === sharedIndex);
                    }
                } else if (sharedEpisodes.length > 1) {
                    // 如果分享了多集，找到对应的索引并勾选
                    const sharedUrls = new Set(sharedEpisodes.map(ep => ep.url));
                    shareEpisodeSelections[key] = episodes.map(ep => sharedUrls.has(ep.url));
                }
                saveShareEpisodeSelections();
                // 重新渲染列表以反映更新后的状态
                renderShareEpisodeList(episodes);
            }
            openShareModal('edit');
        }

        // 播放器内复制标题和当前视频真实播放地址（JSON）
        async function copyCurrentVideoInfo() {
            if (!currentVideoUrl) {
                showToast('暂无可复制的视频地址');
                return;
            }
            const info = {
                title: currentVideoTitle || '视频播放',
                url: currentVideoUrl
            };
            const text = JSON.stringify(info, null, 2);
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.setAttribute('readonly', '');
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    const copied = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    if (!copied) throw new Error('copy failed');
                }
                showToast('标题和真实播放地址已复制');
            } catch (error) {
                prompt('请复制视频信息 JSON:', text);
            }
        }

        // 播放器内分享当前视频
        async function shareCurrentVideo() {
            if (!currentVideoUrl) {
                showToast('暂无可分享的视频');
                return;
            }
            // 保存当前播放时间
            const currentTime = dplayer ? dplayer.video.currentTime : 0;
            // 保存视频信息到局部变量
            const videoUrl = currentVideoUrl;
            const videoTitle = currentVideoTitle;
            const videoPic = currentVideoPic;
            const videoSource = currentVideoSource;
            const videoRawUrl = currentVideoRawUrl || currentVideoUrl;
            const episodeIndex = currentEpisodeIndex;
            const videoDesc = currentVideoDesc;
            const videoClass = currentVideoClass;
            const videoActor = currentVideoActor;
            const videoYear = currentVideoYear;
            const videoRemarks = currentVideoRemarks;
            // 保存当前播放状态
            const currentPlaybackState = {
                url: videoUrl,
                title: videoTitle,
                pic: videoPic,
                source: videoSource,
                currentTime: currentTime
            };
            // 关闭视频播放器
            closeVideoPlayer();
            // 存储播放状态
            sessionStorage.setItem('sharePlaybackState', JSON.stringify(currentPlaybackState));
            await shareVideo(videoRawUrl, videoTitle || '视频播放', videoPic || '', videoSource || getHostLabel(), episodeIndex, videoDesc || '', videoClass || '', videoActor || '', videoYear || '', videoRemarks || '');
        }

        // 播放器内喜欢/取消喜欢
        async function toggleCurrentVideoFavorite() {
            const fullVideoUrl = currentVideoRawUrl || currentVideoUrl;
            if (!fullVideoUrl) {
                showToast('暂无可操作的视频');
                return;
            }
            const token = getUserToken ? getUserToken() : '';
            ensureFavoritesCacheImmediate();
            const favorites = getFavorites();
            const existingIndex = favorites.findIndex(item => isSameFavoriteVideo(item && item.url, fullVideoUrl));

            if (existingIndex >= 0) {
                const existingUrl = favorites[existingIndex].url || fullVideoUrl;
                favorites.splice(existingIndex, 1);
                setFavoritesCache(favorites);
                showToast('已取消喜欢');
                updatePlayerLikeButtons(false);
                updateCardFavoriteByUrl(existingUrl, false);
                if (token) {
                    fetch('/api/user/favorites', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ url: existingUrl })
                    }).catch(() => {});
                }
            } else {
                const source = currentVideoSource || getHostLabel();
                const episodeList = Array.isArray(currentEpisodeList) ? currentEpisodeList : [];
                const episodeRawIndex = Number(currentEpisodeIndex);
                const activeEpisode = Number.isFinite(episodeRawIndex) && episodeList[episodeRawIndex]
                    ? episodeList[episodeRawIndex]
                    : null;
                const item = {
                    title: currentVideoTitle || '视频播放',
                    url: fullVideoUrl,
                    pic: currentVideoPic || '',
                    source: source || '',
                    desc: currentVideoDesc || '',
                    class: currentVideoClass || '',
                    actor: currentVideoActor || '',
                    year: currentVideoYear || '',
                    remarks: currentVideoRemarks || '',
                    episodeName: (activeEpisode && activeEpisode.name) || '',
                    episodeIndex: Number.isFinite(episodeRawIndex) ? episodeRawIndex : null,
                    episodeCount: episodeList.length || null,
                    timestamp: Date.now()
                };
                favorites.unshift(item);
                if (favorites.length > 100) {
                    favorites.splice(100);
                }
                setFavoritesCache(favorites);
                showToast('已加入喜欢');
                updatePlayerLikeButtons(true);
                updateCardFavoriteByUrl(fullVideoUrl, true);
                if (token) {
                    fetch('/api/user/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(item)
                    }).catch(() => {});
                }
            }
            scheduleUserStatsUpdate();
            updatePanelTabCounts();
        }

        function updateCardFavoriteByUrl(rawUrl, isLiked) {
            if (!rawUrl) return;
            const cards = document.querySelectorAll('.video-card');
            cards.forEach(card => {
                if (!card) return;
                const cardUrl = card.getAttribute('data-video-url');
                if (!cardUrl || !isSameFavoriteVideo(cardUrl, rawUrl)) return;
                const btn = card.querySelector('[data-action="favorite"]');
                if (btn) updateFavoriteButton(btn, isLiked);
            });
        }

        function updatePlayerLikeButtons(isLiked) {
            const icons = window.HubIcons || {};
            const desktopBtn = document.getElementById('likeVideoButton');
            const mobileBtn = document.getElementById('likeVideoButtonMobile');
            [desktopBtn, mobileBtn].forEach(btn => {
                if (!btn) return;
                btn.classList.toggle('is-liked', isLiked);
                btn.dataset.icon = isLiked ? 'heartFilled' : 'heart';
                btn.innerHTML = (isLiked ? icons.heartFilled : icons.heart) || '';
                btn.title = isLiked ? '取消喜欢' : '喜欢';
            });
        }
        
