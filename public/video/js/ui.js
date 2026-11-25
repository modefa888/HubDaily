/* 滚动、加载状态与通用 UI */
        // 分享回退方案
        function fallbackShare(url) {
            try {
                // 尝试复制到剪贴板
                navigator.clipboard.writeText(url).then(() => {
                    showToast('视频链接已复制到剪贴板');
                }).catch(() => {
                    // 如果复制失败，显示提示
                    prompt('请复制视频链接:', url);
                });
            } catch (err) {
                prompt('请复制视频链接:', url);
            }
        }
        
        // 切换画中画模式
        function togglePictureInPicture() {
            if (!dplayer || !dplayer.video) return;
            
            if (document.pictureInPictureElement) {
                // 退出画中画模式
                document.exitPictureInPicture().then(() => {
                    showToast('已退出画中画模式');
                }).catch(err => {
                    console.error('退出画中画失败:', err);
                    showToast('退出画中画失败');
                });
            } else {
                // 进入画中画模式
                if (document.pictureInPictureEnabled) {
                    dplayer.video.requestPictureInPicture().then(() => {
                        showToast('已进入画中画模式');
                    }).catch(err => {
                        console.error('进入画中画失败:', err);
                        showToast('进入画中画失败');
                    });
                } else {
                    showToast('您的浏览器不支持画中画功能');
                }
            }
        }
        
        // 滚动处理
        let loadMoreDelayTimer = null;
        let loadMoreCountdownTimer = null;
        function handleScroll() {
            // 显示/隐藏回到顶部按钮
            if (window.scrollY > 300) {
                floatingButtons.classList.remove('hidden');
            } else {
                floatingButtons.classList.add('hidden');
            }
            
            // 无限滚动加载更多
            if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 200) {
                if (hasMore && !isLoading) {
                    showLoadMoreButton();
                    if (loadMoreDelayTimer) return;
                    let countdown = 3;
                    setLoadMoreButtonCountdown(countdown);
                    loadMoreCountdownTimer = setInterval(() => {
                        countdown -= 1;
                        if (countdown > 0) {
                            setLoadMoreButtonCountdown(countdown);
                        }
                    }, 1000);
                    loadMoreDelayTimer = setTimeout(() => {
                        loadMoreDelayTimer = null;
                        if (loadMoreCountdownTimer) {
                            clearInterval(loadMoreCountdownTimer);
                            loadMoreCountdownTimer = null;
                        }
                        loadMoreButton.innerHTML = `
                            <span>加载中...</span>
                            <i class="fa fa-refresh fa-spin"></i>
                        `;
                        if (!hasMore || isLoading) return;
                        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 200) {
                            loadMoreData();
                        }
                    }, 3000);
                }
            } else if (loadMoreDelayTimer) {
                clearTimeout(loadMoreDelayTimer);
                loadMoreDelayTimer = null;
                if (loadMoreCountdownTimer) {
                    clearInterval(loadMoreCountdownTimer);
                    loadMoreCountdownTimer = null;
                }
                setLoadMoreButtonCountdown(0);
            }
        }
        
        // 回到顶部
        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        // 折叠/展开悬浮控制按钮
        function toggleFloatingButtons() {
            const content = document.getElementById('floatingButtonsContent');
            if (content) {
                if (content.classList.contains('hidden')) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            }
        }
        
        // 移动端点击其他地方自动折叠
        document.addEventListener('click', function(event) {
            const floatingButtons = document.getElementById('floatingButtons');
            const content = document.getElementById('floatingButtonsContent');
            if (floatingButtons && content && !content.classList.contains('hidden')) {
                // 检查点击是否在floatingButtons区域内
                if (!floatingButtons.contains(event.target)) {
                    content.classList.add('hidden');
                }
            }
        });
        
        // 显示加载指示器
        function showLoading(text = '加载中...') {
            // 不显示加载指示器，以便用户能够看到实时加载的效果
            loadingText.textContent = text;
        }
        
        // 隐藏加载指示器
        function hideLoading() {
            // 不显示加载指示器，以便用户能够看到实时加载的效果
        }
        
        // 显示空状态
        function showEmptyState() {
            videoList.innerHTML = '';
            // 隐藏搜索中提示
            document.getElementById('searchingState').classList.add('hidden');
            emptyState.classList.remove('hidden');
            hideLoadMoreButton();
        }

        function hideEmptyState() {
            emptyState.classList.add('hidden');
        }
        
        // 显示错误状态
        function showErrorState(message, options = {}) {
            hideEmptyState();
            const showRetry = options.showRetry !== false;
            const retryHtml = showRetry
                ? `<button onclick="loadInitialData()" class="btn-primary">
                        <i class="fa fa-refresh mr-1"></i> 重试
                    </button>`
                : '';
            videoList.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fa fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-700 mb-2">加载失败</h3>
                    <p class="text-gray-600 mb-4">${message}</p>
                    ${retryHtml}
                </div>
            `;
            hideLoadMoreButton();
        }
        
        // 显示加载更多按钮
        function showLoadMoreButton() {
            loadMoreButton.classList.remove('hidden');
        }

        function setLoadMoreButtonCountdown(seconds) {
            if (!loadMoreButton) return;
            if (!Number.isFinite(seconds) || seconds <= 0) {
                loadMoreButton.innerHTML = `
                    <span>加载更多</span>
                    <i class="fa fa-refresh"></i>
                `;
                return;
            }
            loadMoreButton.innerHTML = `
                <span>倒计时 ${seconds}s</span>
                <i class="fa fa-refresh fa-spin"></i>
            `;
        }
        
        // 隐藏加载更多按钮
        function hideLoadMoreButton() {
            loadMoreButton.classList.add('hidden');
        }
        
        function getPanels() {
            return [historyPanel, favoritePanel, sharePanel, userPanel, aboutPanel, hostModal].filter(Boolean);
        }

        function updateOverlayForPanels() {
            const anyOpen = getPanels().some(panel => !panel.classList.contains('translate-x-full'));
            overlay.classList.toggle('hidden', !anyOpen);
        }

        function closePanelsExcept(activePanel) {
            getPanels().forEach(panel => {
                if (panel !== activePanel) panel.classList.add('translate-x-full');
            });
        }

        // 关闭所有面板
        function closeAllPanels() {
            getPanels().forEach(panel => panel.classList.add('translate-x-full'));
            overlay.classList.add('hidden');
        }

        function getShareExpireLabel(expiresAt) {
            if (!expiresAt || expiresAt === 0) return '永久';
            const diff = expiresAt - Date.now();
            if (diff <= 0) return '已过期';
            const minutes = Math.ceil(diff / 60000);
            if (minutes < 60) return `${minutes}分钟后过期`;
            const hours = Math.ceil(diff / 3600000);
            if (hours < 24) return `${hours}小时后过期`;
            const days = Math.ceil(diff / 86400000);
            return `${days}天后过期`;
        }

        function renderShareContent(list) {
            if (!shareContent) return;
            const shares = Array.isArray(list) ? list.map(normalizeShareItem).filter(Boolean) : [];
            
            // 根据当前tab过滤分享内容
            let filteredShares = shares;
            if (currentShareTab !== 'all') {
                filteredShares = shares.filter(item => {
                    let category = getOfficialCategoryByName(item.source) || '';
                    if (!category) {
                        // 如果无法通过source获取分类，使用当前host的分类作为默认值
                        category = getCurrentHostCategory();
                    }
                    return normalizeCategory(category) === currentShareTab;
                });
            }
            
            filteredShares.sort((a, b) => {
                const aLast = Number(a.lastViewAt || 0);
                const bLast = Number(b.lastViewAt || 0);
                if (bLast !== aLast) return bLast - aLast;
                return Number(b.createdAt || 0) - Number(a.createdAt || 0);
            });
            if (filteredShares.length === 0) {
                shareContent.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fa fa-share-alt text-4xl mb-3"></i>
                        <p>暂无分享内容</p>
                    </div>
                `;
                return;
            }
            shareContent.innerHTML = filteredShares.map(item => {
                const statusText = getShareExpireLabel(item.expiresAt);
                const statusClass = statusText === '已过期' ? 'text-red-500' : 'text-gray-500';
                return `
                    <div class="bg-white rounded-lg p-3 mb-3 shadow-sm">
                        <div class="flex space-x-3">
                            <div class="w-20 h-12 rounded-md overflow-hidden bg-gray-200 flex-shrink-0 cursor-pointer" data-preview-group="share" data-preview-url="${item.pic || FALLBACK_IMAGE}" data-preview-title="${item.title || ''}" data-preview-video-url="${item.url || ''}" data-preview-source="${item.source || ''}" onclick="openPreviewFromGroup(this)">
                                ${
                                    item.pic
                                        ? `<img src="${item.pic}" alt="${item.title}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';" loading="lazy" class="w-full h-full object-cover">`
                                    : `<img src="${FALLBACK_IMAGE}" alt="loading" loading="lazy" class="w-full h-full object-cover">`
                                }
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-sm mb-2 line-clamp-1">
                                    <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-1">${item.source || '未知来源'}</span>
                                    ${item.title}
                                </h4>
                                ${(item.episodeName || item.episodeCount) ? `<div class="text-[11px] text-gray-500 mb-1">选集：${item.episodeName || '-'}${item.episodeCount ? `（共 ${item.episodeCount} 集）` : ''}</div>` : ''}
                                ${(item.actor || item.class || item.year || item.remarks) ? `<div class="text-[11px] text-gray-500 mb-1 line-clamp-1">${[item.class, item.year, item.remarks].filter(Boolean).join(' · ')}${item.actor ? `${(item.class || item.year || item.remarks) ? ' · ' : ''}演员：${item.actor}` : ''}</div>` : ''}
                                ${item.desc ? `<div class="text-[11px] text-gray-400 mb-1 line-clamp-2">${item.desc}</div>` : ''}
                                <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    <span>分享时间: ${formatDate(item.createdAt)}</span>
                                    <span>更新时间: ${item.updatedAt ? formatDate(item.updatedAt) : '-'}</span>
                                    <span>查看次数: ${Number.isFinite(item.viewCount) ? item.viewCount : 0}</span>
                                    <span>最近查看: ${item.lastViewAt ? formatDate(item.lastViewAt) : '-'}</span>
                                    <span class="${statusClass}">${statusText}</span>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 space-y-2">
                            <label class="block text-xs text-gray-500">有效时间</label>
                            <div class="flex items-center space-x-2">
                                <select class="input-primary flex-[2] text-xs" onchange="updateShareExpire('${item.id}', this.value)">
                                    <option value="1800" ${Number(item.expireSeconds) === 1800 ? 'selected' : ''}>30分钟</option>
                                    <option value="7200" ${Number(item.expireSeconds) === 7200 ? 'selected' : ''}>2小时</option>
                                    <option value="86400" ${Number(item.expireSeconds) === 86400 ? 'selected' : ''}>1天</option>
                                    <option value="604800" ${Number(item.expireSeconds) === 604800 ? 'selected' : ''}>7天</option>
                                    <option value="0" ${Number(item.expireSeconds) === 0 ? 'selected' : ''}>永久</option>
                                </select>
                                <button onclick="copyShareLink('${item.id}')" class="btn-secondary text-xs px-3 flex-[1]">
                                    <i class="fa fa-copy mr-1"></i> 复制
                                </button>
                                <button onclick="openShareEditModal('${item.id}')" class="btn-secondary text-xs px-3 flex-[1]">
                                    <i class="fa fa-edit mr-1"></i> 修改
                                </button>
                            </div>
                            <div class="flex justify-between items-center">
                                <button 
                                    onclick="openVideoPlayer('${item.url}', '${item.title}', '${item.pic || ''}', '${item.source || ''}', '', ${Number.isFinite(item.episodeIndex) ? item.episodeIndex : 'null'}, '${escapeInlineText(item.desc)}', '${escapeInlineText(item.class)}', '${escapeInlineText(item.actor)}', '${escapeInlineText(item.year)}', '${escapeInlineText(item.remarks)}')"
                                    class="btn-primary text-xs py-1 px-2 flex-1"
                                >
                                    <i class="fa fa-play mr-1"></i> 播放
                                </button>
                                <button 
                                    onclick="cancelShare('${item.id}')"
                                    class="text-gray-500 hover:text-red-500 p-1 ml-2"
                                    title="取消分享"
                                >
                                    <i class="fa fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function toggleSharePanel() {
            if (!sharePanel) return;
            const willOpen = sharePanel.classList.contains('translate-x-full');
            if (!willOpen) {
                sharePanel.classList.add('translate-x-full');
                updateOverlayForPanels();
                return;
            }
            shareContent.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="inline-flex items-center space-x-2">
                        <span class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        <span>加载中...</span>
                    </span>
                </div>
            `;
            closePanelsExcept(sharePanel);
            sharePanel.classList.remove('translate-x-full');
            updateOverlayForPanels();
            let remote = null;
            if (!shareListLoaded) {
                remote = await loadRemoteShares();
            }
            const shares = (remote || getShareList()).map(normalizeShareItem).filter(Boolean);
            renderShareContent(shares);
        }

        async function updateShareExpire(id, seconds) {
            const list = getShareList().map(normalizeShareItem).filter(Boolean);
            const target = list.find(item => item.id === id);
            if (!target) return;
            const expireSeconds = Number(seconds || 0);
            const now = Date.now();
            target.expireSeconds = Number.isFinite(expireSeconds) ? expireSeconds : 0;
            target.expiresAt = target.expireSeconds > 0 ? now + target.expireSeconds * 1000 : 0;
            target.shareUrl = buildShareUrl(target.url, target.title, target.pic, target.source, target.expireSeconds, target.id);
            target.updatedAt = now;
            setShareList(list);
            renderShareContent(list);
            
            // 立即更新到后端
            const token = getUserToken ? getUserToken() : '';
            if (token) {
                try {
                    const res = await fetch(`/api/user/shares/${target.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ expireSeconds: target.expireSeconds })
                    });
                    
                    const data = await res.json();
                    if (data && data.code === 200) {
                        showToast('分享有效期已成功更新');
                    } else {
                        showToast('更新失败，请重试');
                    }
                } catch (err) {
                    showToast('网络错误，请稍后重试');
                }
            } else {
                showToast('请先登录');
            }
        }

        function copyShareLink(id) {
            const list = getShareList().map(normalizeShareItem).filter(Boolean);
            const target = list.find(item => item.id === id);
            if (!target || !target.shareUrl) return;
            try {
                navigator.clipboard.writeText(target.shareUrl).then(() => {
                    showToast('分享链接已复制到剪贴板');
                }).catch(() => {
                    prompt('请复制分享链接:', target.shareUrl);
                });
            } catch (err) {
                prompt('请复制分享链接:', target.shareUrl);
            }
        }

        function cancelShare(id) {
            const list = getShareList().map(normalizeShareItem).filter(Boolean);
            const next = list.filter(item => item.id !== id);
            setShareList(next);
            renderShareContent(next);
            showToast('已取消分享');
            const token = getUserToken ? getUserToken() : '';
            if (token) {
                fetch(`/api/user/shares/${encodeURIComponent(id)}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => {});
            }
        }

        
        // 显示Toast提示
        function showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg z-[90]';
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 2000);
        }
        
        // 格式化日期
        function formatDate(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            // 小于1小时
            if (diff < 3600000) {
                const minutes = Math.floor(diff / 60000);
                return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
            }
            
            // 小于24小时
            if (diff < 86400000) {
                const hours = Math.floor(diff / 3600000);
                return `${hours}小时前`;
            }
            
            // 小于7天
            if (diff < 604800000) {
                const days = Math.floor(diff / 86400000);
                return `${days}天前`;
            }
            
            // 其他情况显示具体日期
            return date.toLocaleDateString('zh-CN');
        }

        function formatDuration(seconds) {
            if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
            const total = Math.floor(seconds);
            const hours = Math.floor(total / 3600);
            const minutes = Math.floor((total % 3600) / 60);
            const secs = total % 60;
            if (hours > 0) {
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        

