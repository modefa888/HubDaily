/* 视频播放与悬浮播放器 */
        // 打开视频播放器
        function parsePlayUrls(rawUrl) {
            const text = String(rawUrl || '');
            if (!text) return [];
            const segments = text.split('$$$').map(part => part.trim()).filter(Boolean);
            const preferredSegment = segments.find(seg => seg.toLowerCase().includes('m3u8')) || segments[0] || '';
            const parts = preferredSegment.split('#').map(part => part.trim()).filter(Boolean);
            return parts.map((part, index) => {
                const splitIndex = part.indexOf('$');
                if (splitIndex === -1) {
                    return { name: `第${index + 1}集`, url: part };
                }
                const name = part.slice(0, splitIndex).trim() || `第${index + 1}集`;
                const url = part.slice(splitIndex + 1).trim();
                return { name, url };
            }).filter(item => item.url);
        }

        function isM3u8Url(url) {
            if (!url) return false;
            const cleaned = String(url).split('?')[0].split('#')[0].toLowerCase();
            return cleaned.endsWith('.m3u8');
        }

        function openVideoPlayer(videoUrl, videoTitle, imageUrl = '', sourceLabel = '', category = '', preferredEpisodeIndex = null, videoDesc = '', videoClass = '', videoActor = '', videoYear = '', videoRemarks = '') {
            if (!host) {
                if (!isAggregateSearchEnabled()) {
                    showToast('请先设置API Host');
                    showHostModal();
                    return;
                }
            }

            showLoading('正在加载视频...');
            
            try {
                const resolvedCategory = normalizeCategory(category || getOfficialCategoryByName(sourceLabel) || getCurrentHostCategory());
                const baseTitle = String(videoTitle || '').trim();
                const episodes = parsePlayUrls(videoUrl);
                const hasEpisodeList = episodes.length > 1;
                const normalizedPreferred = Number.isFinite(Number(preferredEpisodeIndex)) ? Number(preferredEpisodeIndex) : null;
                const initialIndex = hasEpisodeList && normalizedPreferred !== null && normalizedPreferred >= 0 && normalizedPreferred < episodes.length
                    ? normalizedPreferred
                    : 0;
                const initialEpisode = episodes[initialIndex];
                const initialUrl = initialEpisode ? initialEpisode.url : (videoUrl.split('$')[1] || videoUrl);
                if (!isM3u8Url(initialUrl)) {
                    hideLoading();
                    showToast('仅支持 .m3u8 视频地址');
                    return;
                }
                const episodeTitle = hasEpisodeList && initialEpisode && initialEpisode.name ? initialEpisode.name : '';
                const displayTitle = baseTitle
                    ? (episodeTitle ? `${baseTitle} ${episodeTitle}` : baseTitle)
                    : (episodeTitle || '视频播放');
                currentVideoRawUrl = videoUrl;
                currentEpisodeList = episodes;
                currentEpisodeIndex = initialIndex;
                currentVideoUrl = initialUrl;
                currentVideoTitle = displayTitle || '视频播放';
                currentVideoPic = imageUrl || '';
                currentVideoSource = sourceLabel || getHostLabel();
                currentVideoDesc = videoDesc || '';
                currentVideoClass = videoClass || '';
                currentVideoActor = videoActor || '';
                currentVideoYear = videoYear || '';
                currentVideoRemarks = videoRemarks || '';
                const episodePanel = document.getElementById('episodePanel');
                const episodeList = document.getElementById('episodeList');
                let activeEpisodeIndex = initialIndex;
                const setActiveEpisodeButton = () => {
                    if (!episodeList) return;
                    const buttons = episodeList.querySelectorAll('button[data-episode-index]');
                    buttons.forEach((btn) => {
                        const idx = Number(btn.getAttribute('data-episode-index'));
                        const isActive = Number.isFinite(idx) && idx === activeEpisodeIndex;
                        btn.classList.toggle('active', isActive);
                    });
                };
                const updateEpisodeNav = () => {
                    if (!dplayer || typeof dplayer.setEpisodeNavigation !== 'function') return;
                    dplayer.setEpisodeNavigation(
                        hasEpisodeList && activeEpisodeIndex > 0,
                        hasEpisodeList && activeEpisodeIndex < episodes.length - 1
                    );
                };
                let currentPage = 1;
                let totalPages = 1;
                
                const renderEpisodePanel = () => {
                    if (!episodePanel || !episodeList) return;
                    if (resolvedCategory !== 'normal' || !hasEpisodeList) {
                        episodePanel.classList.add('hidden');
                        episodeList.innerHTML = '';
                        return;
                    }
                    episodePanel.classList.remove('hidden');
                    
                    // 计算总页数（每个 tab 25 集）
                    totalPages = Math.ceil(episodes.length / 25);
                    
                    // 确保当前页在有效范围内
                    if (currentPage < 1) currentPage = 1;
                    if (currentPage > totalPages) currentPage = totalPages;
                    
                    // 渲染 tabs
                    const tabsContainer = document.getElementById('episodeTabs');
                    if (tabsContainer) {
                        tabsContainer.innerHTML = '';
                        for (let i = 1; i <= totalPages; i++) {
                            const startEpisode = (i - 1) * 25 + 1;
                            const endEpisode = Math.min(i * 25, episodes.length);
                            const tabButton = document.createElement('button');
                            tabButton.type = 'button';
                            tabButton.className = `cvp-episode-tab${i === currentPage ? ' active' : ''}`;
                            tabButton.textContent = `${startEpisode}-${endEpisode}集`;
                            tabButton.dataset.page = i;
                            tabButton.onclick = () => {
                                currentPage = parseInt(tabButton.dataset.page);
                                renderEpisodePanel();
                            };
                            tabsContainer.appendChild(tabButton);
                        }
                    }
                    
                    // 计算当前页的剧集范围
                    const startIndex = (currentPage - 1) * 25;
                    const endIndex = Math.min(startIndex + 25, episodes.length);
                    const pageEpisodes = episodes.slice(startIndex, endIndex);
                    
                    // 渲染剧集列表
                    episodeList.innerHTML = pageEpisodes.map((ep, idx) => {
                        const actualIndex = startIndex + idx;
                        return `
                            <button 
                                type="button"
                                class="cvp-episode-chip${actualIndex === activeEpisodeIndex ? ' active' : ''}"
                                data-episode-index="${actualIndex}"
                            >${ep.name}</button>
                        `;
                    }).join('');
                    
                    // 绑定倒序按钮事件
                    const reverseButton = document.getElementById('reverseButton');
                    if (reverseButton) {
                        reverseButton.onclick = () => {
                            episodes.reverse();
                            activeEpisodeIndex = episodes.length - 1 - activeEpisodeIndex;
                            currentPage = 1;
                            renderEpisodePanel();
                        };
                    }
                    
                    setActiveEpisodeButton();
                    updateEpisodeNav();
                };
                const updatePlayerTitle = (title) => {
                    const playerTitle = document.getElementById('playerTitle');
                    if (playerTitle) {
                        const label = currentVideoSource || '未知来源';
                        playerTitle.innerHTML = `<span class="bg-white/20 text-white/90 text-[10px] px-2 py-0.5 rounded mr-2">${label}</span>${title || ''}`;
                    }
                };
                updatePlayerLikeButtons(isFavorited(initialUrl));
                updatePlayerTitle(currentVideoTitle);
                
                // 更新页面标题
                document.title = `正在播放: ${currentVideoTitle}`;
                
                // 保存播放历史
                saveToHistory(currentVideoTitle, initialUrl, imageUrl, currentVideoSource, episodeTitle || '', hasEpisodeList ? initialIndex : null);
                
                // 显示播放器
                setModalScrollLock(true);
                videoPlayerModal.classList.remove('hidden');
                
                // 初始化自定义播放器
                if (dplayer) {
                    dplayer.destroy();
                }
                
                const resumeTarget = loadResumeTime(initialUrl);
                let resumeApplied = false;

                dplayer = new CustomVideoPlayer({
                    container: document.getElementById('dplayer'),
                    video: {
                        url: initialUrl,
                        type: 'hls',
                        pic: currentVideoPic || '',
                        thumbnails: '',
                        title: currentVideoTitle || '视频播放'
                    },
                    autoplay: true,
                    theme: '#3b82f6',
                    loop: false,
                    screenshot: true,
                    hotkey: true,
                    preload: 'auto',
                    contextmenu: [
                        {
                            text: '在新窗口打开',
                            link: initialUrl,
                        }
                    ],
                    onPrevEpisode: () => {
                        if (activeEpisodeIndex <= 0 || !episodeList) return;
                        const idx = activeEpisodeIndex - 1;
                        currentPage = Math.floor(idx / 25) + 1;
                        renderEpisodePanel();
                        const btn = episodeList.querySelector(`[data-episode-index="${idx}"]`);
                        if (btn) btn.click();
                    },
                    onNextEpisode: () => {
                        if (activeEpisodeIndex >= episodes.length - 1 || !episodeList) return;
                        const idx = activeEpisodeIndex + 1;
                        currentPage = Math.floor(idx / 25) + 1;
                        renderEpisodePanel();
                        const btn = episodeList.querySelector(`[data-episode-index="${idx}"]`);
                        if (btn) btn.click();
                    }
                });
                
                dplayer.on('play', () => {
                    hideLoading();
                    isLoading = false;
                });

                dplayer.on('loadedmetadata', () => {
                    hideLoading();
                    isLoading = false;
                    if (resumeApplied || !resumeTarget) return;
                    const duration = dplayer?.video?.duration || 0;
                    if (duration > 0 && resumeTarget < duration - RESUME_MIN_SECONDS) {
                        dplayer.seek(resumeTarget);
                        resumeApplied = true;
                        showToast('已恢复到上次播放位置');
                    }
                });

                dplayer.on('timeupdate', () => {
                    if (!dplayer || !dplayer.video) return;
                    if (dplayer.currentUrl && dplayer.currentUrl !== currentVideoUrl) return;
                    const current = dplayer.video.currentTime || 0;
                    if (lastWatchUrl !== currentVideoUrl) {
                        lastWatchUrl = currentVideoUrl;
                        lastWatchTime = current;
                    }
                    const delta = current - lastWatchTime;
                    if (delta > 0 && delta <= 5) {
                        addWatchTime(delta);
                    }
                    lastWatchTime = current;
                    saveResumeTime(currentVideoUrl, dplayer.video.currentTime, dplayer.video.duration);
                });

                dplayer.on('pause', () => {
                    saveResumeNow(currentVideoUrl);
                });

                dplayer.on('seeked', () => {
                    saveResumeNow(currentVideoUrl);
                });

                dplayer.on('ended', () => {
                    clearResumeTime(currentVideoUrl);
                    lastWatchTime = 0;
                    lastWatchUrl = '';
                });

                renderEpisodePanel();

                if (episodeList) {
                    episodeList.onclick = (e) => {
                        const target = e.target;
                        if (!(target instanceof HTMLElement)) return;
                        const idx = Number(target.getAttribute('data-episode-index'));
                        if (!Number.isFinite(idx) || !episodes[idx]) return;
                        activeEpisodeIndex = idx;
                        setActiveEpisodeButton();
                        const ep = episodes[idx];
                        if (!isM3u8Url(ep.url)) {
                            showToast('仅支持 .m3u8 视频地址');
                            return;
                        }
                        const title = baseTitle
                            ? (ep.name ? `${baseTitle} ${ep.name}` : baseTitle)
                            : (ep.name || '视频播放');
                        currentVideoUrl = ep.url;
                        currentVideoTitle = title;
                        currentEpisodeIndex = idx;
                        updatePlayerTitle(title);
                        // 更新页面标题
                        document.title = `正在播放: ${title}`;
                        updatePlayerLikeButtons(isFavorited(ep.url));
                        saveToHistory(title, ep.url, imageUrl, currentVideoSource, ep.name || '', idx);
                        if (dplayer && typeof dplayer.switchVideo === 'function') {
                            dplayer.switchVideo({ url: ep.url, type: 'hls', pic: '', thumbnails: '', title });
                            dplayer.play();
                        } else if (dplayer && dplayer.video) {
                            dplayer.video.src = ep.url;
                            dplayer.video.play();
                        }
                        renderEpisodePanel();
                    };
                }
                
                dplayer.on('error', (e) => {
                    // 只有在加载过程中发生错误才显示提示
                    if (isLoading) {
                        hideLoading();
                        showToast('视频加载失败，请尝试其他视频');
                    }
                    console.error('视频播放错误:', e);
                });
            } catch (error) {
                hideLoading();
                showToast('视频加载失败');
                console.error('视频播放器初始化失败:', error);
            }
        }
        
        // 关闭视频播放器
        function closeVideoPlayer() {
            if (dplayer) {
                saveResumeNow(currentVideoUrl);
                dplayer.destroy();
                dplayer = null;
            }
            
            videoPlayerModal.classList.add('hidden');
            setModalScrollLock(false);
            currentVideoUrl = '';
            currentVideoTitle = '';
            currentVideoPic = '';
            currentVideoSource = '';
            currentVideoDesc = '';
            currentVideoClass = '';
            currentVideoActor = '';
            currentVideoYear = '';
            currentVideoRemarks = '';
            updatePlayerLikeButtons(false);
            const playerTitle = document.getElementById('playerTitle');
            if (playerTitle) {
                playerTitle.textContent = '';
            }
            
            // 恢复原始页面标题
            document.title = originalPageTitle;
            
            // 隐藏移动设备关闭按钮
            const mobileCloseButton = document.getElementById('closeVideoButtonMobile');
            if (mobileCloseButton) {
                // 使用className重置所有样式，确保下次能正确显示
                mobileCloseButton.className = 'md:hidden inline-flex vp-top-btn fixed top-4 right-4 z-50';
                mobileCloseButton.style.cssText = '';
            }
            
            // 重新初始化懒加载，确保所有图片都能被正确加载
            setTimeout(() => {
                initLazyLoading();
            }, 100);
        }

        // 打开悬浮播放框
        let floatingCurrentEpisodeIndex = 0;
        let floatingEpisodes = [];
        let floatingCurrentPage = 1;
        let floatingTotalPages = 1;
        let floatingIsReversed = false;
        
        function parseFloatingEpisodes(rawUrl) {
            const text = String(rawUrl || '');
            if (!text) return [];
            const parts = text.split('#').map(part => part.trim()).filter(Boolean);
            return parts.map((part, index) => {
                const splitIndex = part.indexOf('$');
                if (splitIndex === -1) {
                    return { name: `第${index + 1}集`, url: part };
                }
                const name = part.slice(0, splitIndex).trim() || `第${index + 1}集`;
                const url = part.slice(splitIndex + 1).trim();
                return { name, url };
            }).filter(item => item.url);
        }
        
        function renderFloatingEpisodes() {
            const episodePanel = document.getElementById('floatingEpisodePanel');
            const episodeList = document.getElementById('floatingEpisodeList');
            const tabsContainer = document.getElementById('floatingEpisodeTabs');
            
            if (!episodePanel || !episodeList || !tabsContainer) return;
            
            if (floatingEpisodes.length <= 1) {
                episodePanel.classList.add('hidden');
                episodeList.innerHTML = '';
                tabsContainer.innerHTML = '';
                return;
            }
            
            episodePanel.classList.remove('hidden');
            
            // 计算总页数（每个 tab 25 集）
            floatingTotalPages = Math.ceil(floatingEpisodes.length / 25);
            
            // 确保当前页在有效范围内
            if (floatingCurrentPage < 1) floatingCurrentPage = 1;
            if (floatingCurrentPage > floatingTotalPages) floatingCurrentPage = floatingTotalPages;
            
            // 渲染 tabs
            tabsContainer.innerHTML = '';
            for (let i = 1; i <= floatingTotalPages; i++) {
                const startEpisode = (i - 1) * 25 + 1;
                const endEpisode = Math.min(i * 25, floatingEpisodes.length);
                const tabButton = document.createElement('button');
                tabButton.type = 'button';
                tabButton.className = `px-2 py-0.5 rounded ${i === floatingCurrentPage ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'} text-xs whitespace-nowrap`;
                tabButton.textContent = `${startEpisode}-${endEpisode}集`;
                tabButton.dataset.page = i;
                tabButton.onclick = () => {
                    floatingCurrentPage = parseInt(tabButton.dataset.page);
                    renderFloatingEpisodes();
                };
                tabsContainer.appendChild(tabButton);
            }
            
            // 计算当前页的剧集范围
            const startIndex = (floatingCurrentPage - 1) * 25;
            const endIndex = Math.min(startIndex + 25, floatingEpisodes.length);
            const pageEpisodes = floatingEpisodes.slice(startIndex, endIndex);
            
            // 渲染剧集列表
            episodeList.innerHTML = '';
            pageEpisodes.forEach((episode, index) => {
                const actualIndex = startIndex + index;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `px-2 py-0.5 rounded-full text-xs ${actualIndex === floatingCurrentEpisodeIndex ? 'bg-blue-600 border-blue-600' : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'} border`;
                button.textContent = episode.name;
                button.dataset.episodeIndex = actualIndex;
                button.onclick = () => {
                    const selectedIndex = parseInt(button.dataset.episodeIndex);
                    if (selectedIndex !== floatingCurrentEpisodeIndex) {
                        floatingCurrentEpisodeIndex = selectedIndex;
                        if (floatingDplayer) {
                            floatingDplayer.switchVideo({
                                url: floatingEpisodes[selectedIndex].url,
                                type: 'hls',
                                title: floatingEpisodes[selectedIndex].name,
                                pic: ''
                            });
                            floatingDplayer.play();
                        }
                        renderFloatingEpisodes();
                    }
                };
                episodeList.appendChild(button);
            });
        }
        
        function toggleFloatingEpisodeOrder() {
            floatingIsReversed = !floatingIsReversed;
            floatingEpisodes.reverse();
            floatingCurrentEpisodeIndex = floatingEpisodes.length - 1 - floatingCurrentEpisodeIndex;
            floatingCurrentPage = 1;
            renderFloatingEpisodes();
        }
        
        function openFloatingPlayer(videoUrl, videoTitle, imageUrl = '', sourceLabel = '') {
            const floatingPlayer = document.getElementById('floatingPlayer');
            const floatingPlayerTitle = document.getElementById('floatingPlayerTitle');
            
            if (!floatingPlayer || !floatingPlayerTitle) return;
            
            // 更新页面标题
            document.title = `正在播放: ${videoTitle || '视频'}`;
            
            // 更新悬浮播放框标题
            floatingPlayerTitle.textContent = videoTitle || '视频播放';
            
            // 显示悬浮播放框
            floatingPlayer.classList.remove('hidden');
            
            // 解析剧集
            floatingEpisodes = parseFloatingEpisodes(videoUrl);
            floatingCurrentEpisodeIndex = 0;
            floatingCurrentPage = 1;
            floatingIsReversed = false;
            
            // 初始化悬浮播放器（保持互斥：暂停主播放器）
            if (dplayer) dplayer.pause();
            if (floatingDplayer) {
                floatingDplayer.destroy();
            }
            
            floatingDplayer = new CustomVideoPlayer({
                container: document.getElementById('floatingPlayerContainer'),
                video: {
                    url: floatingEpisodes.length > 0 ? floatingEpisodes[0].url : videoUrl,
                    type: 'hls',
                    title: videoTitle || '视频播放',
                    pic: imageUrl || ''
                },
                autoplay: true,
                theme: '#3b82f6',
                loop: false,
                screenshot: false,
                hotkey: true,
                mutex: true,
                compact: true
            });
            
            // 渲染剧集列表
            renderFloatingEpisodes();
            
            // 绑定倒序按钮事件
            const reverseButton = document.getElementById('floatingReverseButton');
            if (reverseButton) {
                reverseButton.onclick = toggleFloatingEpisodeOrder;
            }
            
            // 保存播放历史
            saveToHistory(videoTitle, videoUrl, imageUrl, sourceLabel);
        }

        // 关闭悬浮播放框
        function closeFloatingPlayer() {
            const floatingPlayer = document.getElementById('floatingPlayer');
            
            if (!floatingPlayer) return;
            
            // 恢复原始页面标题
            document.title = originalPageTitle;
            
            // 隐藏悬浮播放框
            floatingPlayer.classList.add('hidden');
            
            // 销毁悬浮播放器
            if (floatingDplayer) {
                floatingDplayer.destroy();
                floatingDplayer = null;
            }
        }

