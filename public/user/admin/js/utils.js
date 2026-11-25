/* 通用工具与在线统计 */
    const renderPagination = () => {
      const info = document.getElementById("paginationInfo");
      const buttons = document.getElementById("paginationButtons");
      if (!info || !buttons) return;
      info.textContent = `第 ${currentUsersPage} 页 / 共 ${currentUsersTotalPages} 页，合计 ${currentUsersTotal} 条`;
      buttons.innerHTML = "";

      const createBtn = (label, page, disabled, isActive) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.disabled = disabled;
        btn.setAttribute("data-page", String(page));
        btn.className = [
          "px-2.5",
          "py-1",
          "rounded",
          "border",
          disabled ? "text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300 hover:bg-slate-100",
          isActive ? "bg-slate-800 text-white border-slate-800" : "bg-white"
        ].join(" ");
        return btn;
      };

      buttons.appendChild(createBtn("上一页", currentUsersPage - 1, currentUsersPage <= 1, false));

      const windowSize = 5;
      const half = Math.floor(windowSize / 2);
      let start = Math.max(1, currentUsersPage - half);
      let end = Math.min(currentUsersTotalPages, start + windowSize - 1);
      start = Math.max(1, end - windowSize + 1);
      for (let p = start; p <= end; p += 1) {
        buttons.appendChild(createBtn(String(p), p, false, p === currentUsersPage));
      }

      buttons.appendChild(
        createBtn("下一页", currentUsersPage + 1, currentUsersPage >= currentUsersTotalPages, false)
      );
    };

    const updateUserSelectors = (users) => {
      const favoritesSelect = document.getElementById("favoritesUserSelect");
      const sharesSelect = document.getElementById("sharesUserSelect");
      if (!favoritesSelect || !sharesSelect) return;
      const list = Array.isArray(users) ? users : [];
      const options = list.map((u) => ({
        id: u._id,
        label: `${u.username}${u.nickname ? ` (${u.nickname})` : ""}`,
      }));
      const buildOptions = () =>
        options.map((opt) => `<option value="${opt.id}">${opt.label}</option>`).join("");
      favoritesSelect.innerHTML = buildOptions();
      sharesSelect.innerHTML = buildOptions();
      const targetId = currentProfile ? String(currentProfile._id || "") : (options[0] ? options[0].id : "");
      if (targetId) {
        favoritesSelect.value = targetId;
        sharesSelect.value = targetId;
      }
    };

    const formatTime = (value) => {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleString("zh-CN");
    };

    const loadOnline = async () => {
      const btn = document.getElementById("loadOnlineBtn");
      const input = document.getElementById("onlineWindowInput");
      const meta = document.getElementById("onlineMeta");
      const tbody = document.getElementById("onlineTbody");
      const minutes = Math.min(1440, Math.max(1, Number(input ? input.value : 5) || 5));
      if (input) input.value = String(minutes);
      const originalText = btn.textContent;
      btn.innerHTML = '<span class="inline-flex items-center space-x-2"><span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>加载中...</span></span>';
      btn.disabled = true;
      try {
        const res = await fetch(`/api/user/online?within=${minutes * 60 * 1000}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "获取在线用户失败");
          return;
        }
        if (meta) {
          const windowMinutes = Math.round((data.withinMs || minutes * 60 * 1000) / 60000);
          meta.textContent = `在线 ${data.total || 0} 人（统计窗口 ${windowMinutes} 分钟）`;
        }
        if (tbody) {
          tbody.innerHTML = "";
          (data.data || []).forEach((item) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td class="py-2">${item.username || ""}</td>
              <td>${item.nickname || ""}</td>
              <td>${item.role || ""}</td>
              <td>${formatTime(item.lastSeenAt)}</td>
              <td class="text-xs text-slate-600">${item.lastPage || "-"}</td>
              <td class="text-xs text-slate-600">${item.ip || "-"}</td>
              <td class="text-xs text-slate-500">${item.userAgent || "-"}</td>
            `;
            tbody.appendChild(tr);
            cacheRowInitialValues(tr);
          });
          if (!data.data || data.data.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="7">暂无在线用户</td>';
            tbody.appendChild(tr);
          }
        }
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    };

    const setBtnLoading = (btn, loading, label) => {
      if (!btn) return;
      if (loading) {
        btn.dataset.label = btn.textContent || "";
        if (label === "") {
          btn.innerHTML = '<span class="inline-flex items-center"><span class="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></span></span>';
        } else {
          btn.innerHTML = '<span class="inline-flex items-center space-x-2"><span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>' + (label || "处理中...") + '</span></span>';
        }
        btn.disabled = true;
      } else {
        btn.disabled = false;
        const text = btn.dataset.label || label || "";
        btn.textContent = text || btn.textContent;
      }
    };

    const setBtnIconLoading = (btn, loading) => {
      if (!btn) return;
      if (loading) {
        btn.dataset.label = btn.textContent || "";
        btn.innerHTML = '<span class="inline-flex items-center"><span class="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span></span>';
        btn.disabled = true;
      } else {
        btn.disabled = false;
        const text = btn.dataset.label || "";
        if (text) btn.textContent = text;
      }
    };

    const cacheRowInitialValues = (row) => {
      if (!row) return;
      const inputs = row.querySelectorAll('[data-field]');
      inputs.forEach((input) => {
        const field = input.getAttribute('data-field');
        if (field === 'sort') return;
        input.dataset.initialValue = String(input.value || '');
      });
      const saveBtn = row.querySelector('button[data-action="save"]');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.remove('text-blue-600');
        saveBtn.classList.add('text-slate-400', 'cursor-not-allowed');
      }
    };

    const updateRowSaveState = (row) => {
      if (!row) return;
      const inputs = row.querySelectorAll('[data-field]');
      let dirty = false;
      inputs.forEach((input) => {
        const field = input.getAttribute('data-field');
        if (field === 'sort') return;
        const initialValue = input.dataset.initialValue ?? '';
        if (String(input.value || '') !== String(initialValue)) {
          dirty = true;
        }
      });
      const saveBtn = row.querySelector('button[data-action="save"]');
      if (!saveBtn) return;
      saveBtn.disabled = !dirty;
      if (dirty) {
        saveBtn.classList.add('text-blue-600');
        saveBtn.classList.remove('text-slate-400', 'cursor-not-allowed');
      } else {
        saveBtn.classList.remove('text-blue-600');
        saveBtn.classList.add('text-slate-400', 'cursor-not-allowed');
      }
    };

