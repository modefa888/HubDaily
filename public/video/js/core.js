/* 全局状态与基础工具 */
        // 全局变量
        let currentPage = 1;
        let searchTerm = '';
        let host = '';
        let hostName = '';
        let dplayer = null;
        let floatingDplayer = null;
        let isLoading = false;
        let hasMore = true;
        let currentVideoUrl = '';
        let currentVideoTitle = '';
        let currentVideoPic = '';
        let currentVideoSource = '';
        let currentVideoRawUrl = '';
        let currentEpisodeList = [];
        let currentEpisodeIndex = 0;
        let currentVideoDesc = '';
        let currentVideoClass = '';
        let currentVideoActor = '';
        let currentVideoYear = '';
        let currentVideoRemarks = '';
        let lastVisitAtStart = null;
        let aggregateNoMore = new Set();
        let renderedVideos = [];
        const FALLBACK_IMAGE = './loading.gif';
        const RESUME_STORAGE_KEY = 'playbackResume';
        const RESUME_MAX_ITEMS = 200;
        const RESUME_MIN_SECONDS = 5;
        const RESUME_SAVE_THROTTLE_MS = 3000;
        let resumeLastSaveAt = 0;
        let resumeLastUrl = '';
        const WATCH_TIME_KEY = 'videoWatchTimeDaily';
        const WATCH_TIME_MAX_DAYS = 60;
        const OFFICIAL_API_TYPE_KEY = 'officialApiType';
        const CUSTOM_API_TYPE_KEY = 'customApiType';
        const OFFICIAL_API_LIST_KEY = 'officialApiList';
        const OFFICIAL_API_LIST_SIGNATURE_KEY = 'officialApiListSignature';
        const USER_TOKEN_KEY = 'userToken';
        const USER_TOKEN_EXPIRES_KEY = 'userTokenExpires';
        const USER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
        const USER_AVATAR_KEY = 'userAvatarUrl';
        const USER_AVATAR_API = 'https://v2.xxapi.cn/api/head';
        let lastWatchTime = 0;
        let lastWatchUrl = '';
        const loadedTotalCount = document.getElementById('loadedTotalCount');
        let originalPageTitle = document.title;

        // 通用fetch函数，处理401错误
        async function fetchWithAuth(url, options = {}) {
            const token = getUserToken ? getUserToken() : '';
            if (token && !options.headers) {
                options.headers = {};
            }
            if (token) {
                options.headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(url, options);
            
            // 检查是否是JSON响应
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                // 克隆响应对象，因为响应体只能读取一次
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    
                    // 检查是否登录已过期
                    if (data.code === 401 && data.message === '登录已过期') {
                        showToast('登录已过期，请重新登录');
                        setTimeout(() => {
                            window.location.href = '/login/index.html';
                        }, 1000);
                        throw new Error('登录已过期');
                    }
                } catch (error) {
                    // 如果解析JSON失败，继续返回原始响应
                }
            }
            
            return response;
        }

        // 用户相关函数
        function getUserToken() {
            const token = String(localStorage.getItem(USER_TOKEN_KEY) || '').trim();
            if (!token) return '';
            const expiresAt = Number(localStorage.getItem(USER_TOKEN_EXPIRES_KEY) || '0');
            if (!expiresAt) {
                localStorage.setItem(USER_TOKEN_EXPIRES_KEY, String(Date.now() + USER_TOKEN_TTL_MS));
                return token;
            }
            if (Date.now() > expiresAt) {
                clearUserToken();
                return '';
            }
            return token;
        }

        function setUserToken(token) {
            localStorage.setItem(USER_TOKEN_KEY, String(token || ''));
            localStorage.setItem(USER_TOKEN_EXPIRES_KEY, String(Date.now() + USER_TOKEN_TTL_MS));
        }

        function clearUserToken() {
            localStorage.removeItem(USER_TOKEN_KEY);
            localStorage.removeItem(USER_TOKEN_EXPIRES_KEY);
        }

        function revokeAccess() {
            window.location.href = '/login/index.html';
        }

        async function fetchUserRole() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) {
                currentUserRole = null;
                return;
            }
            try {
                const res = await fetchWithAuth('/api/user/profile');
                const data = await res.json();
                if (data.code === 200 && data.data) {
                    currentUserRole = data.data.role || null;
                }
            } catch (e) {
                console.error('获取用户角色失败:', e);
            }
        }

        function isAdmin() {
            return currentUserRole === 'admin';
        }

        function applyAvatar(url) {
            const safe = String(url || '').trim();
            if (safe) {
                if (userAvatarImg) {
                    userAvatarImg.src = safe;
                    userAvatarImg.classList.remove('hidden');
                }
                if (userAvatarPreview) {
                    userAvatarPreview.src = safe;
                    userAvatarPreview.classList.remove('hidden');
                }
                if (userAvatarText) {
                    userAvatarText.classList.add('hidden');
                }
            } else {
                if (userAvatarImg) userAvatarImg.classList.add('hidden');
                if (userAvatarPreview) userAvatarPreview.classList.add('hidden');
                if (userAvatarText) userAvatarText.classList.remove('hidden');
            }
        }
        
        // DOM元素
        const videoList = document.getElementById('videoList');
        const loadMoreButton = document.getElementById('loadMoreButton');
        const emptyState = document.getElementById('emptyState');
        const historyPanel = document.getElementById('historyPanel');
        const historyContent = document.getElementById('historyContent');
        const favoritePanel = document.getElementById('favoritePanel');
        const favoriteContent = document.getElementById('favoriteContent');
        const uploadFavoritesButton = document.getElementById('uploadFavoritesButton');
        const sharePanel = document.getElementById('sharePanel');
        const shareContent = document.getElementById('shareContent');
        const userPanel = document.getElementById('userPanel');
        const userInfoContent = document.getElementById('userInfoContent');
        const aboutPanel = document.getElementById('aboutPanel');
        const overlay = document.getElementById('overlay');
        const floatingButtons = document.getElementById('floatingButtons');
        const videoPlayerModal = document.getElementById('videoPlayerModal');
        const hostModal = document.getElementById('hostModal');
        const hostInput = document.getElementById('hostInput');
        const customTypeSelect = document.getElementById('customTypeSelect');
        const hostNameDisplay = document.getElementById('hostNameDisplay');
        const hostHistoryWrap = document.getElementById('hostHistoryWrap');
        const hostHistoryList = document.getElementById('hostHistoryList');
        const officialApiListAdult = document.getElementById('officialApiListAdult');
        const officialApiListNormal = document.getElementById('officialApiListNormal');
        const aggregateApiListAdult = document.getElementById('aggregateApiListAdult');
        const aggregateApiListNormal = document.getElementById('aggregateApiListNormal');
        const aggregateSwitch = document.getElementById('aggregateSwitch');
        const aggregateApiSection = document.getElementById('aggregateApiSection');
        const officialApiSection = document.getElementById('officialApiSection');
        const aggregateApiToggleButton = document.getElementById('aggregateApiToggleButton');
        const officialApiToggleButton = document.getElementById('officialApiToggleButton');
        const hostHistoryToggleButton = document.getElementById('hostHistoryToggleButton');
        const aggregateSelectedCount = document.getElementById('aggregateSelectedCount');
        const officialApiCount = document.getElementById('officialApiCount');
        const officialApiCountAdult = document.getElementById('officialApiCountAdult');
        const officialApiCountNormal = document.getElementById('officialApiCountNormal');
        const officialApiCountAdult2 = document.getElementById('officialApiCountAdult2');
        const officialApiCountNormal2 = document.getElementById('officialApiCountNormal2');
        const officialApiCount2 = document.getElementById('officialApiCount2');
        const privacySwitch = document.getElementById('privacySwitch');
        const searchInput = document.getElementById('searchInput');
        const searchInputMobile = document.getElementById('searchInputMobile');
        const searchHistoryBox = document.getElementById('searchHistoryBox');
        const searchHistoryBoxMobile = document.getElementById('searchHistoryBoxMobile');
        const searchButtonMobile = document.getElementById('searchButtonMobile');
        let suppressHistoryClick = false;
        const transferHistoryList = document.getElementById('transferHistoryList');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const loadingText = document.getElementById('loadingText');
        const shareModal = document.getElementById('shareModal');
        const shareExpireSelect = document.getElementById('shareExpireSelect');
        const shareEpisodeSection = document.getElementById('shareEpisodeSection');
        const shareEpisodeList = document.getElementById('shareEpisodeList');
        const shareConfirmButton = document.getElementById('shareConfirmButton');
        let currentShareUrl = '';
        let currentSharePayload = null;
        let currentShareId = '';
        let pendingShareEpisodes = [];
        let pendingShareCurrentIndex = 0;
        let isShareEditing = false;
        let shareListLoaded = false;
        let currentUserRole = null;
        const userAvatarImg = document.getElementById('userAvatarImg');
        const userAvatarText = document.getElementById('userAvatarText');
        const userAvatarPreview = document.getElementById('userAvatarPreview');
        const clearFavoritesModal = document.getElementById('clearFavoritesModal');
        const clearFavoritesPassword = document.getElementById('clearFavoritesPassword');
        const clearFavoritesError = document.getElementById('clearFavoritesError');

        function getResumeStore() {
            try {
                return JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY) || '{}');
            } catch (error) {
                console.error('读取播放进度失败:', error);
                return {};
            }
        }

        function setResumeStore(store) {
            try {
                localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(store));
            } catch (error) {
                console.error('保存播放进度失败:', error);
            }
        }

        function getEntryTime(entry) {
            if (!entry) return 0;
            const time = Number(entry.time);
            return Number.isFinite(time) ? time : 0;
        }

        function loadResumeTime(url) {
            if (!url) return 0;
            const store = getResumeStore();
            const entry = store[url];
            return getEntryTime(entry);
        }

        function resolveResumeTime(rawUrl) {
            if (!rawUrl) return 0;
            const url = String(rawUrl).trim();
            const store = getResumeStore();
            const direct = store[url];
            const directTime = getEntryTime(direct);
            if (directTime) return directTime;

            const decoded = (() => {
                try { return decodeURIComponent(url); } catch (e) { return url; }
            })();
            const decodedEntry = store[decoded];
            const decodedTime = getEntryTime(decodedEntry);
            if (decodedTime) return decodedTime;

            const stripQueryHash = (value) => value.split('#')[0].split('?')[0];
            const stripped = stripQueryHash(url);
            const strippedEntry = store[stripped];
            const strippedTime = getEntryTime(strippedEntry);
            if (strippedTime) return strippedTime;

            const strippedDecoded = stripQueryHash(decoded);
            const strippedDecodedEntry = store[strippedDecoded];
            const strippedDecodedTime = getEntryTime(strippedDecodedEntry);
            if (strippedDecodedTime) return strippedDecodedTime;

            const keys = Object.keys(store);
            if (keys.length === 0) return 0;
            const match = keys
                .map((key) => {
                    const base = stripQueryHash(key);
                    if (base === strippedDecoded || strippedDecoded.startsWith(base) || base.startsWith(strippedDecoded)) {
                        return { key, entry: store[key] };
                    }
                    return null;
                })
                .filter(Boolean)
                .sort((a, b) => (b.entry.updatedAt || 0) - (a.entry.updatedAt || 0))[0];
            if (match && match.entry) {
                const matchTime = getEntryTime(match.entry);
                if (matchTime) return matchTime;
            }
            return 0;
        }

        function getResumeTimeForHistory(item) {
            if (!item || !item.url) return 0;
            const raw = String(item.url).trim();
            const fromRaw = resolveResumeTime(raw);
            if (fromRaw) return fromRaw;
            const decoded = (() => {
                try { return decodeURIComponent(raw); } catch (e) { return raw; }
            })();
            const fromDecoded = resolveResumeTime(decoded);
            if (fromDecoded) return fromDecoded;
            const splitUrl = raw.split('$')[1] || raw;
            const fromSplit = resolveResumeTime(splitUrl);
            if (fromSplit) return fromSplit;
            const decodedSplit = decoded.split('$')[1] || decoded;
            return resolveResumeTime(decodedSplit);
        }

        function saveResumeTime(url, time, duration) {
            if (!url || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;
            if (time < 1) return;
            const now = Date.now();
            if (resumeLastUrl === url && now - resumeLastSaveAt < RESUME_SAVE_THROTTLE_MS) return;
            resumeLastSaveAt = now;
            resumeLastUrl = url;
            const store = getResumeStore();
            store[url] = { time, duration, updatedAt: now };
            const keys = Object.keys(store);
            if (keys.length > RESUME_MAX_ITEMS) {
                keys
                    .sort((a, b) => (store[a].updatedAt || 0) - (store[b].updatedAt || 0))
                    .slice(0, keys.length - RESUME_MAX_ITEMS)
                    .forEach((key) => delete store[key]);
            }
            setResumeStore(store);

            try {
                const history = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
                const index = history.findIndex(item => item.url === url);
                if (index >= 0) {
                    history[index].lastPosition = time;
                    history[index].lastPositionUpdatedAt = now;
                    localStorage.setItem('videoPlayHistory', JSON.stringify(history));
                }
            } catch (e) {
                // ignore history update errors
            }
        }

        function saveResumeNow(url) {
            if (!url || !dplayer || !dplayer.video) return;
            if (dplayer.currentUrl && dplayer.currentUrl !== url) return;
            const current = dplayer.video.currentTime || 0;
            const duration = dplayer.video.duration || 0;
            saveResumeTime(url, current, duration);
        }

        function clearResumeTime(url) {
            if (!url) return;
            const store = getResumeStore();
            if (!store[url]) return;
            delete store[url];
            setResumeStore(store);
        }

        function getTodayKey() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function getWatchTimeStore() {
            try {
                return JSON.parse(localStorage.getItem(WATCH_TIME_KEY) || '{}');
            } catch (error) {
                console.error('读取观看时长失败:', error);
                return {};
            }
        }

        function setWatchTimeStore(store) {
            try {
                localStorage.setItem(WATCH_TIME_KEY, JSON.stringify(store));
            } catch (error) {
                console.error('保存观看时长失败:', error);
            }
        }

        function addWatchTime(seconds) {
            if (!Number.isFinite(seconds) || seconds <= 0) return;
            const store = getWatchTimeStore();
            const todayKey = getTodayKey();
            store[todayKey] = (store[todayKey] || 0) + seconds;
            const keys = Object.keys(store);
            if (keys.length > WATCH_TIME_MAX_DAYS) {
                keys
                    .sort()
                    .slice(0, keys.length - WATCH_TIME_MAX_DAYS)
                    .forEach((key) => delete store[key]);
            }
            setWatchTimeStore(store);
            scheduleUserStatsUpdate(3000);
        }

        function getTodayWatchTime() {
            const store = getWatchTimeStore();
            return store[getTodayKey()] || 0;
        }

        let statsUpdateTimer = null;
        const scheduleUserStatsUpdate = (delay = 1000) => {
            if (statsUpdateTimer) clearTimeout(statsUpdateTimer);
            statsUpdateTimer = setTimeout(() => {
                updateUserStats();
            }, delay);
        };

        async function updateUserStats() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) return;
            const localFavorites = JSON.parse(localStorage.getItem('videoFavorites') || '[]');
            const remoteFavorites = Array.isArray(favoritesCache) ? favoritesCache : [];
            const localMap = new Map((localFavorites || []).filter(item => item && item.url).map(item => [item.url, item]));
            const remoteMap = new Map((remoteFavorites || []).filter(item => item && item.url).map(item => [item.url, item]));
            const unionUrls = Array.from(new Set([...localMap.keys(), ...remoteMap.keys()]));
            const favorites = unionUrls
                .map(url => {
                    const remoteItem = remoteMap.get(url);
                    const localItem = localMap.get(url);
                    const base = remoteItem || localItem || { url };
                    const inLocal = !!localItem;
                    const inRemote = !!remoteItem;
                    return {
                        ...base,
                        _status: inLocal && inRemote ? 'both' : (inLocal ? 'local' : 'remote')
                    };
                })
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            const history = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
            const searchHistory = getSearchHistory();
            const watchSeconds = getTodayWatchTime();
            try {
                const res = await fetch('/api/user/stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        favoriteCount: favorites.length,
                        shareCount: getShareList().length,
                        historyCount: history.length,
                        searchCount: searchHistory.length,
                        watchSeconds
                    })
                });
                if (res && res.ok) {
                    currentUserStats = {
                        favoriteCount: favorites.length,
                        shareCount: getShareList().length,
                        historyCount: history.length,
                        searchCount: searchHistory.length,
                        watchSeconds
                    };
                    const favoriteCountEl = document.getElementById('userFavoriteCount');
                    const historyCountEl = document.getElementById('userHistoryCount');
                    const searchCountEl = document.getElementById('userSearchCount');
                    const watchTodayEl = document.getElementById('userWatchToday');
                    if (favoriteCountEl) favoriteCountEl.textContent = String(favorites.length);
                    if (historyCountEl) historyCountEl.textContent = String(history.length);
                    if (searchCountEl) searchCountEl.textContent = String(searchHistory.length);
                    if (watchTodayEl) watchTodayEl.textContent = formatDuration(watchSeconds);
                }
            } catch (e) {
                // ignore
            }
        }

        function refreshLocalStatsDisplay() {
            const favoriteCountEl = document.getElementById('userFavoriteCount');
            const shareCountEl = document.getElementById('userShareCount');
            const historyCountEl = document.getElementById('userHistoryCount');
            const searchCountEl = document.getElementById('userSearchCount');
            const watchTodayEl = document.getElementById('userWatchToday');
            const favorites = getFavorites();
            const shares = getShareList();
            const history = JSON.parse(localStorage.getItem('videoPlayHistory') || '[]');
            const searchHistory = getSearchHistory();
            const watchSeconds = getTodayWatchTime();
            if (favoriteCountEl) favoriteCountEl.textContent = String(favorites.length);
            if (shareCountEl) shareCountEl.textContent = String(shares.length);
            if (historyCountEl) historyCountEl.textContent = String(history.length);
            if (searchCountEl) searchCountEl.textContent = String(searchHistory.length);
            if (watchTodayEl) watchTodayEl.textContent = formatDuration(watchSeconds);
        }

        async function syncRemoteListsAndStats() {
            const token = getUserToken ? getUserToken() : '';
            if (!token) {
                refreshLocalStatsDisplay();
                return;
            }
            await Promise.all([
                loadFavorites(true),
                loadRemoteShares(),
            ]);
            refreshLocalStatsDisplay();
            updateUserStats();
        }

        let visitHistoryFetched = false;
        let visitHistoryFetchPromise = null;
        async function fetchVisitHistoryOnce() {
            if (visitHistoryFetched) return null;
            if (visitHistoryFetchPromise) return visitHistoryFetchPromise;
            const token = getUserToken ? getUserToken() : '';
            if (!token) return null;
            visitHistoryFetchPromise = (async () => {
                try {
                    const res = await fetch('/api/user/visit-history', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data && data.code === 200 && Array.isArray(data.data)) {
                        localStorage.setItem('visitHistory', JSON.stringify(data.data));
                        visitHistoryFetched = true;
                        return data.data;
                    }
                } catch (e) {
                    // ignore
                } finally {
                    visitHistoryFetchPromise = null;
                }
                return null;
            })();
            return visitHistoryFetchPromise;
        }

        function normalizeVisitEntry(entry) {
            if (entry && typeof entry === 'object') {
                const time = Number(entry.time ?? entry.timestamp ?? entry.lastSeenAt ?? '');
                if (!Number.isFinite(time)) return null;
                return {
                    time,
                    ip: String(entry.ip || ''),
                    userAgent: String(entry.userAgent || entry.ua || '')
                };
            }
            const time = Number(entry);
            if (!Number.isFinite(time)) return null;
            return { time, ip: '', userAgent: '' };
        }

        function normalizeVisitHistory(list) {
            const raw = Array.isArray(list) ? list : [];
            return raw.map(normalizeVisitEntry).filter(Boolean);
        }

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatIp(value) {
            const raw = String(value || '').trim();
            if (!raw) return '未知';
            if (raw.startsWith('::ffff:')) return raw.slice(7);
            return raw;
        }

        function detectClientLabel(ua) {
            const text = String(ua || '').toLowerCase();
            if (!text) return '未知';
            if (text.includes('windows')) return 'Windows';
            if (text.includes('mac os') || text.includes('macintosh')) return 'macOS';
            if (text.includes('android')) return 'Android';
            if (text.includes('iphone') || text.includes('ipad') || text.includes('ios')) return 'iOS';
            if (text.includes('linux')) return 'Linux';
            return '其他';
        }

        function formatDateOnly(timestamp) {
            if (!timestamp || !Number.isFinite(Number(timestamp))) return '';
            return new Date(Number(timestamp)).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }

        function getVisitRangeDays() {
            const saved = localStorage.getItem('visitRangeDays');
            const value = Number(saved || '7');
            return Number.isFinite(value) ? value : 7;
        }

        function setVisitRangeDays(value) {
            const days = Number(value);
            if (!Number.isFinite(days)) return;
            localStorage.setItem('visitRangeDays', String(days));
        }
        
        // 初始化
        // 检查登录状态并显示/隐藏退出登录按钮
        function checkLoginStatus() {
            const token = getUserToken ? getUserToken() : '';
            const logoutButton = document.getElementById('logoutButton');
            if (logoutButton) {
                if (token) {
                    logoutButton.classList.remove('hidden');
                    logoutButton.disabled = false;
                } else {
                    logoutButton.classList.add('hidden');
                    logoutButton.disabled = true;
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            // 加载保存的Host
            host = localStorage.getItem('apiHost') || '';
            hostName = localStorage.getItem('apiHostName') || '';
            updateHostNameDisplay(host);
            updateCustomTypeSelect();
            applyAvatarFromStorage();
            // 检查登录状态
            checkLoginStatus();
            // 获取用户角色
            fetchUserRole();
            if (customTypeSelect) {
                customTypeSelect.addEventListener('change', () => {
                    const value = customTypeSelect.value;
                    if (value === 'normal' || value === 'adult') {
                        localStorage.setItem(CUSTOM_API_TYPE_KEY, value);
                        updateHostNameDisplay(host);
                    }
                });
            }
            const aggregateEnabled = isAggregateSearchEnabled();
            if (aggregateSwitch) {
                aggregateSwitch.checked = aggregateEnabled;
                updateAggregateSwitchUI(aggregateEnabled);
            }
            // 根据聚合搜索是否开启来显示/隐藏进度条
            const progressDisplay = document.getElementById('progressDisplay');
            if (progressDisplay) {
                progressDisplay.style.display = aggregateEnabled ? 'block' : 'none';
            }
            const privacyEnabled = isPrivacyModeEnabled();
            if (privacySwitch) {
                privacySwitch.checked = privacyEnabled;
                updatePrivacySwitchUI(privacyEnabled);
            }
            applyPrivacyMode(privacyEnabled);
            updateSearchButtonLabel(aggregateEnabled);
            
            // 鼠标移出面板自动关闭
            historyPanel.addEventListener('mouseleave', closeAllPanels);
            favoritePanel.addEventListener('mouseleave', closeAllPanels);
            if (sharePanel) {
                sharePanel.addEventListener('mouseleave', closeAllPanels);
            }
            if (userPanel) {
                userPanel.addEventListener('mouseleave', closeAllPanels);
            }
            if (aboutPanel) {
                aboutPanel.addEventListener('mouseleave', closeAllPanels);
            }
            hostModal.addEventListener('mouseleave', () => {
                if (!hostModal.classList.contains('translate-x-full')) {
                    toggleHostModal();
                }
            });

            if (aggregateApiToggleButton) {
                aggregateApiToggleButton.textContent = aggregateApiSection && aggregateApiSection.classList.contains('hidden') ? '展开' : '收起';
            }
            if (officialApiToggleButton) {
                officialApiToggleButton.textContent = officialApiSection && officialApiSection.classList.contains('hidden') ? '展开' : '收起';
            }
            switchAggregateTab('adult');
            switchOfficialTab(getDefaultOfficialTab());
            if (hostHistoryToggleButton) {
                hostHistoryToggleButton.textContent = hostHistoryWrap && hostHistoryWrap.classList.contains('hidden') ? '展开' : '收起';
            }

            const previousVisit = localStorage.getItem('lastVisit');
            const nowTs = Date.now();
            const rangeDays = getVisitRangeDays();
            const cutoff = nowTs - rangeDays * 24 * 60 * 60 * 1000;
            const visitHistory = normalizeVisitHistory(JSON.parse(localStorage.getItem('visitHistory') || '[]'))
                .filter((item) => item.time >= cutoff);
            if (previousVisit) {
                const time = Number(previousVisit);
                if (Number.isFinite(time)) {
                    visitHistory.unshift({ time, ip: '', userAgent: '' });
                }
            }
            const uniqueHistory = [];
            const seen = new Set();
            for (const item of visitHistory) {
                const key = String(item.time);
                if (seen.has(key)) continue;
                seen.add(key);
                uniqueHistory.push(item);
            }
            const trimmedHistory = uniqueHistory.slice(0, 200);
            localStorage.setItem('visitHistory', JSON.stringify(trimmedHistory));
            lastVisitAtStart = trimmedHistory[0] ? String(trimmedHistory[0].time) : null;
            localStorage.setItem('lastVisit', nowTs);

            renderTransferHistory();

            syncRemoteListsAndStats();
            
            // 加载初始数据
            loadInitialData();
            
            // 监听滚动事件
            window.addEventListener('scroll', handleScroll);

            // 搜索历史提示
            bindSearchHistoryEvents();

            // 点击空白处关闭更多菜单
            document.addEventListener('click', (e) => {
                const menu = document.getElementById('moreMenu');
                const button = document.getElementById('moreButton');
                if (!menu || !button) return;
                if (menu.contains(e.target) || button.contains(e.target)) return;
                menu.classList.add('hidden');
            });

            // 移动端搜索框打开时点击其他位置自动关闭
            document.addEventListener('click', (e) => {
                const box = document.getElementById('mobileSearchBox');
                const toggle = document.getElementById('mobileSearchToggle');
                if (!box || !toggle) return;
                if (box.classList.contains('hidden')) return;
                if (box.contains(e.target) || toggle.contains(e.target)) return;
                box.classList.add('hidden');
            });

            // 移动端搜索框打开时，滑动/触摸其他位置也关闭
            document.addEventListener('touchstart', (e) => {
                const box = document.getElementById('mobileSearchBox');
                const toggle = document.getElementById('mobileSearchToggle');
                if (!box || !toggle) return;
                if (box.classList.contains('hidden')) return;
                if (box.contains(e.target) || toggle.contains(e.target)) return;
                box.classList.add('hidden');
            }, { passive: true });

            // 点击导航栏任意位置关闭面板
            const header = document.getElementById('header');
            if (header) {
                header.addEventListener('click', (e) => {
                    const target = e.target;
                    if (target && target.closest('button, input, select, textarea, a, label, #moreMenu')) {
                        return;
                    }
                    closeAllPanels();
                });
            }

            if (shareModal) {
                shareModal.addEventListener('click', (e) => {
                    if (e.target === shareModal) {
                        closeShareModal();
                    }
                });
            }
            if (shareExpireSelect) {
                shareExpireSelect.addEventListener('change', () => {
                    refreshShareUrlFromSelection();
                });
            }
            document.addEventListener('change', (e) => {
                const target = e.target;
                if (!(target instanceof HTMLInputElement)) return;
                if (target.name === 'shareEpisodeMode') {
                    toggleShareEpisodeList(target.value === 'custom');
                    if (target.value === 'custom') {
                        setShareEpisodeChecks(false);
                    }
                    setShareConfirmState('ready', isShareEditing);
                    currentShareUrl = '';
                    return;
                }
                if (target.closest('#shareEpisodeList')) {
                    setShareConfirmState('ready', isShareEditing);
                    currentShareUrl = '';
                }
            });
            if (shareEpisodeSection) {
                shareEpisodeSection.addEventListener('click', (e) => {
                    const target = e.target;
                    if (!(target instanceof HTMLElement)) return;
                    const action = target.getAttribute('data-action');
                    if (!action) return;
                    if (action === 'select-all') setShareEpisodeChecks(true);
                    if (action === 'clear-all') setShareEpisodeChecks(false);
                });
            }

            const siteTitle = document.getElementById('siteTitle');
            if (siteTitle) {
                let clickCount = 0;
                let clickTimer = null;
                const CLICK_WINDOW_MS = 600;

                siteTitle.addEventListener('click', () => {
                    clickCount += 1;
                    if (clickTimer) clearTimeout(clickTimer);
                    clickTimer = setTimeout(() => {
                        if (clickCount === 2) {
                            if (privacySwitch) {
                                privacySwitch.checked = false;
                                togglePrivacyMode();
                            } else {
                                localStorage.setItem('privacyMode', '0');
                                applyPrivacyMode(false);
                            }
                        } else if (clickCount >= 3) {
                            if (privacySwitch) {
                                privacySwitch.checked = true;
                                togglePrivacyMode();
                            } else {
                                localStorage.setItem('privacyMode', '1');
                                applyPrivacyMode(true);
                            }
                        }
                        clickCount = 0;
                        clickTimer = null;
                    }, CLICK_WINDOW_MS);
                });
            }

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState !== 'visible') {
                    saveResumeNow(currentVideoUrl);
                }
            }, { passive: true });

            window.addEventListener('pagehide', () => {
                saveResumeNow(currentVideoUrl);
            }, { passive: true });
        });

        function applyAvatarFromStorage() {
            const url = localStorage.getItem(USER_AVATAR_KEY) || '';
            applyAvatar(url);
        }

        async function randomizeAvatar() {
            try {
                const res = await fetch(USER_AVATAR_API);
                const data = await res.json();
                if (data && data.code === 200 && data.data) {
                    const url = String(data.data).trim();
                    localStorage.setItem(USER_AVATAR_KEY, url);
                    applyAvatar(url);
                    const token = getUserToken ? getUserToken() : '';
                    if (token) {
                        fetch('/api/user/avatar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ avatar: url })
                        }).catch(() => {});
                    }
                    showToast('头像已更新');
                } else {
                    showToast('获取头像失败');
                }
            } catch (e) {
                showToast('获取头像失败');
            }
        }

        let avatarClickCount = 0;
        let avatarClickTimer = null;
        function handleAvatarTripleClick() {
            avatarClickCount += 1;
            if (avatarClickCount === 1) {
                showToast('连续点击头像3次可随机头像');
            }
            if (avatarClickTimer) {
                clearTimeout(avatarClickTimer);
            }
            avatarClickTimer = setTimeout(() => {
                avatarClickCount = 0;
                avatarClickTimer = null;
            }, 700);
            if (avatarClickCount >= 3) {
                avatarClickCount = 0;
                if (avatarClickTimer) {
                    clearTimeout(avatarClickTimer);
                    avatarClickTimer = null;
                }
                randomizeAvatar();
            }
        }

