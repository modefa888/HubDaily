/* 接口数据、渲染与搜索 */
        function getOfficialApiUrl() {
            return '/api/apis/official';
        }
        
        // 加载初始数据
        function loadInitialData() {
            if (!host && !isAggregateSearchEnabled()) {
                // 如果没有设置Host，显示设置提示
                showHostModal();
                return;
            }
            
            hideEmptyState();
            // 显示搜索中提示
            document.getElementById('searchingState').classList.remove('hidden');
            showLoading('正在加载推荐视频...');
            hasMore = true;
            fetchData('', 1).finally(() => {
                hideLoading();
                // 隐藏搜索中提示
                document.getElementById('searchingState').classList.add('hidden');
            });
        }
        
        // 获取代理URL
        function getProxyUrl(endpoint, params = {}) {
            const baseUrl = window.location.origin + '/api/proxy';
            const url = new URL(endpoint, baseUrl);
            
            // 添加查询参数
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, params[key]);
                }
            });
            
            return url.toString();
        }
        
        // 获取数据
        async function fetchData(keyword, page) {
            if (isAggregateSearchEnabled()) {
                return fetchAggregatedData(keyword, page);
            }
            try {
                const token = getUserToken ? getUserToken() : '';
                if (!token) {
                    showToast('请先登录');
                    return [];
                }
                await ensureFavoritesLoaded();
                const params = {
                    wd: keyword,
                    pg: page,
                    url: host
                };
                
                const response = await fetch(getProxyUrl('', params), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const rawText = await response.text();
                if (rawText && rawText.includes("搜索关闭")) {
                    if (page === 1) {
                        showErrorState("当前接口无法搜索", { showRetry: false });
                    } else {
                        showToast("当前接口无法搜索");
                    }
                    hideLoadMoreButton();
                    hasMore = false;
                    return [];
                }
                let data = {};
                try {
                    data = rawText ? JSON.parse(rawText) : {};
                } catch (e) {
                    data = {};
                }
                
                // 检查是否登录已过期
                if (data.code === 401 && data.message === '登录已过期') {
                    showToast('登录已过期，请重新登录');
                    setTimeout(() => {
                        window.location.href = '/login/index.html';
                    }, 1000);
                    return [];
                }
                
                if (!data.list || data.list.length === 0) {
                    if (page === 1) {
                        showEmptyState();
                    } else {
                        showToast('数据加载完毕');
                    }
                    hideLoadMoreButton();
                    hasMore = false;
                    return [];
                }
                
                const isNormalHost = normalizeCategory(getCurrentHostCategory()) === 'normal';
                // 普通接口不去重
                const deduped = isNormalHost ? data.list : (() => {
                    const seenTitles = new Set();
                    const filtered = [];
                    data.list.forEach(video => {
                        const title = (video.vod_name || '').trim();
                        if (!title) {
                            filtered.push(video);
                            return;
                        }
                        if (seenTitles.has(title)) return;
                        seenTitles.add(title);
                        filtered.push(video);
                    });
                    return filtered;
                })();
                const hostCategory = getCurrentHostCategory();
                const tagged = deduped.map(video => ({
                    ...video,
                    _sourceCategory: hostCategory
                }));
                
                // 渲染数据
                if (page === 1) {
                    videoList.innerHTML = '';
                    renderedVideos = [];
                    updateLoadedCount(0);
                }
                
                hideEmptyState();
                renderVideos(tagged);
                updateLoadedCount(renderedVideos.length);
                
                // 更新分页状态
                currentPage = page;
                searchTerm = keyword;
                
                // 显示/隐藏加载更多按钮
                if (data.list.length < 20) {
                    hideLoadMoreButton();
                    hasMore = false;
                } else {
                    showLoadMoreButton();
                    hasMore = true;
                }
                
                return tagged;
            } catch (error) {
                console.error('获取数据失败:', error);
                if (page === 1) {
                    showErrorState('获取数据失败，请检查网络连接或Host设置');
                }
                return [];
            }
        }

        async function fetchAggregatedData(keyword, page) {
            try {
                if (page === 1) {
                    aggregateNoMore = new Set();
                }
                await ensureFavoritesLoaded();
                const apis = await getOfficialApis();
                const selectedUrls = resolveAggregateSelection(apis);
                const targetApis = selectedUrls.length > 0
                    ? apis.filter(item => selectedUrls.includes(item.url))
                    : apis;
                const activeApis = targetApis.filter(item => !aggregateNoMore.has(item.url));
                if (!activeApis || activeApis.length === 0) {
                    if (page === 1) {
                        showEmptyState();
                    } else {
                        showToast('数据加载完毕');
                    }
                    hideLoadMoreButton();
                    hasMore = false;
                    return [];
                }
                
                let completed = 0;
                const progressDone = document.getElementById('progressDone');
                const progressTotal = document.getElementById('progressTotal');
                const progressDoneDesktop = document.getElementById('progressDoneDesktop');
                const progressTotalDesktop = document.getElementById('progressTotalDesktop');
                if (progressDone) progressDone.textContent = '0';
                if (progressTotal) progressTotal.textContent = activeApis.length;
                if (progressDoneDesktop) progressDoneDesktop.textContent = '0';
                if (progressTotalDesktop) progressTotalDesktop.textContent = activeApis.length;
                
                if (page === 1) {
                    videoList.innerHTML = '';
                    renderedVideos = [];
                    updateLoadedCount(0);
                }
                
                hideEmptyState();
                
                // 并行请求所有接口，但每个接口完成后立即渲染
                const promises = activeApis.map(async (item) => {
                    try {
                        const params = {
                            wd: keyword,
                            pg: page,
                            url: item.url
                        };
                        const token = getUserToken ? getUserToken() : '';
                        const response = await fetch(getProxyUrl('', params), {
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        const data = await response.json();
                        
                        // 检查是否登录已过期
                        if (data.code === 401 && data.message === '登录已过期') {
                            showToast('登录已过期，请重新登录');
                            setTimeout(() => {
                                window.location.href = '/login/index.html';
                            }, 1000);
                            return { item, list: [] };
                        }
                        
                        const list = Array.isArray(data.list) ? data.list : [];
                        
                        if (!list || list.length === 0) {
                            aggregateNoMore.add(item.url);
                        }
                        
                        const label = getOfficialLabel(item);
                        const normalizedCategory = normalizeCategory(item.category || getOfficialCategoryByUrl(item.url) || '');
                        const videos = list.map(video => ({
                            ...video,
                            _sourceLabel: label,
                            _sourceCategory: normalizedCategory
                        }));
                        
                        // 普通接口不去重
                        const seenTitles = new Set();
                        const deduped = [];
                        videos.forEach(video => {
                            const category = normalizeCategory(video._sourceCategory || '');
                            const title = (video.vod_name || '').trim();
                            
                            // 筛选：标题必须包含搜索关键字
                            if (title && !title.toLowerCase().includes(keyword.toLowerCase())) {
                                return;
                            }
                            
                            if (category === 'normal') {
                                deduped.push(video);
                                return;
                            }
                            if (!title) {
                                deduped.push(video);
                                return;
                            }
                            if (seenTitles.has(title)) return;
                            seenTitles.add(title);
                            deduped.push(video);
                        });
                        
                        // 立即渲染数据
                        if (deduped.length > 0) {
                            // 隐藏搜索中提示
                            document.getElementById('searchingState').classList.add('hidden');
                            renderVideos(deduped);
                            updateLoadedCount(renderedVideos.length);
                        }
                        
                        return { item, list };
                    } catch (error) {
                        console.error(`Error fetching data from ${item.url}:`, error);
                        return { item, list: [] };
                    } finally {
                        completed += 1;
                        if (progressDone) progressDone.textContent = completed;
                        if (progressDoneDesktop) progressDoneDesktop.textContent = completed;
                    }
                });
                
                const results = await Promise.all(promises);
                
                // 所有请求完成后，更新进度显示为"完成/总接口数"
                if (progressDone) progressDone.textContent = '完成';
                if (progressDoneDesktop) progressDoneDesktop.textContent = '完成';
                
                currentPage = page;
                searchTerm = keyword;
                
                const anyHasMore = results.some(r => r.list && r.list.length >= 20);
                if (anyHasMore) {
                    showLoadMoreButton();
                    hasMore = true;
                } else {
                    hideLoadMoreButton();
                    hasMore = false;
                }
                
                // 检查是否有数据
                if (renderedVideos.length === 0) {
                    if (page === 1) {
                        // 只有当所有接口请求完成且都没有内容时才显示空状态
                        showEmptyState();
                    } else {
                        showToast('数据加载完毕');
                    }
                }
                
                return renderedVideos;
            } catch (error) {
                console.error('聚合搜索失败:', error);
                if (page === 1) {
                    showErrorState('获取数据失败，请检查网络连接或Host设置');
                }
                return [];
            }
        }

        function updateAggregateLoading(done, total) {
            if (!isAggregateSearchEnabled()) return;
            const text = `聚合搜索加载中... (${done}/${total})`;
            if (loadingText) {
                loadingText.textContent = text;
            }
            // 同时更新悬浮按钮中的进度显示
            const progressDone = document.getElementById('progressDone');
            const progressTotal = document.getElementById('progressTotal');
            if (progressDone) progressDone.textContent = done;
            if (progressTotal) progressTotal.textContent = total;
        }

        async function ensureFavoritesLoaded() {
            if (Array.isArray(favoritesCache)) return;
            await loadFavorites(true);
        }
        
        // 渲染视频卡片
        function updateVideoGridLayout(category) {
            if (!videoList) return;
            const isNormal = category === 'normal';
            const gridClasses = [
                'grid',
                'grid-cols-1',
                'sm:grid-cols-2',
                'md:grid-cols-3',
                'lg:grid-cols-4',
                'xl:grid-cols-5'
            ];
            const normalGridClasses = [
                'grid',
                'grid-cols-2',
                'sm:grid-cols-3',
                'md:grid-cols-4',
                'lg:grid-cols-5',
                'xl:grid-cols-6'
            ];
            gridClasses.concat(normalGridClasses).forEach((cls) => videoList.classList.remove(cls));
            (isNormal ? normalGridClasses : gridClasses).forEach((cls) => videoList.classList.add(cls));
        }

        function renderVideos(videos) {
            const resolveVideoCategory = (video) => {
                if (video && video._sourceCategory) return normalizeCategory(video._sourceCategory);
                return normalizeCategory(getCurrentHostCategory());
            };
            const categories = new Set((videos || []).map(resolveVideoCategory));
            const layoutCategory = categories.size === 1 ? Array.from(categories)[0] : 'adult';
            updateVideoGridLayout(layoutCategory);

            videos.forEach((video, index) => {
                const favorited = isFavorited(video.vod_play_url);
                const sourceLabel = video._sourceLabel || getHostLabel();
                const category = resolveVideoCategory(video);
                const isNormal = category === 'normal';
                if (video.vod_play_url) {
                    renderedVideos.push({
                        url: video.vod_play_url,
                        title: video.vod_name || '未命名',
                        pic: video.vod_pic || '',
                        source: sourceLabel
                    });
                }
                const card = document.createElement('div');
                card.className = `bg-white rounded-lg overflow-hidden shadow-md card-hover scroll-offset video-card ${isNormal ? 'video-card--normal max-w-[220px] w-full mx-auto' : 'video-card--adult'}`;
                card.setAttribute('data-video-url', video.vod_play_url || '');
                const thumbClass = isNormal
                    ? 'video-thumb relative aspect-[474/670] overflow-hidden cursor-pointer'
                    : 'video-thumb relative aspect-video overflow-hidden cursor-pointer';
                const titleClass = isNormal
                    ? 'font-semibold mb-2 line-clamp-1 text-sm'
                    : 'font-semibold mb-2 line-clamp-1';
                const actionClass = isNormal ? 'text-xs' : 'text-sm';
                const yearBadge = isNormal && video.vod_year
                    ? `<span class="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">${video.vod_year}</span>`
                    : '';
                const classText = isNormal && video.vod_class
                    ? String(video.vod_class).split(',').map(s => s.trim()).filter(Boolean).slice(0, 3).join(' / ')
                    : '';
                const actorText = isNormal && video.vod_actor
                    ? String(video.vod_actor).split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' / ')
                    : '未知';
                const cleanText = (value) => {
                    const raw = String(value || '');
                    if (!raw) return '';
                    return raw
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/gi, ' ')
                        .replace(/&amp;/gi, '&')
                        .replace(/&lt;/gi, '<')
                        .replace(/&gt;/gi, '>')
                        .replace(/&quot;/gi, '"')
                        .replace(/&#39;/gi, "'")
                        .replace(/\s+/g, ' ')
                        .trim();
                };
                const contentText = isNormal ? cleanText(video.vod_content) : '';
                const buttonClass = isNormal ? 'btn-primary text-xs' : 'btn-primary text-sm';
                card.innerHTML = `
                    <div class="${thumbClass}" data-preview-group="video" data-preview-url="${video.vod_pic || FALLBACK_IMAGE}" data-preview-title="${video.vod_name || ''}" data-preview-video-url="${video.vod_play_url || ''}" data-preview-source="${sourceLabel || ''}" data-preview-category="${category}" onclick="openPreviewFromGroup(this)">
                        <div class="video-cover-wrapper" id="cover-wrapper-${index}">
                            <img 
                                src="${FALLBACK_IMAGE}" 
                                data-src="${video.vod_pic}" 
                                alt="${video.vod_name}" 
                                onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';"
                                loading="lazy"
                                class="w-full h-full object-cover lazy-image"
                                onload="checkVideoImageOrientation(this, ${index})"
                            >
                        </div>
                        ${isNormal && video.vod_remarks ? `<div class="absolute top-2 left-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded-full max-w-[85%] truncate">${video.vod_remarks}</div>` : ''}
                        <div class="privacy-mask"></div>
                        <div class="count-badge hidden absolute top-2 right-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded-full"></div>
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end">
                            <div class="p-3 w-full">
                                <h3 class="text-white font-medium line-clamp-2">${video.vod_name}</h3>
                                ${isNormal && contentText ? `<p class="text-white/80 text-[11px] mt-1 line-clamp-3">${contentText}</p>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="p-4">
                        ${isNormal ? `
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">${sourceLabel}</span>
                                ${yearBadge}
                            </div>
                        ` : ''}
                        <h3 class="${titleClass}">
                            ${!isNormal ? `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2">${sourceLabel}</span>` : ''}
                            ${video.vod_name}
                        </h3>
                        ${isNormal && (classText || actorText) ? `
                            <div class="text-[11px] text-gray-500 space-y-0.5 mb-2">
                                ${classText ? `<div>类型：${classText}</div>` : ''}
                                ${actorText ? `<div class="line-clamp-1">演员：${actorText}</div>` : ''}
                            </div>
                        ` : ''}
                        <div class="flex justify-between items-center">
                            <button 
                                onclick="openVideoPlayer('${video.vod_play_url}', '${video.vod_name}', '${video.vod_pic}', '${sourceLabel}', '${category}', 0, '${cleanText(video.vod_content)}', '${classText}', '${actorText}', '${video.vod_year || ''}', '${video.vod_remarks || ''}')"
                                class="${buttonClass}"
                            >
                                <i class="fa fa-play mr-1"></i> 播放
                            </button>
                            <div class="flex items-center space-x-2">
                                <button 
                                    onclick="toggleFavorite('${video.vod_name}', '${video.vod_play_url}', '${video.vod_pic}', this, '${sourceLabel}')"
                                    data-action="favorite"
                                    class="${actionClass} ${favorited ? 'text-red-500' : 'text-gray-500'} hover:text-red-500"
                                    title="喜欢"
                                >
                                    <i class="fa ${favorited ? 'fa-heart' : 'fa-heart-o'} ${isNormal ? '' : 'mr-1'}"></i><span class="${isNormal ? 'hidden sm:inline' : ''} ${isNormal ? 'sm:ml-1' : ''}">喜欢</span>
                                </button>
                                <button 
                                    onclick="shareVideo('${video.vod_play_url}', '${video.vod_name}', '${video.vod_pic}', '${sourceLabel}', 0, '${cleanText(video.vod_content)}', '${classText}', '${actorText}', '${video.vod_year || ''}', '${video.vod_remarks || ''}')"
                                    class="${actionClass} text-gray-500 hover:text-blue-500"
                                    title="分享视频"
                                >
                                    <i class="fa fa-share-alt ${isNormal ? '' : 'mr-1'}"></i><span class="${isNormal ? 'hidden sm:inline' : ''} ${isNormal ? 'sm:ml-1' : ''}">分享</span>
                                </button>

                            </div>
                        </div>
                    </div>
                `;
                
                const cardIndex = renderedVideos.length;
                card.dataset.index = String(cardIndex);
                const thumb = card.querySelector('.video-thumb');
                if (thumb) {
                    thumb.addEventListener('mouseenter', () => {
                        showCardCount(thumb, cardIndex);
                    });
                    thumb.addEventListener('mouseleave', () => {
                        hideCardCount(thumb);
                    });
                }
                videoList.appendChild(card);
            });
            
            // 初始化懒加载
            initLazyLoading();
            
            // 触发一次滚动事件，确保所有可见的图片都能被加载
            setTimeout(() => {
                window.dispatchEvent(new Event('scroll'));
            }, 100);
        }

        function updateLoadedCount(totalCount) {
            let changed = false;
            const loadedTotalCountDesktop = document.getElementById('loadedTotalCountDesktop');
            if (loadedTotalCount && totalCount !== null && totalCount !== undefined) {
                loadedTotalCount.textContent = String(totalCount);
                changed = true;
            }
            if (loadedTotalCountDesktop && totalCount !== null && totalCount !== undefined) {
                loadedTotalCountDesktop.textContent = String(totalCount);
                changed = true;
            }
            if (!changed) return;
            const targets = [loadedTotalCount, loadedTotalCountDesktop].filter(Boolean);
            targets.forEach((el) => el.classList.add('animate-pulse'));
            setTimeout(() => {
                targets.forEach((el) => el.classList.remove('animate-pulse'));
            }, 500);
        }

        function showCardCount(thumbEl, index) {
            if (!thumbEl) return;
            const badge = thumbEl.querySelector('.count-badge');
            if (!badge) return;
            const total = renderedVideos.length;
            badge.textContent = `${index}/${total}`;
            badge.classList.remove('hidden');
        }

        function hideCardCount(thumbEl) {
            if (!thumbEl) return;
            const badge = thumbEl.querySelector('.count-badge');
            if (!badge) return;
            badge.classList.add('hidden');
        }

        function playRandomVideo() {
            if (!renderedVideos || renderedVideos.length === 0) {
                showToast('暂无可播放视频');
                return;
            }
            const index = Math.floor(Math.random() * renderedVideos.length);
            const target = renderedVideos[index];
            if (!target || !target.url) {
                showToast('暂无可播放视频');
                return;
            }
            openVideoPlayer(target.url, target.title, target.pic, target.source || '', '', null, target.desc || '', target.class || '', target.actor || '', target.year || '', target.remarks || '');
        }
        
        // 初始化图片懒加载
        function initLazyLoading() {
            const lazyImages = document.querySelectorAll('img[data-src]');
            
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src && img.src !== img.dataset.src) {
                                img.onload = function() {
                                    // 图片加载完成后检测方向
                                    const wrapper = img.closest('.video-cover-wrapper');
                                    if (wrapper) {
                                        const wrapperId = wrapper.id;
                                        const match = wrapperId.match(/cover-wrapper-(\d+)/);
                                        if (match) {
                                            const index = parseInt(match[1], 10);
                                            applyVideoImageOrientation(img, index);
                                        }
                                    }
                                    img.classList.remove('lazy-image');
                                };
                                img.src = img.dataset.src;
                            }
                            imageObserver.unobserve(img);
                        }
                    });
                });
                
                lazyImages.forEach(img => {
                    // 只观察那些还没有加载的图片
                    if (img.src !== img.dataset.src) {
                        imageObserver.observe(img);
                    } else if (img.naturalWidth) {
                        // 已经加载的图片，立即检测
                        const wrapper = img.closest('.video-cover-wrapper');
                        if (wrapper) {
                            const wrapperId = wrapper.id;
                            const match = wrapperId.match(/cover-wrapper-(\d+)/);
                            if (match) {
                                const index = parseInt(match[1], 10);
                                applyVideoImageOrientation(img, index);
                            }
                        }
                    }
                });
            } else {
                // 回退方案
                lazyImages.forEach(img => {
                    if (img.dataset.src && img.src !== img.dataset.src) {
                        img.onload = function() {
                            const wrapper = img.closest('.video-cover-wrapper');
                            if (wrapper) {
                                const wrapperId = wrapper.id;
                                const match = wrapperId.match(/cover-wrapper-(\d+)/);
                                if (match) {
                                    const index = parseInt(match[1], 10);
                                    applyVideoImageOrientation(img, index);
                                }
                            }
                            img.classList.remove('lazy-image');
                        };
                        img.src = img.dataset.src;
                    } else if (img.naturalWidth) {
                        const wrapper = img.closest('.video-cover-wrapper');
                        if (wrapper) {
                            const wrapperId = wrapper.id;
                            const match = wrapperId.match(/cover-wrapper-(\d+)/);
                            if (match) {
                                const index = parseInt(match[1], 10);
                                applyVideoImageOrientation(img, index);
                            }
                        }
                    }
                });
            }
        }
        
        // 搜索功能
        function searchData() {
            suppressHistoryInteractions(200);
            const isMobile = window.matchMedia('(max-width: 767px)').matches;
            const desktopValue = document.getElementById('searchInput').value.trim();
            const mobileValue = document.getElementById('searchInputMobile').value.trim();
            const input = isMobile ? mobileValue : (desktopValue || mobileValue);
            
            if (!input) {
                showToast('请输入搜索关键词');
                return;
            }
            
            if (!host && !isAggregateSearchEnabled()) {
                showToast('请先设置API Host');
                showHostModal();
                return;
            }
            
            searchTerm = input;
            currentPage = 1;
            hasMore = true;
            hideEmptyState();
            saveSearchHistory(input);
            hideSearchHistory();
            
            // 更新两个搜索框的值
            document.getElementById('searchInput').value = input;
            document.getElementById('searchInputMobile').value = input;
            
            // 防止重复请求
            if (isLoading) return;
            isLoading = true;
            // 隐藏加载更多按钮
            hideLoadMoreButton();
            // 显示搜索中提示
            document.getElementById('searchingState').classList.remove('hidden');
            
            showLoading('正在搜索...');
            fetchData(input, 1).then((list) => {
                if (list && list.length > 0) {
                    if (window.matchMedia('(max-width: 767px)').matches) {
                        setTimeout(() => {
                            const mobileBox = document.getElementById('mobileSearchBox');
                            if (mobileBox && !mobileBox.classList.contains('hidden')) {
                                mobileBox.classList.add('hidden');
                            }
                        }, 200);
                    }
                    // 移除滚动到第一条数据的代码
                }
            }).finally(() => {
                hideLoading();
                isLoading = false;
                // 隐藏搜索中提示
                document.getElementById('searchingState').classList.add('hidden');
            });
        }

        // 搜索历史记录
        function getSearchHistory() {
            return JSON.parse(localStorage.getItem('searchHistory') || '[]');
        }

        function saveSearchHistory(term) {
            if (!term) return;
            const history = getSearchHistory();
            const existingIndex = history.findIndex(item => item === term);
            if (existingIndex >= 0) {
                history.splice(existingIndex, 1);
            }
            history.unshift(term);
            if (history.length > 20) {
                history.splice(20);
            }
            localStorage.setItem('searchHistory', JSON.stringify(history));
            scheduleUserStatsUpdate();
        }

        function renderSearchHistory() {
            const history = getSearchHistory().slice(0, 12);
            const box = searchHistoryBox;
            const boxMobile = searchHistoryBoxMobile;
            const html = history.length === 0
                ? `<div class="px-3 py-2 text-xs text-gray-500">暂无搜索历史</div>`
                : `
                    <div class="p-2">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs text-gray-500">搜索历史</span>
                            <button 
                                class="text-xs text-gray-400 hover:text-red-500"
                                onclick="clearSearchHistory()"
                                title="清除搜索历史"
                            >
                                <i class="fa fa-trash-o mr-1"></i> 清除
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2 max-h-[96px] overflow-hidden">
                            ${history.map(item => `
                                <button 
                                    class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                                    onclick="selectSearchHistory('${item}')"
                                    title="${item}"
                                >${item}</button>
                            `).join('')}
                        </div>
                    </div>
                `;
            if (box) box.innerHTML = html;
            if (boxMobile) boxMobile.innerHTML = html;
        }

        function clearSearchHistory() {
            localStorage.removeItem('searchHistory');
            renderSearchHistory();
            // 更新用户信息面板中的搜索历史计数
            updateUserInfo();
        }

        function showSearchHistory() {
            if (suppressHistoryClick) return;
            renderSearchHistory();
            if (searchHistoryBox) searchHistoryBox.classList.remove('hidden');
            if (searchHistoryBoxMobile) searchHistoryBoxMobile.classList.remove('hidden');
        }

        function hideSearchHistory() {
            if (searchHistoryBox) searchHistoryBox.classList.add('hidden');
            if (searchHistoryBoxMobile) searchHistoryBoxMobile.classList.add('hidden');
        }

        function selectSearchHistory(term) {
            if (suppressHistoryClick) return;
            if (!term) return;
            if (searchInput) searchInput.value = term;
            if (searchInputMobile) searchInputMobile.value = term;
            searchData();
        }

        function bindSearchHistoryEvents() {
            const bind = (input) => {
                if (!input) return;
                input.addEventListener('focus', showSearchHistory);
                input.addEventListener('blur', () => {
                    setTimeout(hideSearchHistory, 150);
                });
            };
            bind(searchInput);
            bind(searchInputMobile);

            // 移动端点击输入框时清空上次搜索内容
            if (searchInputMobile) {
                searchInputMobile.addEventListener('focus', () => {
                    searchInputMobile.value = '';
                });
            }
            if (searchButtonMobile) {
                const suppress = () => suppressHistoryInteractions(250);
                searchButtonMobile.addEventListener('mousedown', suppress);
                searchButtonMobile.addEventListener('pointerdown', suppress);
                searchButtonMobile.addEventListener('touchstart', suppress, { passive: true });
            }
        }

        function suppressHistoryInteractions(duration = 200) {
            suppressHistoryClick = true;
            hideSearchHistory();
            if (searchHistoryBox) searchHistoryBox.style.pointerEvents = 'none';
            if (searchHistoryBoxMobile) searchHistoryBoxMobile.style.pointerEvents = 'none';
            setTimeout(() => {
                suppressHistoryClick = false;
                if (searchHistoryBox) searchHistoryBox.style.pointerEvents = '';
                if (searchHistoryBoxMobile) searchHistoryBoxMobile.style.pointerEvents = '';
            }, duration);
        }

        // 滚动到元素并避开固定导航
        function scrollToElementWithHeaderOffset(element, extraOffset = 0) {
            if (!element) return;
            const header = document.getElementById('header');
            const headerHeight = header ? header.offsetHeight : 0;
            const rect = element.getBoundingClientRect();
            const targetTop = rect.top + window.pageYOffset - headerHeight - extraOffset;
            window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
        }
        
        let lastLoadMoreAt = 0;
        let mathChallengeAnswer = null;
        let mathChallengeResolver = null;

        function showMathChallengeModal() {
            if (videoPlayerModal && !videoPlayerModal.classList.contains('hidden')) {
                return Promise.resolve(false);
            }
            const ops = ['+', '-', '*'];
            const op = ops[Math.floor(Math.random() * ops.length)];
            let a = Math.floor(Math.random() * 9) + 1;
            let b = Math.floor(Math.random() * 9) + 1;
            if (op === '-' && a < b) {
                const tmp = a;
                a = b;
                b = tmp;
            }
            mathChallengeAnswer = op === '+' ? a + b : op === '-' ? a - b : a * b;
            const questionEl = document.getElementById('mathChallengeQuestion');
            const inputEl = document.getElementById('mathChallengeInput');
            const errorEl = document.getElementById('mathChallengeError');
            const modalEl = document.getElementById('mathChallengeModal');
            if (!questionEl || !inputEl || !errorEl || !modalEl) return Promise.resolve(false);
            questionEl.textContent = `${a} ${op} ${b} = ?`;
            inputEl.value = '';
            errorEl.classList.add('hidden');
            modalEl.classList.remove('hidden');
            modalEl.classList.add('flex');
            document.body.style.overflow = 'hidden';
            setTimeout(() => inputEl.focus(), 0);
            return new Promise(resolve => {
                mathChallengeResolver = resolve;
            });
        }

        function hideMathChallengeModal() {
            const modalEl = document.getElementById('mathChallengeModal');
            if (!modalEl) return;
            modalEl.classList.add('hidden');
            modalEl.classList.remove('flex');
            document.body.style.overflow = '';
        }

        function submitMathChallenge() {
            const inputEl = document.getElementById('mathChallengeInput');
            const errorEl = document.getElementById('mathChallengeError');
            if (!inputEl || !errorEl) return;
            const answer = Number(String(inputEl.value).trim());
            if (!Number.isFinite(answer) || answer !== mathChallengeAnswer) {
                errorEl.classList.remove('hidden');
                inputEl.focus();
                return;
            }
            errorEl.classList.add('hidden');
            hideMathChallengeModal();
            if (typeof mathChallengeResolver === 'function') {
                mathChallengeResolver(true);
                mathChallengeResolver = null;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const inputEl = document.getElementById('mathChallengeInput');
            const submitEl = document.getElementById('mathChallengeSubmit');
            if (submitEl) submitEl.addEventListener('click', submitMathChallenge);
            if (inputEl) {
                inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') submitMathChallenge();
                });
            }
        });

        // 检测视频图片方向，如果是竖屏图片则添加特殊样式
        function checkVideoImageOrientation(img, index) {
            // 使用setTimeout确保图片尺寸已经加载完成
            setTimeout(function() {
                // 如果naturalWidth为0，说明图片还没加载完成，使用loaded事件
                if (!img.naturalWidth || !img.naturalHeight) {
                    img.addEventListener('load', function() {
                        applyVideoImageOrientation(img, index);
                    });
                } else {
                    applyVideoImageOrientation(img, index);
                }
            }, 100);
        }

        // 应用视频图片方向样式
        function applyVideoImageOrientation(img, index) {
            if (img.naturalWidth && img.naturalHeight) {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                // 如果是竖屏图片（宽高比小于0.75），添加portrait类
                if (aspectRatio < 0.75) {
                    const wrapper = document.getElementById(`cover-wrapper-${index}`);
                    if (wrapper) {
                        wrapper.classList.add('portrait');
                    }
                }
            }
        }

        // 加载更多
        async function loadMoreData() {
            if (isLoading || (!host && !isAggregateSearchEnabled()) || !hasMore) return;
            if (videoPlayerModal && !videoPlayerModal.classList.contains('hidden')) return;

            const now = Date.now();
            if (now - lastLoadMoreAt < 5000) {
                const ok = await showMathChallengeModal();
                if (!ok) return;
            }
            lastLoadMoreAt = now;
            
            isLoading = true;
            showLoading('加载更多内容...');
            
            fetchData(searchTerm, currentPage + 1).finally(() => {
                hideLoading();
                isLoading = false;
            });
        }
        
