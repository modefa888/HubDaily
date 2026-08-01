// ==UserScript==
// @name         智能存档助手 - 油猴版
// @namespace    http://tampermonkey.net/
// @version      3.0.1
// @description  智能存档工具，支持m3u8检测、五星评分、上传存档
// @author       Tabbit
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      180.184.79.211
// @connect      127.0.0.1
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置
    const HOST = 'http://180.184.79.211:8888/api/smart_archive';
    const TOKEN = 'YOUR_BEARER_TOKEN_HERE'; // 请替换为您的实际token

    // 控制台美化输出模块
    const ConsoleLogger = {
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
        title: '#9C27B0',

        log(title, data, type = 'info') {
            const colors = {
                success: this.success,
                warning: this.warning,
                error: this.error,
                info: this.info
            };

            console.group('%c 📦 ' + title, 'color: ' + this.title + '; font-weight: bold; font-size: 14px;');
            if (typeof data === 'object' && data !== null) {
                for (const [key, value] of Object.entries(data)) {
                    if (value) {
                        console.log('%c ✓ ' + key + ':', 'color: ' + colors[type] + '; font-weight: 500;', value);
                    } else {
                        console.log('%c ✗ ' + key + ':', 'color: ' + this.error + '; font-weight: 500;', '未获取到');
                    }
                }
            } else {
                console.log('%c ' + data, 'color: ' + colors[type] + ';');
            }
            console.groupEnd();
        }
    };

    // API客户端 - 使用GM_xmlhttpRequest绕过Mixed Content限制
    const apiClient = {
        checkExists(pageHref) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: HOST + '/check_existence?pageHref=' + encodeURIComponent(pageHref),
                    headers: { 'Authorization': 'Bearer ' + TOKEN },
                    timeout: 10000,
                    onload: response => {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch {
                            reject(new Error('解析响应失败'));
                        }
                    },
                    onerror: () => reject(new Error('网络错误')),
                    ontimeout: () => reject(new Error('请求超时'))
                });
            });
        },

        saveData(data) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: HOST + '/save_data',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + TOKEN
                    },
                    timeout: 30000,
                    data: JSON.stringify(data),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                        } else {
                            reject(new Error('服务器错误: ' + response.status));
                        }
                    },
                    onerror: () => reject(new Error('网络错误')),
                    ontimeout: () => reject(new Error('请求超时'))
                });
            });
        },

        deleteData(pageHref) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: HOST + '/delete_by_href',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + TOKEN
                    },
                    timeout: 10000,
                    data: JSON.stringify({ pageHref: encodeURIComponent(pageHref) }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                        } else {
                            reject(new Error('服务器错误: ' + response.status));
                        }
                    },
                    onerror: () => reject(new Error('网络错误')),
                    ontimeout: () => reject(new Error('请求超时'))
                });
            });
        },

        updateRating(data) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: HOST + '/update_rating',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + TOKEN
                    },
                    timeout: 10000,
                    data: JSON.stringify(data),
                    onload: response => {
                        resolve(response.status >= 200 && response.status < 300);
                    },
                    onerror: () => reject(new Error('网络错误')),
                    ontimeout: () => reject(new Error('请求超时'))
                });
            });
        }
    };

    // m3u8检测引擎
    class M3U8Detector {
        constructor() {
            this.m3u8Urls = new Set();
            this.observer = null;
            this.isRunning = false;
        }

        start() {
            if (this.isRunning) return;
            this.isRunning = true;

            // 方法1: 网络请求拦截
            this._interceptNetwork();

            // 方法2: DOM扫描
            this._scanDOM();

            // 方法3: 播放器API钩子
            this._hookPlayerAPIs();

            // 方法4: Performance API监控
            this._monitorPerformance();

            // 方法5: MutationObserver监听DOM变化
            this._setupMutationObserver();

            // 方法6: 定时轮询
            this._startPolling();

            // 方法7: 属性扫描
            this._scanAttributes();

            // 方法8: 嵌入对象检测
            this._scanEmbedObjects();

            // 方法9: 脚本分析
            this._analyzeScripts();

            // 方法10: 错误捕获
            this._captureMediaErrors();

            ConsoleLogger.log('检测引擎', '10种检测方法已启动', 'success');
        }

        _isM3U8Url(url) {
            if (!url || typeof url !== 'string') return false;
            const cleanUrl = url.trim().toLowerCase();
            return cleanUrl.includes('.m3u8') && !cleanUrl.includes('.ts');
        }

        _interceptNetwork() {
            const originalXHR = window.XMLHttpRequest;
            const originalFetch = window.fetch;

            // 拦截XHR
            if (originalXHR) {
                const xhrOpen = originalXHR.prototype.open;
                originalXHR.prototype.open = function(method, url) {
                    if (this._isM3U8Url(url)) {
                        this.m3u8Urls.add(url);
                    }
                    return xhrOpen.apply(this, arguments);
                };
            }

            // 拦截Fetch
            if (originalFetch) {
                window.fetch = function(input, init) {
                    const request = new Request(input, init);
                    if (this._isM3U8Url(request.url)) {
                        this.m3u8Urls.add(request.url);
                    }
                    return originalFetch.apply(this, arguments);
                };
            }
        }

        _scanDOM() {
            const elements = document.querySelectorAll('video, audio, source, iframe');
            elements.forEach(el => {
                const url = el.src || el.getAttribute('data-src') || el.getAttribute('data-url');
                if (this._isM3U8Url(url)) {
                    this.m3u8Urls.add(url);
                }
            });
        }

        _hookPlayerAPIs() {
            const players = ['DPlayer', 'ArtPlayer', 'VideoJS', 'Plyr', 'Flowplayer', 'Clappr', 'MediaElement'];
            players.forEach(playerName => {
                if (window[playerName]) {
                    const original = window[playerName].prototype.load;
                    window[playerName].prototype.load = function(source) {
                        if (this._isM3U8Url(source)) {
                            this.m3u8Urls.add(source);
                        }
                        return original.call(this, source);
                    };
                }
            });
        }

        _monitorPerformance() {
            if (window.performance && performance.getEntriesByType) {
                const resources = performance.getEntriesByType('resource');
                resources.forEach(resource => {
                    if (this._isM3U8Url(resource.name)) {
                        this.m3u8Urls.add(resource.name);
                    }
                });

                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (this._isM3U8Url(entry.name)) {
                            this.m3u8Urls.add(entry.name);
                        }
                    });
                });
                observer.observe({ entryTypes: ['resource'] });
            }
        }

        _setupMutationObserver() {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) {
                                const elements = node.querySelectorAll?.('video, audio, source, iframe') || [];
                                elements.forEach(el => {
                                    const url = el.src || el.getAttribute('data-src') || el.getAttribute('data-url');
                                    if (this._isM3U8Url(url)) {
                                        this.m3u8Urls.add(url);
                                    }
                                });
                            }
                        });
                    }
                });
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        _startPolling() {
            setInterval(() => {
                this._scanDOM();
                this._scanAttributes();
            }, 3000);
        }

        _scanAttributes() {
            const attributes = ['src', 'data-src', 'data-url', 'data-hls', 'data-m3u8', 'poster', 'data-poster', 'href', 'data-href', 'url', 'data-stream', 'data-video', 'data-media'];
            const allElements = document.querySelectorAll('*');

            allElements.forEach(el => {
                attributes.forEach(attr => {
                    const value = el.getAttribute(attr);
                    if (this._isM3U8Url(value)) {
                        this.m3u8Urls.add(value);
                    }
                });

                // 检查style属性
                const style = el.getAttribute('style');
                if (style && style.includes('url(')) {
                    const matches = style.match(/url\(['"]?([^'"()]+)['"]?\)/g);
                    if (matches) {
                        matches.forEach(match => {
                            const url = match.replace(/url\(['"]?|['"]?\)/g, '');
                            if (this._isM3U8Url(url)) {
                                this.m3u8Urls.add(url);
                            }
                        });
                    }
                }
            });
        }

        _scanEmbedObjects() {
            const embeds = document.querySelectorAll('embed, object');
            embeds.forEach(embed => {
                const src = embed.src || embed.getAttribute('data');
                if (this._isM3U8Url(src)) {
                    this.m3u8Urls.add(src);
                }

                // 检查flashvars
                const flashvars = embed.getAttribute('flashvars');
                if (flashvars) {
                    const params = flashvars.split('&');
                    params.forEach(param => {
                        const [key, value] = param.split('=');
                        if (key && value && this._isM3U8Url(decodeURIComponent(value))) {
                            this.m3u8Urls.add(decodeURIComponent(value));
                        }
                    });
                }
            });
        }

        _analyzeScripts() {
            const scripts = document.querySelectorAll('script');
            scripts.forEach(script => {
                const content = script.textContent || script.innerHTML;
                if (content) {
                    const m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/gi;
                    const matches = content.match(m3u8Regex);
                    if (matches) {
                        matches.forEach(url => {
                            if (this._isM3U8Url(url)) {
                                this.m3u8Urls.add(url);
                            }
                        });
                    }
                }
            });
        }

        _captureMediaErrors() {
            const mediaElements = document.querySelectorAll('video, audio');
            mediaElements.forEach(media => {
                media.addEventListener('error', (e) => {
                    const src = media.src || media.currentSrc;
                    if (src && this._isM3U8Url(src)) {
                        this.m3u8Urls.add(src);
                    }
                });
            });
        }

        getUrls() {
            return Array.from(this.m3u8Urls);
        }

        clear() {
            this.m3u8Urls.clear();
        }

        stop() {
            if (this.observer) {
                this.observer.disconnect();
            }
            this.isRunning = false;
        }
    }

    // 侧边栏UI
    class SidebarUI {
        constructor() {
            this.sidebar = null;
            this.toggleBtn = null;
            this.isOpen = false;
            this.detector = new M3U8Detector();
            this.init();
        }

        init() {
            this.injectStyles();
            this.createToggleButton();
            this.createSidebar();
            this.detector.start();
            this.checkArchiveStatus();
            this.updateDisplay();
            setInterval(() => this.updateDisplay(), 2000);
        }

        injectStyles() {
            const style = `
                #smart-archive-sidebar {
                    position: fixed;
                    top: 0;
                    left: -320px;
                    width: 300px;
                    height: 100vh;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: white;
                    z-index: 999999;
                    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.5);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                #smart-archive-sidebar.open {
                    left: 0;
                }

                #smart-archive-toggle {
                    position: fixed;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 30px;
                    height: 60px;
                    background: linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%);
                    color: white;
                    border: none;
                    border-radius: 0 8px 8px 0;
                    cursor: pointer;
                    z-index: 999998;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
                }

                #smart-archive-toggle:hover {
                    width: 35px;
                    background: linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%);
                }

                .sa-header {
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.3);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    position: relative;
                }

                .sa-close {
                    position: absolute;
                    right: 15px;
                    top: 15px;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .sa-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }

                .sa-section {
                    padding: 15px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .sa-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #8e2de2;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .sa-content {
                    font-size: 13px;
                    color: #e0e0e0;
                    line-height: 1.5;
                }

                .sa-btn {
                    background: linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%);
                    border: none;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.3s;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin: 3px;
                }

                .sa-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(142, 45, 226, 0.4);
                }

                .sa-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                }

                .sa-btn.secondary {
                    background: rgba(255, 255, 255, 0.1);
                }

                .sa-btn.secondary:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .sa-btn.danger {
                    background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
                }

                .sa-btn.danger:hover {
                    box-shadow: 0 4px 12px rgba(255, 65, 108, 0.4);
                }

                .sa-input {
                    width: 100%;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: white;
                    font-size: 13px;
                    margin-bottom: 10px;
                }

                .sa-input:focus {
                    outline: none;
                    border-color: #8e2de2;
                    background: rgba(255, 255, 255, 0.15);
                }

                .sa-status {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 500;
                }

                .sa-status.success {
                    background: rgba(76, 175, 80, 0.2);
                    color: #4caf50;
                }

                .sa-status.warning {
                    background: rgba(255, 152, 0, 0.2);
                    color: #ff9800;
                }

                .sa-status.error {
                    background: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                }

                .sa-cover-img {
                    max-width: 100%;
                    max-height: 140px;
                    border-radius: 6px;
                    margin-top: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .sa-rating {
                    display: flex;
                    gap: 4px;
                    margin: 8px 0;
                }

                .sa-star {
                    font-size: 18px;
                    color: #666;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .sa-star.active {
                    color: #ffd700;
                }

                .sa-star:hover {
                    transform: scale(1.2);
                }

                .sa-url-item {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 8px;
                    border-radius: 4px;
                    margin: 4px 0;
                    font-size: 11px;
                    word-break: break-all;
                    border-left: 3px solid #8e2de2;
                }

                .sa-btn-group {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-top: 10px;
                }

                .sa-spinner {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: sa-spin 0.6s linear infinite;
                }

                @keyframes sa-spin {
                    to { transform: rotate(360deg); }
                }
            `;

            GM_addStyle(style);
        }

        createToggleButton() {
            this.toggleBtn = document.createElement('button');
            this.toggleBtn.id = 'smart-archive-toggle';
            this.toggleBtn.innerHTML = '▶';
            this.toggleBtn.title = '打开智能存档助手';
            this.toggleBtn.onclick = () => this.toggleSidebar();
            document.body.appendChild(this.toggleBtn);
        }

        createSidebar() {
            this.sidebar = document.createElement('div');
            this.sidebar.id = 'smart-archive-sidebar';

            this.sidebar.innerHTML = `
                <div class="sa-header">
                    <h3 style="margin: 0; font-size: 16px; color: #8e2de2;">🎯 智能存档助手</h3>
                    <div style="font-size: 12px; color: #aaa; margin-top: 4px;">v3.0 增强 - 油猴版</div>
                    <button class="sa-close" title="收起侧边栏">✕</button>
                </div>

                <div class="sa-section">
                    <div class="sa-title">📄 页面信息</div>
                    <div class="sa-content">
                        <div><strong>标题:</strong> <span id="sa-page-title">-</span></div>
                        <div><strong>封面:</strong> <span id="sa-page-cover">❌ 未获取</span></div>
                        <div id="sa-cover-preview" style="display: none;">
                            <img class="sa-cover-img" id="sa-cover-image" src="" alt="封面">
                        </div>
                        <div><strong>状态:</strong> <span id="sa-archive-status" class="sa-status warning">⚠️ 检查中</span></div>
                    </div>
                </div>

                <div class="sa-section">
                    <div class="sa-title">🎬 m3u8 地址</div>
                    <div class="sa-content">
                        <div id="sa-m3u8-count">0</div>
                        <div id="sa-m3u8-list" style="max-height: 100px; overflow-y: auto; margin-top: 8px;"></div>
                        <div id="sa-m3u8-hint" style="font-size: 11px; color: #aaa; margin-top: 4px;">
                            ⏳ 等待检测 m3u8 地址...<br>请播放视频或等待页面加载
                        </div>
                    </div>
                </div>

                <div class="sa-section">
                    <div class="sa-title">⭐ 评分</div>
                    <div class="sa-content">
                        <div class="sa-rating" id="sa-rating-stars">
                            <span class="sa-star" data-value="1">★</span>
                            <span class="sa-star" data-value="2">★</span>
                            <span class="sa-star" data-value="3">★</span>
                            <span class="sa-star" data-value="4">★</span>
                            <span class="sa-star" data-value="5">★</span>
                        </div>
                        <div id="sa-rating-text" style="font-size: 12px; color: #aaa;">未评分</div>
                    </div>
                </div>

                <div class="sa-section">
                    <div class="sa-title">📤 上传存档</div>
                    <div class="sa-content">
                        <input type="text" class="sa-input" id="sa-remark" placeholder="请输入备注...">
                        <div class="sa-btn-group">
                            <button class="sa-btn" id="sa-upload-btn">
                                <span>📤 上传到服务器</span>
                            </button>
                            <button class="sa-btn danger" id="sa-delete-btn">
                                <span>🗑️ 删除存档</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="sa-section">
                    <div class="sa-title">💾 存档预览</div>
                    <div class="sa-content">
                        <div id="sa-preview-content" style="font-size: 12px; color: #aaa; min-height: 40px;">
                            点击下方按钮生成...
                        </div>
                        <div class="sa-btn-group">
                            <button class="sa-btn" id="sa-save-btn">
                                <span>💾 保存数据</span>
                            </button>
                            <button class="sa-btn secondary" id="sa-copy-btn">
                                <span>📋 复制全部</span>
                            </button>
                            <button class="sa-btn secondary" id="sa-rescan-btn">
                                <span>🔍 重新扫描</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(this.sidebar);

            // 绑定事件
            this.sidebar.querySelector('.sa-close').onclick = () => this.toggleSidebar();
            document.getElementById('sa-upload-btn').onclick = () => this.uploadData();
            document.getElementById('sa-delete-btn').onclick = () => this.deleteArchive();
            document.getElementById('sa-save-btn').onclick = () => this.saveLocal();
            document.getElementById('sa-copy-btn').onclick = () => this.copyAll();
            document.getElementById('sa-rescan-btn').onclick = () => this.rescan();

            // 绑定评分事件
            const stars = document.querySelectorAll('.sa-star');
            stars.forEach(star => {
                star.onclick = (e) => this.setRating(parseInt(e.target.dataset.value));
            });
        }

        toggleSidebar() {
            this.isOpen = !this.isOpen;
            this.sidebar.classList.toggle('open', this.isOpen);
            this.toggleBtn.innerHTML = this.isOpen ? '◀' : '▶';
            this.toggleBtn.title = this.isOpen ? '收起侧边栏' : '打开智能存档助手';

            if (this.isOpen) {
                this.updateDisplay();
            }
        }

        async checkArchiveStatus() {
            try {
                const result = await apiClient.checkExists(window.location.href);
                const statusEl = document.getElementById('sa-archive-status');

                if (result.exists) {
                    statusEl.textContent = '✅ 已存档';
                    statusEl.className = 'sa-status success';

                    // 显示评分
                    if (result.rating) {
                        this.setRating(result.rating, false);
                    }
                } else {
                    statusEl.textContent = '❌ 未存档';
                    statusEl.className = 'sa-status error';
                }
            } catch (error) {
                ConsoleLogger.log('状态检查', { error: error.message }, 'error');
                document.getElementById('sa-archive-status').textContent = '⚠️ 检查失败';
                document.getElementById('sa-archive-status').className = 'sa-status warning';
            }
        }

        updateDisplay() {
            // 更新页面标题
            const title = document.title || window.location.hostname;
            document.getElementById('sa-page-title').textContent = title;

            // 更新封面
            const cover = this.getCoverImage();
            const coverEl = document.getElementById('sa-page-cover');
            const previewEl = document.getElementById('sa-cover-preview');
            const imgEl = document.getElementById('sa-cover-image');

            if (cover) {
                coverEl.textContent = '✅ 已获取';
                previewEl.style.display = 'block';
                imgEl.src = cover;
                imgEl.onerror = () => {
                    previewEl.style.display = 'none';
                    coverEl.textContent = '❌ 图片加载失败';
                };
            } else {
                coverEl.textContent = '❌ 未获取';
                previewEl.style.display = 'none';
            }

            // 更新m3u8列表
            const m3u8Urls = this.detector.getUrls();
            document.getElementById('sa-m3u8-count').textContent = m3u8Urls.length;

            const listEl = document.getElementById('sa-m3u8-list');
            const hintEl = document.getElementById('sa-m3u8-hint');

            if (m3u8Urls.length > 0) {
                hintEl.style.display = 'none';
                listEl.innerHTML = '';
                m3u8Urls.forEach((url, index) => {
                    const div = document.createElement('div');
                    div.className = 'sa-url-item';
                    div.textContent = `${index + 1}. ${url}`;
                    listEl.appendChild(div);
                });
            } else {
                hintEl.style.display = 'block';
                listEl.innerHTML = '';
            }
        }

        getCoverImage() {
            // 尝试多种方式获取封面
            const selectors = [
                'meta[property="og:image"]',
                'meta[name="twitter:image"]',
                'video[poster]',
                'img[class*="cover"]',
                'img[class*="poster"]',
                'div[class*="cover"]',
                'div[class*="poster"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const src = element.getAttribute('content') ||
                               element.getAttribute('src') ||
                               element.getAttribute('poster') ||
                               element.getAttribute('data-src');
                    if (src && src.startsWith('http')) {
                        return src;
                    }

                    // 检查style背景图
                    const style = element.getAttribute('style');
                    if (style && style.includes('url(')) {
                        const match = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
                        if (match && match[1]) {
                            const url = match[1];
                            if (url.startsWith('http')) return url;
                            if (url.startsWith('//')) return window.location.protocol + url;
                            if (url.startsWith('/')) return window.location.origin + url;
                        }
                    }
                }
            }

            return null;
        }

        async uploadData() {
            const uploadBtn = document.getElementById('sa-upload-btn');
            const originalText = uploadBtn.innerHTML;

            try {
                uploadBtn.innerHTML = '<span class="sa-spinner"></span> 上传中...';
                uploadBtn.disabled = true;

                const m3u8Urls = this.detector.getUrls();
                const cover = this.getCoverImage();
                const remark = document.getElementById('sa-remark').value.trim();

                const data = {
                    pageHref: window.location.href,
                    pageTitle: document.title,
                    coverImage: cover || '',
                    m3u8Urls: m3u8Urls,
                    remark: remark || '无备注',
                    timestamp: new Date().toISOString()
                };

                await apiClient.saveData(data);

                ConsoleLogger.log('上传成功', '数据已保存到服务器', 'success');
                alert('✅ 存档上传成功！');

                // 更新状态
                this.checkArchiveStatus();

            } catch (error) {
                ConsoleLogger.log('上传失败', { error: error.message }, 'error');
                alert('❌ 上传失败: ' + error.message);
            } finally {
                uploadBtn.innerHTML = originalText;
                uploadBtn.disabled = false;
            }
        }

        async deleteArchive() {
            if (!confirm('确定要删除此页面的存档吗？此操作不可撤销。')) {
                return;
            }

            const deleteBtn = document.getElementById('sa-delete-btn');
            const originalText = deleteBtn.innerHTML;

            try {
                deleteBtn.innerHTML = '<span class="sa-spinner"></span> 删除中...';
                deleteBtn.disabled = true;

                await apiClient.deleteData(window.location.href);

                ConsoleLogger.log('删除成功', '存档已从服务器删除', 'success');
                alert('✅ 存档删除成功！');

                // 更新状态
                this.checkArchiveStatus();

            } catch (error) {
                ConsoleLogger.log('删除失败', { error: error.message }, 'error');
                alert('❌ 删除失败: ' + error.message);
            } finally {
                deleteBtn.innerHTML = originalText;
                deleteBtn.disabled = false;
            }
        }

        async setRating(rating, updateServer = true) {
            // 更新UI
            const stars = document.querySelectorAll('.sa-star');
            const ratingText = document.getElementById('sa-rating-text');

            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });

            const texts = ['未评分', '1 星 - 很差', '2 星 - 较差', '3 星 - 一般', '4 星 - 较好', '5 星 - 优秀'];
            ratingText.textContent = texts[rating] || '未评分';

            // 更新服务器
            if (updateServer) {
                try {
                    await apiClient.updateRating({
                        pageHref: window.location.href,
                        rating: rating
                    });
                    ConsoleLogger.log('评分更新', { rating: rating }, 'success');
                } catch (error) {
                    ConsoleLogger.log('评分更新失败', { error: error.message }, 'error');
                }
            }
        }

        saveLocal() {
            const m3u8Urls = this.detector.getUrls();
            const cover = this.getCoverImage();
            const title = document.title;
            const url = window.location.href;

            const data = {
                title: title,
                url: url,
                cover: cover || '',
                m3u8Urls: m3u8Urls,
                timestamp: new Date().toISOString()
            };

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const downloadUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `存档_${title.substring(0, 20)}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            ConsoleLogger.log('本地保存', '数据已保存为JSON文件', 'success');
            alert('✅ 数据已保存到本地文件！');
        }

        copyAll() {
            const m3u8Urls = this.detector.getUrls();
            const cover = this.getCoverImage();
            const title = document.title;

            let text = `标题: ${title}\n`;
            text += `URL: ${window.location.href}\n`;
            text += `封面: ${cover || '无'}\n\n`;
            text += `m3u8 地址 (${m3u8Urls.length} 个):\n`;

            m3u8Urls.forEach((url, index) => {
                text += `${index + 1}. ${url}\n`;
            });

            navigator.clipboard.writeText(text).then(() => {
                ConsoleLogger.log('复制成功', '数据已复制到剪贴板', 'success');
                alert('✅ 数据已复制到剪贴板！');
            }).catch(err => {
                ConsoleLogger.log('复制失败', { error: err.message }, 'error');
                alert('❌ 复制失败: ' + err.message);
            });
        }

        rescan() {
            this.detector.clear();
            this.detector.start();
            this.updateDisplay();
            ConsoleLogger.log('重新扫描', 'm3u8检测引擎已重启', 'info');
            alert('🔄 已重新开始扫描m3u8地址！');
        }
    }

    // 初始化
    setTimeout(() => {
        new SidebarUI();
        ConsoleLogger.log('智能存档助手', '油猴脚本已加载', 'success');
    }, 1000);

})();
