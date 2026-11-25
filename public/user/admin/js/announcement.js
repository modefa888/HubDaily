/* 公告管理 */
    // 公告管理相关函数
    const loadAnnouncement = async () => {
      const meta = document.getElementById("announcementMeta");
      const pagesList = document.getElementById("announcementPagesList");
      const btn = document.getElementById("loadAnnouncementBtn");
      const editForm = document.getElementById("announcementEditForm");
      const announcementList = document.getElementById("announcementList");
      const newAnnouncementBtn = document.getElementById("newAnnouncementBtn");
      if (!meta || !pagesList) return;

      // 初始化Markdown编辑器
      initMarkdownEditor();

      // 隐藏编辑表单，显示公告列表和新建按钮
      if (editForm) editForm.classList.add("hidden");
      if (announcementList) announcementList.classList.remove("hidden");
      if (newAnnouncementBtn) newAnnouncementBtn.classList.remove("hidden");

      meta.textContent = "加载中...";
      if (btn) setBtnLoading(btn, true, "");

      try {
        // 加载可用页面列表
        try {
          const pagesRes = await fetch("/api/user/available-pages", { headers: authHeaders() });
          if (pagesRes.ok) {
            const pagesData = await pagesRes.json();
            if (pagesData.code === 200 && Array.isArray(pagesData.data)) {
              availablePages = pagesData.data;
              renderAnnouncementPagesList(pagesData.data);
            }
          }
        } catch (pagesError) {
          console.error("加载页面列表失败:", pagesError);
          // 即使页面列表加载失败，也继续显示编辑界面
          renderAnnouncementPagesList([]);
        }

        // 加载公告列表
        try {
          const announcementRes = await fetch("/api/user/announcements", { headers: authHeaders() });
          if (announcementRes.ok) {
            const announcementData = await announcementRes.json();
            if (announcementData.code === 200 && Array.isArray(announcementData.data)) {
              renderAnnouncementList(announcementData.data);
            }
          }
        } catch (announcementError) {
          console.error("加载公告列表失败:", announcementError);
          // 即使公告列表加载失败，也继续显示编辑界面
          renderAnnouncementList([]);
        }

        meta.textContent = "加载完成";
      } catch (error) {
        console.error("加载公告失败:", error);
        meta.textContent = "部分加载失败";
        toast("加载公告时遇到问题，但编辑功能仍然可用");
      } finally {
        if (btn) setBtnLoading(btn, false, "刷新");
      }
    };

    const showAnnouncementEditForm = () => {
      const editForm = document.getElementById("announcementEditForm");
      const announcementList = document.getElementById("announcementList");
      const newAnnouncementBtn = document.getElementById("newAnnouncementBtn");
      if (editForm) editForm.classList.remove("hidden");
      if (announcementList) announcementList.classList.add("hidden");
      if (newAnnouncementBtn) newAnnouncementBtn.classList.add("hidden");
    };

    const hideAnnouncementEditForm = () => {
      const editForm = document.getElementById("announcementEditForm");
      const announcementList = document.getElementById("announcementList");
      const newAnnouncementBtn = document.getElementById("newAnnouncementBtn");
      if (editForm) editForm.classList.add("hidden");
      if (announcementList) announcementList.classList.remove("hidden");
      if (newAnnouncementBtn) newAnnouncementBtn.classList.remove("hidden");
      // 清空表单
      document.getElementById("announcementTitleInput").value = "";
      document.getElementById("announcementTypeSelect").value = "info";
      if (markdownEditor) {
        markdownEditor.value("");
      } else {
        document.getElementById("announcementContentInput").value = "";
      }
      document.getElementById("announcementStartTimeInput").value = "";
      document.getElementById("announcementEndTimeInput").value = "";
      document.querySelectorAll(".announcement-page-checkbox").forEach(cb => cb.checked = false);
      currentEditingAnnouncementId = null;
    };

    const renderAnnouncementPagesList = (pages) => {
      const pagesList = document.getElementById("announcementPagesList");
      if (!pagesList) return;

      pagesList.innerHTML = pages.map(page => {
        let pagePath = "";
        if (typeof page === "string") {
          pagePath = page.trim();
        } else {
          pagePath = String(page.path || "").trim();
        }
        const pageName = pagePath;
        return `
          <div class="flex items-center space-x-2">
            <input type="checkbox" id="page_${pagePath.replace(/\//g, "_")}" class="announcement-page-checkbox" value="${pagePath}">
            <label for="page_${pagePath.replace(/\//g, "_")}" class="flex-1">${pageName}</label>
          </div>
        `;
      }).join("");
    };

    const renderAnnouncementList = (announcements) => {
      const list = document.getElementById("announcementList");
      if (!list) return;

      if (announcements.length === 0) {
        list.innerHTML = '<div class="text-center text-slate-500 py-4">暂无公告</div>';
        return;
      }

      list.innerHTML = announcements.map(ann => {
        const id = String(ann._id || "").trim();
        const title = String(ann.title || "").trim();
        const type = String(ann.type || "info").trim();
        const content = String(ann.content || "").trim();
        const startTime = formatTime(ann.startTime);
        const endTime = formatTime(ann.endTime);
        const pages = Array.isArray(ann.pages) ? ann.pages : [];
        const isActive = ann.isActive || false;

        return `
          <div class="border rounded-lg p-3 ${isActive ? "bg-slate-50" : "bg-slate-100"}">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex-1">
                <h3 class="font-medium text-slate-800">${title}</h3>
                <div class="text-xs text-slate-500 mt-1">
                  <span>${type === "info" ? "信息" : type === "warning" ? "警告" : "错误"}</span> · 
                  <span>生效: ${startTime}</span> · 
                  <span>过期: ${endTime}</span> · 
                  <span class="${isActive ? "text-green-500" : "text-red-500"}">状态: ${isActive ? "生效中" : "已过期"}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button class="px-2 py-1 rounded text-xs bg-blue-600 text-white" onclick="editAnnouncement('${id}')">编辑</button>
                <button class="px-2 py-1 rounded text-xs bg-rose-600 text-white" onclick="deleteAnnouncement('${id}')">删除</button>
              </div>
            </div>
            <div class="text-sm text-slate-600 mt-2 markdown-content">${typeof marked === 'function' ? marked(content) : content}</div>
            <div class="text-xs text-slate-500 mt-2">
              <span>显示页面:</span>
              <div class="mt-1 flex flex-wrap gap-1">
                ${pages.map(page => `<span class="px-2 py-0.5 bg-slate-200 rounded">${page}</span>`).join("")}
              </div>
            </div>
          </div>
        `;
      }).join("");
    };

    const getSelectedAnnouncementPages = () => {
      const checkboxes = document.querySelectorAll(".announcement-page-checkbox:checked");
      return Array.from(checkboxes).map(cb => cb.value);
    };

    const selectAllAnnouncementPages = () => {
      const checkboxes = document.querySelectorAll(".announcement-page-checkbox");
      checkboxes.forEach(cb => cb.checked = true);
    };

    const clearAllAnnouncementPages = () => {
      const checkboxes = document.querySelectorAll(".announcement-page-checkbox");
      checkboxes.forEach(cb => cb.checked = !cb.checked);
    };

    const saveAnnouncement = async () => {
      const titleInput = document.getElementById("announcementTitleInput");
      const typeSelect = document.getElementById("announcementTypeSelect");
      const contentInput = document.getElementById("announcementContentInput");
      const startTimeInput = document.getElementById("announcementStartTimeInput");
      const endTimeInput = document.getElementById("announcementEndTimeInput");
      const saveBtn = document.getElementById("saveAnnouncementBtn");

      if (!titleInput || !typeSelect || !contentInput || !startTimeInput || !endTimeInput || !saveBtn) {
        toast("表单元素缺失");
        return;
      }

      const title = titleInput.value.trim();
      const type = typeSelect.value;
      const content = markdownEditor ? markdownEditor.value() : contentInput.value.trim();
      const startTime = startTimeInput.value;
      const endTime = endTimeInput.value;
      const pages = getSelectedAnnouncementPages();

      if (!title) {
        toast("请输入公告标题");
        return;
      }

      if (!content) {
        toast("请输入公告内容");
        return;
      }

      if (!startTime) {
        toast("请选择生效时间");
        return;
      }

      if (!endTime) {
        toast("请选择过期时间");
        return;
      }

      if (pages.length === 0) {
        toast("请至少选择一个显示页面");
        return;
      }

      saveBtn.disabled = true;
      setLoading(true, "保存公告...");

      try {
        let res;
        const payload = { title, type, content, startTime, endTime, pages };
        
        if (currentEditingAnnouncementId) {
          // 更新现有公告
          res = await fetch(`/api/user/announcement/${currentEditingAnnouncementId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          });
        } else {
          // 创建新公告
          res = await fetch("/api/user/announcement", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          });
        }

        const data = await res.json();
        if (data.code === 200) {
          toast("保存成功");
          // 重新加载公告列表
          await loadAnnouncement();
        } else {
          toast(data.message || "保存失败");
        }
      } catch (error) {
        console.error("保存公告失败:", error);
        toast("保存失败");
      } finally {
        saveBtn.disabled = false;
        setLoading(false);
      }
    };

    let currentEditingAnnouncementId = null;
    let markdownEditor = null;

    // 初始化Markdown编辑器
    const initMarkdownEditor = () => {
      if (markdownEditor) return;
      if (typeof EasyMDE === 'undefined') {
        console.warn('EasyMDE is not loaded yet');
        return;
      }
      const textarea = document.getElementById('announcementContentInput');
      if (!textarea) return;
      // 确保textarea没有内联样式干扰
      textarea.style.border = '1px solid #e2e8f0';
      textarea.style.borderRadius = '0.375rem';
      markdownEditor = new EasyMDE({
        element: textarea,
        spellChecker: false,
        toolbar: [
          { name: 'heading-1', action: EasyMDE.toggleHeading1, className: 'fa fa-header fa-heading-1', title: '标题 1' },
          { name: 'heading-2', action: EasyMDE.toggleHeading2, className: 'fa fa-header fa-heading-2', title: '标题 2' },
          { name: 'heading-3', action: EasyMDE.toggleHeading3, className: 'fa fa-header fa-heading-3', title: '标题 3' },
          '|',
          { name: 'bold', action: EasyMDE.toggleBold, className: 'fa fa-bold', title: '粗体' },
          { name: 'italic', action: EasyMDE.toggleItalic, className: 'fa fa-italic', title: '斜体' },
          { name: 'strikethrough', action: EasyMDE.toggleStrikethrough, className: 'fa fa-strikethrough', title: '删除线' },
          '|',
          { name: 'code', action: EasyMDE.toggleCodeBlock, className: 'fa fa-code', title: '代码块' },
          { name: 'quote', action: EasyMDE.toggleBlockquote, className: 'fa fa-quote-right', title: '引用' },
          { name: 'unordered-list', action: EasyMDE.toggleUnorderedList, className: 'fa fa-list-ul', title: '无序列表' },
          { name: 'ordered-list', action: EasyMDE.toggleOrderedList, className: 'fa fa-list-ol', title: '有序列表' },
          '|',
          { name: 'link', action: EasyMDE.drawLink, className: 'fa fa-link', title: '链接' },
          { name: 'image', action: EasyMDE.drawImage, className: 'fa fa-image', title: '图片' },
          '|',
          { name: 'preview', action: EasyMDE.togglePreview, className: 'fa fa-eye no-disable', title: '预览' },
          { name: 'side-by-side', action: EasyMDE.toggleSideBySide, className: 'fa fa-columns no-disable no-mobile', title: '分屏预览' },
          { name: 'fullscreen', action: EasyMDE.toggleFullScreen, className: 'fa fa-arrows-alt no-disable no-mobile', title: '全屏' },
          '|',
          { name: 'guide', action: function(){ window.open('https://simplemde.com/markdown-guide'); }, className: 'fa fa-question-circle', title: 'Markdown 指南' }
        ],
        minHeight: '200px',
        placeholder: '请输入公告内容，支持 Markdown 格式...',
        autofocus: false,
        lineWrapping: true
      });
    };

    const editAnnouncement = async (id) => {
      setLoading(true, "加载公告详情...");
      try {
        const res = await fetch(`/api/user/announcement/${id}`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.code === 200 && data.data) {
          const announcement = data.data;
          currentEditingAnnouncementId = id;
          
          // 显示编辑表单
          showAnnouncementEditForm();
          
          // 填充表单
          document.getElementById("announcementTitleInput").value = announcement.title || "";
          document.getElementById("announcementTypeSelect").value = announcement.type || "info";
          if (markdownEditor) {
            markdownEditor.value(announcement.content || "");
          } else {
            document.getElementById("announcementContentInput").value = announcement.content || "";
          }
          
          // 处理时间格式
          if (announcement.startTime) {
            const startTime = new Date(announcement.startTime);
            document.getElementById("announcementStartTimeInput").value = startTime.toISOString().slice(0, 16);
          }
          if (announcement.endTime) {
            const endTime = new Date(announcement.endTime);
            document.getElementById("announcementEndTimeInput").value = endTime.toISOString().slice(0, 16);
          }
          
          // 重置页面选择
          const checkboxes = document.querySelectorAll(".announcement-page-checkbox");
          checkboxes.forEach(cb => cb.checked = false);
          
          // 选中当前公告的页面
          if (Array.isArray(announcement.pages)) {
            announcement.pages.forEach(page => {
              const checkbox = document.querySelector(`.announcement-page-checkbox[value="${page}"]`);
              if (checkbox) checkbox.checked = true;
            });
          }
          
          toast("编辑模式已启动，请修改后保存");
        } else {
          toast(data.message || "加载公告失败");
        }
      } catch (error) {
        console.error("加载公告失败:", error);
        toast("加载公告失败");
      } finally {
        setLoading(false);
      }
    };

    const deleteAnnouncement = async (id) => {
      if (!confirm("确定要删除此公告吗？")) return;

      try {
        const res = await fetch(`/api/user/announcement/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });

        const data = await res.json();
        if (data.code === 200) {
          toast("删除成功");
          await loadAnnouncement();
        } else {
          toast(data.message || "删除失败");
        }
      } catch (error) {
        console.error("删除公告失败:", error);
        toast("删除失败");
      }
    };

    // 绑定公告管理相关事件
    if (document.getElementById("announcementSelectAllBtn")) {
      document.getElementById("announcementSelectAllBtn").addEventListener("click", selectAllAnnouncementPages);
    }

    if (document.getElementById("announcementClearAllBtn")) {
      document.getElementById("announcementClearAllBtn").addEventListener("click", clearAllAnnouncementPages);
    }

    if (document.getElementById("saveAnnouncementBtn")) {
      document.getElementById("saveAnnouncementBtn").addEventListener("click", saveAnnouncement);
    }

    if (document.getElementById("loadAnnouncementBtn")) {
      document.getElementById("loadAnnouncementBtn").addEventListener("click", loadAnnouncement);
    }

    if (document.getElementById("newAnnouncementBtn")) {
      document.getElementById("newAnnouncementBtn").addEventListener("click", showAnnouncementEditForm);
    }

    if (document.getElementById("cancelAnnouncementBtn")) {
      document.getElementById("cancelAnnouncementBtn").addEventListener("click", hideAnnouncementEditForm);
    }

    // 文章管理相关函数
