/* 配置、资料与导航 */
    let feedbackDeleteMessage = "";
    let passwordResetSettings = {
      resetMethod: "securityQuestion",
      securityQuestions: [
        "您母亲的姓名是什么？",
        "您的出生城市是？",
        "您的小学校名是？",
        "您的第一个宠物名字是？",
        "您的第一次旅行地点是？"
      ],
      emailFrom: "",
      emailPass: "",
      emailSubject: "密码重置请求",
      emailTemplate: "您请求重置您的账户密码。请点击以下链接完成重置：\n\n{resetLink}\n\n此链接将在24小时后失效。\n\n如果您没有请求密码重置，请忽略此邮件。"
    };

    let navigationSettings = {
      siteTitle: 'SmartNav',
      siteDescription: '让上网更高效',
      theme: 'light',
      categories: []
    };

    // 加载导航设置
    const loadNavigationSettings = async () => {
      try {
        const res = await fetch('/api/user/navigation-settings', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', ...authHeaders() }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200) {
            navigationSettings = data.data || {
              siteTitle: 'SmartNav',
              siteDescription: '让上网更高效',
              theme: 'light',
              categories: []
            };
            // 渲染导航设置
            const siteTitleInput = document.getElementById('navigationSiteTitle');
            if (siteTitleInput) {
              siteTitleInput.value = navigationSettings.siteTitle || 'SmartNav';
            }
            const siteDescriptionInput = document.getElementById('navigationSiteDescription');
            if (siteDescriptionInput) {
              siteDescriptionInput.value = navigationSettings.siteDescription || '让上网更高效';
            }
            const copyrightInput = document.getElementById('navigationCopyright');
            if (copyrightInput) {
              copyrightInput.value = navigationSettings.copyright || '© 2024 SmartNav - 智能网站导航';
            }
            
            // 设置主题单选按钮
            const themeRadios = document.querySelectorAll('input[name="navigationTheme"]');
            if (themeRadios.length > 0) {
              themeRadios.forEach(radio => {
                radio.checked = radio.value === navigationSettings.theme;
              });
            }
            
            // 渲染分类和网站
            if (typeof renderNavigationCategories === 'function') {
              renderNavigationCategories();
            }
            if (typeof renderNavigationSites === 'function') {
              renderNavigationSites();
            }
          } else {
            toast(data.message || '加载失败');
          }
        } else {
          toast('加载导航设置失败');
        }
      } catch (error) {
        console.error('加载导航设置失败:', error);
        toast('加载导航设置失败');
      }
    };

    // 搜索关键字相关变量
    let currentSearchKeywordsPage = 1;
    let currentSearchKeywordsPageSize = 20;
    let currentSearchKeywordsTotalPages = 1;
    let currentSearchKeywordsTotal = 0;
    let keywordsChart = null;
    const FALLBACK_IMAGE = "/video/loading.gif";

    const authHeaders = () => {
      const token = getToken();
      return token ? { Authorization: "Bearer " + token } : {};
    };

    const renderProfileBox = (profile) => {
      const box = document.getElementById("profileBox");
      if (!box) return;
      if (!profile) {
        box.textContent = "未登录";
        return;
      }
      const avatar = String(profile.avatar || "").trim();
      const nickname = String(profile.nickname || "").trim();
      const username = String(profile.username || "").trim();
      const role = String(profile.role || "").trim();
      const apiAccess = String(profile.apiAccess || "").trim();
      const isDisabled = profile.isDisabled || false;
      const disabledReason = String(profile.disabledReason || "").trim();
      const createdAt = profile.createdAt ? new Date(profile.createdAt).toLocaleString() : "";
      const updatedAt = profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "";
      const lastSeenAt = profile.lastSeenAt ? new Date(profile.lastSeenAt).toLocaleString() : "";
      const profileNote = String(profile.profileNote || "").trim();
      const adminNote = String(profile.note || "").trim();
      const title = nickname || username || "-";
      const subtitle = nickname && username ? `@${username}` : (username || "");
      box.innerHTML = `
        <div class="flex flex-col md:flex-row items-start gap-4">
          <div class="w-16 h-16 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-lg font-semibold text-slate-600">
            ${avatar ? `<img src="${avatar}" class="w-full h-full object-cover" />` : title.charAt(0)}
          </div>
          <div class="flex-1 space-y-2">
            <div>
              <div class="font-semibold text-slate-800">${title}</div>
              ${subtitle ? `<div class="text-sm text-slate-500">${subtitle}</div>` : ""}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              ${role ? `<div class="text-slate-600">角色: ${role}</div>` : ""}
              ${apiAccess ? `<div class="text-slate-600">API访问: ${apiAccess}</div>` : ""}
              <div class="text-slate-600">状态: ${isDisabled ? '已禁用' : '正常'}</div>
              ${isDisabled && disabledReason ? `<div class="text-slate-600">禁用原因: ${disabledReason}</div>` : ""}
              ${createdAt ? `<div class="text-slate-600">创建时间: ${createdAt}</div>` : ""}
              ${updatedAt ? `<div class="text-slate-600">更新时间: ${updatedAt}</div>` : ""}
              ${lastSeenAt ? `<div class="text-slate-600">最后在线: ${lastSeenAt}</div>` : ""}
              ${profileNote ? `<div class="text-slate-600 cursor-pointer hover:bg-slate-100 p-1 rounded" data-note="${profileNote}" onclick="editProfileNote(this)">个人备注: ${profileNote}</div>` : `<div class="text-slate-600 cursor-pointer hover:bg-slate-100 p-1 rounded" data-note="" onclick="editProfileNote(this)">个人备注: <span class="text-slate-400">点击添加</span></div>`}
              ${adminNote ? `<div class="text-slate-600 cursor-pointer hover:bg-slate-100 p-1 rounded" data-note="${adminNote}" onclick="editAdminNote(this)">管理员备注: ${adminNote}</div>` : `<div class="text-slate-600 cursor-pointer hover:bg-slate-100 p-1 rounded" data-note="" onclick="editAdminNote(this)">管理员备注: <span class="text-slate-400">点击添加</span></div>`}
              <div class="text-slate-600">密码: <button class="text-blue-600 hover:underline" onclick="showPasswordResetModal()">点击修改</button></div>
            </div>
          </div>
        </div>
      `;
    };

    // 显示密码修改模态框
    const showPasswordResetModal = () => {
      // 创建密码修改模态框
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">修改密码</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">旧密码</label>
              <input type="password" id="oldPassword" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请输入旧密码">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
              <input type="password" id="newPassword" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请输入新密码">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
              <input type="password" id="confirmPassword" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请再次输入新密码">
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
            <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 confirm-btn">确认修改</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 确认按钮事件
      modal.querySelector('.confirm-btn').addEventListener('click', async () => {
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!oldPassword || !newPassword || !confirmPassword) {
          toast('请填写所有字段');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          toast('两次输入的新密码不一致');
          return;
        }
        
        try {
          setLoading(true, "修改密码中...");
          
          const res = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ oldPassword, newPassword })
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.code === 200) {
              toast('密码修改成功');
              modal.remove();
            } else {
              toast(data.message || '密码修改失败');
            }
          } else {
            toast('密码修改失败');
          }
        } catch (error) {
          console.error('密码修改失败:', error);
          toast('密码修改失败');
        } finally {
          setLoading(false);
        }
      });
    };

    // 编辑个人备注
    const editProfileNote = (element) => {
      // 保存原始内容
      const originalContent = element.getAttribute('data-note') || '';
      
      // 创建悬浮弹窗
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">编辑个人备注</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">个人备注</label>
              <input type="text" value="${originalContent}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" id="profileNoteInput">
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
            <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 confirm-btn">确认保存</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 获取输入框并聚焦
      const input = document.getElementById('profileNoteInput');
      if (input) {
        input.focus();
        // 将光标移到内容末尾，而不是选中全部
        input.setSelectionRange(input.value.length, input.value.length);
        
        // 按Enter键保存，按Esc键取消
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            modal.querySelector('.confirm-btn').click();
          } else if (e.key === 'Escape') {
            modal.remove();
          }
        });
      }
      
      // 确认按钮事件
      modal.querySelector('.confirm-btn').addEventListener('click', async () => {
        const newNote = document.getElementById('profileNoteInput').value.trim();
        if (newNote !== originalContent) {
          try {
            setLoading(true, "保存备注...");
            
            const res = await fetch('/api/user/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ profileNote: newNote })
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data.code === 200) {
                // 更新显示
                element.innerHTML = `个人备注: ${newNote}`;
                element.className = 'text-slate-600 cursor-pointer hover:bg-slate-100 p-1 rounded';
                element.setAttribute('data-note', newNote);
                element.onclick = () => editProfileNote(element);
                toast('个人备注保存成功');
                modal.remove();
              } else {
                toast(data.message || '保存失败');
              }
            } else {
              toast('保存个人备注失败');
            }
          } catch (error) {
            console.error('保存个人备注失败:', error);
            toast('保存个人备注失败');
          } finally {
            setLoading(false);
          }
        } else {
          // 内容未改变，关闭弹窗
          modal.remove();
        }
      });
    };

    // 编辑管理员备注
    const editAdminNote = (element) => {
      // 保存原始内容
      const originalContent = element.getAttribute('data-note') || '';
      
      // 创建悬浮弹窗
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">编辑管理员备注</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">管理员备注</label>
              <input type="text" value="${originalContent}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" id="adminNoteInput">
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
            <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 confirm-btn">确认保存</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 获取输入框并聚焦
      const input = document.getElementById('adminNoteInput');
      if (input) {
        input.focus();
        // 将光标移到内容末尾，而不是选中全部
        input.setSelectionRange(input.value.length, input.value.length);
        
        // 按Enter键保存，按Esc键取消
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            modal.querySelector('.confirm-btn').click();
          } else if (e.key === 'Escape') {
            modal.remove();
          }
        });
      }
      
      // 确认按钮事件
      modal.querySelector('.confirm-btn').addEventListener('click', async () => {
        const newNote = document.getElementById('adminNoteInput').value.trim();
        if (newNote !== originalContent) {
          try {
            setLoading(true, "保存备注...");
            
            const res = await fetch(`/api/user/${currentProfile._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ note: newNote })
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data.code === 200) {
                // 更新显示
                element.innerHTML = `管理员备注: ${newNote}`;
                element.className = 'text-slate-600 cursor-pointer hover:bg-slate-100 p-1 rounded';
                element.setAttribute('data-note', newNote);
                element.onclick = () => editAdminNote(element);
                toast('管理员备注保存成功');
                modal.remove();
              } else {
                toast(data.message || '保存失败');
              }
            } else {
              toast('保存管理员备注失败');
            }
          } catch (error) {
            console.error('保存管理员备注失败:', error);
            toast('保存管理员备注失败');
          } finally {
            setLoading(false);
          }
        } else {
          // 内容未改变，关闭弹窗
          modal.remove();
        }
      });
    };

    // 渲染导航分类
    const renderNavigationCategories = () => {
      const categoriesList = document.getElementById('navigationCategoriesList');
      if (!categoriesList) return;
      
      if (navigationSettings.categories.length === 0) {
        categoriesList.innerHTML = '<div class="text-center text-slate-500 py-4">暂无分类</div>';
        return;
      }
      
      categoriesList.innerHTML = navigationSettings.categories.map(category => {
        const categoryEncoded = encodeURIComponent(category.category);
        return `
          <div class="bg-white border rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold">${category.category}</h4>
              <div class="flex items-center gap-2">
                <button class="px-2 py-1 rounded text-xs bg-blue-600 text-white" onclick="editNavigationCategory('${categoryEncoded}')">编辑</button>
                <button class="px-2 py-1 rounded text-xs bg-rose-600 text-white" onclick="deleteNavigationCategory('${categoryEncoded}')">删除</button>
              </div>
            </div>
            <div class="text-sm text-slate-500">网站数量: ${category.links.length}</div>
          </div>
        `;
      }).join('');
    };

    // 渲染导航站点
    const renderNavigationSites = () => {
      const sitesList = document.getElementById('navigationSitesList');
      if (!sitesList) return;
      
      if (navigationSettings.categories.length === 0) {
        sitesList.innerHTML = '<div class="text-center text-slate-500 py-4">暂无网站</div>';
        return;
      }
      
      sitesList.innerHTML = navigationSettings.categories.map(category => {
        if (category.links.length === 0) return '';
        
        return `
          <div class="bg-white border rounded-lg p-4">
            <h4 class="font-semibold mb-3">${category.category}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${category.links.map(link => {
                const categoryEncoded = encodeURIComponent(category.category);
                const urlEncoded = encodeURIComponent(link.url);
                const nameEncoded = encodeURIComponent(link.name);
                const iconEncoded = encodeURIComponent(link.icon);
                return `
                  <div class="flex items-center justify-between p-2 border rounded">
                    <div class="flex items-center gap-3">
                      <i class="fa ${link.icon || 'fa-link'} text-slate-500"></i>
                      <div>
                        <div class="font-medium">${link.name}</div>
                        <div class="text-xs text-slate-500 truncate">${link.url}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="px-2 py-1 rounded text-xs bg-blue-600 text-white" onclick="editNavigationSite('${categoryEncoded}', '${urlEncoded}', '${nameEncoded}', '${iconEncoded}')">编辑</button>
                      <button class="px-2 py-1 rounded text-xs bg-rose-600 text-white" onclick="deleteNavigationSite('${categoryEncoded}', '${urlEncoded}')">删除</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
    };

    // 保存导航设置
    const saveNavigationSettings = async () => {
      try {
        setLoading(true, "保存设置...");
        
        // 收集表单数据
        const siteTitleInput = document.getElementById('navigationSiteTitle');
        const siteDescriptionInput = document.getElementById('navigationSiteDescription');
        const copyrightInput = document.getElementById('navigationCopyright');
        const checkedThemeRadio = document.querySelector('input[name="navigationTheme"]:checked');
        
        const settings = {
          siteTitle: siteTitleInput ? siteTitleInput.value : 'SmartNav',
          siteDescription: siteDescriptionInput ? siteDescriptionInput.value : '让上网更高效',
          theme: checkedThemeRadio ? checkedThemeRadio.value : 'light',
          copyright: copyrightInput ? copyrightInput.value : '© 2024 SmartNav - 智能网站导航',
          categories: navigationSettings.categories || []
        };
        
        const res = await fetch('/api/user/navigation-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(settings)
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200) {
            navigationSettings = data.data || {
              siteTitle: 'SmartNav',
              siteDescription: '让上网更高效',
              theme: 'light',
              categories: []
            };
            renderNavigationCategories();
            renderNavigationSites();
            toast('导航设置保存成功');
          } else {
            toast(data.message || '保存失败');
          }
        } else {
          toast('保存导航设置失败');
        }
      } catch (error) {
        console.error('保存导航设置失败:', error);
        toast('保存导航设置失败');
      } finally {
        setLoading(false);
      }
    };

    // 显示删除确认模态框
    const showDeleteConfirmModal = (title, message, onConfirm) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">${title}</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <p class="text-gray-600 mb-6">${message}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
            <button type="button" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 confirm-btn">删除</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 确认按钮事件
      modal.querySelector('.confirm-btn').addEventListener('click', async () => {
        await onConfirm();
        modal.remove();
      });
    };

    // 删除导航分类
    const deleteNavigationCategory = async (categoryEncoded) => {
      const category = decodeURIComponent(categoryEncoded);
      showDeleteConfirmModal(
        '删除分类',
        `确定删除分类「${category}」吗？该分类下的网站也会被删除。`,
        async () => {
          navigationSettings.categories = navigationSettings.categories.filter(cat => cat.category !== category);
          renderNavigationCategories();
          renderNavigationSites();
          
          // 自动保存到数据库
          await saveNavigationSettings();
        }
      );
    };

    // 删除导航网站
    const deleteNavigationSite = async (categoryEncoded, urlEncoded) => {
      const category = decodeURIComponent(categoryEncoded);
      const url = decodeURIComponent(urlEncoded);
      
      // 查找网站名称
      let siteName = '该网站';
      const categoryIndex = navigationSettings.categories.findIndex(cat => cat.category === category);
      if (categoryIndex !== -1) {
        const site = navigationSettings.categories[categoryIndex].links.find(link => link.url === url);
        if (site) {
          siteName = site.name;
        }
      }
      
      showDeleteConfirmModal(
        '删除网站',
        `确定删除网站「${siteName}」吗？`,
        async () => {
          const categoryIndex = navigationSettings.categories.findIndex(cat => cat.category === category);
          if (categoryIndex !== -1) {
            navigationSettings.categories[categoryIndex].links = navigationSettings.categories[categoryIndex].links.filter(link => link.url !== url);
            renderNavigationSites();
            renderNavigationCategories(); // 更新分类统计
            
            // 自动保存到数据库
            await saveNavigationSettings();
          }
        }
      );
    };

    // 显示编辑分类模态框
    const editNavigationCategory = (categoryEncoded) => {
      const category = decodeURIComponent(categoryEncoded);
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">编辑分类</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <form class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
              <input type="text" id="editCategoryNameInput" value="${category}" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90">保存</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 表单提交事件
      modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCategoryName = document.getElementById('editCategoryNameInput').value.trim();
        if (!newCategoryName) return;
        
        // 检查分类名称是否已存在
        const existingCategory = navigationSettings.categories.find(cat => cat.category === newCategoryName && cat.category !== category);
        if (existingCategory) {
          toast('该分类已存在');
          return;
        }
        
        // 更新分类名称
        const categoryIndex = navigationSettings.categories.findIndex(cat => cat.category === category);
        if (categoryIndex !== -1) {
          navigationSettings.categories[categoryIndex].category = newCategoryName;
          renderNavigationCategories();
          renderNavigationSites();
          
          // 自动保存到数据库
          await saveNavigationSettings();
          
          modal.remove();
          toast('分类编辑成功');
        }
      });
    };

    // 显示编辑网站模态框
    const editNavigationSite = (categoryEncoded, urlEncoded, nameEncoded, iconEncoded) => {
      const category = decodeURIComponent(categoryEncoded);
      const url = decodeURIComponent(urlEncoded);
      const name = decodeURIComponent(nameEncoded);
      const icon = decodeURIComponent(iconEncoded);
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">编辑网站</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <form class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">网站名称</label>
              <input type="text" id="editSiteNameInput" value="${name}" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">网站URL</label>
              <input type="text" id="editSiteUrlInput" value="${url}" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select id="editSiteCategoryInput" required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                ${navigationSettings.categories.map(cat => `<option value="${cat.category}" ${cat.category === category ? 'selected' : ''}>${cat.category}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">图标</label>
              <input type="text" id="editSiteIconInput" value="${icon}" placeholder="fa-link"
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90">保存</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 表单提交事件
      modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('editSiteNameInput').value.trim();
        const newUrl = document.getElementById('editSiteUrlInput').value.trim();
        const newCategory = document.getElementById('editSiteCategoryInput').value;
        const newIcon = document.getElementById('editSiteIconInput').value.trim() || 'fa-link';
        
        if (!newName || !newUrl) return;
        
        // 处理 URL
        let finalUrl = newUrl;
        if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://') && !newUrl.startsWith('/')) {
            finalUrl = 'https://' + newUrl;
        }
        
        // 更新网站信息
        const categoryIndex = navigationSettings.categories.findIndex(cat => cat.category === category);
        if (categoryIndex !== -1) {
            const siteIndex = navigationSettings.categories[categoryIndex].links.findIndex(link => link.url === url);
            if (siteIndex !== -1) {
                // 如果分类改变，需要将网站从原分类移动到新分类
                if (newCategory !== category) {
                    const newCategoryIndex = navigationSettings.categories.findIndex(cat => cat.category === newCategory);
                    if (newCategoryIndex !== -1) {
                        // 从原分类中移除网站
                        const site = navigationSettings.categories[categoryIndex].links.splice(siteIndex, 1)[0];
                        // 更新网站信息
                        site.name = newName;
                        site.url = finalUrl;
                        site.icon = newIcon;
                        // 添加到新分类
                        navigationSettings.categories[newCategoryIndex].links.push(site);
                    }
                } else {
                    // 分类未改变，直接更新网站信息
                    navigationSettings.categories[categoryIndex].links[siteIndex] = {
                        name: newName,
                        url: finalUrl,
                        icon: newIcon
                    };
                }
                
                renderNavigationSites();
                renderNavigationCategories(); // 更新分类统计
                
                // 自动保存到数据库
                await saveNavigationSettings();
                
                modal.remove();
                toast('网站编辑成功');
            }
        }
      });
    };

    // 显示添加分类模态框
    const showAddCategoryModal = () => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">添加分类</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <form class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
              <input type="text" id="categoryNameInput" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
              <button type="submit" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:opacity-90">添加</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 表单提交事件
      modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = document.getElementById('categoryNameInput').value.trim();
        if (!categoryName) return;
        
        const existingCategory = navigationSettings.categories.find(cat => cat.category === categoryName);
        if (existingCategory) {
          toast('该分类已存在');
          return;
        }
        
        navigationSettings.categories.push({
          category: categoryName,
          links: []
        });
        
        renderNavigationCategories();
        modal.remove();
        
        // 自动保存到数据库
        await saveNavigationSettings();
      });
    };

    // 显示添加网站模态框
    const showAddSiteModal = () => {
      if (navigationSettings.categories.length === 0) {
        toast('请先添加分类');
        return;
      }
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      
      const categoryOptions = navigationSettings.categories.map(cat => 
        `<option value="${cat.category}">${cat.category}</option>`
      ).join('');
      
      modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-md transform transition-all">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">添加网站</h3>
            <button class="text-gray-500 hover:text-gray-700 close-btn">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          <form class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">网站名称</label>
              <input type="text" id="siteNameInput" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">网站URL</label>
              <input type="text" id="siteUrlInput" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select id="siteCategoryInput" required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">选择分类</option>
                ${categoryOptions}
              </select>
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 close-btn">取消</button>
              <button type="submit" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:opacity-90">添加</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
      
      // 关闭按钮事件
      modal.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
      });
      
      // 表单提交事件
      modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const siteName = document.getElementById('siteNameInput').value.trim();
        const siteUrl = document.getElementById('siteUrlInput').value.trim();
        const category = document.getElementById('siteCategoryInput').value;
        
        if (!siteName || !siteUrl || !category) return;
        
        // 处理 URL
        let finalUrl = siteUrl;
        if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://') && !siteUrl.startsWith('/')) {
          // 普通网址，添加 https 协议
          finalUrl = 'https://' + siteUrl;
        }
        
        const selectedCategory = navigationSettings.categories.find(cat => cat.category === category);
        if (!selectedCategory) return;
        
        // 检查网站是否已存在
        const existingSite = selectedCategory.links.find(link => link.url === finalUrl);
        if (existingSite) {
          toast('该网站已存在');
          return;
        }
        
        selectedCategory.links.push({
          name: siteName,
          url: finalUrl,
          icon: 'fa-link'
        });
        
        renderNavigationSites();
        renderNavigationCategories(); // 更新分类统计
        modal.remove();
        
        // 自动保存到数据库
        await saveNavigationSettings();
      });
    };

    const openFeedbackReplyPanel = (id, summary, content) => {
      feedbackReplyTargetId = id || "";
      const panel = document.getElementById("feedbackReplyPanel");
      const meta = document.getElementById("feedbackReplyMeta");
      const contentBox = document.getElementById("feedbackReplyContent");
      const input = document.getElementById("feedbackReplyInput");
      if (!panel || !input) return;
      if (meta) meta.textContent = summary || "";
      if (contentBox) contentBox.textContent = content || "";
      input.value = "";
      panel.classList.remove("hidden");
      panel.classList.add("flex");
      input.focus();
    };

    const closeFeedbackReplyPanel = () => {
      const panel = document.getElementById("feedbackReplyPanel");
      const input = document.getElementById("feedbackReplyInput");
      const contentBox = document.getElementById("feedbackReplyContent");
      if (!panel) return;
      panel.classList.add("hidden");
      panel.classList.remove("flex");
      if (input) input.value = "";
      if (contentBox) contentBox.textContent = "";
      feedbackReplyTargetId = "";
    };

    const saveProfileField = async (field, value) => {
      if (!currentProfile || !currentProfile._id) {
        toast("请先登录");
        return false;
      }
      const payload = {};
      if (field === "nickname") payload.nickname = value;
      if (field === "avatar") payload.avatar = value;
      if (field === "profileNote") payload.profileNote = value;
      if (field === "password") payload.password = value;
      if (field === "adminNote") payload.adminNote = value;
      const res = await fetch(`/api/user/${currentProfile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "更新失败");
        return false;
      }
      currentProfile = data.data || currentProfile;
      renderProfileBox(currentProfile);
      return true;
    };

    const beginInlineEdit = (el) => {
      if (!el || el.dataset.editing === "1") return;
      const field = el.dataset.field;
      const oldValue = el.dataset.value || "";
      el.dataset.editing = "1";
      const input = document.createElement("input");
      input.type = field === "password" ? "password" : "text";
      input.className = "border rounded px-2 py-1 text-sm w-full md:w-80";
      input.value = field === "password" ? "" : oldValue;
      el.classList.add("hidden");
      el.parentNode.appendChild(input);
      input.focus();
      input.select();
      const cleanup = async (save) => {
        const newValue = (input.value || "").trim();
        input.remove();
        el.classList.remove("hidden");
        el.dataset.editing = "0";
        if (!save) return;
        if (field === "password") {
          if (!newValue) return;
        } else if (field === "adminNote" && !currentProfile?.role) {
          return;
        } else if (newValue === oldValue) {
          return;
        }
        const ok = await saveProfileField(field, newValue);
        if (!ok) {
          renderProfileBox(currentProfile);
        }
      };
      input.addEventListener("blur", async () => cleanup(true));
      input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          await cleanup(false);
        }
      });
    };

    const randomizeProfileAvatar = async () => {
      try {
        const res = await fetch("https://v2.xxapi.cn/api/head");
        const data = await res.json();
        if (data && data.code === 200 && data.data) {
          const url = String(data.data).trim();
          const ok = await saveProfileField("avatar", url);
          if (ok) toast("头像已更新");
        } else {
          toast("获取头像失败");
        }
      } catch (e) {
        toast("获取头像失败");
      }
    };

    // 加载密码重置设置
    const loadPasswordResetSettings = async () => {
      try {
        const res = await fetch("/api/user/password-reset-settings", {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.code === 200 && data.data) {
          passwordResetSettings = { ...passwordResetSettings, ...data.data };
          renderPasswordResetSettings();
        }
      } catch (error) {
        console.error("加载密码重置设置失败:", error);
      } finally {
        // 添加保存按钮事件监听器
        const saveBtn = document.getElementById("savePasswordResetSettingsBtn");
        if (saveBtn) {
          // 先移除可能存在的事件监听器，避免重复添加
          saveBtn.removeEventListener("click", savePasswordResetSettings);
          saveBtn.addEventListener("click", savePasswordResetSettings);
        }
      }
    };

    // 保存密码重置设置
    const savePasswordResetSettings = async () => {
      try {
        setLoading(true, "保存设置...");
        // 收集表单数据
        const checkedResetMethod = document.querySelector('input[name="resetMethod"]:checked');
        const securityQuestions = [];
        for (let i = 0; i < 5; i++) {
          const input = document.getElementById(`securityQuestion${i + 1}`);
          if (input) {
            securityQuestions.push(input.value.trim());
          }
        }
        const emailFromInput = document.getElementById("emailFrom");
        const emailPassInput = document.getElementById("emailPass");
        const emailSubjectInput = document.getElementById("emailSubject");
        const emailTemplateInput = document.getElementById("emailTemplate");
        
        const formData = {
          resetMethod: checkedResetMethod ? checkedResetMethod.value : "securityQuestion",
          securityQuestions: securityQuestions.filter(q => q),
          emailFrom: emailFromInput ? emailFromInput.value.trim() : "",
          emailPass: emailPassInput ? emailPassInput.value.trim() : "",
          emailSubject: emailSubjectInput ? emailSubjectInput.value.trim() : "密码重置请求",
          emailTemplate: emailTemplateInput ? emailTemplateInput.value.trim() : "您请求重置您的账户密码。请点击以下链接完成重置：\n\n{resetLink}\n\n此链接将在24小时后失效。\n\n如果您没有请求密码重置，请忽略此邮件。"
        };
        const res = await fetch("/api/user/password-reset-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.code === 200) {
          passwordResetSettings = { ...passwordResetSettings, ...formData };
          toast("设置保存成功");
        } else {
          toast(data.message || "保存失败");
        }
      } catch (error) {
        console.error("保存密码重置设置失败:", error);
        toast("保存失败");
      } finally {
        setLoading(false);
      }
    };

    // 渲染密码重置设置
    const renderPasswordResetSettings = () => {
      // 设置重置方式
      const resetMethodSecurityQuestion = document.getElementById("resetMethodSecurityQuestion");
      if (resetMethodSecurityQuestion) {
        resetMethodSecurityQuestion.checked = passwordResetSettings.resetMethod === "securityQuestion";
      }
      const resetMethodEmail = document.getElementById("resetMethodEmail");
      if (resetMethodEmail) {
        resetMethodEmail.checked = passwordResetSettings.resetMethod === "email";
      }
      const resetMethodBoth = document.getElementById("resetMethodBoth");
      if (resetMethodBoth) {
        resetMethodBoth.checked = passwordResetSettings.resetMethod === "both";
      }
      
      // 设置安全问题
      for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`securityQuestion${i + 1}`);
        if (input) {
          input.value = passwordResetSettings.securityQuestions?.[i] || "";
        }
      }
      
      // 设置邮箱信息
      const emailFromInput = document.getElementById("emailFrom");
      if (emailFromInput) {
        emailFromInput.value = passwordResetSettings.emailFrom || "";
      }
      const emailPassInput = document.getElementById("emailPass");
      if (emailPassInput) {
        emailPassInput.value = passwordResetSettings.emailPass || "";
      }
      const emailSubjectInput = document.getElementById("emailSubject");
      if (emailSubjectInput) {
        emailSubjectInput.value = passwordResetSettings.emailSubject || "密码重置请求";
      }
      const emailTemplateInput = document.getElementById("emailTemplate");
      if (emailTemplateInput) {
        emailTemplateInput.value = passwordResetSettings.emailTemplate || "您请求重置您的账户密码。请点击以下链接完成重置：\n\n{resetLink}\n\n此链接将在24小时后失效。\n\n如果您没有请求密码重置，请忽略此邮件。";
      }
    };

    // Skeleton screen functions
