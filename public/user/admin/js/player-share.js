/* 播放器、排序与分享工具 */
    const renderVideoCards = (items, container, options = {}) => {
      if (!container) return;
      const list = Array.isArray(items) ? items : [];
      if (list.length === 0) {
        container.innerHTML = `
          <div class="col-span-full text-center text-slate-500 py-8">暂无内容</div>
        `;
        return;
      }
      const allowDelete = options.allowDelete;
      const deleteAction = options.deleteAction || "";
      container.innerHTML = list.map((item) => {
        const title = item.title || "未命名";
        const pic = item.pic || FALLBACK_IMAGE;
        const source = item.source || "未知来源";
        const url = item.url || "";
        const shareUrl = item.shareUrl || "";
        const cardId = item.shareId || item.id || url;
        const deleteBtn = allowDelete
          ? `<button class="px-3 py-1.5 rounded bg-rose-600 text-white text-xs" data-action="${deleteAction}" data-url="${url}" data-share-id="${item.shareId || item.id || ""}">删除</button>`
          : "";
        const playBtn = url
          ? `<button class="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs" data-action="play" data-url="${url}" data-title="${title.replace(/"/g, "&quot;")}">播放</button>`
          : "";
        const shareBtn = shareUrl
          ? `<button class="px-3 py-1.5 rounded bg-slate-700 text-white text-xs" data-action="copy" data-share-url="${shareUrl}">复制分享</button>`
          : "";
        return `
          <div class="bg-white rounded-lg overflow-hidden shadow-md h-[260px] flex flex-col" data-card-id="${cardId}">
            <div class="relative aspect-video overflow-hidden">
              <img src="${pic}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';" class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div class="absolute bottom-2 left-2 text-white text-sm font-medium line-clamp-2">${title}</div>
            </div>
            <div class="p-3 space-y-2 flex-1 flex flex-col justify-between">
              <div class="text-xs text-slate-500 truncate">${source}</div>
              <div class="flex items-center gap-2">
                ${playBtn}
                ${shareBtn}
                ${deleteBtn}
              </div>
            </div>
          </div>
        `;
      }).join("");
    };

    const buildShareUrl = (item) => {
      const url = String(item.url || "");
      if (!url) return "";
      const title = String(item.title || "");
      const pic = String(item.pic || "");
      const source = String(item.source || "");
      const expiresAt = Number(item.expiresAt || 0);
      const shareId = String(item.id || item.shareId || "");
      const payload = btoa([
        encodeURIComponent(url),
        encodeURIComponent(title),
        encodeURIComponent(pic),
        encodeURIComponent(source),
        encodeURIComponent(String(expiresAt || 0)),
        encodeURIComponent(String(shareId || "")),
      ].join("|"));
      const base = window.location.origin;
      return `${base}/video/share?key=${payload}`;
    };

    let adminPlayerInstance = null;
    let draggedButton = null;
    
    // 初始化按钮排序
    const initButtonOrder = () => {
      const savedOrder = localStorage.getItem('moduleTabOrder');
      if (savedOrder) {
        try {
          const order = JSON.parse(savedOrder);
          const sideNav = document.getElementById('sideNav');
          if (sideNav) {
            const buttons = sideNav.querySelectorAll('.module-tab');
            const buttonMap = new Map();
            buttons.forEach(btn => {
              buttonMap.set(btn.dataset.moduleTarget, btn);
              sideNav.removeChild(btn);
            });
            
            // 按照保存的顺序重新添加按钮
            order.forEach(target => {
              if (buttonMap.has(target)) {
                sideNav.appendChild(buttonMap.get(target));
                buttonMap.delete(target);
              }
            });
            
            // 添加剩余的按钮
            buttonMap.forEach(btn => {
              sideNav.appendChild(btn);
            });
          }
        } catch (e) {
          console.error('读取按钮顺序失败:', e);
        }
      }
    };
    
    // 保存按钮排序到本地存储
    const saveButtonOrder = () => {
      const sideNav = document.getElementById('sideNav');
      if (sideNav) {
        const buttons = sideNav.querySelectorAll('.module-tab');
        const order = Array.from(buttons).map(btn => btn.dataset.moduleTarget);
        localStorage.setItem('moduleTabOrder', JSON.stringify(order));
      }
    };
    
    // 实现按钮拖动排序功能
    const setupButtonDrag = () => {
      const sideNav = document.getElementById('sideNav');
      if (!sideNav) return;
      
      // 创建插入指示器
      const createInsertIndicator = () => {
        const indicator = document.createElement('div');
        indicator.id = 'insertIndicator';
        indicator.style.height = '2px';
        indicator.style.backgroundColor = '#3b82f6';
        indicator.style.margin = '2px 0';
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.2s ease';
        return indicator;
      };
      
      let insertIndicator = createInsertIndicator();
      sideNav.appendChild(insertIndicator);
      
      const buttons = sideNav.querySelectorAll('.module-tab');
      buttons.forEach(button => {
        button.setAttribute('draggable', 'true');
        button.style.cursor = 'grab';
        
        button.addEventListener('dragstart', (e) => {
          draggedButton = button;
          button.style.opacity = '0.5';
          button.style.cursor = 'grabbing';
        });
        
        button.addEventListener('dragend', (e) => {
          draggedButton = null;
          button.style.opacity = '1';
          button.style.cursor = 'grab';
          insertIndicator.style.opacity = '0';
          saveButtonOrder();
        });
        
        button.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (!draggedButton || draggedButton === button) return;
          
          // 计算鼠标在按钮上的位置
          const rect = button.getBoundingClientRect();
          const mouseY = e.clientY - rect.top;
          const buttonHeight = rect.height;
          
          // 显示插入指示器
          insertIndicator.style.opacity = '1';
          
          // 根据鼠标位置决定插入位置
          if (mouseY < buttonHeight / 2) {
            // 插入到按钮上方
            button.parentNode.insertBefore(insertIndicator, button);
          } else {
            // 插入到按钮下方
            button.parentNode.insertBefore(insertIndicator, button.nextSibling);
          }
        });
        
        button.addEventListener('dragleave', (e) => {
          if (!draggedButton) return;
          // 检查是否完全离开侧边栏
          const sideNavRect = sideNav.getBoundingClientRect();
          if (e.clientX < sideNavRect.left || e.clientX > sideNavRect.right ||
              e.clientY < sideNavRect.top || e.clientY > sideNavRect.bottom) {
            insertIndicator.style.opacity = '0';
          }
        });
        
        button.addEventListener('drop', (e) => {
          e.preventDefault();
          if (!draggedButton || draggedButton === button) return;
          
          // 根据插入指示器的位置来插入按钮
          const sideNav = button.parentNode;
          const indicatorIndex = Array.from(sideNav.children).indexOf(insertIndicator);
          
          // 先移除按钮，再插入到正确位置
          sideNav.removeChild(draggedButton);
          sideNav.insertBefore(draggedButton, sideNav.children[indicatorIndex]);
          
          // 隐藏插入指示器
          insertIndicator.style.opacity = '0';
        });
      });
    };
    
    const openAdminPlayer = (url, title = "") => {
      const modal = document.getElementById("adminPlayerModal");
      const container = document.getElementById("adminPlayerContainer");
      const titleEl = document.getElementById("adminPlayerTitle");
      if (!modal || !container || !window.DPlayer) return;
      if (titleEl) titleEl.textContent = title || "播放";
      if (adminPlayerInstance) {
        adminPlayerInstance.destroy();
        adminPlayerInstance = null;
      }
      const safeUrl = String(url || "").trim();
      const isHls = safeUrl.toLowerCase().includes(".m3u8");
      adminPlayerInstance = new DPlayer({
        container,
        video: isHls ? { url: safeUrl, type: "hls" } : { url: safeUrl },
        autoplay: true,
      });
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
    };

    const closeAdminPlayer = () => {
      const modal = document.getElementById("adminPlayerModal");
      if (adminPlayerInstance) {
        adminPlayerInstance.destroy();
        adminPlayerInstance = null;
      }
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
      document.body.style.overflow = "";
    };

    const getSelectedUserId = () => {
      const select = document.getElementById("favoritesUserSelect");
      return select && select.value ? select.value : (currentProfile ? String(currentProfile._id || "") : "");
    };

    const syncUserSelects = (value) => {
      const favoritesSelect = document.getElementById("favoritesUserSelect");
      const sharesSelect = document.getElementById("sharesUserSelect");
      if (favoritesSelect && favoritesSelect.value !== value) favoritesSelect.value = value;
      if (sharesSelect && sharesSelect.value !== value) sharesSelect.value = value;
    };

    const openModal = (id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    };

    const closeModal = (id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    };

    const updateGridMeta = (containerId, metaId) => {
      const container = document.getElementById(containerId);
      const meta = document.getElementById(metaId);
      if (!container || !meta) return;
      const cards = container.querySelectorAll("[data-card-id]");
      if (cards.length === 0) {
        meta.textContent = "共 0 条";
        container.innerHTML = '<div class="col-span-full text-center text-slate-500 py-8">暂无内容</div>';
        return;
      }
      meta.textContent = `共 ${cards.length} 条`;
    };

