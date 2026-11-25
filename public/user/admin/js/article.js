/* 文章管理 */
    let currentEditingArticleId = null;
    let articleEditor = null;
    let currentArticlePage = 1;
    let articlePageSize = 5;
    let totalArticles = 0;
    let totalArticlePages = 1;

    const loadArticles = async (page = currentArticlePage) => {
      const meta = document.getElementById("articlesMeta");
      const btn = document.getElementById("loadArticlesBtn");
      const editForm = document.getElementById("articleEditForm");
      const articlesList = document.getElementById("articlesList");
      const newArticleBtn = document.getElementById("newArticleBtn");
      if (!meta) return;

      // 初始化Markdown编辑器
      initArticleEditor();

      // 隐藏编辑表单，显示文章列表和新建按钮
      if (editForm) editForm.classList.add("hidden");
      if (articlesList) articlesList.classList.remove("hidden");
      if (newArticleBtn) newArticleBtn.classList.remove("hidden");

      meta.textContent = "加载中...";
      if (btn) setBtnLoading(btn, true, "");

      try {
        // 加载文章列表
        const res = await fetch(`/api/user/articles?page=${page}&pageSize=${articlePageSize}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200) {
            currentArticlePage = Number(data.page || 1);
            totalArticles = Number(data.total || 0);
            totalArticlePages = Number(data.totalPages || 1);
            if (Array.isArray(data.data)) {
              renderArticlesList(data.data);
              updateArticlePagination();
            }
          }
        }

        meta.textContent = `共 ${totalArticles} 篇文章`;
      } catch (error) {
        console.error("加载文章失败:", error);
        meta.textContent = "加载失败";
        toast("加载文章时遇到问题");
      } finally {
        if (btn) setBtnLoading(btn, false, "刷新");
      }
    };

    // 分页按钮事件处理函数
    const handleArticlePagination = async (direction) => {
      let newPage;
      if (direction === 'prev' && currentArticlePage > 1) {
        newPage = currentArticlePage - 1;
      } else if (direction === 'next' && currentArticlePage < totalArticlePages) {
        newPage = currentArticlePage + 1;
      } else {
        return;
      }
      
      // 禁用分页按钮，防止重复点击
      const prevBtn = document.getElementById("articlePrevPage");
      const nextBtn = document.getElementById("articleNextPage");
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      
      try {
        await loadArticles(newPage);
      } finally {
        // 重新启用分页按钮
        if (prevBtn) prevBtn.disabled = currentArticlePage <= 1;
        if (nextBtn) nextBtn.disabled = currentArticlePage >= totalArticlePages;
      }
    };

    const updateArticlePagination = () => {
      const pagination = document.getElementById("articlePagination");
      if (!pagination) return;

      pagination.innerHTML = `
        <div class="flex items-center justify-between text-sm">
          <div>第 ${currentArticlePage} 页 / 共 ${totalArticlePages} 页</div>
          <div class="flex items-center gap-2">
            <button id="articlePrevPage" class="px-3 py-1 rounded border ${currentArticlePage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentArticlePage <= 1 ? 'disabled' : ''}>
              上一页
            </button>
            <button id="articleNextPage" class="px-3 py-1 rounded border ${currentArticlePage >= totalArticlePages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentArticlePage >= totalArticlePages ? 'disabled' : ''}>
              下一页
            </button>
          </div>
        </div>
      `;

      // 绑定分页按钮事件
      const prevBtn = document.getElementById("articlePrevPage");
      const nextBtn = document.getElementById("articleNextPage");
      
      if (prevBtn) {
        prevBtn.addEventListener("click", () => handleArticlePagination('prev'));
      }
      
      if (nextBtn) {
        nextBtn.addEventListener("click", () => handleArticlePagination('next'));
      }
    };

    const showArticleEditForm = () => {
      const editForm = document.getElementById("articleEditForm");
      const articlesList = document.getElementById("articlesList");
      const newArticleBtn = document.getElementById("newArticleBtn");
      const articlePagination = document.getElementById("articlePagination");
      if (editForm) editForm.classList.remove("hidden");
      if (articlesList) articlesList.classList.add("hidden");
      if (newArticleBtn) newArticleBtn.classList.add("hidden");
      if (articlePagination) articlePagination.classList.add("hidden");
    };

    const hideArticleEditForm = () => {
      const editForm = document.getElementById("articleEditForm");
      const articlesList = document.getElementById("articlesList");
      const newArticleBtn = document.getElementById("newArticleBtn");
      const articlePagination = document.getElementById("articlePagination");
      if (editForm) editForm.classList.add("hidden");
      if (articlesList) articlesList.classList.remove("hidden");
      if (newArticleBtn) newArticleBtn.classList.remove("hidden");
      if (articlePagination) articlePagination.classList.remove("hidden");
      resetArticleForm();
    };

    const renderArticlesList = (articles) => {
      const list = document.getElementById("articlesList");
      if (!list) return;

      if (articles.length === 0) {
        list.innerHTML = '<div class="text-center text-slate-500 py-4">暂无文章</div>';
        return;
      }

      list.innerHTML = articles.map(article => {
        const id = String(article._id || "").trim();
        const title = String(article.title || "").trim();
        const status = String(article.status || "published").trim();
        const content = String(article.content || "").trim();
        const publishTime = formatTime(article.publishTime);
        const category = String(article.category || "").trim();
        const tags = Array.isArray(article.tags) ? article.tags : [];
        const createdAt = formatTime(article.createdAt);
        const updatedAt = formatTime(article.updatedAt);
        const isTop = article.isTop || false;
        const viewCount = article.viewCount || 0;
        const likeCount = article.likeCount || 0;
        const dislikeCount = article.dislikeCount || 0;

        return `
          <div class="border rounded-lg p-3 ${status === "published" ? "bg-slate-50" : "bg-slate-100"}">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-medium text-slate-800">${isTop ? '<span class="text-red-500 mr-1">[顶置]</span>' : ''}${title}</h3>
                </div>
                <div class="text-xs text-slate-500 mt-1">
                  <span>状态: ${status === "published" ? "已发布" : "草稿"}</span> · 
                  ${isTop ? '<span class="text-red-500">已顶置</span> · ' : ''}
                  ${category ? `<span>分类: ${category}</span> · ` : ''}
                  <span>发布: ${publishTime}</span> · 
                  <span>创建: ${createdAt}</span> · 
                  <span>更新: ${updatedAt}</span>
                </div>
                <div class="text-xs text-slate-500 mt-1">
                  <span class="text-slate-600"><i class="far fa-eye mr-1"></i>${viewCount} 浏览</span> · 
                  <span class="text-green-600"><i class="far fa-thumbs-up mr-1"></i>${likeCount} 点赞</span> · 
                  <span class="text-red-600"><i class="far fa-thumbs-down mr-1"></i>${dislikeCount} 倒赞</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button class="px-2 py-1 rounded text-xs ${isTop ? 'bg-slate-600' : 'bg-amber-600'} text-white" onclick="toggleArticleTop('${id}', ${!isTop})">${isTop ? '取消顶置' : '顶置'}</button>
                <button class="px-2 py-1 rounded text-xs bg-blue-600 text-white" onclick="editArticle('${id}')">编辑</button>
                <a href="/articles/detail.html?id=${id}" target="_blank" class="px-2 py-1 rounded text-xs bg-green-600 text-white">查看</a>
                <button class="px-2 py-1 rounded text-xs bg-rose-600 text-white" onclick="deleteArticle('${id}')">删除</button>
              </div>
            </div>
            <div class="text-sm text-slate-600 mt-2 markdown-content">${typeof marked === 'function' ? marked(content.substring(0, 200) + (content.length > 200 ? '...' : '')) : content.substring(0, 200) + (content.length > 200 ? '...' : '')}</div>
            ${category ? `
              <div class="text-xs text-slate-500 mt-2">
                <span>分类:</span>
                <div class="mt-1 flex flex-wrap gap-1">
                  <span class="px-2 py-0.5 bg-slate-200 rounded">${category}</span>
                </div>
              </div>
            ` : ''}
            ${tags.length > 0 ? `
              <div class="text-xs text-slate-500 mt-2">
                <span>标签:</span>
                <div class="mt-1 flex flex-wrap gap-1">
                  ${tags.map(tag => `<span class="px-2 py-0.5 bg-slate-200 rounded">${tag}</span>`).join("")}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join("");
    };

    const toggleArticleTop = async (id, isTop) => {
      try {
        const res = await fetch(`/api/user/article/${id}/top`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ isTop }),
        });

        const data = await res.json();
        if (data.code === 200) {
          toast(isTop ? "文章已顶置" : "已取消顶置");
          await loadArticles();
        } else {
          toast(data.message || "操作失败");
        }
      } catch (error) {
        console.error("顶置操作失败:", error);
        toast("操作失败");
      }
    };

    // 初始化文章Markdown编辑器
    const initArticleEditor = () => {
      if (articleEditor) return;
      if (typeof EasyMDE === 'undefined') {
        console.warn('EasyMDE is not loaded yet');
        return;
      }
      const textarea = document.getElementById('articleContentInput');
      if (!textarea) return;
      // 确保textarea没有内联样式干扰
      textarea.style.border = '1px solid #e2e8f0';
      textarea.style.borderRadius = '0.375rem';
      articleEditor = new EasyMDE({
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
        minHeight: '300px',
        placeholder: '请输入文章内容，支持 Markdown 格式...',
        autofocus: false,
        lineWrapping: true
      });
    };

    let articleTags = [];

const resetArticleForm = () => {
      document.getElementById("articleTitleInput").value = "";
      document.getElementById("articleStatusSelect").value = "published";
      document.getElementById("articleAccessSelect").value = "public";
      if (articleEditor) {
        articleEditor.value("");
      } else {
        document.getElementById("articleContentInput").value = "";
      }
      document.getElementById("articlePublishTimeInput").value = new Date().toISOString().slice(0, 16);
      document.getElementById("articleCategoryInput").value = "";
      articleTags = [];
      renderArticleTags();
      document.getElementById("articleTagsInput").value = "";
      currentEditingArticleId = null;
      // 重置保存按钮文本
      const saveBtn = document.getElementById("saveArticleBtn");
      if (saveBtn) {
        saveBtn.textContent = "发布文章";
      }
    };

const renderArticleTags = () => {
      const container = document.getElementById("articleTagsContainer");
      if (!container) return;
      container.innerHTML = articleTags.map((tag, index) => `
        <div class="inline-flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-sm">
          <span>${tag}</span>
          <button type="button" class="text-slate-500 hover:text-slate-700" onclick="removeArticleTag(${index})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join("");
    };

const addArticleTag = (tag) => {
      const trimmedTag = String(tag || "").trim();
      if (!trimmedTag) return;
      if (!articleTags.includes(trimmedTag)) {
        articleTags.push(trimmedTag);
        renderArticleTags();
      }
    };

const removeArticleTag = (index) => {
      if (index >= 0 && index < articleTags.length) {
        articleTags.splice(index, 1);
        renderArticleTags();
      }
    };

    



    const deleteArticle = async (id) => {
      if (!confirm("确定要删除此文章吗？")) return;

      try {
        const res = await fetch(`/api/user/article/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });

        const data = await res.json();
        if (data.code === 200) {
          toast("删除成功");
          await loadArticles();
        } else {
          toast(data.message || "删除失败");
        }
      } catch (error) {
        console.error("删除文章失败:", error);
        toast("删除失败");
      }
    };

    // 分类管理相关函数
    let articleCategories = [];

    const loadCategories = async () => {
      try {
        const res = await fetch("/api/user/categories", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200 && Array.isArray(data.data)) {
            articleCategories = data.data;
            updateCategorySelect();
            renderCategoriesList();
          }
        }
      } catch (error) {
        console.error("加载分类失败:", error);
      }
    };

    const updateCategorySelect = () => {
      const select = document.getElementById("articleCategorySelect");
      if (!select) return;
      select.innerHTML = `
        <option value="">选择分类</option>
        <option value="new">创建新分类</option>
        ${articleCategories.map(cat => `
          <option value="${cat.name}">${cat.name}</option>
        `).join("")}
      `;
    };

    const renderCategoriesList = () => {
      const list = document.getElementById("categoriesList");
      if (!list) return;
      if (articleCategories.length === 0) {
        list.innerHTML = '<div class="text-center text-slate-500 py-4">暂无分类</div>';
        return;
      }
      list.innerHTML = articleCategories.map(cat => `
        <div class="flex items-center justify-between p-2 border rounded">
          <span>${cat.name}</span>
          <button class="px-2 py-1 rounded text-xs bg-rose-600 text-white" onclick="deleteCategory('${cat._id}')">删除</button>
        </div>
      `).join("");
    };

    const addCategory = async () => {
      const input = document.getElementById("newCategoryInput");
      const name = input.value.trim();
      if (!name) {
        toast("请输入分类名称");
        return;
      }
      try {
        const res = await fetch("/api/user/category", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (data.code === 200) {
          toast("分类添加成功");
          input.value = "";
          await loadCategories();
        } else {
          toast(data.message || "添加失败");
        }
      } catch (error) {
        console.error("添加分类失败:", error);
        toast("添加失败");
      }
    };

    const deleteCategory = async (id) => {
      if (!confirm("确定要删除此分类吗？")) return;
      try {
        const res = await fetch(`/api/user/category/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.code === 200) {
          toast("分类删除成功");
          await loadCategories();
        } else {
          toast(data.message || "删除失败");
        }
      } catch (error) {
        console.error("删除分类失败:", error);
        toast("删除失败");
      }
    };

    const showCategoriesModal = () => {
      const modal = document.getElementById("categoriesModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        document.body.style.overflow = "hidden";
        loadCategories();
      }
    };

    const hideCategoriesModal = () => {
      const modal = document.getElementById("categoriesModal");
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        document.body.style.overflow = "";
      }
    };

    // 修改保存文章函数，支持从选择框获取分类
    const saveArticle = async () => {
      const titleInput = document.getElementById("articleTitleInput");
      const statusSelect = document.getElementById("articleStatusSelect");
      const accessSelect = document.getElementById("articleAccessSelect");
      const contentInput = document.getElementById("articleContentInput");
      const publishTimeInput = document.getElementById("articlePublishTimeInput");
      const categorySelect = document.getElementById("articleCategorySelect");
      const categoryInput = document.getElementById("articleCategoryInput");
      const tagsInput = document.getElementById("articleTagsInput");
      const saveBtn = document.getElementById("saveArticleBtn");

      if (!titleInput || !statusSelect || !accessSelect || !contentInput || !publishTimeInput || !categorySelect || !categoryInput || !tagsInput || !saveBtn) {
        toast("表单元素缺失");
        return;
      }

      const title = titleInput.value.trim();
      const status = statusSelect.value;
      const access = accessSelect.value;
      const content = articleEditor ? articleEditor.value() : contentInput.value.trim();
      const publishTime = publishTimeInput.value;
      let category = categorySelect.value;
      if (category === "new") {
        category = categoryInput.value.trim();
      }
      const tags = articleTags;

      // 草稿状态不要求填写所有字段
      if (status !== "draft") {
        if (!title) {
          toast("请输入文章标题");
          return;
        }

        if (!content) {
          toast("请输入文章内容");
          return;
        }

        if (!publishTime) {
          toast("请选择发布时间");
          return;
        }
      }

      // 草稿状态不要求填写分类
      if (status !== "draft" && categorySelect.value === "new" && !category) {
        toast("请输入新分类名称");
        return;
      }

      saveBtn.disabled = true;
      setLoading(true, "保存文章...");

      try {
        // 如果是创建新分类，先调用分类创建API（非草稿状态）
        if (status !== "draft" && categorySelect.value === "new" && category) {
          const categoryRes = await fetch("/api/user/category", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ name: category }),
          });
          const categoryData = await categoryRes.json();
          if (categoryData.code !== 200) {
            toast(categoryData.message || "创建分类失败");
            return;
          }
          // 重新加载分类列表
          await loadCategories();
        }

        let res;
        const payload = { title, status, access, content, publishTime, category, tags };
        
        if (currentEditingArticleId) {
          // 更新现有文章
          res = await fetch(`/api/user/article/${currentEditingArticleId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          });
        } else {
          // 创建新文章
          res = await fetch("/api/user/article", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          });
        }

        const data = await res.json();
        if (data.code === 200) {
          toast("保存成功");
          // 重新加载文章列表
          await loadArticles();
        } else {
          toast(data.message || "保存失败");
        }
      } catch (error) {
        console.error("保存文章失败:", error);
        toast("保存失败");
      } finally {
        saveBtn.disabled = false;
        setLoading(false);
      }
    };

    // 修改编辑文章函数，支持分类选择
    const editArticle = async (id) => {
      setLoading(true, "加载文章详情...");
      try {
        // 先加载分类列表
        await loadCategories();
        
        const res = await fetch(`/api/user/article/${id}`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.code === 200 && data.data) {
          const article = data.data;
          currentEditingArticleId = id;
          
          // 显示编辑表单
          showArticleEditForm();
          
          // 填充表单
          document.getElementById("articleTitleInput").value = article.title || "";
          document.getElementById("articleStatusSelect").value = article.status || "published";
          document.getElementById("articleAccessSelect").value = article.access || "public";
          if (articleEditor) {
            articleEditor.value(article.content || "");
          } else {
            document.getElementById("articleContentInput").value = article.content || "";
          }
          
          // 处理时间格式
          if (article.publishTime) {
            const publishTime = new Date(article.publishTime);
            document.getElementById("articlePublishTimeInput").value = publishTime.toISOString().slice(0, 16);
          } else {
            document.getElementById("articlePublishTimeInput").value = new Date().toISOString().slice(0, 16);
          }
          
          // 处理分类
          const categorySelect = document.getElementById("articleCategorySelect");
          const categoryInput = document.getElementById("articleCategoryInput");
          if (categorySelect && categoryInput) {
            if (article.category) {
              // 检查分类是否在下拉菜单中
              let categoryExists = false;
              for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].value === article.category) {
                  categoryExists = true;
                  break;
                }
              }
              
              if (categoryExists) {
                categorySelect.value = article.category;
              } else {
                // 如果分类不在列表中，添加一个临时选项
                const option = document.createElement("option");
                option.value = article.category;
                option.textContent = article.category;
                categorySelect.appendChild(option);
                categorySelect.value = article.category;
              }
              categoryInput.classList.add("hidden");
            } else {
              categorySelect.value = "";
              categoryInput.classList.add("hidden");
            }
          }
          
          // 处理标签
          if (Array.isArray(article.tags)) {
            articleTags = article.tags;
          } else {
            articleTags = [];
          }
          renderArticleTags();
          document.getElementById("articleTagsInput").value = "";
          
          toast("编辑模式已启动，请修改后保存");
        } else {
          toast(data.message || "加载文章失败");
        }
      } catch (error) {
        console.error("加载文章失败:", error);
        toast("加载文章失败");
      } finally {
        setLoading(false);
      }
    };

    // 绑定文章管理相关事件
    if (document.getElementById("loadArticlesBtn")) {
      document.getElementById("loadArticlesBtn").addEventListener("click", loadArticles);
    }

    if (document.getElementById("saveArticleBtn")) {
      document.getElementById("saveArticleBtn").addEventListener("click", saveArticle);
    }

    if (document.getElementById("resetArticleFormBtn")) {
      document.getElementById("resetArticleFormBtn").addEventListener("click", resetArticleForm);
    }

    if (document.getElementById("newArticleBtn")) {
      document.getElementById("newArticleBtn").addEventListener("click", () => {
        resetArticleForm();
        showArticleEditForm();
        loadCategories();
      });
    }

    // 监听文章状态变化，更新保存按钮文本
    if (document.getElementById("articleStatusSelect")) {
      document.getElementById("articleStatusSelect").addEventListener("change", function() {
        const saveBtn = document.getElementById("saveArticleBtn");
        if (saveBtn) {
          saveBtn.textContent = this.value === "draft" ? "保存草稿" : "发布文章";
        }
      });
    }

    if (document.getElementById("cancelArticleBtn")) {
      document.getElementById("cancelArticleBtn").addEventListener("click", hideArticleEditForm);
    }

    // 绑定分类管理相关事件
    if (document.getElementById("manageCategoriesBtn")) {
      document.getElementById("manageCategoriesBtn").addEventListener("click", showCategoriesModal);
    }

    if (document.getElementById("closeCategoriesModal")) {
      document.getElementById("closeCategoriesModal").addEventListener("click", hideCategoriesModal);
    }

    if (document.getElementById("addCategoryBtn")) {
      document.getElementById("addCategoryBtn").addEventListener("click", addCategory);
    }

    if (document.getElementById("articleCategorySelect")) {
      document.getElementById("articleCategorySelect").addEventListener("change", (e) => {
        const categoryInput = document.getElementById("articleCategoryInput");
        if (e.target.value === "new") {
          categoryInput.classList.remove("hidden");
        } else {
          categoryInput.classList.add("hidden");
        }
      });
    }

    // 全局函数，供HTML调用
    window.editArticle = editArticle;
    window.deleteArticle = deleteArticle;
    window.removeArticleTag = removeArticleTag;
    window.deleteCategory = deleteCategory;
    window.toggleArticleTop = toggleArticleTop;
    window.deleteNavigationCategory = deleteNavigationCategory;
    window.deleteNavigationSite = deleteNavigationSite;
    window.editNavigationCategory = editNavigationCategory;
    window.editNavigationSite = editNavigationSite;
    window.manageVideos = switchToVideoManagement;

    // 为标签输入框添加回车键事件监听器
    document.addEventListener('DOMContentLoaded', () => {
      const tagsInput = document.getElementById('articleTagsInput');
      if (tagsInput) {
        tagsInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addArticleTag(tagsInput.value);
            tagsInput.value = '';
          }
        });
      }

      // 绑定导航设置事件监听器
      if (document.getElementById('saveNavigationSettingsBtn')) {
        document.getElementById('saveNavigationSettingsBtn').addEventListener('click', saveNavigationSettings);
      }
    });

