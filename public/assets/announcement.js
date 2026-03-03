// 公告悬浮框功能
// 引入marked.js用于Markdown渲染
function ensureMarkedLoaded() {
    return new Promise((resolve) => {
        // 检查marked是否已经加载
        if (typeof marked === 'function') {
            resolve();
            return;
        }
        
        // 动态加载marked.js
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = () => {
            console.log('marked.js 加载成功');
            resolve();
        };
        script.onerror = () => {
            console.error('marked.js 加载失败');
            resolve(); // 即使加载失败也继续执行
        };
        document.head.appendChild(script);
        console.log('开始加载 marked.js');
    });
}

// 立即开始加载marked.js
ensureMarkedLoaded();

class AnnouncementManager {
    constructor() {
        this.announcements = [];
        this.isLoaded = false;
        this.loadedAt = 0;
        this.cacheTime = 5 * 60 * 1000; // 5分钟缓存
        this.init();
    }

    async init() {
        await this.loadAnnouncements();
        await this.showActiveAnnouncements();
    }

    async loadAnnouncements() {
        const now = Date.now();
        if (this.isLoaded && now - this.loadedAt < this.cacheTime) {
            return;
        }

        try {
            const response = await fetch('/api/announcements');
            const data = await response.json();
            if (data.code === 200 && Array.isArray(data.data)) {
                this.announcements = data.data;
                this.isLoaded = true;
                this.loadedAt = now;
            }
        } catch (error) {
            console.error('加载公告失败:', error);
        }
    }

    async showActiveAnnouncements() {
        let currentPath = window.location.pathname;
        
        // 规范化路径：处理/video和/video/的情况
        if (currentPath === '/video' || currentPath === '/video/') {
            currentPath = '/video/index.html';
        }
        
        const activeAnnouncements = this.announcements.filter(ann => {
            if (!ann.isActive) return false;
            if (!Array.isArray(ann.pages) || ann.pages.length === 0) return false;
            return ann.pages.includes(currentPath);
        });

        for (const ann of activeAnnouncements) {
            const id = ann._id || `ann_${Date.now()}`;
            // Check if user has already dismissed this announcement
            if (!localStorage.getItem(`announcement_shown_${id}`)) {
                await this.showAnnouncement(ann);
            }
        }
    }

    async showAnnouncement(announcement) {
        const id = announcement._id || `ann_${Date.now()}`;
        const title = announcement.title || '公告';
        const content = announcement.content || '';
        const type = announcement.type || 'info';

        // 等待marked.js加载完成
        await ensureMarkedLoaded();
        console.log('marked函数状态:', typeof marked);

        // 创建公告悬浮框
        const container = document.createElement('div');
        container.id = `announcement_${id}`;
        container.className = `fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-lg border ${this.getTypeClass(type)}`;
        container.style.animation = 'slideIn 0.3s ease-out';

        // 渲染Markdown内容
        let renderedContent = content;
        try {
            // 配置 marked.js
            if (typeof marked === 'object' && marked && typeof marked.setOptions === 'function') {
                marked.setOptions({
                    breaks: true, // 启用换行符转换为 <br>
                    gfm: true,   // 启用 GitHub Flavored Markdown
                    headerIds: false, // 禁用标题 ID
                    mangle: false     // 禁用电子邮件地址混淆
                });
            }
            
            if (typeof marked === 'function') {
                // 旧版本的 marked.js API
                renderedContent = marked(content);
            } else if (typeof marked === 'object' && marked && typeof marked.parse === 'function') {
                // 新版本的 marked.js API
                renderedContent = marked.parse(content);
                console.log('使用新版本 marked.parse API 渲染成功');
            } else {
                console.error('marked 不是一个函数或对象，无法渲染 Markdown');
            }
        } catch (error) {
            console.error('渲染 Markdown 失败:', error);
            // 渲染失败时回退到原始文本
        }
        console.log('渲染前:', content);
        console.log('渲染后:', renderedContent);

        // 公告内容
        container.innerHTML = `
            <div class="p-4">
                <div class="flex items-start justify-between">
                    <h3 class="text-lg font-medium text-gray-900">${title}</h3>
                    <button class="text-gray-400 hover:text-gray-500 focus:outline-none" onclick="this.closest('[id^=announcement_]').remove();">
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="mt-2 text-sm text-gray-600 markdown-content">${renderedContent}</div>
                <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div class="text-xs text-gray-400">
                        ${announcement.updatedAt ? `更新时间：${new Date(announcement.updatedAt).toLocaleString('zh-CN')}` : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500" onclick="this.closest('[id^=announcement_]').remove(); localStorage.setItem('announcement_shown_${id}', '1');">
                            下次不再显示
                        </button>
                        <button class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500" onclick="this.closest('[id^=announcement_]').remove();">
                            我知道了
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(container);

        // 添加动画样式和Markdown样式
        if (!document.getElementById('announcement-styles')) {
            const style = document.createElement('style');
            style.id = 'announcement-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                /* Markdown样式 */
                .markdown-content {
                    line-height: 1.6;
                }
                
                .markdown-content h1 {
                    font-size: 1.5rem;
                    font-weight: bold;
                    margin: 1rem 0 0.5rem 0;
                }
                
                .markdown-content h2 {
                    font-size: 1.3rem;
                    font-weight: bold;
                    margin: 1rem 0 0.5rem 0;
                }
                
                .markdown-content h3 {
                    font-size: 1.1rem;
                    font-weight: bold;
                    margin: 1rem 0 0.5rem 0;
                }
                
                .markdown-content p {
                    margin: 0.5rem 0;
                }
                
                .markdown-content strong {
                    font-weight: bold;
                }
                
                .markdown-content em {
                    font-style: italic;
                }
                
                .markdown-content ul,
                .markdown-content ol {
                    margin: 0.5rem 0 0.5rem 1.5rem;
                }
                
                .markdown-content li {
                    margin: 0.25rem 0;
                }
                
                .markdown-content code {
                    background-color: #f1f1f1;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-family: monospace;
                    font-size: 0.9rem;
                }
                
                .markdown-content pre {
                    background-color: #f1f1f1;
                    padding: 1rem;
                    border-radius: 0.25rem;
                    overflow-x: auto;
                    font-family: monospace;
                    font-size: 0.9rem;
                    margin: 0.5rem 0;
                }
                
                .markdown-content blockquote {
                    border-left: 4px solid #ddd;
                    padding-left: 1rem;
                    margin: 0.5rem 0;
                    color: #666;
                }
                
                /* 链接样式 */
                .markdown-content a {
                    color: #3b82f6;
                    text-decoration: underline;
                    font-weight: 500;
                }
                
                .markdown-content a:hover {
                    color: #2563eb;
                    text-decoration: none;
                }
                
                /* 图片样式 */
                .markdown-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.25rem;
                    margin: 0.5rem 0;
                }
            `;
            document.head.appendChild(style);
        }
        
        // 处理链接在新标签页打开
        setTimeout(() => {
            const links = container.querySelectorAll('.markdown-content a');
            links.forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });
        }, 0);
    }

    getTypeClass(type) {
        switch (type) {
            case 'warning':
                return 'border-yellow-400';
            case 'error':
                return 'border-red-400';
            default:
                return 'border-blue-400';
        }
    }
}

// 初始化公告管理器
if (typeof window !== 'undefined') {
    window.AnnouncementManager = AnnouncementManager;
    window.addEventListener('DOMContentLoaded', () => {
        window.announcementManager = new AnnouncementManager();
    });
}
