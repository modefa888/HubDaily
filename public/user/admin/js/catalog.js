/* 频道与视频管理 */
    // 电视管理相关功能
    let currentChannelId = null;
    let currentVideoId = null;
    let channelsData = []; // 缓存频道数据
    let channelsLoaded = false; // 标记频道数据是否已加载
    
    // 加载频道列表
    const loadChannelsData = async () => {
      try {
        if (!channelsLoaded) {
          const response = await fetch('/api/admin/tv/channels', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
          });
          const data = await response.json();
          if (data.code === 200) {
            channelsData = data.data;
            channelsLoaded = true;
          } else {
            toast('加载频道数据失败');
          }
        }
        renderChannelsList(channelsData);
        document.getElementById('tvMeta').textContent = `共 ${channelsData.length} 个频道`;
      } catch (error) {
        console.error('加载频道数据失败:', error);
        toast('加载频道数据失败');
      }
    };
    
    // 加载频道到视频管理的选择框
    const loadChannelsForVideoSelect = async () => {
      try {
        if (!channelsLoaded) {
          const response = await fetch('/api/admin/tv/channels', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
          });
          const data = await response.json();
          if (data.code === 200) {
            channelsData = data.data;
            channelsLoaded = true;
          }
        }
        const select = document.getElementById('videoChannelSelect');
        const channelDisplay = document.getElementById('currentChannelDisplay');
        if (select && channelDisplay) {
          // 保存当前选择的频道ID
          const currentSelectedValue = select.value;
          select.innerHTML = '<option value="">选择频道</option>';
          channelsData.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel._id;
            option.textContent = channel.name;
            select.appendChild(option);
          });
          // 恢复之前选择的频道
          if (currentSelectedValue) {
            select.value = currentSelectedValue;
            updateChannelDisplay(currentSelectedValue);
          }
        }
      } catch (error) {
        console.error('加载频道数据失败:', error);
      }
    };
    
    // 更新频道显示
    const updateChannelDisplay = (channelId) => {
      const channelDisplay = document.getElementById('currentChannelDisplay');
      if (channelDisplay) {
        if (channelId) {
          const channel = channelsData.find(c => c._id === channelId);
          if (channel) {
            channelDisplay.textContent = channel.name;
          }
        } else {
          channelDisplay.textContent = '选择频道';
        }
      }
    };
    
    // 渲染频道列表
    const renderChannelsList = (channels) => {
      const tbody = document.getElementById('channelsTbody');
      if (!tbody) return;
      
      tbody.innerHTML = '';
      channels.forEach(channel => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${channel.order || 1}</td>
          <td>${channel.name}</td>
          <td>${channel.description || '-'}</td>
          <td>${channel.videos ? channel.videos.length : 0}</td>
          <td>
            <button class="text-blue-600 hover:underline mr-2" onclick="editChannel('${channel._id}')">编辑</button>
            <button class="text-green-600 hover:underline mr-2" onclick="switchToVideoManagement('${channel._id}')">管理视频</button>
            <button class="text-red-600 hover:underline" onclick="deleteChannel('${channel._id}')">删除</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };
    
    // 显示频道编辑表单
    const showChannelEditForm = (channel = null) => {
      currentChannelId = channel ? channel._id : null;
      document.getElementById('channelNameInput').value = channel ? channel.name : '';
      if (channel) {
        document.getElementById('channelOrderInput').value = channel.order;
      } else {
        // 计算新频道的排序号（现有最大排序号+1）
        const maxOrder = channelsData.reduce((max, c) => Math.max(max, c.order || 1), 0);
        document.getElementById('channelOrderInput').value = maxOrder + 1;
      }
      document.getElementById('channelDescriptionInput').value = channel ? channel.description : '';
      document.getElementById('channelEditForm').classList.remove('hidden');
      document.getElementById('videoEditForm').classList.add('hidden');
    };
    
    // 隐藏频道编辑表单
    const hideChannelEditForm = () => {
      document.getElementById('channelEditForm').classList.add('hidden');
      currentChannelId = null;
    };
    
    // 显示视频编辑表单
    const showVideoEditForm = (video = null) => {
      currentVideoId = video ? video._id : null;
      document.getElementById('videoTitleInput').value = video ? video.title : '';
      document.getElementById('videoOrderInput').value = video ? video.order : 1;
      document.getElementById('videoUrlInput').value = video ? video.url : '';
      const videoImageInput = document.getElementById('videoImageInput');
      const videoImagePreview = document.getElementById('videoImagePreview');
      if (videoImageInput && videoImagePreview) {
        videoImageInput.value = video ? video.image : '';
        // 更新预览图片
        const imageUrl = video ? video.image : '';
        if (imageUrl) {
          videoImagePreview.src = imageUrl;
          videoImagePreview.classList.remove('hidden');
        } else {
          videoImagePreview.src = '';
          videoImagePreview.classList.add('hidden');
        }
      }
      document.getElementById('videoEditForm').classList.remove('hidden');
    };
    
    // 保存频道
    const saveChannel = async () => {
      const name = document.getElementById('channelNameInput').value.trim();
      const order = parseInt(document.getElementById('channelOrderInput').value) || 1;
      const description = document.getElementById('channelDescriptionInput').value.trim();
      
      if (!name) {
        toast('频道名称不能为空');
        return;
      }
      
      try {
        setLoading(true, "保存频道...");
        const url = currentChannelId ? `/api/admin/tv/channels/${currentChannelId}` : '/api/admin/tv/channels';
        const method = currentChannelId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
          },
          body: JSON.stringify({ name, order, description })
        });
        
        const data = await response.json();
        if (data.code === 200) {
          toast('保存频道成功');
          hideChannelEditForm();
          loadChannelsData();
        } else {
          toast('保存频道失败');
        }
      } catch (error) {
        console.error('保存频道失败:', error);
        toast('保存频道失败');
      } finally {
        setLoading(false);
      }
    };
    

    
    // 编辑频道
    const editChannel = async (id) => {
      try {
        setLoading(true, "加载频道数据...");
        const response = await fetch(`/api/admin/tv/channels/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
          }
        });
        const data = await response.json();
        if (data.code === 200) {
          showChannelEditForm(data.data);
        } else {
          toast('加载频道数据失败');
        }
      } catch (error) {
        console.error('加载频道数据失败:', error);
        toast('加载频道数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    // 视频管理模态框
    const createVideoManagementModal = () => {
      // 检查模态框是否已存在
      if (document.getElementById('videoManagementModal')) {
        return;
      }
      
      const modal = document.createElement('div');
      modal.id = 'videoManagementModal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-semibold" id="videoManagementTitle">视频管理</h3>
            <button id="closeVideoManagementBtn" class="text-slate-500 hover:text-slate-700">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          
          <!-- 视频编辑表单 -->
          <div id="videoEditForm" class="space-y-4 hidden">
            <div class="flex items-center justify-between">
              <h4 class="font-medium" id="videoEditTitle">编辑视频</h4>
              <button id="cancelVideoEditBtn" class="text-slate-500 hover:text-slate-700">
                <i class="fa fa-times"></i>
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-700">视频标题</label>
                <input id="videoTitleInput" class="w-full border rounded px-3 py-2 text-sm" placeholder="请输入视频标题">
              </div>
              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-700">排序</label>
                <input id="videoOrderInput" type="number" class="w-full border rounded px-3 py-2 text-sm" placeholder="请输入排序序号" value="1">
              </div>
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium text-slate-700">视频链接</label>
              <input id="videoUrlInput" type="text" class="w-full border rounded px-3 py-2 text-sm" placeholder="请输入视频URL">
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium text-slate-700">视频封面</label>
              <input id="videoImageInput" type="text" class="w-full border rounded px-3 py-2 text-sm" placeholder="请输入视频封面URL">
            </div>
            <div class="flex items-center justify-end gap-2">
              <button id="cancelVideoEditBtn2" class="px-3 py-1.5 rounded border text-slate-600 text-sm">取消</button>
              <button id="saveVideoBtn" class="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm">保存视频</button>
            </div>
          </div>
          
          <!-- 视频列表 -->
          <div class="space-y-4" id="videosListSection">
            <div class="flex items-center justify-between">
              <h4 class="font-medium">视频列表</h4>
              <button id="addVideoBtn" class="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm">
                <i class="fa fa-plus mr-1"></i>添加视频
              </button>
            </div>
            <div class="overflow-auto max-h-96">
              <table class="min-w-full text-sm">
                <thead class="text-left text-slate-500">
                  <tr>
                    <th class="py-2">排序</th>
                    <th class="py-2">标题</th>
                    <th class="py-2">链接</th>
                    <th class="py-2">操作</th>
                  </tr>
                </thead>
                <tbody id="videosTbody" class="divide-y"></tbody>
              </table>
            </div>
            <!-- 分页控件 -->
            <div class="flex items-center justify-between" id="videosPagination">
              <div class="text-sm text-slate-500" id="videosPaginationInfo">显示 1-10 条，共 0 条</div>
              <div class="flex items-center gap-1">
                <button id="videosPrevPage" class="px-3 py-1 rounded border text-slate-600 text-sm" disabled>上一页</button>
                <button id="videosNextPage" class="px-3 py-1 rounded border text-slate-600 text-sm" disabled>下一页</button>
              </div>
            </div>
          </div>
        </div>
      `;
      // 查找目标div（具有特定class的div）
      const targetDiv = document.querySelector('.bg-white.rounded-xl.shadow-xl.w-full.max-w-4xl.p-6.space-y-4');
      if (targetDiv) {
        targetDiv.appendChild(modal);
      } else {
        document.body.appendChild(modal);
      }
      
      // 绑定事件
      document.getElementById('closeVideoManagementBtn').addEventListener('click', closeVideoManagementModal);
      document.getElementById('addVideoBtn').addEventListener('click', showAddVideoForm);
      document.getElementById('cancelVideoEditBtn').addEventListener('click', hideVideoEditForm);
      document.getElementById('cancelVideoEditBtn2').addEventListener('click', hideVideoEditForm);
      document.getElementById('saveVideoBtn').addEventListener('click', saveVideo);
      document.getElementById('videosPrevPage').addEventListener('click', () => changeVideoPage(currentVideoPage - 1));
      document.getElementById('videosNextPage').addEventListener('click', () => changeVideoPage(currentVideoPage + 1));
    };
    
    // 关闭视频管理模态框
    const closeVideoManagementModal = () => {
      const modal = document.getElementById('videoManagementModal');
      if (modal) {
        modal.remove();
      }
    };
    
    // 分页相关变量
    let currentVideoPage = 1;
    let videosPerPage = 10;
    let totalVideos = 0;
    let allVideos = [];
    
    // 显示编辑视频表单
    const showEditVideoForm = (video) => {
      currentVideoId = video ? video._id : null;
      document.getElementById('videoTitleInput').value = video ? video.title : '';
      document.getElementById('videoOrderInput').value = video ? video.order : 1;
      document.getElementById('videoUrlInput').value = video ? video.url : '';
      document.getElementById('videoImageInput').value = video ? video.image : '';
      document.getElementById('videoEditForm').classList.remove('hidden');
    };
    
    // 隐藏视频编辑表单
    const hideVideoEditForm = () => {
      document.getElementById('videoEditForm').classList.add('hidden');
      currentVideoId = null;
    };
    
    // 切换视频页码
    const changeVideoPage = (page) => {
      if (page < 1 || page > Math.ceil(totalVideos / videosPerPage)) {
        return;
      }
      currentVideoPage = page;
      renderVideosList(allVideos);
    };
    
    // 加载视频列表
    const loadVideos = async (channelId) => {
      try {
        // 显示骨架屏
        const skeleton = document.getElementById('videosSkeleton');
        const content = document.getElementById('videosContent');
        if (skeleton && content) {
          skeleton.classList.remove('hidden');
          content.classList.add('hidden');
        }
        
        const response = await fetch(`/api/admin/tv/channels/${channelId}/videos`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
          }
        });
        const data = await response.json();
        if (data.code === 200) {
          allVideos = data.data || [];
          totalVideos = allVideos.length;
          currentVideoPage = 1;
          renderVideosList(allVideos);
        } else {
          toast('加载视频列表失败');
        }
      } catch (error) {
        console.error('加载视频列表失败:', error);
        toast('加载视频列表失败');
      } finally {
        // 隐藏骨架屏，显示实际内容
        setTimeout(() => {
          const skeleton = document.getElementById('videosSkeleton');
          const content = document.getElementById('videosContent');
          if (skeleton && content) {
            skeleton.classList.add('hidden');
            content.classList.remove('hidden');
          }
        }, 300);
      }
    };
    
    // 渲染视频列表
    const renderVideosList = (videos) => {
      const tbody = document.getElementById('videosTbody');
      if (!tbody) return;
      
      // 计算分页数据
      const startIndex = (currentVideoPage - 1) * videosPerPage;
      const endIndex = startIndex + videosPerPage;
      const paginatedVideos = videos.slice(startIndex, endIndex);
      
      // 更新分页信息
      const paginationInfo = document.getElementById('videosPaginationInfo');
      if (paginationInfo) {
        paginationInfo.textContent = `显示 ${startIndex + 1}-${Math.min(endIndex, totalVideos)} 条，共 ${totalVideos} 条`;
      }
      
      // 更新分页按钮状态
      const prevBtn = document.getElementById('videosPrevPage');
      const nextBtn = document.getElementById('videosNextPage');
      if (prevBtn) {
        prevBtn.disabled = currentVideoPage === 1;
      }
      if (nextBtn) {
        nextBtn.disabled = endIndex >= totalVideos;
      }
      
      // 渲染视频列表
      tbody.innerHTML = '';
      if (paginatedVideos.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="4">暂无视频</td>';
        tbody.appendChild(tr);
      } else {
        paginatedVideos.forEach(video => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${video.order || 1}</td>
            <td>${video.title}</td>
            <td class="max-w-xs truncate">${video.url}</td>
            <td>
              <button class="text-blue-600 hover:underline mr-2 edit-video-btn" data-video-id="${video._id}">编辑</button>
              <button class="text-red-600 hover:underline delete-video-btn" data-video-id="${video._id}">删除</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
        
        // 绑定编辑按钮事件
        document.querySelectorAll('.edit-video-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video-id');
            const video = videos.find(v => v._id === videoId);
            if (video) {
              showEditVideoForm(video);
            }
          });
        });
        
        // 绑定删除按钮事件
        document.querySelectorAll('.delete-video-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video-id');
            deleteVideo(videoId);
          });
        });
      }
    };
    
    // 删除视频
    const deleteVideo = async (videoId) => {
      if (!confirm('确定要删除这个视频吗？')) {
        return;
      }
      
      try {
        setLoading(true, "删除视频...");
        const response = await fetch(`/api/admin/tv/channels/${currentChannelId}/videos/${videoId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
          }
        });
        const data = await response.json();
        if (data.code === 200) {
          toast('删除视频成功');
          loadVideos(currentChannelId);
        } else {
          toast('删除视频失败');
        }
      } catch (error) {
        console.error('删除视频失败:', error);
        toast('删除视频失败');
      } finally {
        setLoading(false);
      }
    };
    
    // 保存视频
    const saveVideo = async () => {
      const title = document.getElementById('videoTitleInput').value.trim();
      const order = parseInt(document.getElementById('videoOrderInput').value) || 1;
      const url = document.getElementById('videoUrlInput').value.trim();
      const image = document.getElementById('videoImageInput').value.trim();
      
      if (!title || !url) {
        toast('视频标题和链接不能为空');
        return;
      }
      
      try {
        setLoading(true, "保存视频...");
        const apiUrl = currentVideoId ? 
          `/api/admin/tv/channels/${currentChannelId}/videos/${currentVideoId}` : 
          `/api/admin/tv/channels/${currentChannelId}/videos`;
        const method = currentVideoId ? 'PUT' : 'POST';
        
        const response = await fetch(apiUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
          },
          body: JSON.stringify({ title, order, url, image })
        });
        
        const data = await response.json();
        if (data.code === 200) {
          toast('保存视频成功');
          hideVideoEditForm();
          loadVideos(currentChannelId);
        } else {
          toast('保存视频失败');
        }
      } catch (error) {
        console.error('保存视频失败:', error);
        toast('保存视频失败');
      } finally {
        setLoading(false);
      }
    };
    

    
    // 删除频道
    const deleteChannel = async (id) => {
      if (!confirm('确定要删除这个频道吗？')) {
        return;
      }
      
      try {
        setLoading(true, "删除频道...");
        const response = await fetch(`/api/admin/tv/channels/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
          }
        });
        const data = await response.json();
        if (data.code === 200) {
          toast('删除频道成功');
          loadChannelsData();
        } else {
          toast('删除频道失败');
        }
      } catch (error) {
        console.error('删除频道失败:', error);
        toast('删除频道失败');
      } finally {
        setLoading(false);
      }
    };
    
    // 切换到视频管理并选择频道
    const switchToVideoManagement = async (channelId) => {
      currentChannelId = channelId;
      
      // 切换到视频管理tab
      const tvTabVideos = document.getElementById('tvTabVideos');
      if (tvTabVideos) {
        tvTabVideos.click();
      }
      
      // 选择对应的频道
      setTimeout(async () => {
        const videoChannelSelect = document.getElementById('videoChannelSelect');
        if (videoChannelSelect) {
          videoChannelSelect.value = channelId;
          updateChannelDisplay(channelId);
          await loadVideos(channelId);
          // 确保显示频道名称而不是选择框
          videoChannelSelect.classList.add('hidden');
          document.getElementById('currentChannelDisplay').classList.remove('hidden');
        }
      }, 100);
    };
    
    // 初始化电视管理
    const initTvManagement = () => {
      const addChannelBtn = document.getElementById('addChannelBtn');
      const loadChannelsBtn = document.getElementById('loadChannelsBtn');
      const cancelChannelBtn = document.getElementById('cancelChannelBtn');
      const saveChannelBtn = document.getElementById('saveChannelBtn');
      const cancelVideoBtn = document.getElementById('cancelVideoBtn');
      const saveVideoBtn = document.getElementById('saveVideoBtn');
      const addVideoBtn = document.getElementById('addVideoBtn');
      const videoChannelSelect = document.getElementById('videoChannelSelect');
      const tvTabChannels = document.getElementById('tvTabChannels');
      const tvTabVideos = document.getElementById('tvTabVideos');
      const channelsSection = document.getElementById('channelsSection');
      const videosSection = document.getElementById('videosSection');
      
      // Tab切换功能
      if (tvTabChannels) {
        tvTabChannels.addEventListener('click', () => {
          tvTabChannels.classList.add('bg-white', 'shadow', 'text-slate-800');
          tvTabChannels.classList.remove('text-slate-600');
          tvTabVideos.classList.remove('bg-white', 'shadow', 'text-slate-800');
          tvTabVideos.classList.add('text-slate-600');
          channelsSection.classList.remove('hidden');
          videosSection.classList.add('hidden');
          // 只有在频道数据未加载时才加载
          if (!channelsLoaded) {
            loadChannelsData();
          } else {
            // 数据已加载，直接渲染
            renderChannelsList(channelsData);
            document.getElementById('tvMeta').textContent = `共 ${channelsData.length} 个频道`;
          }
        });
      }
      
      if (tvTabVideos) {
        tvTabVideos.addEventListener('click', () => {
          tvTabVideos.classList.add('bg-white', 'shadow', 'text-slate-800');
          tvTabVideos.classList.remove('text-slate-600');
          tvTabChannels.classList.remove('bg-white', 'shadow', 'text-slate-800');
          tvTabChannels.classList.add('text-slate-600');
          channelsSection.classList.add('hidden');
          videosSection.classList.remove('hidden');
          // 只有在频道数据未加载时才加载
          if (!channelsLoaded) {
            loadChannelsForVideoSelect();
          } else {
            // 数据已加载，只需更新选择框
            const select = document.getElementById('videoChannelSelect');
            const channelDisplay = document.getElementById('currentChannelDisplay');
            if (select && channelDisplay) {
              // 保存当前选择的频道ID
              const currentSelectedValue = select.value;
              select.innerHTML = '<option value="">选择频道</option>';
              channelsData.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel._id;
                option.textContent = channel.name;
                select.appendChild(option);
              });
              // 恢复之前选择的频道
              if (currentSelectedValue) {
                select.value = currentSelectedValue;
                updateChannelDisplay(currentSelectedValue);
              }
            }
          }
          if (videoChannelSelect.value) {
            // 同步currentChannelId
            currentChannelId = videoChannelSelect.value;
            // 显示视频列表内容
            document.getElementById('videosContent').classList.remove('hidden');
          } else {
            // 隐藏视频列表内容
            document.getElementById('videosContent').classList.add('hidden');
          }
        });
      }
      
      // 频道选择变化
      if (videoChannelSelect) {
        videoChannelSelect.addEventListener('change', (e) => {
          const channelId = e.target.value;
          currentChannelId = channelId;
          updateChannelDisplay(channelId);
          if (channelId) {
            loadVideos(channelId);
            // 显示视频列表内容
            document.getElementById('videosContent').classList.remove('hidden');
          } else {
            // 隐藏视频列表内容
            document.getElementById('videosContent').classList.add('hidden');
          }
          // 选择后隐藏选择框，显示频道名称
          videoChannelSelect.classList.add('hidden');
          document.getElementById('currentChannelDisplay').classList.remove('hidden');
        });
      }
      
      // 点击频道显示区域时显示选择框
      const currentChannelDisplay = document.getElementById('currentChannelDisplay');
      if (currentChannelDisplay) {
        currentChannelDisplay.addEventListener('click', () => {
          const select = document.getElementById('videoChannelSelect');
          if (select) {
            select.classList.remove('hidden');
            currentChannelDisplay.classList.add('hidden');
            // 隐藏视频列表内容
            document.getElementById('videosContent').classList.add('hidden');
          }
        });
      }
      
      // 刷新按钮事件
      const refreshVideosBtn = document.getElementById('refreshVideosBtn');
      if (refreshVideosBtn) {
        refreshVideosBtn.addEventListener('click', () => {
          if (currentChannelId) {
            loadVideos(currentChannelId);
          } else {
            toast('请先选择频道');
          }
        });
      }
      
      if (addChannelBtn) {
        addChannelBtn.addEventListener('click', async () => {
          // 确保频道数据已加载
          if (!channelsLoaded) {
            await loadChannelsData();
          }
          showChannelEditForm();
        });
      }
      
      if (addVideoBtn) {
        addVideoBtn.addEventListener('click', () => {
          if (!videoChannelSelect.value) {
            toast('请先选择频道');
            return;
          }
          currentChannelId = videoChannelSelect.value;
          showVideoEditForm();
        });
      }
      
      if (loadChannelsBtn) {
        loadChannelsBtn.addEventListener('click', loadChannelsData);
        loadChannelsBtn.classList.remove('hidden');
      }
      
      if (cancelChannelBtn) {
        cancelChannelBtn.addEventListener('click', hideChannelEditForm);
      }
      
      if (saveChannelBtn) {
        saveChannelBtn.addEventListener('click', saveChannel);
      }
      
      if (cancelVideoBtn) {
        cancelVideoBtn.addEventListener('click', hideVideoEditForm);
      }
      
      if (saveVideoBtn) {
        saveVideoBtn.addEventListener('click', saveVideo);
      }
      
      // 视频封面预览
      const videoImageInput = document.getElementById('videoImageInput');
      const videoImagePreview = document.getElementById('videoImagePreview');
      if (videoImageInput && videoImagePreview) {
        videoImageInput.addEventListener('input', function() {
          const url = this.value.trim();
          if (url) {
            videoImagePreview.src = url;
            videoImagePreview.classList.remove('hidden');
          } else {
            videoImagePreview.src = '';
            videoImagePreview.classList.add('hidden');
          }
        });
      }
      
      // 从分享链接添加视频
      const addFromShareBtn = document.getElementById('addFromShareBtn');
      if (addFromShareBtn) {
        addFromShareBtn.addEventListener('click', async () => {
          const shareUrlInput = document.getElementById('shareUrlInput');
          const shareUrl = shareUrlInput.value.trim();
          
          if (!shareUrl) {
            toast('请输入分享链接');
            return;
          }
          
          if (!videoChannelSelect.value) {
            toast('请先选择频道');
            return;
          }
          
          try {
            setLoading(true, "处理分享链接...");
            
            // 从分享链接中提取分享ID
            const shareId = extractShareIdFromUrl(shareUrl);
            if (!shareId) {
              toast('无效的分享链接');
              return;
            }
            
            // 获取分享信息
            const shareResponse = await fetch(`/api/share/${shareId}`, {
              headers: authHeaders()
            });
            
            const shareData = await shareResponse.json();
            if (shareData.code !== 200) {
              toast(shareData.message || '获取分享信息失败');
              return;
            }
            
            const videoData = shareData.data;
            if (!videoData || !videoData.url) {
              toast('分享信息不完整');
              return;
            }
            
            // 显示视频编辑表单并传递视频数据
            currentChannelId = videoChannelSelect.value;
            showVideoEditForm({
              title: videoData.title || '未命名视频',
              url: (videoData.url || '').replace(/`/g, '').trim(),
              image: (videoData.pic || '').replace(/`/g, '').trim(),
              order: 1
            });
            
            toast('已从分享链接提取视频信息');
          } catch (error) {
            console.error('从分享添加视频失败:', error);
            toast('从分享添加视频失败');
          } finally {
            setLoading(false);
          }
        });
      }
    };
    
    // 从分享链接中提取分享ID
    const extractShareIdFromUrl = (url) => {
      try {
        // 从URL中提取sid参数
        const urlParams = new URLSearchParams(new URL(url).search);
        const sid = urlParams.get('sid');
        return sid;
      } catch (error) {
        console.error('解析分享链接失败:', error);
        return null;
      }
    };

    // 初始化电视管理
    initTvManagement();
