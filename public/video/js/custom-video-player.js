/* 自定义播放器 */
        const ICONS = window.HubIcons || {};

        class CustomVideoPlayer {
            constructor(options = {}) {
                this.options = options || {};
                this.container = this.options.container;
                if (!this.container) throw new Error('CustomVideoPlayer: container is required');
                this.theme = this.options.theme || '#3b82f6';
                this.compact = this.options.compact === true || (this.container.clientWidth > 0 && this.container.clientWidth < 420);
                this.listeners = Object.create(null);
                this.hls = null;
                this.destroyed = false;
                this.noticeTimer = null;
                this.rotations = [0, 90, 180, 270];
                this.rotationIndex = 0;
                this.speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                this.speedIndex = 2;
                this.currentUrl = '';
                this.videoIsPortrait = false;
                this.frameCache = [];
                this.lastCacheTime = -Infinity;
                this.previewVideo = null;
                this.previewHls = null;
                this.previewTimer = null;
                this.previewTargetTime = 0;
                this.buildDom();
                this.bindEvents();
                this.setSource(this.options.video || {});
                if (this.options.autoplay) this.play();
            }

            buildDom() {
                const root = document.createElement('div');
                root.className = `cvp${this.compact ? ' compact' : ''}`;
                root.style.setProperty('--cvp-theme', this.theme);

                const stage = document.createElement('div');
                stage.className = 'cvp-stage';
                const bgCanvas = document.createElement('canvas');
                bgCanvas.className = 'cvp-bg-canvas';
                const video = document.createElement('video');
                video.className = 'cvp-video';
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.preload = this.options.preload || 'auto';
                video.loop = !!this.options.loop;
                stage.appendChild(bgCanvas);
                stage.appendChild(video);

                const centerPlay = document.createElement('button');
                centerPlay.type = 'button';
                centerPlay.className = 'cvp-center-play';
                centerPlay.title = '播放';
                centerPlay.innerHTML = ICONS.play || '';
                centerPlay.onclick = () => this.togglePlay();

                const loading = document.createElement('div');
                loading.className = 'cvp-loading hidden';
                const notice = document.createElement('div');
                notice.className = 'cvp-notice hidden';
                const contextMenu = document.createElement('div');
                contextMenu.className = 'cvp-context-menu hidden';

                const hoverPreview = document.createElement('div');
                hoverPreview.className = 'cvp-hover-preview hidden';
                const hoverImg = document.createElement('img');
                hoverImg.alt = '';
                hoverImg.style.visibility = 'hidden';
                const hoverTime = document.createElement('div');
                hoverTime.className = 'cvp-hover-time';
                hoverPreview.appendChild(hoverImg);
                hoverPreview.appendChild(hoverTime);

                const controls = document.createElement('div');
                controls.className = 'cvp-controls';
                const progressWrap = document.createElement('div');
                progressWrap.className = 'cvp-progress-wrap';
                const currentTime = document.createElement('span');
                currentTime.className = 'cvp-time cvp-time-current';
                currentTime.textContent = '00:00';
                const range = document.createElement('input');
                range.type = 'range';
                range.min = '0';
                range.max = '1000';
                range.value = '0';
                range.step = '1';
                range.className = 'cvp-range cvp-progress';
                range.title = '播放进度';
                const durationTime = document.createElement('span');
                durationTime.className = 'cvp-time cvp-time-duration';
                durationTime.textContent = '00:00';
                progressWrap.appendChild(currentTime);
                progressWrap.appendChild(range);
                progressWrap.appendChild(durationTime);

                const row = document.createElement('div');
                row.className = 'cvp-row';
                const makeButton = (className, html, title, onClick) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = `cvp-btn ${className}`;
                    btn.title = title;
                    btn.innerHTML = html;
                    btn.onclick = onClick;
                    return btn;
                };

                const playBtn = makeButton('cvp-play', ICONS.play || '', '播放/暂停', () => this.togglePlay());
                const prevEpisodeBtn = makeButton('cvp-episode-nav cvp-prev-episode hidden', ICONS.prevEpisode || '', '上一集', () => {
                    if (this.options.onPrevEpisode) this.options.onPrevEpisode();
                });
                const nextEpisodeBtn = makeButton('cvp-episode-nav cvp-next-episode hidden', ICONS.nextEpisode || '', '下一集', () => {
                    if (this.options.onNextEpisode) this.options.onNextEpisode();
                });
                const spacer = document.createElement('span');
                spacer.className = 'cvp-spacer';

                const volume = document.createElement('span');
                volume.className = 'cvp-volume';
                const volumeBtn = makeButton('cvp-volume-btn', ICONS.volume || '', '音量设置', () => this.openPopover('volume', volumeBtn));
                volume.appendChild(volumeBtn);

                const speedBtn = makeButton('cvp-speed', `${ICONS.speed || ''}<span class="cvp-label">1x</span>`, '播放速度', () => this.openPopover('speed', speedBtn));
                const rotateBtn = makeButton('cvp-rotate', `${ICONS.rotate || ''}<span class="cvp-rotate-label">0°</span>`, '旋转画面', () => this.rotate());

                const popover = document.createElement('div');
                popover.className = 'cvp-popover hidden';

                const volumePanel = document.createElement('div');
                volumePanel.className = 'cvp-popover-panel cvp-volume-panel hidden';
                const volumeTitle = document.createElement('div');
                volumeTitle.className = 'cvp-popover-title';
                volumeTitle.textContent = '音量';
                const muteBtn = document.createElement('button');
                muteBtn.type = 'button';
                muteBtn.className = 'cvp-popover-mute';
                muteBtn.title = '静音/取消静音';
                muteBtn.innerHTML = ICONS.volume || '';
                muteBtn.onclick = () => this.toggleMute();
                const volumeRange = document.createElement('input');
                volumeRange.type = 'range';
                volumeRange.min = '0';
                volumeRange.max = '100';
                volumeRange.value = '100';
                volumeRange.className = 'cvp-range cvp-popover-range';
                volumeRange.title = '音量';
                const volumeValue = document.createElement('div');
                volumeValue.className = 'cvp-volume-value';
                volumeValue.textContent = '100%';
                volumePanel.appendChild(volumeTitle);
                volumePanel.appendChild(muteBtn);
                volumePanel.appendChild(volumeRange);
                volumePanel.appendChild(volumeValue);

                const speedPanel = document.createElement('div');
                speedPanel.className = 'cvp-popover-panel cvp-speed-panel hidden';
                const speedTitle = document.createElement('div');
                speedTitle.className = 'cvp-popover-title';
                speedTitle.textContent = '播放速度';
                speedPanel.appendChild(speedTitle);
                const speedOptions = this.speeds.map((speed, index) => {
                    const option = document.createElement('button');
                    option.type = 'button';
                    option.className = `cvp-speed-option${index === this.speedIndex ? ' active' : ''}`;
                    option.innerHTML = `<span>${speed}x</span><span class="cvp-speed-check">${index === this.speedIndex ? '✓' : ''}</span>`;
                    option.onclick = () => this.setSpeed(speed);
                    speedPanel.appendChild(option);
                    return option;
                });
                popover.appendChild(volumePanel);
                popover.appendChild(speedPanel);

                row.appendChild(playBtn);
                row.appendChild(prevEpisodeBtn);
                row.appendChild(nextEpisodeBtn);
                row.appendChild(spacer);
                row.appendChild(volume);
                row.appendChild(speedBtn);
                row.appendChild(rotateBtn);
                if (this.options.screenshot !== false) {
                    row.appendChild(makeButton('cvp-screenshot', ICONS.camera || '', '截图', () => this.screenshot()));
                }
                row.appendChild(makeButton('cvp-pip', ICONS.pip || '', '画中画', () => this.togglePip()));
                row.appendChild(makeButton('cvp-fullscreen', ICONS.fullscreen || '', '全屏', () => this.toggleFullscreen()));

                controls.appendChild(progressWrap);
                controls.appendChild(row);
                root.appendChild(stage);
                root.appendChild(centerPlay);
                root.appendChild(loading);
                root.appendChild(notice);
                root.appendChild(controls);
                root.appendChild(contextMenu);
                root.appendChild(popover);
                root.appendChild(hoverPreview);
                this.container.innerHTML = '';
                this.container.appendChild(root);

                this.root = root;
                this.stage = stage;
                this.bgCanvas = bgCanvas;
                this.bgCtx = bgCanvas.getContext('2d');
                this.bgFrame = 0;
                this.bgLastDraw = 0;
                this.bgRunning = false;
                this.video = video;
                this.centerPlay = centerPlay;
                this.loading = loading;
                this.noticeEl = notice;
                this.contextMenu = contextMenu;
                this.range = range;
                this.currentTimeEl = currentTime;
                this.durationTimeEl = durationTime;
                this.playBtn = playBtn;
                this.prevEpisodeBtn = prevEpisodeBtn;
                this.nextEpisodeBtn = nextEpisodeBtn;
                this.volumeRange = volumeRange;
                this.volumeValue = volumeValue;
                this.volumeMuteBtn = muteBtn;
                this.volumeBtn = volumeBtn;
                this.speedBtn = speedBtn;
                this.speedOptions = speedOptions;
                this.rotateBtn = rotateBtn;
                this.popover = popover;
                this.volumePanel = volumePanel;
                this.speedPanel = speedPanel;
                this.popoverType = null;
                this.popoverAnchor = null;
                this.hoverPreview = hoverPreview;
                this.hoverImg = hoverImg;
                this.hoverTime = hoverTime;
                this.resizeBackgroundCanvas();
            }

            resizeBackgroundCanvas() {
                if (!this.bgCanvas || !this.stage) return;
                const width = Math.max(1, Math.floor(this.stage.clientWidth / 2));
                const height = Math.max(1, Math.floor(this.stage.clientHeight / 2));
                if (this.bgCanvas.width !== width || this.bgCanvas.height !== height) {
                    this.bgCanvas.width = width;
                    this.bgCanvas.height = height;
                }
            }

            drawBackground() {
                const canvas = this.bgCanvas;
                const ctx = this.bgCtx;
                const video = this.video;
                if (!canvas || !ctx || !video || !canvas.width || !canvas.height) return;
                if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
                try {
                    const canvasRatio = canvas.width / canvas.height;
                    const videoRatio = video.videoWidth / video.videoHeight;
                    let sx = 0;
                    let sy = 0;
                    let sw = video.videoWidth;
                    let sh = video.videoHeight;
                    if (videoRatio > canvasRatio) {
                        sw = video.videoHeight * canvasRatio;
                        sx = (video.videoWidth - sw) / 2;
                    } else {
                        sh = video.videoWidth / canvasRatio;
                        sy = (video.videoHeight - sh) / 2;
                    }
                    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                } catch (err) {
                    // 跨域视频可能无法绘制，忽略即可
                }
            }

            startBackground() {
                if (this.bgRunning || !this.bgCtx || this.destroyed) return;
                this.bgRunning = true;
                const loop = (now) => {
                    if (!this.bgRunning || this.destroyed) return;
                    if (now - this.bgLastDraw > 60) {
                        this.bgLastDraw = now;
                        this.drawBackground();
                    }
                    this.bgFrame = requestAnimationFrame(loop);
                };
                this.bgFrame = requestAnimationFrame(loop);
            }

            stopBackground() {
                this.bgRunning = false;
                if (this.bgFrame) cancelAnimationFrame(this.bgFrame);
                this.bgFrame = 0;
            }

            openPopover(type, anchor) {
                if (this.popoverType === type && !this.popover.classList.contains('hidden')) {
                    this.closePopover();
                    return;
                }
                this.popoverType = type;
                this.popoverAnchor = anchor;
                this.popover.classList.toggle('cvp-popover-volume', type === 'volume');
                this.popover.classList.toggle('cvp-popover-speed', type === 'speed');
                this.volumePanel.classList.toggle('hidden', type !== 'volume');
                this.speedPanel.classList.toggle('hidden', type !== 'speed');
                this.popover.classList.remove('hidden');
                const rootRect = this.root.getBoundingClientRect();
                const anchorRect = anchor.getBoundingClientRect();
                const width = this.popover.offsetWidth || 148;
                const center = anchorRect.left - rootRect.left + anchorRect.width / 2;
                const left = Math.max(8, Math.min(center - width / 2, rootRect.width - width - 8));
                const bottom = Math.max(8, rootRect.bottom - anchorRect.top + 10);
                this.popover.style.left = `${left}px`;
                this.popover.style.bottom = `${bottom}px`;
            }

            closePopover() {
                if (!this.popover) return;
                this.popover.classList.add('hidden');
                this.volumePanel.classList.add('hidden');
                this.speedPanel.classList.add('hidden');
                this.popoverType = null;
                this.popoverAnchor = null;
            }

            setSpeed(speed) {
                const index = this.speeds.indexOf(speed);
                if (index >= 0) this.speedIndex = index;
                this.video.playbackRate = speed;
                this.speedBtn.innerHTML = `${ICONS.speed || ''}<span class="cvp-label">${speed}x</span>`;
                this.speedOptions.forEach((option, i) => {
                    option.classList.toggle('active', i === this.speedIndex);
                    const check = option.querySelector('.cvp-speed-check');
                    if (check) check.textContent = i === this.speedIndex ? '✓' : '';
                });
                this.closePopover();
                this.notice(`播放速度 ${speed}x`);
            }

            bindEvents() {
                const v = this.video;
                this.stage.addEventListener('click', (e) => {
                    if (e.target === this.video || e.target === this.stage) this.togglePlay();
                });
                v.addEventListener('loadedmetadata', () => {
                    this.loading.classList.add('hidden');
                    const ratio = v.videoWidth / v.videoHeight;
                    this.videoIsPortrait = Number.isFinite(ratio) && ratio < 0.85;
                    this.applyRotation();
                    this.resizeBackgroundCanvas();
                    this.drawBackground();
                    this.cacheFrame();
                    this.updateProgress();
                    this.emit('loadedmetadata');
                });
                v.addEventListener('timeupdate', () => {
                    this.updateProgress();
                    this.cacheFrame();
                    this.emit('timeupdate');
                });
                v.addEventListener('progress', () => this.updateBuffered());
                v.addEventListener('play', () => {
                    this.centerPlay.classList.add('hidden');
                    this.playBtn.innerHTML = ICONS.pause || '';
                    this.startBackground();
                    this.drawBackground();
                    this.emit('play');
                });
                v.addEventListener('pause', () => {
                    this.centerPlay.classList.remove('hidden');
                    this.playBtn.innerHTML = ICONS.play || '';
                    this.stopBackground();
                    this.emit('pause');
                });
                v.addEventListener('ended', () => {
                    this.centerPlay.classList.remove('hidden');
                    this.playBtn.innerHTML = ICONS.play || '';
                    this.stopBackground();
                    this.emit('ended');
                });
                v.addEventListener('seeked', () => {
                    this.updateProgress();
                    this.emit('seeked');
                });
                v.addEventListener('volumechange', () => this.updateVolumeIcon());
                v.addEventListener('error', (e) => {
                    this.loading.classList.add('hidden');
                    this.emit('error', e);
                });

                this.range.addEventListener('input', () => {
                    const duration = v.duration || 0;
                    if (!duration) return;
                    const target = (Number(this.range.value) / 1000) * duration;
                    this.root.style.setProperty('--cvp-played', `${(target / duration) * 100}%`);
                    v.currentTime = target;
                });
                this.range.addEventListener('mousemove', (e) => {
                    const duration = v.duration || 0;
                    if (!duration) return;
                    const rect = this.range.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    this.showHoverPreview(e.clientX, ratio * duration);
                });
                this.range.addEventListener('mouseleave', () => this.hideHoverPreview());
                this.volumeRange.addEventListener('input', () => {
                    v.volume = Math.min(1, Math.max(0, Number(this.volumeRange.value) / 100));
                    v.muted = v.volume === 0;
                    this.volumeValue.textContent = `${this.volumeRange.value}%`;
                    this.root.style.setProperty('--cvp-volume', `${this.volumeRange.value}%`);
                });

                this.root.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.showContextMenu(e.clientX, e.clientY);
                });
                this._onDocClick = (e) => {
                    if (!this.contextMenu.contains(e.target)) this.contextMenu.classList.add('hidden');
                    if (e.target instanceof Element && e.target.closest('.cvp-popover, .cvp-volume-btn, .cvp-speed')) return;
                    this.closePopover();
                };
                document.addEventListener('click', this._onDocClick);
                this._onKeydown = (e) => this.handleKeydown(e);
                document.addEventListener('keydown', this._onKeydown);
                this._onResize = () => {
                    this.applyRotation();
                    this.resizeBackgroundCanvas();
                    this.drawBackground();
                };
                window.addEventListener('resize', this._onResize);
                document.addEventListener('fullscreenchange', this._onResize);
                document.addEventListener('webkitfullscreenchange', this._onResize);
            }

            on(event, callback) {
                if (typeof callback !== 'function') return this;
                if (!this.listeners[event]) this.listeners[event] = [];
                this.listeners[event].push(callback);
                return this;
            }

            emit(event, data) {
                const callbacks = this.listeners[event] || [];
                callbacks.forEach((cb) => {
                    try { cb(data); } catch (err) { console.error('播放器事件处理失败:', err); }
                });
            }

            setSource(videoInfo = {}) {
                const url = videoInfo.url || '';
                this.currentUrl = url;
                this.video.url = url;
                if (this.hls) { this.hls.destroy(); this.hls = null; }
                this.video.pause();
                this.video.removeAttribute('src');
                this.video.poster = videoInfo.pic || '';
                this.video.playbackRate = this.speeds[this.speedIndex];
                this.speedBtn.innerHTML = `${ICONS.speed || ''}<span class="cvp-label">${this.speeds[this.speedIndex]}x</span>`;
                this.range.value = '0';
                this.root.style.setProperty('--cvp-played', '0%');
                this.root.style.setProperty('--cvp-buffered', '0%');
                this.currentTimeEl.textContent = '00:00';
                this.durationTimeEl.textContent = '00:00';
                this.closePopover();
                this.hideHoverPreview();
                this.frameCache = [];
                this.lastCacheTime = -Infinity;
                if (this.previewHls) { this.previewHls.destroy(); this.previewHls = null; }
                if (this.previewVideo) {
                    this.previewVideo.pause();
                    this.previewVideo.removeAttribute('src');
                    this.previewVideo.load();
                }
                if (this.bgCtx && this.bgCanvas) {
                    this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
                }
                this.noticeEl.classList.add('hidden');
                this.contextMenu.classList.add('hidden');
                this.loading.classList.remove('hidden');
                if (this.options.contextmenu && this.options.contextmenu.length) {
                    this.options.contextmenu[0].link = url;
                }
                if (window.Hls && Hls.isSupported() && /\.m3u8(?:[?#]|$)/i.test(url)) {
                    this.hls = new Hls({ enableWorker: true, capLevelToPlayerSize: true });
                    this.hls.on(Hls.Events.ERROR, (_, data) => {
                        if (data && data.fatal) this.emit('error', data.error || data);
                    });
                    this.hls.loadSource(url);
                    this.hls.attachMedia(this.video);
                } else if (url) {
                    this.video.src = url;
                    this.video.load();
                }
            }

            load() {
                this.setSource({ url: this.video.url || this.currentUrl, pic: this.video.poster });
            }

            switchVideo(videoInfo = {}) {
                const wasPlaying = !this.video.paused;
                this.setSource(videoInfo);
                if (wasPlaying || this.options.autoplay) this.play();
            }

            play() {
                const promise = this.video.play();
                if (promise && typeof promise.catch === 'function') {
                    promise.catch((err) => {
                        if (err && err.name !== 'AbortError') console.warn('视频播放被阻止:', err);
                    });
                }
            }

            pause() {
                this.video.pause();
            }

            seek(seconds) {
                if (!Number.isFinite(seconds)) return;
                const duration = this.video.duration || 0;
                const target = duration > 0 ? Math.min(seconds, duration) : Math.max(0, seconds);
                this.video.currentTime = Math.max(0, target);
            }

            skip(seconds) {
                if (!this.video.src && !this.currentUrl) return;
                this.seek((this.video.currentTime || 0) + seconds);
                this.notice(seconds > 0 ? `快进 ${seconds} 秒` : `后退 ${Math.abs(seconds)} 秒`);
            }

            setEpisodeNavigation(hasPrev, hasNext) {
                if (this.prevEpisodeBtn) {
                    this.prevEpisodeBtn.classList.toggle('hidden', !hasPrev);
                    this.prevEpisodeBtn.title = hasPrev ? '上一集' : '已经是第一集';
                }
                if (this.nextEpisodeBtn) {
                    this.nextEpisodeBtn.classList.toggle('hidden', !hasNext);
                    this.nextEpisodeBtn.title = hasNext ? '下一集' : '已经是最后一集';
                }
            }

            togglePlay() {
                if (this.video.paused) this.play();
                else this.pause();
            }

            toggleMute() {
                this.video.muted = !this.video.muted;
                this.notice(this.video.muted ? '已静音' : '已取消静音');
            }

            cycleSpeed() {
                this.setSpeed(this.speeds[(this.speedIndex + 1) % this.speeds.length]);
            }

            rotate() {
                this.rotationIndex = (this.rotationIndex + 1) % this.rotations.length;
                const angle = this.rotations[this.rotationIndex];
                this.applyRotation();
                this.notice(`画面已旋转 ${angle}°`);
            }

            applyRotation() {
                if (!this.stage || !this.video) return;
                const angle = this.rotations[this.rotationIndex];
                const label = this.rotateBtn && this.rotateBtn.querySelector('.cvp-rotate-label');
                if (label) label.textContent = `${angle}°`;
                if (angle === 90 || angle === 270) {
                    const w = this.stage.clientWidth;
                    const h = this.stage.clientHeight;
                    if (w && h) {
                        this.video.style.maxWidth = 'none';
                        this.video.style.maxHeight = 'none';
                        this.video.style.width = `${h}px`;
                        this.video.style.height = `${w}px`;
                    }
                } else if (this.videoIsPortrait) {
                    this.video.style.maxWidth = '100%';
                    this.video.style.maxHeight = '100%';
                    this.video.style.width = 'auto';
                    this.video.style.height = '100%';
                } else {
                    this.video.style.maxWidth = '';
                    this.video.style.maxHeight = '';
                    this.video.style.width = '';
                    this.video.style.height = '';
                }
                this.video.style.transform = `rotate(${angle}deg)`;
                if (this.bgCanvas) {
                    this.bgCanvas.style.opacity = angle === 90 || angle === 270 ? '0' : '.92';
                }
            }

            screenshot() {
                if (!this.video.videoWidth || !this.video.videoHeight) {
                    this.notice('视频尚未加载完成');
                    return;
                }
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = this.video.videoWidth;
                    canvas.height = this.video.videoHeight;
                    canvas.getContext('2d').drawImage(this.video, 0, 0);
                    const link = document.createElement('a');
                    link.download = `screenshot-${Date.now()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    this.notice('截图已保存');
                } catch (err) {
                    this.notice('截图失败，视频源可能不允许跨域截图');
                }
            }

            togglePip() {
                if (document.pictureInPictureElement === this.video) {
                    document.exitPictureInPicture().catch(() => this.notice('退出画中画失败'));
                } else if (document.pictureInPictureEnabled && this.video.requestPictureInPicture) {
                    this.video.requestPictureInPicture().catch(() => this.notice('进入画中画失败'));
                } else {
                    this.notice('浏览器不支持画中画');
                }
            }

            toggleFullscreen() {
                const isFull = document.fullscreenElement === this.root || document.webkitFullscreenElement === this.root;
                if (isFull) {
                    const exit = document.exitFullscreen || document.webkitExitFullscreen;
                    if (exit) exit.call(document);
                } else {
                    const request = this.root.requestFullscreen || this.root.webkitRequestFullscreen;
                    if (request) request.call(this.root);
                    else this.notice('浏览器不支持全屏');
                }
            }

            showContextMenu(clientX, clientY) {
                this.contextMenu.innerHTML = '';
                const items = (this.options.contextmenu && this.options.contextmenu.length)
                    ? this.options.contextmenu
                    : [{ text: '在新窗口打开', link: this.currentUrl }];
                items.forEach((item) => {
                    const link = document.createElement('a');
                    link.href = item.link && item.link !== '#' ? item.link : this.currentUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = item.text || '在新窗口打开';
                    this.contextMenu.appendChild(link);
                });
                const rect = this.root.getBoundingClientRect();
                const left = Math.max(4, Math.min(clientX - rect.left, rect.width - 140));
                const top = Math.max(4, Math.min(clientY - rect.top, rect.height - (items.length * 30 + 12)));
                this.contextMenu.style.left = `${left}px`;
                this.contextMenu.style.top = `${top}px`;
                this.contextMenu.classList.remove('hidden');
            }

            handleKeydown(e) {
                if (this.destroyed || !this.root.isConnected) return;
                const inFullscreen = document.fullscreenElement === this.root || document.webkitFullscreenElement === this.root;
                if (!inFullscreen && !this.root.offsetParent) return;
                const tag = String(e.target && e.target.tagName || '').toLowerCase();
                if (['input', 'textarea', 'select'].includes(tag) || (e.target && e.target.isContentEditable)) return;
                let handled = true;
                switch (e.key) {
                    case ' ':
                    case 'k':
                        this.togglePlay();
                        break;
                    case 'ArrowLeft':
                    case 'j':
                        this.skip(-5);
                        break;
                    case 'ArrowRight':
                    case 'l':
                        this.skip(5);
                        break;
                    case 'ArrowUp':
                        this.video.volume = Math.min(1, (this.video.volume || 0) + 0.1);
                        this.video.muted = false;
                        this.notice(`音量 ${Math.round(this.video.volume * 100)}%`);
                        break;
                    case 'ArrowDown':
                        this.video.volume = Math.max(0, (this.video.volume || 0) - 0.1);
                        this.video.muted = this.video.volume === 0;
                        this.notice(`音量 ${Math.round(this.video.volume * 100)}%`);
                        break;
                    case 'm':
                        this.toggleMute();
                        break;
                    case 'f':
                        this.toggleFullscreen();
                        break;
                    case 's':
                        if (this.options.screenshot !== false) this.screenshot();
                        break;
                    case 'r':
                        this.rotate();
                        break;
                    default:
                        if (/^[0-9]$/.test(e.key)) {
                            this.seek((Number(e.key) / 10) * (this.video.duration || 0));
                        } else {
                            handled = false;
                        }
                }
                if (handled) e.preventDefault();
            }

            formatTime(seconds) {
                if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = Math.floor(seconds % 60);
                const pad = (n) => String(n).padStart(2, '0');
                return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
            }

            cacheFrame() {
                const v = this.video;
                if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight) return;
                const time = v.currentTime || 0;
                if (time - this.lastCacheTime < 2) return;
                this.lastCacheTime = time;
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 320;
                    canvas.height = 180;
                    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
                    this.frameCache.push({ time, src: canvas.toDataURL('image/jpeg', 0.85) });
                    if (this.frameCache.length > 300) {
                        this.frameCache.splice(0, this.frameCache.length - 300);
                    }
                } catch (err) {
                    // 跨域视频无法缓存帧，忽略即可
                }
            }

            ensurePreviewVideo() {
                if (this.previewVideo) return this.previewVideo;
                const video = document.createElement('video');
                video.muted = true;
                video.playsInline = true;
                video.preload = 'auto';
                video.className = 'cvp-preview-video';
                video.addEventListener('seeked', () => {
                    if (!this.hoverImg) return;
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 320;
                        canvas.height = 180;
                        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                        this.hoverImg.src = canvas.toDataURL('image/jpeg', 0.9);
                        this.hoverImg.style.visibility = 'visible';
                    } catch (err) {
                        // 忽略跨域或解码失败
                    }
                });
                this.root.appendChild(video);
                this.previewVideo = video;
                const url = this.currentUrl;
                if (window.Hls && Hls.isSupported() && /\.m3u8(?:[?#]|$)/i.test(url)) {
                    this.previewHls = new Hls({ enableWorker: true, capLevelToPlayerSize: true });
                    this.previewHls.loadSource(url);
                    this.previewHls.attachMedia(video);
                } else if (url) {
                    video.src = url;
                    video.load();
                }
                return video;
            }

            requestPreviewFrame(time) {
                clearTimeout(this.previewTimer);
                this.previewTimer = setTimeout(() => {
                    if (this.destroyed || !this.hoverPreview || this.hoverPreview.classList.contains('hidden')) return;
                    const video = this.ensurePreviewVideo();
                    if (!video || !Number.isFinite(time)) return;
                    const duration = this.video.duration || 0;
                    this.previewTargetTime = duration > 0
                        ? Math.max(0, Math.min(time, duration - 0.1))
                        : Math.max(0, time);
                    const seek = () => {
                        try { video.currentTime = this.previewTargetTime; } catch (err) { /* 忽略无效时间 */ }
                    };
                    if (video.readyState === 0) video.addEventListener('loadedmetadata', seek, { once: true });
                    else seek();
                }, 120);
            }

            showHoverPreview(clientX, time) {
                if (!this.hoverPreview) return;
                const duration = this.video.duration || 0;
                if (!duration) return;
                const rootRect = this.root.getBoundingClientRect();
                const rangeRect = this.range.getBoundingClientRect();
                const left = Math.max(84, Math.min(clientX - rootRect.left, rootRect.width - 84));
                const bottom = Math.max(8, rootRect.bottom - rangeRect.top + 8);
                this.hoverPreview.style.left = `${left}px`;
                this.hoverPreview.style.bottom = `${bottom}px`;
                this.hoverTime.textContent = this.formatTime(time);
                this.hoverPreview.classList.remove('hidden');

                let nearest = null;
                let minDiff = Infinity;
                for (const frame of this.frameCache) {
                    const diff = Math.abs(frame.time - time);
                    if (diff < minDiff) { minDiff = diff; nearest = frame; }
                }
                if (nearest && minDiff <= 30 && nearest.src) {
                    clearTimeout(this.previewTimer);
                    this.hoverImg.src = nearest.src;
                    this.hoverImg.style.visibility = 'visible';
                } else {
                    this.hoverImg.removeAttribute('src');
                    this.hoverImg.style.visibility = 'hidden';
                    this.requestPreviewFrame(time);
                }
            }

            hideHoverPreview() {
                if (!this.hoverPreview) return;
                this.hoverPreview.classList.add('hidden');
                clearTimeout(this.previewTimer);
            }

            updateProgress() {
                const duration = this.video.duration || 0;
                const current = this.video.currentTime || 0;
                this.currentTimeEl.textContent = this.formatTime(current);
                this.durationTimeEl.textContent = this.formatTime(duration);
                if (duration > 0) {
                    const percent = (current / duration) * 100;
                    this.root.style.setProperty('--cvp-played', `${percent}%`);
                    this.range.value = String(Math.round((current / duration) * 1000));
                } else {
                    this.root.style.setProperty('--cvp-played', '0%');
                    this.range.value = '0';
                }
            }

            updateBuffered() {
                try {
                    const duration = this.video.duration || 0;
                    const buffered = this.video.buffered;
                    if (duration > 0 && buffered && buffered.length) {
                        const end = buffered.end(buffered.length - 1);
                        this.root.style.setProperty('--cvp-buffered', `${Math.min(100, (end / duration) * 100)}%`);
                    }
                } catch (err) {
                    // 某些视频源不暴露缓冲信息，忽略即可
                }
            }

            updateVolumeIcon() {
                const muted = this.video.muted || this.video.volume === 0;
                this.volumeBtn.innerHTML = (muted ? ICONS.volumeOff : ICONS.volume) || '';
                const volumePercent = Math.round((muted ? 0 : this.video.volume) * 100);
                this.volumeRange.value = String(volumePercent);
                this.volumeValue.textContent = `${volumePercent}%`;
                if (this.volumeMuteBtn) this.volumeMuteBtn.innerHTML = (muted ? ICONS.volumeOff : ICONS.volume) || '';
                this.root.style.setProperty('--cvp-volume', `${volumePercent}%`);
            }

            destroy() {
                if (this.destroyed) return;
                this.destroyed = true;
                this.stopBackground();
                this.hideHoverPreview();
                clearTimeout(this.previewTimer);
                if (this.previewHls) { this.previewHls.destroy(); this.previewHls = null; }
                if (this.previewVideo) {
                    this.previewVideo.pause();
                    this.previewVideo.removeAttribute('src');
                    this.previewVideo.load();
                }
                this.listeners = Object.create(null);
                document.removeEventListener('click', this._onDocClick);
                document.removeEventListener('keydown', this._onKeydown);
                window.removeEventListener('resize', this._onResize);
                document.removeEventListener('fullscreenchange', this._onResize);
                document.removeEventListener('webkitfullscreenchange', this._onResize);
                if (this.hls) { this.hls.destroy(); this.hls = null; }
                this.video.pause();
                this.video.removeAttribute('src');
                this.video.load();
                if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
            }
        }

        function toggleMoreMenu() {
            const menu = document.getElementById('moreMenu');
            if (!menu) return;
            menu.classList.toggle('hidden');
            if (!menu.classList.contains('hidden')) {
                menu.addEventListener('mouseleave', function handleMouseLeave() {
                    menu.classList.add('hidden');
                    menu.removeEventListener('mouseleave', handleMouseLeave);
                }, { once: true });
            }
        }

        function handleMoreAction(action) {
            toggleMoreMenu();
            if (action === 'favorite') {
                if (typeof toggleFavorites === 'function') toggleFavorites();
            } else if (action === 'share') {
                if (typeof toggleSharePanel === 'function') toggleSharePanel();
            } else if (action === 'history') {
                if (typeof toggleHistory === 'function') toggleHistory();
            } else if (action === 'user') {
                if (typeof toggleUserInfo === 'function') toggleUserInfo();
            } else if (action === 'setting') {
                if (typeof toggleHostModal === 'function') toggleHostModal();
            } else if (action === 'about') {
                if (typeof toggleAboutPanel === 'function') toggleAboutPanel();
            }
        }
