/* 分享墙管理 */
    let currentShareId = '';
    
    // 检查接口状态
    const checkApiStatus = async (url, button) => {
      if (!url) {
        showToast("接口 URL 不能为空");
        return;
      }
      
      const originalText = button.textContent;
      button.textContent = "监测中...";
      button.disabled = true;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        // 获取认证 token
        const token = getToken();
        
        // 使用项目自带的代理接口进行监测，避免跨域问题
        // 用当前站点地址拼接，避免硬编码端口在部署环境失效
        const proxyOrigin = window.location.origin || "";
        const proxyUrl = `${proxyOrigin}/api/proxy?wd=&pg=1&url=${encodeURIComponent(url)}`;
        const headers = {
          'Accept': '*/*'
        };
        
        // 添加 token 认证
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(proxyUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: headers
        });
        
        clearTimeout(timeoutId);
        
        if (res.status === 200) {
          button.className = "px-2 py-1 rounded text-xs bg-emerald-600 text-white";
          button.textContent = "正常";
        } else {
          button.className = "px-2 py-1 rounded text-xs bg-rose-600 text-white";
          button.textContent = `异常 (${res.status})`;
        }
      } catch (error) {
        button.className = "px-2 py-1 rounded text-xs bg-rose-600 text-white";
        button.textContent = "异常";
      } finally {
        button.disabled = false;
      }
    };
    
    // 加载分享墙列表
    async function loadShareWall() {
      const shareWallMeta = document.getElementById('shareWallMeta');
      const shareWallGrid = document.getElementById('shareWallGrid');
      const loadShareWallBtn = document.getElementById('loadShareWallBtn');
      
      if (shareWallMeta) shareWallMeta.textContent = '加载中...';
      
      try {
        // 获取分享墙列表不需要认证，因为它是公开接口
        const response = await fetch('/api/share-wall');
        
        const data = await response.json();
        if (data.code === 200 && data.data) {
          if (shareWallMeta) shareWallMeta.textContent = `共 ${data.data.length} 条记录`;
          
          if (shareWallGrid) {
            shareWallGrid.innerHTML = data.data.map(item => {
              const addedAt = new Date(item.createdAt).toLocaleString();
              const expireLabel = item.expiresAt ? new Date(item.expiresAt).toLocaleString() : '永久';
              const shareUrl = `/video/share?sid=${encodeURIComponent(item.shareId)}`;
              // 封面地址（单引号转义，避免内联 style/属性被截断）
              const coverUrl = String(item.pic || '/video/loading.gif').replace(/'/g, '%27');
              
              // 计算过期状态
              let statusLabel = '正常';
              let statusColor = '#10b981'; // 绿色
              let expireColor = '#f59e0b'; // 黄色
              if (!item.expiresAt) {
                statusLabel = '永久';
              } else if (new Date(item.expiresAt) < new Date()) {
                statusLabel = '过期';
                statusColor = '#ef4444'; // 红色
                expireColor = '#ef4444'; // 红色
              }
              
              return `
                <article class="video-card sw-card">
                  <div class="thumb-wrapper sw-thumb" style="background-image:url('${coverUrl}')">
                    <img src="${coverUrl}"
                         alt="${item.title}"
                         loading="lazy"
                         onerror="this.src='/video/loading.gif'"
                         class="sw-cover">
                    <label class="sw-check" title="选择该分享">
                      <input type="checkbox" class="share-checkbox" data-share-id="${item.shareId}">
                    </label>
                    <div class="play-overlay sw-overlay">
                      <span class="sw-play">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                      </span>
                    </div>
                  </div>
                  <div class="info sw-info">
                    <div class="title sw-title">${item.title}</div>
                    <div class="sw-chips">
                      <span class="source-badge sw-badge">${item.source || '未知'}</span>
                    </div>
                    <div class="meta sw-meta">
                      <span class="sw-meta-k">添加人</span>
                      <span class="sw-meta-v">${item.addedBy || '未知'}</span>
                    </div>
                    <div class="meta sw-meta">
                      <span class="sw-meta-k">添加时间</span>
                      <span class="sw-meta-v">${addedAt}</span>
                    </div>
                    <div class="meta flex justify-end sw-status-row">
                      <span class="sw-pill" style="color:${statusColor};">${statusLabel}</span>
                      <span class="text-xs text-yellow-400 sw-expire" style="color:${expireColor};">${item.expiresAt ? expireLabel : ''}</span>
                    </div>
                    <div class="sw-actions">
                      <button class="sw-action" onclick="openShareActionsModal('${item.shareId}', '${item.title}')">操作</button>
                    </div>
                  </div>
                </article>
              `;
            }).join('');

            if (!data.data.length) {
              shareWallGrid.innerHTML = `
                <div class="sw-empty">
                  <span class="sw-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="3"></rect>
                      <path d="M3 9h18"></path>
                      <path d="M9 14h6"></path>
                    </svg>
                  </span>
                  <div class="sw-empty-text">暂无分享记录</div>
                </div>
              `;
            }
          }
        } else {
          if (shareWallMeta) shareWallMeta.textContent = '加载失败';
        }
      } catch (error) {
        console.error('加载分享墙失败:', error);
        if (shareWallMeta) shareWallMeta.textContent = '加载失败';
      } finally {
        if (loadShareWallBtn) loadShareWallBtn.classList.remove('hidden');
      }
    }
    
    // 打开分享操作模态框
    function openShareActionsModal(shareId, title) {
      currentShareId = shareId;
      const modal = document.getElementById('shareActionsModal');
      const titleElement = document.getElementById('shareActionsTitle');
      const infoElement = document.getElementById('shareActionsInfo');
      
      if (titleElement) titleElement.textContent = `操作: ${title}`;
      if (infoElement) infoElement.textContent = `分享ID: ${shareId}`;
      if (modal) modal.classList.remove('hidden');
      
      // 绑定按钮事件
      const viewBtn = document.getElementById('viewShareBtn');
      const editBtn = document.getElementById('editExpireBtn');
      const removeBtn = document.getElementById('removeShareBtn');
      
      if (viewBtn) {
        viewBtn.onclick = function() {
          viewShareItem(shareId);
          closeShareActionsModal();
        };
      }
      
      if (editBtn) {
        editBtn.onclick = function() {
          const expireSelect = document.getElementById('expireTimeSelect');
          const btnText = document.getElementById('editExpireBtnText');
          const btnSpinner = document.getElementById('editExpireBtnSpinner');
          
          if (expireSelect) {
            const expireSeconds = parseInt(expireSelect.value, 10);
            
            // 显示旋转图标，隐藏按钮文本
            if (btnText) btnText.classList.add('hidden');
            if (btnSpinner) btnSpinner.classList.remove('hidden');
            
            updateShareExpireTime(shareId, expireSeconds).finally(() => {
              // 恢复按钮状态
              if (btnText) btnText.classList.remove('hidden');
              if (btnSpinner) btnSpinner.classList.add('hidden');
            });
          }
        };
      }
      
      if (removeBtn) {
        removeBtn.onclick = function() {
          openDeleteConfirmModal(shareId);
        };
      }
    }
    
    // 关闭分享操作模态框
    function closeShareActionsModal() {
      const modal = document.getElementById('shareActionsModal');
      if (modal) modal.classList.add('hidden');
    }
    
    // 关闭删除确认悬浮框
    function closeDeleteConfirmModal() {
      const modal = document.getElementById('deleteConfirmModal');
      if (modal) modal.classList.add('hidden');
    }
    
    // 从分享墙移除项目
    async function removeShareWallItem(shareId) {
      try {
        const token = getToken();
        if (!token) {
          showToast('请先登录');
          return;
        }
        
        const response = await fetch(`/api/share-wall/${shareId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (data.code === 200) {
          showToast('移除成功');
          loadShareWall();
          closeShareActionsModal();
          closeDeleteConfirmModal();
        } else {
          showToast(data.message || '移除失败');
        }
      } catch (error) {
        console.error('移除失败:', error);
        showToast('移除失败');
      }
    }
    
    // 打开删除确认悬浮框
    function openDeleteConfirmModal(shareId) {
      currentShareId = shareId;
      const modal = document.getElementById('deleteConfirmModal');
      if (modal) modal.classList.remove('hidden');
      
      // 绑定确认删除按钮事件
      const confirmBtn = document.getElementById('confirmDeleteBtn');
      if (confirmBtn) {
        confirmBtn.onclick = function() {
          removeShareWallItem(shareId);
        };
      }
    }
    
    // 查看分享项
    function viewShareItem(shareId) {
      const shareUrl = `/video/share?sid=${encodeURIComponent(shareId)}`;
      window.open(shareUrl, '_blank');
    }
    
    // 修改过期时间
    function editExpireTime(shareId) {
      const expireSeconds = prompt('请输入新的过期时间（秒），0表示永久：', '0');
      if (expireSeconds === null) return;
      
      const seconds = parseInt(expireSeconds, 10);
      if (isNaN(seconds) || seconds < 0) {
        showToast('请输入有效的数字');
        return;
      }
      
      updateShareExpireTime(shareId, seconds);
    }
    
    // 更新分享过期时间
    async function updateShareExpireTime(shareId, expireSeconds) {
      try {
        const token = getToken();
        if (!token) {
          showToast('请先登录');
          return;
        }
        
        const response = await fetch(`/api/user/shares/${shareId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ expireSeconds })
        });
        
        const data = await response.json();
        if (data.code === 200) {
          showToast('更新成功');
          // 直接更新对应视频卡片的过期时间
          updateShareCardExpireTime(shareId, expireSeconds);
        } else {
          showToast(data.message || '更新失败');
        }
      } catch (error) {
        console.error('更新失败:', error);
        showToast('更新失败');
      }
    }
    
    // 更新分享卡片的过期时间显示
    function updateShareCardExpireTime(shareId, expireSeconds) {
      // 构建过期时间
      let expiresAt = null;
      if (expireSeconds > 0) {
        expiresAt = new Date(Date.now() + expireSeconds * 1000);
      }
      
      // 计算过期状态和标签
      let statusLabel = '正常';
      let statusColor = '#10b981'; // 绿色
      // 永久分享不重复显示“永久”标签（状态列已表达）
      let expireLabel = '';
      let expireColor = '#f59e0b'; // 黄色
      
      if (!expiresAt) {
        statusLabel = '永久';
      } else if (expiresAt < new Date()) {
        statusLabel = '过期';
        statusColor = '#ef4444'; // 红色
        expireColor = '#ef4444'; // 红色
        expireLabel = expiresAt.toLocaleString();
      } else {
        expireLabel = expiresAt.toLocaleString();
      }
      
      // 查找对应的视频卡片
      const shareWallGrid = document.getElementById('shareWallGrid');
      if (shareWallGrid) {
        const cards = shareWallGrid.querySelectorAll('.video-card');
        cards.forEach(card => {
          // 查找包含分享ID的操作按钮
          const actionBtn = card.querySelector(`button[onclick="openShareActionsModal('${shareId}',`);
          if (actionBtn) {
            // 更新状态标签
            const statusSpan = card.querySelector('.meta.flex.justify-end span:first-child');
            if (statusSpan) {
              statusSpan.textContent = statusLabel;
              statusSpan.style.color = statusColor;
            }
            
            // 更新过期时间标签
            const expireSpan = card.querySelector('.meta.flex.justify-end span.text-xs.text-yellow-400');
            if (expireSpan) {
              expireSpan.textContent = expireLabel;
              expireSpan.style.color = expireColor;
            }
          }
        });
      }
    }
    
    // 初始化分享墙管理模块
    function initShareWallModule() {
      const loadShareWallBtn = document.getElementById('loadShareWallBtn');
      if (loadShareWallBtn) {
        loadShareWallBtn.addEventListener('click', loadShareWall);
        loadShareWallBtn.classList.remove('hidden');
      }
      
      // 全选/取消全选功能
      const selectAllCheckbox = document.getElementById('selectAllShares');
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
          const checkboxes = document.querySelectorAll('.share-checkbox');
          checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
          });
        });
      }
      
      // 批量更新按钮点击事件
      const batchUpdateBtn = document.getElementById('batchUpdateExpireBtn');
      if (batchUpdateBtn) {
        batchUpdateBtn.addEventListener('click', function() {
          const selectedCheckboxes = document.querySelectorAll('.share-checkbox:checked');
          if (selectedCheckboxes.length === 0) {
            showToast('请至少选择一个分享');
            return;
          }
          
          const shareIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.dataset.shareId);
          const expireSelect = document.getElementById('batchExpireTimeSelect');
          const expireSeconds = parseInt(expireSelect.value, 10);
          
          // 显示旋转图标，隐藏按钮文本
          const btnText = document.getElementById('batchUpdateBtnText');
          const btnSpinner = document.getElementById('batchUpdateBtnSpinner');
          if (btnText) btnText.classList.add('hidden');
          if (btnSpinner) btnSpinner.classList.remove('hidden');
          
          batchUpdateShareExpireTime(shareIds, expireSeconds).finally(() => {
            // 恢复按钮状态
            if (btnText) btnText.classList.remove('hidden');
            if (btnSpinner) btnSpinner.classList.add('hidden');
          });
        });
      }
    }
    
    // 批量更新分享过期时间
    async function batchUpdateShareExpireTime(shareIds, expireSeconds) {
      try {
        const token = getToken();
        if (!token) {
          showToast('请先登录');
          return;
        }
        
        const response = await fetch('/api/user/shares/batch', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ shareIds, expireSeconds })
        });
        
        const data = await response.json();
        if (data.code === 200) {
          showToast(`成功更新 ${data.data.updatedCount} 个分享的有效期`);
          loadShareWall();
        } else {
          showToast(data.message || '更新失败');
        }
      } catch (error) {
        console.error('批量更新失败:', error);
        showToast('批量更新失败');
      }
    }
    
    // 显示提示信息
    function showToast(message) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
          toast.classList.add('hidden');
        }, 3000);
      } else {
        // 如果没有toast元素，使用alert
        alert(message);
      }
    }
    
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
      initShareWallModule();
    });
