/* 图片预览 */
        // 处理回车键搜索
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                searchData();
            }
        }
        
        function openPreviewFromGroup(el) {
            if (!el || !el.dataset) return;
            const group = el.dataset.previewGroup || '';
            const nodes = group
                ? Array.from(document.querySelectorAll(`[data-preview-group="${group}"]`))
                : [];
            const list = nodes.length > 0
                ? nodes.map(node => ({
                    url: String(node.dataset.previewUrl || ''),
                    title: String(node.dataset.previewTitle || ''),
                    videoUrl: String(node.dataset.previewVideoUrl || ''),
                    source: String(node.dataset.previewSource || ''),
                    category: String(node.dataset.previewCategory || '')
                })).filter(item => item.url)
                : [{
                    url: String(el.dataset.previewUrl || ''),
                    title: String(el.dataset.previewTitle || ''),
                    videoUrl: String(el.dataset.previewVideoUrl || ''),
                    source: String(el.dataset.previewSource || ''),
                    category: String(el.dataset.previewCategory || '')
                }];
            const index = nodes.length > 0 ? Math.max(0, nodes.indexOf(el)) : 0;
            const current = list[index] || list[0];
            if (!current || !current.url) return;
            openFullScreenPreview(current.url, current.title, list, index);
        }

        // 显示全屏预览
        function openFullScreenPreview(imageUrl, title, list = [], startIndex = 0) {
            const items = Array.isArray(list) && list.length > 0
                ? list
                : [{ url: imageUrl, title }];
            let currentIndex = Math.min(Math.max(Number(startIndex) || 0, 0), items.length - 1);
            let currentEpisodeIndex = 0;
            let scale = 1;
            let translateX = 0;
            let translateY = 0;
            let isDragging = false;
            let dragStartX = 0;
            let dragStartY = 0;
            let pinchStartDist = 0;
            let pinchStartScale = 1;
            let swipeStartX = 0;
            let swipeStartY = 0;
            let lastTapAt = 0;

            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4';
            overlay.innerHTML = `
                <div class="relative max-w-full max-h-[90vh] w-full flex items-center justify-center">
                    <button 
                        class="fixed top-4 right-4 text-white hover:text-gray-300 z-10"
                        data-action="close"
                    >
                        <i class="fa fa-times text-xl"></i>
                    </button>
                    <button
                        class="fixed top-4 left-4 text-white hover:text-white/80 bg-blue-600/80 hover:bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center hidden z-10"
                        data-action="play"
                        title="播放"
                    >
                        <i class="fa fa-play text-base"></i>
                    </button>
                    <button 
                        class="fixed left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center ${items.length > 1 ? '' : 'hidden'} z-10"
                        data-action="prev"
                    >
                        <i class="fa fa-angle-left text-2xl"></i>
                    </button>
                    <button 
                        class="fixed right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center ${items.length > 1 ? '' : 'hidden'} z-10"
                        data-action="next"
                    >
                        <i class="fa fa-angle-right text-2xl"></i>
                    </button>
                    <div class="relative max-w-full max-h-[90vh] flex flex-col items-center">
                        <img 
                            src="" 
                            alt="" 
                            onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';"
                            loading="lazy"
                            class="max-w-full max-h-[80vh] object-contain rounded-lg select-none touch-none"
                        >
                        <div class="preview-meta text-white/80 text-xs mt-2"></div>
                        <p class="preview-caption text-white text-center mt-2"></p>
                        <div class="preview-episodes hidden mt-3 w-full max-w-2xl">
                            <div class="text-xs text-white/70 mb-2">选集播放</div>
                            <div class="preview-episode-list flex flex-wrap gap-2"></div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            setModalScrollLock(true);

            const img = overlay.querySelector('img');
            const caption = overlay.querySelector('.preview-caption');
            const meta = overlay.querySelector('.preview-meta');
            const episodeWrap = overlay.querySelector('.preview-episodes');
            const episodeList = overlay.querySelector('.preview-episode-list');
            const prevBtn = overlay.querySelector('[data-action="prev"]');
            const nextBtn = overlay.querySelector('[data-action="next"]');
            const closeBtn = overlay.querySelector('[data-action="close"]');
            const playBtn = overlay.querySelector('[data-action="play"]');

            const parseEpisodes = (rawUrl) => {
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
            };

            const renderEpisodes = (item) => {
                if (!episodeWrap || !episodeList) return;
                const category = normalizeCategory(item.category || '');
                if (category !== 'normal') {
                    episodeWrap.classList.add('hidden');
                    episodeList.innerHTML = '';
                    currentEpisodeIndex = 0;
                    return;
                }
                const episodes = parseEpisodes(item.videoUrl);
                if (episodes.length <= 1) {
                    episodeWrap.classList.add('hidden');
                    episodeList.innerHTML = '';
                    currentEpisodeIndex = 0;
                    return;
                }
                episodeWrap.classList.remove('hidden');
                episodeList.innerHTML = episodes.map((ep, idx) => `
                    <button 
                        type="button"
                        class="px-3 py-1 rounded-full text-xs border ${idx === currentEpisodeIndex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}"
                        data-episode-index="${idx}"
                        data-episode-url="${ep.url}"
                        data-episode-name="${ep.name}"
                    >${ep.name}</button>
                `).join('');
            };

            const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
            const applyTransform = () => {
                img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            };
            const resetTransform = () => {
                scale = 1;
                translateX = 0;
                translateY = 0;
                applyTransform();
            };
            const renderImage = () => {
                const item = items[currentIndex] || items[0];
                img.src = item.url;
                img.alt = item.title || '';
                caption.textContent = item.title || '';
                if (meta) {
                    meta.textContent = `${currentIndex + 1}/${items.length}`;
                }
                if (playBtn) {
                    playBtn.classList.toggle('hidden', !item.videoUrl);
                }
                currentEpisodeIndex = 0;
                renderEpisodes(item);
                resetTransform();
            };
            const gotoIndex = (nextIndex) => {
                if (items.length <= 1) return;
                currentIndex = (nextIndex + items.length) % items.length;
                renderImage();
            };

            const handleClose = () => {
                overlay.remove();
                setModalScrollLock(false);
                document.removeEventListener('keydown', onKeyDown);
                // 重新初始化懒加载，确保所有图片都能被正确加载
                setTimeout(() => {
                    initLazyLoading();
                }, 100);
            };

            const onKeyDown = (e) => {
                if (e.key === 'Escape') handleClose();
                if (e.key === 'ArrowLeft') gotoIndex(currentIndex - 1);
                if (e.key === 'ArrowRight') gotoIndex(currentIndex + 1);
            };
            document.addEventListener('keydown', onKeyDown);

            if (closeBtn) closeBtn.addEventListener('click', handleClose);
            if (prevBtn) prevBtn.addEventListener('click', () => gotoIndex(currentIndex - 1));
            if (nextBtn) nextBtn.addEventListener('click', () => gotoIndex(currentIndex + 1));
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    const item = items[currentIndex] || items[0];
                    if (!item || !item.videoUrl) return;
                    const episodes = parseEpisodes(item.videoUrl);
                    const selected = episodes[currentEpisodeIndex];
                    handleClose();
                    openVideoPlayer(
                        item.videoUrl,
                        item.title || '',
                        item.url || '',
                        item.source || '',
                        item.category || '',
                        currentEpisodeIndex,
                        item.desc || '',
                        item.class || '',
                        item.actor || '',
                        item.year || '',
                        item.remarks || ''
                    );
                });
            }

            if (episodeList) {
                episodeList.addEventListener('click', (e) => {
                    const target = e.target;
                    if (!(target instanceof HTMLElement)) return;
                    const idx = Number(target.getAttribute('data-episode-index'));
                    const url = String(target.getAttribute('data-episode-url') || '');
                    const name = String(target.getAttribute('data-episode-name') || '');
                    if (!Number.isFinite(idx) || !url) return;
                    currentEpisodeIndex = idx;
                    const buttons = episodeList.querySelectorAll('button[data-episode-index]');
                    buttons.forEach((btn) => {
                        const isActive = Number(btn.getAttribute('data-episode-index')) === idx;
                        btn.classList.toggle('bg-blue-600', isActive);
                        btn.classList.toggle('text-white', isActive);
                        btn.classList.toggle('border-blue-600', isActive);
                        btn.classList.toggle('bg-white/10', !isActive);
                        btn.classList.toggle('text-white', !isActive);
                        btn.classList.toggle('border-white/20', !isActive);
                    });
                    handleClose();
                    const item = items[currentIndex] || {};
                    openVideoPlayer(
                        item.videoUrl || url,
                        item.title || (name || ''),
                        item.url || '',
                        item.source || '',
                        item.category || '',
                        idx,
                        item.desc || '',
                        item.class || '',
                        item.actor || '',
                        item.year || '',
                        item.remarks || ''
                    );
                });
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) handleClose();
            });

            img.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.2 : 0.2;
                const nextScale = clamp(scale + delta, 1, 4);
                scale = nextScale;
                if (scale === 1) {
                    translateX = 0;
                    translateY = 0;
                }
                applyTransform();
            }, { passive: false });

            img.addEventListener('mousedown', (e) => {
                if (scale <= 1) return;
                isDragging = true;
                dragStartX = e.clientX - translateX;
                dragStartY = e.clientY - translateY;
            });
            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                translateX = e.clientX - dragStartX;
                translateY = e.clientY - dragStartY;
                applyTransform();
            });
            window.addEventListener('mouseup', () => {
                isDragging = false;
            });

            img.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    pinchStartDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    pinchStartScale = scale;
                    return;
                }
                if (e.touches.length === 1) {
                    swipeStartX = e.touches[0].clientX;
                    swipeStartY = e.touches[0].clientY;
                    if (scale > 1) {
                        isDragging = true;
                        dragStartX = e.touches[0].clientX - translateX;
                        dragStartY = e.touches[0].clientY - translateY;
                    }
                }
            }, { passive: false });

            img.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    const dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    const nextScale = clamp(pinchStartScale * (dist / (pinchStartDist || dist)), 1, 4);
                    scale = nextScale;
                    if (scale === 1) {
                        translateX = 0;
                        translateY = 0;
                    }
                    applyTransform();
                    return;
                }
                if (e.touches.length === 1 && isDragging) {
                    e.preventDefault();
                    translateX = e.touches[0].clientX - dragStartX;
                    translateY = e.touches[0].clientY - dragStartY;
                    applyTransform();
                }
            }, { passive: false });

            img.addEventListener('touchend', (e) => {
                if (e.touches.length === 0) {
                    isDragging = false;
                    const now = Date.now();
                    if (now - lastTapAt < 280) {
                        if (scale > 1) {
                            resetTransform();
                        } else {
                            scale = 2;
                            applyTransform();
                        }
                        lastTapAt = 0;
                        return;
                    }
                    lastTapAt = now;
                    if (scale <= 1.05 && items.length > 1) {
                        const endX = (e.changedTouches[0] || {}).clientX || swipeStartX;
                        const endY = (e.changedTouches[0] || {}).clientY || swipeStartY;
                        const deltaX = endX - swipeStartX;
                        const deltaY = endY - swipeStartY;
                        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
                            gotoIndex(deltaX > 0 ? currentIndex - 1 : currentIndex + 1);
                        }
                    }
                }
            });

            renderImage();
        }
        
