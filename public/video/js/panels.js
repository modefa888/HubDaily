/* 面板、用户资料与设置 */
        function setModalScrollLock(locked) {
            const body = document.body;
            const html = document.documentElement;
            const isLocked = body.classList.contains('modal-open');
            if (locked === isLocked) return;
            const app = document.getElementById('appContent');
            if (locked) {
                const scrollY = window.scrollY || window.pageYOffset || 0;
                const scrollbarWidth = window.innerWidth - html.clientWidth;
                body.dataset.scrollLockY = String(scrollY);
                body.dataset.scrollbarWidth = String(scrollbarWidth);
                if (app) {
                    app.style.position = 'fixed';
                    app.style.top = `-${scrollY}px`;
                    app.style.left = '0';
                    app.style.right = '0';
                    app.style.width = '100%';
                }
                body.style.overflow = 'hidden';
                if (scrollbarWidth > 0) {
                    body.style.paddingRight = `${scrollbarWidth}px`;
                }
            } else {
                const scrollY = Number(body.dataset.scrollLockY || 0);
                const scrollbarWidth = Number(body.dataset.scrollbarWidth || 0);
                if (app) {
                    app.style.position = '';
                    app.style.top = '';
                    app.style.left = '';
                    app.style.right = '';
                    app.style.width = '';
                }
                body.style.overflow = '';
                body.style.paddingRight = '';
                delete body.dataset.scrollLockY;
                delete body.dataset.scrollbarWidth;
                if (Number.isFinite(scrollY)) {
                    window.scrollTo(0, scrollY);
                }
            }
            body.classList.toggle('modal-open', locked);
            html.classList.toggle('modal-open', locked);
        }
        
        // 保存到播放历史
        function saveToHistory(title, url, pic, source, episodeName = '', episodeIndex = null) {
            try {
                const history = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
                
                // 检查是否已存在
                const existingIndex = history.findIndex(item => item.url === url);
                
                const historyItem = {
                    title,
                    url,
                    pic: pic || '',
                    source: source || '',
                    episodeName: episodeName || '',
                    episodeIndex: Number.isFinite(episodeIndex) ? Number(episodeIndex) : (existingIndex >= 0 ? (history[existingIndex].episodeIndex ?? null) : null),
                    timestamp: Date.now(),
                    playCount: existingIndex >= 0 ? (history[existingIndex].playCount || 0) + 1 : 1,
                    lastPosition: existingIndex >= 0 ? (history[existingIndex].lastPosition || 0) : 0,
                    lastPositionUpdatedAt: existingIndex >= 0 ? (history[existingIndex].lastPositionUpdatedAt || 0) : 0
                };
                
                // 如果已存在，先移除
                if (existingIndex >= 0) {
                    history.splice(existingIndex, 1);
                }
                
                // 添加到开头
                history.unshift(historyItem);
                
                // 限制历史记录数量
                if (history.length > 50) {
                    history.splice(50);
                }
                
                localStorage.setItem('videoPlayHistory', JSON.stringify(history));
            } catch (error) {
                console.error('保存播放历史失败:', error);
            }
            scheduleUserStatsUpdate();
            updatePanelTabCounts();
        }
        
        // 当前选中的历史分类
        let currentHistoryTab = 'all';
        
        // 显示历史记录
        function toggleHistory() {
            updateHistoryDisplay();
            
            const willOpen = historyPanel.classList.contains('translate-x-full');
            if (willOpen) closePanelsExcept(historyPanel);
            historyPanel.classList.toggle('translate-x-full');
            updateOverlayForPanels();
        }
        
        // 更新历史记录显示
        function updateHistoryDisplay() {
            const history = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
            
            // 根据当前tab过滤历史记录
            let filteredHistory = history;
            if (currentHistoryTab !== 'all') {
                filteredHistory = history.filter(item => {
                    const category = getOfficialCategoryByName(item.source) || '';
                    return normalizeCategory(category) === currentHistoryTab;
                });
            }
            
            if (filteredHistory.length === 0) {
                historyContent.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fa fa-history text-4xl mb-3"></i>
                        <p>暂无播放历史</p>
                    </div>
                `;
            } else {
                historyContent.innerHTML = filteredHistory.map(item => {
                    const resumeFromStore = getResumeTimeForHistory(item);
                    const resumeFromHistory = Number(item.lastPosition || 0);
                    const resumeTime = resumeFromStore > 0 ? resumeFromStore : resumeFromHistory;
                    const resumeLabelText = resumeTime > 0 ? formatDuration(resumeTime) : '暂无';
                    const resumeLabel = resumeTime > 0 ? `上次播放: ${resumeLabelText}` : '';
                    const category = normalizeCategory(getOfficialCategoryByName(item.source) || '');
                    return `
                    <div class="bg-white rounded-lg p-3 mb-3 shadow-sm">
                        <div class="flex space-x-3">
                            <div class="w-20 h-12 rounded-md overflow-hidden bg-gray-200 flex-shrink-0 cursor-pointer" data-preview-group="history" data-preview-url="${item.pic || FALLBACK_IMAGE}" data-preview-title="${item.title || ''}" data-preview-video-url="${item.url || ''}" data-preview-source="${item.source || ''}" data-preview-category="${category}" onclick="openPreviewFromGroup(this)">
                                ${
                                    item.pic
                                        ? `<img src="${item.pic}" alt="${item.title}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';" loading="lazy" class="w-full h-full object-cover">`
                                        : `<img src="${FALLBACK_IMAGE}" alt="loading" loading="lazy" class="w-full h-full object-cover">`
                                }
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between mb-2 flex-wrap">
                                    <h4 class="font-medium text-sm line-clamp-1 flex-1 min-w-0">
                                        <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-1">${item.source || '未知来源'}</span>
                                        ${item.title}
                                    </h4>
                                    <span class="text-xs px-2 py-0.5 rounded ${category === 'adult' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} flex-shrink-0 ml-2">
                                        ${category === 'adult' ? '摩西' : '普通'}
                                    </span>
                                </div>
                                ${item.episodeName ? `<div class="text-[11px] text-gray-500 mb-1">选集：${item.episodeName}</div>` : ''}
                                <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    <span>播放次数: ${item.playCount}</span>
                                    ${resumeLabel ? `<span>${resumeLabel}</span>` : ''}
                                    <span>${formatDate(item.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 flex space-x-2">
                            <button 
                                onclick="openVideoPlayer('${item.url}', '${item.title}', '${item.pic || ''}', '${item.source || ''}', '', ${Number.isFinite(item.episodeIndex) ? item.episodeIndex : 'null'}, '${item.desc || ''}', '${item.class || ''}', '${item.actor || ''}', '${item.year || ''}', '${item.remarks || ''}')"
                                class="btn-primary text-xs py-1 px-2 flex-1"
                            >
                                <i class="fa fa-play mr-1"></i> 播放
                            </button>
                            <button 
                                onclick="removeFromHistory('${item.url}')"
                                class="text-gray-500 hover:text-red-500 p-1"
                            >
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                }).join('');
            }
        }
        
        // 切换历史分类Tab
        function switchHistoryTab(tab) {
            const privacyEnabled = isPrivacyModeEnabled();
            // 隐私模式开启时只能选择普通
            if (privacyEnabled && tab !== 'normal') {
                showToast('隐私模式下只能查看普通内容');
                return;
            }
            
            currentHistoryTab = tab;
            
            // 更新Tab样式
            document.getElementById('historyTabAll').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('historyTabAdult').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('historyTabNormal').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById(`historyTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).className = 'flex-1 px-4 py-2 text-center text-sm font-medium bg-blue-100 text-blue-800';
            
            // 重新显示历史记录
            updateHistoryDisplay();
            // 更新Tab数量
            updatePanelTabCounts();
        }
        
        // 初始化历史面板Tab
        function initHistoryTabs() {
            // 默认选择普通
            document.getElementById('historyTabAll').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('historyTabAdult').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('historyTabNormal').className = 'flex-1 px-4 py-2 text-center text-sm font-medium bg-blue-100 text-blue-800';
            currentHistoryTab = 'normal';
            updatePanelTabCounts();
        }
        
        // 切换喜欢分类Tab
        function switchFavoriteTab(tab) {
            const privacyEnabled = isPrivacyModeEnabled();
            // 隐私模式开启时只能选择普通
            if (privacyEnabled && tab !== 'normal') {
                showToast('隐私模式下只能查看普通内容');
                return;
            }
            
            currentFavoriteTab = tab;
            
            // 更新Tab样式
            document.getElementById('favoriteTabAll').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('favoriteTabAdult').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('favoriteTabNormal').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById(`favoriteTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).className = 'flex-1 px-4 py-2 text-center text-sm font-medium bg-blue-100 text-blue-800';
            
            // 重新显示喜欢内容
            renderFavoriteContent(buildFavoriteStatusList());
            // 更新Tab数量
            updatePanelTabCounts();
        }
        
        // 初始化喜欢面板Tab
        function initFavoriteTabs() {
            // 默认选择普通
            document.getElementById('favoriteTabAll').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('favoriteTabAdult').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('favoriteTabNormal').className = 'flex-1 px-4 py-2 text-center text-sm font-medium bg-blue-100 text-blue-800';
            currentFavoriteTab = 'normal';
            updatePanelTabCounts();
        }
        
        // 分享功能
        let currentShareTab = 'all';
        
        // 切换分享分类Tab
        async function loadShareList() {
            let remote = null;
            if (!shareListLoaded) {
                remote = await loadRemoteShares();
            }
            const shares = (remote || getShareList()).map(normalizeShareItem).filter(Boolean);
            renderShareContent(shares);
        }

        async function switchShareTab(tab) {
            const privacyEnabled = isPrivacyModeEnabled();
            // 隐私模式开启时只能选择普通
            if (privacyEnabled && tab !== 'normal') {
                showToast('隐私模式下只能查看普通内容');
                return;
            }
            
            currentShareTab = tab;
            
            // 更新Tab样式
            document.getElementById('shareTabAll').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('shareTabAdult').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('shareTabNormal').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById(`shareTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).className = 'flex-1 px-4 py-2 text-center text-sm font-medium bg-blue-100 text-blue-800';
            
            // 重新显示分享内容
            await loadShareList();
            // 更新Tab数量
            updatePanelTabCounts();
        }
        
        // 更新所有面板的Tab数量
        function updatePanelTabCounts() {
            // 更新历史面板Tab数量
            const history = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
            const historyAllCount = history.length;
            const historyAdultCount = history.filter(item => {
                const category = getOfficialCategoryByName(item.source) || '';
                return normalizeCategory(category) === 'adult';
            }).length;
            const historyNormalCount = history.filter(item => {
                const category = getOfficialCategoryByName(item.source) || '';
                return normalizeCategory(category) === 'normal';
            }).length;
            document.getElementById('historyTabAll').textContent = `全部 (${historyAllCount})`;
            document.getElementById('historyTabAdult').textContent = `摩西 (${historyAdultCount})`;
            document.getElementById('historyTabNormal').textContent = `普通 (${historyNormalCount})`;

            // 更新喜欢面板Tab数量
            ensureFavoritesCacheImmediate();
            const favorites = getFavorites();
            const favoriteAllCount = favorites.length;
            const favoriteAdultCount = favorites.filter(item => {
                const category = item.category || getOfficialCategoryByName(item.source) || '';
                return normalizeCategory(category) === 'adult';
            }).length;
            const favoriteNormalCount = favorites.filter(item => {
                const category = item.category || getOfficialCategoryByName(item.source) || '';
                return normalizeCategory(category) === 'normal';
            }).length;
            document.getElementById('favoriteTabAll').textContent = `全部 (${favoriteAllCount})`;
            document.getElementById('favoriteTabAdult').textContent = `摩西 (${favoriteAdultCount})`;
            document.getElementById('favoriteTabNormal').textContent = `普通 (${favoriteNormalCount})`;

            // 更新分享面板Tab数量
            const shares = getShareList();
            const shareAllCount = shares.length;
            const shareAdultCount = shares.filter(item => {
                const category = item.category || getOfficialCategoryByName(item.source) || '';
                return normalizeCategory(category) === 'adult';
            }).length;
            const shareNormalCount = shares.filter(item => {
                const category = item.category || getOfficialCategoryByName(item.source) || '';
                return normalizeCategory(category) === 'normal';
            }).length;
            document.getElementById('shareTabAll').textContent = `全部 (${shareAllCount})`;
            document.getElementById('shareTabAdult').textContent = `摩西 (${shareAdultCount})`;
            document.getElementById('shareTabNormal').textContent = `普通 (${shareNormalCount})`;
        }

        // 初始化分享面板Tab
        function initShareTabs() {
            // 默认选择普通
            document.getElementById('shareTabAll').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('shareTabAdult').className = 'flex-1 px-4 py-2 text-center text-sm font-medium';
            document.getElementById('shareTabNormal').className = 'flex-1 px-4 py-2 text-center text-sm font-medium bg-blue-100 text-blue-800';
            currentShareTab = 'normal';
            updatePanelTabCounts();
        }
        
        // 页面加载完成后初始化
        window.addEventListener('DOMContentLoaded', function() {
            initHistoryTabs();
            initFavoriteTabs();
            initShareTabs();
        });

        // 喜欢功能
        let favoritesCache = null;
        let favoritesLoadingPromise = null;
        const FAVORITES_REMOTE_LOADED_KEY = 'videoFavoritesRemoteLoaded';
        let currentFavoriteTab = 'all';

        function getFavorites() {
            if (Array.isArray(favoritesCache)) return favoritesCache;
            return [];
        }

        function ensureFavoritesCacheImmediate() {
            if (!Array.isArray(favoritesCache)) {
                favoritesCache = JSON.parse(localStorage.getItem('videoFavorites') || '[]');
            }
        }

        function setFavoritesCache(list) {
            favoritesCache = Array.isArray(list) ? list : [];
            try {
                localStorage.setItem('videoFavorites', JSON.stringify(favoritesCache));
            } catch (e) {
                // ignore storage errors
            }
        }

        async function loadFavorites(force = false) {
            if (favoritesLoadingPromise) return favoritesLoadingPromise;
            const token = getUserToken ? getUserToken() : '';
            const alreadyLoaded = localStorage.getItem(FAVORITES_REMOTE_LOADED_KEY) === '1';
            if (!force && (alreadyLoaded || !token)) {
                setFavoritesCache(getFavorites());
                refreshLocalStatsDisplay();
                return;
            }
            favoritesLoadingPromise = (async () => {
                try {
                    const res = await fetch('/api/user/favorites', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data && data.code === 200 && Array.isArray(data.data)) {
                        setFavoritesCache(data.data);
                        localStorage.setItem(FAVORITES_REMOTE_LOADED_KEY, '1');
                        refreshLocalStatsDisplay();
                    }
                } catch (e) {
                    // ignore
                } finally {
                    favoritesLoadingPromise = null;
                }
            })();
            return favoritesLoadingPromise;
        }

        async function mergeLocalFavoritesToMongo() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) return;
            const local = JSON.parse(localStorage.getItem('videoFavorites') || '[]');
            if (!Array.isArray(local) || local.length === 0) return;
            try {
                await Promise.all(local.map(item => {
                    return fetch('/api/user/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                            title: item.title,
                            url: item.url,
                            pic: item.pic || '',
                            source: item.source || '',
                            timestamp: item.timestamp || Date.now()
                        })
                    });
                }));
            } catch (e) {
                // ignore
            }
        }

        async function uploadLocalFavorites() {
            showToast('已关闭一键同步：喜欢只会从线上读取一次并保存到本地');
        }

        function isFavorited(videoUrl) {
            // 检查完整的URL，不进行分割
            const fullVideoUrl = videoUrl;
            const favorites = getFavorites();
            return favorites.some(item => item.url === fullVideoUrl);
        }

        async function toggleFavorite(title, videoUrl, pic, buttonEl, sourceLabel = '') {
            const token = getUserToken ? getUserToken() : '';
            ensureFavoritesCacheImmediate();
            const favorites = getFavorites();
            // 保存完整的URL，不进行分割
            const fullVideoUrl = videoUrl;
            const existingIndex = favorites.findIndex(item => item.url === fullVideoUrl);
            
            if (existingIndex >= 0) {
                favorites.splice(existingIndex, 1);
                setFavoritesCache(favorites);
                showToast('已取消喜欢');
                updateFavoriteButton(buttonEl, false);
                scheduleUserStatsUpdate();
                if (token) {
                    fetch('/api/user/favorites', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ url: fullVideoUrl })
                    }).catch(() => {});
                }
            } else {
                const source = sourceLabel || getHostLabel();
                const item = {
                    title,
                    url: fullVideoUrl,
                    pic: pic || '',
                    source: source || '',
                    timestamp: Date.now()
                };
                favorites.unshift(item);
                if (favorites.length > 100) {
                    favorites.splice(100);
                }
                setFavoritesCache(favorites);
                showToast('已加入喜欢');
                updateFavoriteButton(buttonEl, true);
                scheduleUserStatsUpdate();
                if (token) {
                    fetch('/api/user/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(item)
                    }).then(async () => {
                        try {
                            if (!Array.isArray(favoritesCache)) {
                                await loadFavorites();
                            } else if (!favoritesCache.some(f => f && f.url === fullVideoUrl)) {
                                favoritesCache.unshift(item);
                                if (favoritesCache.length > 100) favoritesCache.splice(100);
                            }
                            if (!favoritePanel.classList.contains('translate-x-full')) {
                                renderFavoriteContent(buildFavoriteStatusList());
                            }
                        } catch (e) {
                            // ignore
                        }
                    }).catch(() => {});
                }
            }
        }

        function updateFavoriteButton(buttonEl, isLiked) {
            if (!buttonEl) return;
            buttonEl.classList.toggle('text-red-500', isLiked);
            buttonEl.classList.toggle('text-gray-500', !isLiked);
            const icon = buttonEl.querySelector('i');
            if (icon) {
                icon.className = `fa ${isLiked ? 'fa-heart' : 'fa-heart-o'} mr-1`;
            }
        }

        function buildFavoriteStatusList() {
            const remoteFavorites = Array.isArray(favoritesCache) ? favoritesCache : [];
            return remoteFavorites
                .filter(item => item && item.url)
                .map(item => ({ ...item, _status: 'remote' }))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        function renderFavoriteContent(list) {
            const favorites = Array.isArray(list) ? list : [];
            
            // 根据当前tab过滤喜欢内容
            let filteredFavorites = favorites;
            if (currentFavoriteTab !== 'all') {
                filteredFavorites = favorites.filter(item => {
                    const category = getOfficialCategoryByName(item.source) || '';
                    return normalizeCategory(category) === currentFavoriteTab;
                });
            }
            
            if (filteredFavorites.length === 0) {
                favoriteContent.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fa fa-heart text-4xl mb-3"></i>
                        <p>暂无喜欢内容</p>
                    </div>
                `;
                return;
            }
            favoriteContent.innerHTML = filteredFavorites.map(item => {
                const category = normalizeCategory(getOfficialCategoryByName(item.source) || '');
                return `
                <div class="bg-white rounded-lg p-3 mb-3 shadow-sm">
                    <div class="flex space-x-3">
                        <div class="w-20 h-12 rounded-md overflow-hidden bg-gray-200 flex-shrink-0 cursor-pointer" data-preview-group="favorite" data-preview-url="${item.pic || FALLBACK_IMAGE}" data-preview-title="${item.title || ''}" data-preview-video-url="${item.url || ''}" data-preview-source="${item.source || ''}" onclick="openPreviewFromGroup(this)">
                            ${
                                item.pic
                                    ? `<img src="${item.pic}" alt="${item.title}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';" loading="lazy" class="w-full h-full object-cover">`
                                    : `<img src="${FALLBACK_IMAGE}" alt="loading" loading="lazy" class="w-full h-full object-cover">`
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between mb-2 flex-wrap">
                                <h4 class="font-medium text-sm line-clamp-1 flex-1 min-w-0">
                                    <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-1">${item.source || '未知来源'}</span>
                                    <span class="mr-1">${item._status === 'both' ? '🟢' : (item._status === 'local' ? '🔴' : '🟡')}</span>
                                    ${item.title}
                                </h4>
                                <span class="text-xs px-2 py-0.5 rounded ${category === 'adult' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} flex-shrink-0 ml-2">
                                    ${category === 'adult' ? '摩西' : '普通'}
                                </span>
                            </div>
                            <div class="text-xs text-gray-500">
                                <span>收藏时间: ${formatDate(item.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 flex space-x-2">
                        <button 
                            onclick="openVideoPlayer('${item.url}', '${item.title}', '${item.pic || ''}', '${item.source || ''}', '', null, '${item.desc || ''}', '${item.class || ''}', '${item.actor || ''}', '${item.year || ''}', '${item.remarks || ''}')"
                            class="btn-primary text-xs py-1 px-2 flex-1"
                        >
                            <i class="fa fa-play mr-1"></i> 播放
                        </button>
                        <button 
                            onclick="removeFavoriteWithSpin(this, '${item.url}')"
                            class="text-gray-500 hover:text-red-500 p-1"
                        >
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            }).join('');
        }

        async function toggleFavorites() {
            const willOpen = favoritePanel.classList.contains('translate-x-full');
            if (!willOpen) {
                favoritePanel.classList.add('translate-x-full');
                updateOverlayForPanels();
                return;
            }
            favoriteContent.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="inline-flex items-center space-x-2">
                        <span class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        <span>加载中...</span>
                    </span>
                </div>
            `;
            if (uploadFavoritesButton) {
                uploadFavoritesButton.classList.add('hidden');
            }
            closePanelsExcept(favoritePanel);
            favoritePanel.classList.remove('translate-x-full');
            updateOverlayForPanels();
            if (!Array.isArray(favoritesCache)) {
                await loadFavorites();
            }
            const favorites = buildFavoriteStatusList();
            renderFavoriteContent(favorites);
        }

        async function removeFavorite(url) {
            try {
                const token = getUserToken ? getUserToken() : '';
                if (token) {
                    await fetch('/api/user/favorites', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ url })
                    });
                }
                const favorites = getFavorites().filter(item => item.url !== url);
                setFavoritesCache(favorites);
                toggleFavorites();
                toggleFavorites();
                scheduleUserStatsUpdate();
            } catch (error) {
                console.error('移除喜欢失败:', error);
            }
        }

        async function removeFavoriteWithSpin(button, url) {
            if (button) {
                button.disabled = true;
                button.classList.add('opacity-60', 'cursor-not-allowed');
                const icon = button.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-trash');
                    icon.classList.add('fa-refresh', 'fa-spin');
                }
            }
            await removeFavorite(url);
        }

        function openClearFavoritesConfirm() {
            if (!clearFavoritesModal) return;
            clearFavoritesModal.classList.remove('hidden');
            clearFavoritesModal.classList.add('flex');
            if (clearFavoritesPassword) clearFavoritesPassword.value = '';
            if (clearFavoritesError) clearFavoritesError.classList.add('hidden');
            if (clearFavoritesPassword) clearFavoritesPassword.focus();
        }

        function closeClearFavoritesModal() {
            if (!clearFavoritesModal) return;
            clearFavoritesModal.classList.add('hidden');
            clearFavoritesModal.classList.remove('flex');
        }

        async function confirmClearFavorites() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) {
                showToast('请先登录');
                return;
            }
            const password = clearFavoritesPassword ? clearFavoritesPassword.value.trim() : '';
            if (!password) {
                if (clearFavoritesError) {
                    clearFavoritesError.textContent = '请输入密码';
                    clearFavoritesError.classList.remove('hidden');
                }
                return;
            }
            try {
                const verifyRes = await fetch('/api/user/verify-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ password })
                });
                const verifyData = await verifyRes.json();
                if (!verifyData || verifyData.code !== 200 || verifyData.data !== true) {
                    if (clearFavoritesError) {
                        clearFavoritesError.textContent = '密码错误，请重试';
                        clearFavoritesError.classList.remove('hidden');
                    }
                    return;
                }
                await fetch('/api/user/favorites/all', {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFavoritesCache([]);
                toggleFavorites();
                toggleFavorites();
                closeClearFavoritesModal();
                showToast('喜欢内容已清空');
                scheduleUserStatsUpdate();
            } catch (e) {
                if (clearFavoritesError) {
                    clearFavoritesError.textContent = '验证失败，请稍后重试';
                    clearFavoritesError.classList.remove('hidden');
                }
            }
        }
        
        // 从历史记录中移除
        function removeFromHistory(url) {
            try {
                const history = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
                const filteredHistory = history.filter(item => item.url !== url);
                localStorage.setItem('videoPlayHistory', JSON.stringify(filteredHistory));
                
                // 重新渲染历史记录
                toggleHistory();
                toggleHistory();
                scheduleUserStatsUpdate();
            } catch (error) {
                console.error('移除历史记录失败:', error);
            }
        }
        
        // 清空历史记录
        function clearHistory() {
            if (confirm('确定要清空所有播放历史吗？')) {
                localStorage.removeItem('videoPlayHistory');
                toggleHistory();
                toggleHistory();
                showToast('历史记录已清空');
                scheduleUserStatsUpdate();
                updatePanelTabCounts();
            }
        }
        
        // 切换Host设置模态框
        function toggleHostModal() {
            const willOpen = hostModal.classList.contains('translate-x-full');
            if (willOpen) closePanelsExcept(hostModal);
            hostModal.classList.toggle('translate-x-full');
            updateOverlayForPanels();

            if (willOpen) {
                hostInput.value = host;
                updateHostNameDisplay(host);
                updateCustomTypeSelect();
                hostInput.focus();
                fetchOfficialApis(false);
                renderHostHistory();
                renderTransferHistory();
            }
        }

        function showHostModal() {
            if (!hostModal) return;
            if (hostModal.classList.contains('translate-x-full')) {
                toggleHostModal();
            }
        }
        
        // 保存Host设置
        function saveHost() {
            const input = hostInput.value.trim();
            
            if (!input) {
                showToast('请输入有效的Host地址');
                return;
            }
            
            // 验证URL格式
            try {
                new URL(input);
            } catch (e) {
                showToast('请输入有效的URL格式');
                return;
            }
            
            host = input;
            localStorage.setItem('apiHost', host);
            hostName = getOfficialNameByUrl(host) || getHostNameFromUrl(host);
            localStorage.setItem('apiHostName', hostName);
            const rawCategory = getOfficialCategoryByUrl(host);
            if (rawCategory) {
                const officialCategory = normalizeCategory(rawCategory);
                if (officialCategory === 'normal' || officialCategory === 'adult') {
                    localStorage.setItem(OFFICIAL_API_TYPE_KEY, officialCategory);
                    switchOfficialTab(officialCategory);
                }
            } else if (customTypeSelect) {
                const manualType = customTypeSelect.value;
                if (manualType === 'normal' || manualType === 'adult') {
                    localStorage.setItem(CUSTOM_API_TYPE_KEY, manualType);
                }
            }
            saveHostHistory(host);
            updateHostNameDisplay(host);
            updateCustomTypeSelect();
            
            toggleHostModal();
            showToast('Host设置已保存');
            
            // 如果之前因为没有Host而无法加载数据，现在重新加载
            if (videoList.children.length === 0) {
                loadInitialData();
            }
        }
        
        // 重置Host设置
        function resetHost() {
            host = '';
            hostName = '';
            hostInput.value = '';
            localStorage.removeItem('apiHost');
            localStorage.removeItem('apiHostName');
            updateHostNameDisplay('');
            updateCustomTypeSelect();
            showToast('Host已重置');
        }

        // 聚合搜索开关
        function isAggregateSearchEnabled() {
            return localStorage.getItem('aggregateSearch') === '1';
        }

        function toggleAggregateSearch() {
            if (!aggregateSwitch) return;
            const enabled = !!aggregateSwitch.checked;
            if (enabled) {
                const selected = getAggregateApiSelection();
                if (selected.length < 2) {
                    aggregateSwitch.checked = false;
                    updateAggregateSwitchUI(false);
                    showToast('请至少选择2个接口后再开启聚合搜索');
                    return;
                }
            }
            localStorage.setItem('aggregateSearch', enabled ? '1' : '0');
            updateAggregateSwitchUI(enabled);
            if (enabled) {
                fetchOfficialApis(false);
                renderAggregateApiSelection(officialApiCache ? officialApiCache.data : []);
                if (aggregateApiSection && aggregateApiSection.classList.contains('hidden')) {
                    aggregateApiSection.classList.remove('hidden');
                    if (aggregateApiToggleButton) {
                        aggregateApiToggleButton.textContent = '收起';
                    }
                }
                showToast('已开启聚合搜索');
            } else {
                showToast('已关闭聚合搜索');
            }
            // 根据聚合搜索是否开启来显示/隐藏进度条
            const progressDisplay = document.getElementById('progressDisplay');
            if (progressDisplay) {
                progressDisplay.style.display = enabled ? 'block' : 'none';
            }
        }

        function confirmAggregateSelection() {
            const selected = getAggregateApiSelection();
            if (selected.length < 2) {
                showToast('请至少选择2个接口后再保存');
                if (aggregateApiSection && aggregateApiSection.classList.contains('hidden')) {
                    aggregateApiSection.classList.remove('hidden');
                }
                return;
            }
            showToast('聚合接口已保存');
            if (!hostModal.classList.contains('translate-x-full')) {
                toggleHostModal();
            }
        }

        function toggleAggregateApiSection() {
            if (!aggregateApiSection) return;
            fetchOfficialApis(false);
            aggregateApiSection.classList.toggle('hidden');
            if (aggregateApiToggleButton) {
                aggregateApiToggleButton.textContent = aggregateApiSection.classList.contains('hidden') ? '展开' : '收起';
            }
        }

        let currentAggregateTab = 'adult';

        function switchAggregateTab(type) {
            currentAggregateTab = type;
            const adultTab = document.getElementById('aggregateTabAdult');
            const normalTab = document.getElementById('aggregateTabNormal');
            if (aggregateApiListAdult) aggregateApiListAdult.classList.toggle('hidden', type !== 'adult');
            if (aggregateApiListNormal) aggregateApiListNormal.classList.toggle('hidden', type !== 'normal');
            if (adultTab) {
                adultTab.classList.toggle('bg-white', type === 'adult');
                adultTab.classList.toggle('shadow', type === 'adult');
                adultTab.classList.toggle('text-gray-800', type === 'adult');
                adultTab.classList.toggle('text-gray-600', type !== 'adult');
            }
            if (normalTab) {
                normalTab.classList.toggle('bg-white', type === 'normal');
                normalTab.classList.toggle('shadow', type === 'normal');
                normalTab.classList.toggle('text-gray-800', type === 'normal');
                normalTab.classList.toggle('text-gray-600', type !== 'normal');
            }
        }

        function toggleOfficialApiSection() {
            if (!officialApiSection) return;
            officialApiSection.classList.toggle('hidden');
            if (officialApiToggleButton) {
                officialApiToggleButton.textContent = officialApiSection.classList.contains('hidden') ? '展开' : '收起';
            }
        }

        function switchOfficialTab(type) {
            const adultTab = document.getElementById('officialTabAdult');
            const normalTab = document.getElementById('officialTabNormal');
            if (officialApiListAdult) officialApiListAdult.classList.toggle('hidden', type !== 'adult');
            if (officialApiListNormal) officialApiListNormal.classList.toggle('hidden', type !== 'normal');
            if (adultTab) {
                adultTab.classList.toggle('bg-white', type === 'adult');
                adultTab.classList.toggle('shadow', type === 'adult');
                adultTab.classList.toggle('text-gray-800', type === 'adult');
                adultTab.classList.toggle('text-gray-600', type !== 'adult');
            }
            if (normalTab) {
                normalTab.classList.toggle('bg-white', type === 'normal');
                normalTab.classList.toggle('shadow', type === 'normal');
                normalTab.classList.toggle('text-gray-800', type === 'normal');
                normalTab.classList.toggle('text-gray-600', type !== 'normal');
            }
        }

        function getDefaultOfficialTab() {
            const savedType = localStorage.getItem(OFFICIAL_API_TYPE_KEY);
            if (savedType === 'normal' || savedType === 'adult') return savedType;
            const category = getCurrentHostCategory();
            return category === 'normal' ? 'normal' : 'adult';
        }

        function updateAggregateSwitchUI(enabled) {
            if (!aggregateSwitch) return;
            const track = aggregateSwitch.nextElementSibling;
            if (!track) return;
            const thumb = track.firstElementChild;
            track.classList.toggle('bg-primary', enabled);
            track.classList.toggle('bg-gray-300', !enabled);
            if (thumb) {
                thumb.classList.toggle('translate-x-4', enabled);
                thumb.classList.toggle('translate-x-0', !enabled);
            }
            updateSearchButtonLabel(enabled);
        }

        function isPrivacyModeEnabled() {
            const value = localStorage.getItem('privacyMode');
            if (value === null) {
                const category = normalizeCategory(getCurrentHostCategory());
                return category !== 'normal';
            }
            return value === '1';
        }

        async function togglePrivacyMode() {
            if (!privacySwitch) return;
            const enabled = !!privacySwitch.checked;
            localStorage.setItem('privacyMode', enabled ? '1' : '0');
            updatePrivacySwitchUI(enabled);
            applyPrivacyMode(enabled);
            
            // 开启隐私模式时，自动切换所有面板到普通tab
            if (enabled) {
                // 强制切换所有面板到普通tab，无论当前状态如何
                switchHistoryTab('normal');
                switchFavoriteTab('normal');
                await switchShareTab('normal');
            }
            
            showToast(enabled ? '已开启隐私遮挡' : '已关闭隐私遮挡');
        }

        function updatePrivacySwitchUI(enabled) {
            if (!privacySwitch) return;
            const track = privacySwitch.nextElementSibling;
            if (!track) return;
            const thumb = track.firstElementChild;
            track.classList.toggle('bg-primary', enabled);
            track.classList.toggle('bg-gray-300', !enabled);
            if (thumb) {
                thumb.classList.toggle('translate-x-4', enabled);
                thumb.classList.toggle('translate-x-0', !enabled);
            }
        }

        function applyPrivacyMode(enabled) {
            document.body.classList.toggle('privacy-on', !!enabled);
        }

        function updateSearchButtonLabel(aggregateEnabled) {
            const desktopLabel = document.getElementById('searchButtonLabel');
            const mobileLabel = document.getElementById('searchButtonLabelMobile');
            if (desktopLabel) desktopLabel.textContent = aggregateEnabled ? '聚合搜索' : '搜索';
            if (mobileLabel) mobileLabel.textContent = aggregateEnabled ? '聚合搜' : '搜索';
        }

        function toggleMobileSearch() {
            const box = document.getElementById('mobileSearchBox');
            if (!box) return;
            box.classList.toggle('hidden');
            if (!box.classList.contains('hidden')) {
                if (searchInputMobile) searchInputMobile.focus();
            }
        }

        // 导出/导入喜欢、历史、昵称与搜索记录
        function exportUserData() {
            const favorites = JSON.parse(localStorage.getItem('videoFavorites') || '[]');
            const playHistory = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
            const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            const userNickname = localStorage.getItem('userNickname') || '';
            const playbackResume = JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY) || '{}');
            const payload = {
                favorites,
                playHistory,
                searchHistory,
                userNickname,
                playbackResume
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            a.download = `video-data-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            addTransferHistory('导出', a.download);
            showToast('导出成功');
        }

        function importUserData(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result || '{}');
                    if (data.favorites && Array.isArray(data.favorites)) {
                        setFavoritesCache(data.favorites);
                    } else {
                        setFavoritesCache([]);
                    }
                    if (data.playHistory && Array.isArray(data.playHistory)) {
                        localStorage.setItem('videoPlayHistory', JSON.stringify(data.playHistory));
                    } else {
                        localStorage.setItem('videoPlayHistory', JSON.stringify([]));
                    }
                    if (data.searchHistory && Array.isArray(data.searchHistory)) {
                        localStorage.setItem('searchHistory', JSON.stringify(data.searchHistory));
                    } else {
                        localStorage.setItem('searchHistory', JSON.stringify([]));
                    }
                    // 用户昵称已改为账号资料，不再本地保存
                    if (data.playbackResume && typeof data.playbackResume === 'object') {
                        localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(data.playbackResume));
                    } else {
                        localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify({}));
                    }
                    renderUserInfo({ skipStatsFetch: true });
                    addTransferHistory('导入', file.name);
                    showToast('导入成功');
                    scheduleUserStatsUpdate();
                } catch (e) {
                    showToast('导入失败：文件格式不正确');
                } finally {
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        }

        function getTransferHistory() {
            return JSON.parse(localStorage.getItem('transferHistory') || '[]');
        }

        function addTransferHistory(type, filename) {
            const history = getTransferHistory();
            history.unshift({
                type,
                filename: filename || '',
                timestamp: Date.now()
            });
            if (history.length > 10) {
                history.splice(10);
            }
            localStorage.setItem('transferHistory', JSON.stringify(history));
            renderTransferHistory();
        }

        function renderTransferHistory() {
            if (!transferHistoryList) return;
            const history = getTransferHistory();
            if (history.length === 0) {
                transferHistoryList.innerHTML = `
                    <div class="text-xs text-gray-500">暂无记录</div>
                `;
                return;
            }
            transferHistoryList.innerHTML = history.map(item => `
                <div class="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                    <div class="min-w-0 mr-2">
                        <div class="text-xs text-gray-700 truncate">${item.type} · ${formatDate(item.timestamp)}</div>
                        <div class="text-[11px] text-gray-500 truncate">${item.filename || ''}</div>
                    </div>
                </div>
            `).join('');
        }

        function handleActionSelect(value) {
            if (!value) return;
            if (value === 'favorite') {
                toggleFavorites();
            } else if (value === 'share') {
                toggleSharePanel();
            } else if (value === 'history') {
                toggleHistory();
            } else if (value === 'user') {
                toggleUserInfo();
            } else if (value === 'setting') {
                toggleHostModal();
            } else if (value === 'about') {
                toggleAboutPanel();
            }
            const select = document.getElementById('actionSelect');
            if (select) select.value = '';
        }

        function toggleMoreMenu() {
            const menu = document.getElementById('moreMenu');
            if (!menu) return;
            menu.classList.toggle('hidden');
            if (!menu.classList.contains('hidden')) {
                menu.addEventListener('mouseleave', handleMoreMenuMouseLeave, { once: true });
            }
        }

        function handleMoreAction(action) {
            if (action === 'favorite') {
                toggleFavorites();
            } else if (action === 'share') {
                toggleSharePanel();
            } else if (action === 'history') {
                toggleHistory();
            } else if (action === 'user') {
                toggleUserInfo();
            } else if (action === 'setting') {
                toggleHostModal();
            } else if (action === 'about') {
                toggleAboutPanel();
            }
            const menu = document.getElementById('moreMenu');
            if (menu) menu.classList.add('hidden');
        }

        function handleMoreMenuMouseLeave() {
            const menu = document.getElementById('moreMenu');
            if (menu) menu.classList.add('hidden');
        }

        let currentUserProfile = null;
        let currentUserStats = null;

        async function fetchUserProfile() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) return null;
            try {
                const res = await fetch('/api/user/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data && data.code === 200 && data.data) {
                    currentUserProfile = data.data;
                    if (Array.isArray(currentUserProfile.visitHistory)) {
                        localStorage.setItem('visitHistory', JSON.stringify(currentUserProfile.visitHistory));
                    }
                    return currentUserProfile;
                }
            } catch (e) {
                // ignore
            }
            return null;
        }

        async function fetchUserStats() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) return null;
            try {
                const res = await fetch('/api/user/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data && data.code === 200 && data.data) {
                    currentUserStats = data.data;
                    return currentUserStats;
                }
            } catch (e) {
                // ignore
            }
            return null;
        }

        async function renderUserInfo(options = {}) {
            if (!userInfoContent) return;
            const nicknameDisplay = document.getElementById('userNicknameDisplay');
            const nicknameButton = document.getElementById('userNicknameButton');
            const nicknameInput = document.getElementById('userNicknameInput');
            const nicknameEditor = document.getElementById('userNicknameEditor');
            const noteDisplay = document.getElementById('userNoteDisplay');
            const noteInput = document.getElementById('userNoteInput');
            const logoutBtn = document.querySelector('[data-action="logout"]');
            const rangeSelect = document.getElementById('visitRangeSelect');
            const skipStatsFetch = !!options.skipStatsFetch;
            if (nicknameDisplay) {
                nicknameDisplay.innerHTML = `
                    <span class="inline-flex items-center space-x-2 text-gray-500">
                        <span class="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        <span>加载中...</span>
                    </span>
                `;
            }
            if (nicknameButton) {
                nicknameButton.textContent = '加载中...';
            }
            if (nicknameEditor) {
                nicknameEditor.classList.add('hidden');
            }
            if (nicknameInput) {
                nicknameInput.disabled = true;
            }
            if (noteInput) {
                noteInput.disabled = true;
            }
            if (logoutBtn) {
                logoutBtn.disabled = true;
            }
            let profile = currentUserProfile;
            let stats = currentUserStats;
            if (!profile) {
                const token = getUserToken ? getUserToken() : '';
                if (token) {
                    profile = await fetchUserProfile();
                    if (!skipStatsFetch) {
                        // stats fetch disabled; keep cached stats
                    }
                }
            }
            const nicknameText = profile ? (profile.nickname || profile.username || '未登录') : '未登录';
            if (nicknameDisplay) {
                nicknameDisplay.textContent = nicknameText;
            }
            // 检查登录状态，更新退出登录按钮的显示状态
            checkLoginStatus();
            if (nicknameButton) {
                nicknameButton.textContent = nicknameText;
            }
            if (profile && profile.avatar) {
                localStorage.setItem(USER_AVATAR_KEY, String(profile.avatar));
            }
            applyAvatarFromStorage();
            if (nicknameInput) {
                nicknameInput.value = profile ? (profile.nickname || profile.username || '') : '';
                nicknameInput.disabled = false;
            }
            const noteValue = profile ? (profile.profileNote || profile.note || '') : '';
            if (noteInput) {
                noteInput.value = noteValue;
                noteInput.disabled = false;
            }
            if (noteDisplay) {
                noteDisplay.textContent = noteValue || '点击填写备注';
            }
            if (logoutBtn) {
                logoutBtn.disabled = !profile;
            }
            if (rangeSelect) {
                rangeSelect.onchange = () => {
                    setVisitRangeDays(rangeSelect.value);
                    renderUserInfo({ skipStatsFetch: true });
                };
            }
            const favoriteCountEl = document.getElementById('userFavoriteCount');
            const shareCountEl = document.getElementById('userShareCount');
            const historyCountEl = document.getElementById('userHistoryCount');
            const searchCountEl = document.getElementById('userSearchCount');
            const watchTodayEl = document.getElementById('userWatchToday');
            let favoriteCount = Math.max(0, Number(stats?.favoriteCount || 0));
            let shareCount = Math.max(0, Number(stats?.shareCount || 0));
            let historyCount = Math.max(0, Number(stats?.historyCount || 0));
            let searchCount = Math.max(0, Number(stats?.searchCount || 0));
            let watchSeconds = Math.max(0, Number(stats?.watchSeconds || 0));
            const lastVisitEl = document.getElementById('userLastVisit');
            if (lastVisitEl) {
                const historyList = Array.isArray(profile?.visitHistory) && profile.visitHistory.length > 0
                    ? normalizeVisitHistory(profile.visitHistory)
                    : normalizeVisitHistory(JSON.parse(localStorage.getItem('visitHistory') || '[]'));
                const rangeDays = getVisitRangeDays();
                if (rangeSelect) {
                    rangeSelect.value = String(rangeDays);
                }
                const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
                const filteredHistory = historyList.filter((item) => item.time >= cutoff);
                if (!filteredHistory || filteredHistory.length === 0) {
                    lastVisitEl.textContent = '首次访问';
                } else {
                    const groups = new Map();
                    filteredHistory.forEach((entry) => {
                        const dayKey = formatDateOnly(entry.time) || '未知日期';
                        if (!groups.has(dayKey)) groups.set(dayKey, []);
                        groups.get(dayKey).push(entry);
                    });
                    const html = Array.from(groups.entries()).map(([day, entries]) => {
                        const itemsHtml = entries.map((entry) => {
                            const timeText = formatDate(Number(entry.time));
                            const ipText = escapeHtml(formatIp(entry.ip));
                            const uaText = escapeHtml(detectClientLabel(entry.userAgent));
                            return `<div class="text-[11px] text-gray-600 leading-5">${timeText} · ${ipText} · ${uaText}</div>`;
                        }).join('');
                        return `
                            <div class="space-y-1">
                                <div class="text-xs text-gray-500">${day}</div>
                                ${itemsHtml}
                            </div>
                        `;
                    }).join('');
                    lastVisitEl.innerHTML = html;
                }
            }
            if (skipStatsFetch) {
                refreshLocalStatsDisplay();
                return;
            }
            if (favoriteCountEl) favoriteCountEl.textContent = String(favoriteCount);
            if (shareCountEl) shareCountEl.textContent = String(shareCount);
            if (historyCountEl) historyCountEl.textContent = String(historyCount);
            if (searchCountEl) searchCountEl.textContent = String(searchCount);
            if (watchTodayEl) watchTodayEl.textContent = formatDuration(watchSeconds);
        }

        async function saveUserNickname() {
            const nicknameInput = document.getElementById('userNicknameInput');
            const saveButton = document.getElementById('userNicknameSave');
            const nicknameEditor = document.getElementById('userNicknameEditor');
            if (!nicknameInput) return;
            const value = nicknameInput.value.trim();
            const token = getUserToken ? getUserToken() : '';
            if (!token) {
                showToast('请先登录');
                return;
            }
            if (!currentUserProfile) {
                await fetchUserProfile();
            }
            if (!currentUserProfile || !currentUserProfile._id) {
                showToast('无法获取用户信息');
                return;
            }
            const currentName = String(currentUserProfile.nickname || currentUserProfile.username || '').trim();
            if (value === currentName) {
                showToast('昵称未修改');
                return;
            }
            const originalText = saveButton ? saveButton.textContent : '';
            if (saveButton) {
                saveButton.innerHTML = '<span class="inline-flex items-center space-x-2"><span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>保存中...</span></span>';
                saveButton.disabled = true;
            }
            let success = false;
            try {
                const res = await fetch(`/api/user/${currentUserProfile._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ nickname: value })
                });
                const data = await res.json();
                if (data && data.code === 200) {
                    success = true;
                }
            } catch (e) {
                success = false;
            }
            if (success) {
                if (currentUserProfile) {
                    currentUserProfile.nickname = value;
                }
                await renderUserInfo({ skipStatsFetch: true });
                showToast('昵称已保存');
            } else {
                nicknameInput.value = currentName || '';
                showToast('保存失败，请重试');
            }
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = originalText || '保存';
            }
            if (nicknameEditor) {
                nicknameEditor.classList.add('hidden');
            }
        }

        async function saveUserNote() {
            const noteInput = document.getElementById('userNoteInput');
            const noteDisplay = document.getElementById('userNoteDisplay');
            if (!noteInput) return;
            const value = noteInput.value.trim();
            const token = getUserToken ? getUserToken() : '';
            if (!token) {
                showToast('请先登录');
                return;
            }
            if (!currentUserProfile) {
                await fetchUserProfile();
            }
            if (!currentUserProfile || !currentUserProfile._id) {
                showToast('无法获取用户信息');
                return;
            }
            const currentNote = String(currentUserProfile.profileNote || '').trim();
            if (value === currentNote) {
                return;
            }
            const res = await fetch(`/api/user/${currentUserProfile._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ profileNote: value })
            });
            try {
                const data = await res.json();
                if (data && data.code === 200 && data.data) {
                    currentUserProfile = data.data;
                } else if (currentUserProfile) {
                    currentUserProfile.profileNote = value;
                }
            } catch (e) {
                if (currentUserProfile) currentUserProfile.profileNote = value;
            }
            if (noteInput) noteInput.value = value;
            await renderUserInfo({ skipStatsFetch: true });
            showToast('备注已保存');
            if (noteInput) noteInput.classList.add('hidden');
            if (noteDisplay) noteDisplay.classList.remove('hidden');
        }

        function generateRandomNickname() {
            const adjectives = ['清风', '星河', '晨曦', '夜航', '远山', '春雨', '蓝鲸', '微光', '白露', '晚晴'];
            const nouns = ['旅人', '观影者', '探路者', '追光者', '小屋', '电台', '风铃', '岛屿', '长歌', '碎片'];
            const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const number = Math.floor(Math.random() * 900) + 100;
            return `${adjective}${noun}${number}`;
        }

        async function setRandomNickname() {
            const nicknameInput = document.getElementById('userNicknameInput');
            if (!nicknameInput) return;
            const value = generateRandomNickname();
            nicknameInput.value = value;
            await saveUserNickname();
        }

        let noteSaveTimer = null;
        const handleUserNoteBlur = () => {
            if (noteSaveTimer) clearTimeout(noteSaveTimer);
            noteSaveTimer = setTimeout(() => {
                const noteInput = document.getElementById('userNoteInput');
                const noteDisplay = document.getElementById('userNoteDisplay');
                if (!noteInput) return;
                const value = noteInput.value.trim();
                const currentNote = String(currentUserProfile?.profileNote || currentUserProfile?.note || '').trim();
                if (value === currentNote) {
                    noteInput.classList.add('hidden');
                    if (noteDisplay) {
                        noteDisplay.textContent = value || '点击填写备注';
                        noteDisplay.classList.remove('hidden');
                    }
                    return;
                }
                saveUserNote();
            }, 200);
        };

        const bindUserNoteAutoSave = () => {
            const noteInput = document.getElementById('userNoteInput');
            if (!noteInput || noteInput.dataset.bound === '1') return;
            noteInput.addEventListener('blur', handleUserNoteBlur);
            noteInput.dataset.bound = '1';
        };

        const bindUserNicknameAutoSave = () => {
            const nicknameInput = document.getElementById('userNicknameInput');
            if (!nicknameInput || nicknameInput.dataset.bound === '1') return;
            nicknameInput.addEventListener('blur', () => {
                const value = nicknameInput.value.trim();
                const currentName = String(currentUserProfile?.nickname || currentUserProfile?.username || '').trim();
                if (value === currentName) {
                    hideNicknameEditor();
                    return;
                }
                saveUserNickname();
            });
            nicknameInput.dataset.bound = '1';
        };

        function showNicknameEditor() {
            const nicknameEditor = document.getElementById('userNicknameEditor');
            if (nicknameEditor) nicknameEditor.classList.remove('hidden');
        }

        function hideNicknameEditor() {
            const nicknameEditor = document.getElementById('userNicknameEditor');
            if (nicknameEditor) nicknameEditor.classList.add('hidden');
        }

        function showNoteEditor() {
            const noteInput = document.getElementById('userNoteInput');
            const noteDisplay = document.getElementById('userNoteDisplay');
            if (noteInput) noteInput.classList.remove('hidden');
            if (noteDisplay) noteDisplay.classList.add('hidden');
            if (noteInput) noteInput.focus();
        }

        async function logoutUser() {
            const logoutBtn = document.querySelector('[data-action="logout"]');
            const originalHtml = logoutBtn ? logoutBtn.innerHTML : '';
            if (logoutBtn) {
                logoutBtn.innerHTML = '<span class="inline-flex items-center space-x-2"><span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span><span>退出中...</span></span>';
                logoutBtn.disabled = true;
            }
            const token = getUserToken ? getUserToken() : '';
            if (token) {
                try {
                    await fetch('/api/user/logout', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (e) {
                    // ignore
                }
            }
            if (typeof revokeAccess === 'function') {
                revokeAccess('已退出，请重新登录');
            } else if (typeof clearUserToken === 'function') {
                clearUserToken();
            }
            localStorage.removeItem(USER_AVATAR_KEY);
            applyAvatarFromStorage();
            currentUserProfile = null;
            renderUserInfo({ skipStatsFetch: true });
            // 检查登录状态，隐藏退出登录按钮
            checkLoginStatus();
            if (logoutBtn) {
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = originalHtml;
            }
        }

        bindUserNoteAutoSave();
        bindUserNicknameAutoSave();

        function toggleUserInfo() {
            if (!userPanel) return;
            renderUserInfo({ skipStatsFetch: true });
            fetchVisitHistoryOnce().then(() => {
                renderUserInfo({ skipStatsFetch: true });
            });
            const willOpen = userPanel.classList.contains('translate-x-full');
            if (willOpen) closePanelsExcept(userPanel);
            userPanel.classList.toggle('translate-x-full');
            updateOverlayForPanels();
        }

        function toggleAboutPanel() {
            if (!aboutPanel) return;
            const willOpen = aboutPanel.classList.contains('translate-x-full');
            if (willOpen) closePanelsExcept(aboutPanel);
            aboutPanel.classList.toggle('translate-x-full');
            updateOverlayForPanels();
        }
