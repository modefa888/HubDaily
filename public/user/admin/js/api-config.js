/* 官方与解析接口管理 */
    const loadOfficialApis = async () => {
      const btn = document.getElementById("loadOfficialApisBtn");
      const tbody = document.getElementById("officialTbody");
      const meta = document.getElementById("officialMeta");
      const countAdultEl = document.getElementById("officialAdminCountAdult");
      const countNormalEl = document.getElementById("officialAdminCountNormal");
      setBtnLoading(btn, true, "加载中...");
      try {
        const res = await fetch("/api/user/official-apis", { headers: authHeaders() });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "获取失败");
          return;
        }
        officialApisCache = Array.isArray(data.data) ? data.data : [];
        if (meta) meta.textContent = `共 ${officialApisCache.length} 条`;
        if (countAdultEl) {
          countAdultEl.textContent = String(officialApisCache.filter(item => (item.category || "adult") === "adult").length);
        }
        if (countNormalEl) {
          countNormalEl.textContent = String(officialApisCache.filter(item => (item.category || "adult") === "normal").length);
        }
        if (tbody) {
          tbody.innerHTML = "";
          officialApisCache.forEach((item) => {
            const tr = document.createElement("tr");
            tr.setAttribute("data-id", item.id);
            tr.setAttribute("draggable", "true");
            tr.setAttribute("data-category", String(item.category || "adult"));
            tr.innerHTML = `
              <td class="py-2">
                <div class="inline-flex items-center gap-2 text-slate-400 cursor-move" data-action="drag-handle" title="拖拽排序">
                  <span class="text-xs">≡</span>
                  <span class="text-xs">${Number(item.sort || 0)}</span>
                </div>
              </td>
              <td class="py-2">
                <input class="border rounded px-2 py-1 w-40" value="${item.name || ""}" data-field="name" data-id="${item.id}">
              </td>
              <td>
                <input class="border rounded px-2 py-1 w-full min-w-[220px]" value="${item.url || ""}" data-field="url" data-id="${item.id}">
              </td>
              <td>
                <input class="border rounded px-2 py-1 w-24" value="${item.type || "vod"}" data-field="type" data-id="${item.id}">
              </td>
              <td>
                <select class="border rounded px-2 py-1 w-24" data-field="category" data-id="${item.id}">
                  <option value="adult" ${String(item.category || "adult") === "adult" ? "selected" : ""}>18+</option>
                  <option value="normal" ${String(item.category || "adult") === "normal" ? "selected" : ""}>普通</option>
                </select>
              </td>
              <td>
                <button class="px-2 py-1 rounded text-xs ${item.enabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}" data-action="toggle" data-id="${item.id}" data-enabled="${item.enabled ? "1" : "0"}">
                  ${item.enabled ? "已启用" : "已停用"}
                </button>
              </td>
              <td>
                <button class="px-2 py-1 rounded text-xs bg-blue-600 text-white" onclick="checkApiStatus('${item.url || ""}', this)" title="监测接口状态">
                  监测
                </button>
              </td>
              <td class="space-x-2">
                <button class="text-xs text-slate-400 cursor-not-allowed" data-action="save" data-id="${item.id}" disabled>保存</button>
                <button class="text-xs text-rose-600" data-action="delete" data-id="${item.id}">删除</button>
              </td>
            `;
            tbody.appendChild(tr);
            cacheRowInitialValues(tr);
          });
          if (officialApisCache.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="7">暂无数据</td>';
            tbody.appendChild(tr);
          }
          tbody.dataset.sortSignature = getOfficialSortSignature();
        }
        applyOfficialAdminTab("adult");
      } finally {
        setBtnLoading(btn, false, "刷新");
      }
    };

    const applyOfficialAdminTab = (type) => {
      const adultTab = document.getElementById("officialTabAdminAdult");
      const normalTab = document.getElementById("officialTabAdminNormal");
      const tbody = document.getElementById("officialTbody");
      if (adultTab) {
        adultTab.classList.toggle("bg-white", type === "adult");
        adultTab.classList.toggle("shadow", type === "adult");
        adultTab.classList.toggle("text-slate-800", type === "adult");
        adultTab.classList.toggle("text-slate-600", type !== "adult");
      }
      if (normalTab) {
        normalTab.classList.toggle("bg-white", type === "normal");
        normalTab.classList.toggle("shadow", type === "normal");
        normalTab.classList.toggle("text-slate-800", type === "normal");
        normalTab.classList.toggle("text-slate-600", type !== "normal");
      }
      if (!tbody) return;
      tbody.querySelectorAll("tr[data-id]").forEach((row) => {
        const category = row.getAttribute("data-category") || "adult";
        row.classList.toggle("hidden", category !== type);
      });
    };

    const parseOfficialInput = (raw) => {
      const text = String(raw || "").trim();
      if (!text) return null;
      const clean = text.replace(/[{}]/g, " ").replace(/\s+/g, " ").trim();
      const match = clean.match(/^(.*?)\s*(https?:\/\/\S+)$/i);
      if (!match) return null;
      let name = (match[1] || "").trim();
      const url = (match[2] || "").trim();
      name = name.replace(/m3u8|json采集接口|采集接口|接口/gi, "").replace(/[：:]+$/g, "").trim();
      return { name, url };
    };

    const applyParsedOfficialInput = () => {
      const parseInput = document.getElementById("officialParseInput");
      if (!parseInput) return;
      const parsed = parseOfficialInput(parseInput.value);
      if (!parsed) return;
      const nameInput = document.getElementById("officialNameInput");
      const urlInput = document.getElementById("officialUrlInput");
      if (nameInput && parsed.name) nameInput.value = parsed.name;
      if (urlInput && parsed.url) urlInput.value = parsed.url;
    };

    const syncOfficialCategoryTab = (category) => {
      if (category !== "adult" && category !== "normal") return;
      applyOfficialAdminTab(category);
    };

    const addOfficialApi = async () => {
      const nameInput = document.getElementById("officialNameInput");
      const urlInput = document.getElementById("officialUrlInput");
      const typeInput = document.getElementById("officialTypeInput");
      const categoryInput = document.getElementById("officialCategoryInput");
      applyParsedOfficialInput();
      const name = (nameInput.value || "").trim();
      const url = (urlInput.value || "").trim();
      const type = (typeInput.value || "vod").trim();
      const category = (categoryInput?.value || "").trim();
      syncOfficialCategoryTab(category);
      if (!name || !url) {
        toast("名称或URL不能为空");
        return;
      }
      if (!category) {
        toast("请选择分类");
        return;
      }
      const btn = document.getElementById("addOfficialBtn");
      setBtnLoading(btn, true, "提交中...");
      try {
        const res = await fetch("/api/user/official-apis", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name, url, type, category, enabled: true })
        });
        const data = await res.json();
        if (data.code === 200) {
          const parseInput = document.getElementById("officialParseInput");
          if (parseInput) parseInput.value = "";
          nameInput.value = "";
          urlInput.value = "";
          typeInput.value = "";
          if (categoryInput) categoryInput.value = "";
          toast("新增成功");
          await loadOfficialApis();
        } else {
          toast(data.message || "新增失败");
        }
      } finally {
        setBtnLoading(btn, false, "新增");
      }
    };

    const updateOfficialApi = async (id, payload) => {
      const res = await fetch(`/api/user/official-apis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "更新失败");
        return false;
      }
      return true;
    };

    const deleteOfficialApi = async (id) => {
      const confirmed = typeof showConfirmDialog === "function"
        ? await showConfirmDialog({
          title: "删除接口",
          description: "确认删除该接口？删除后不可恢复。",
          confirmText: "删除",
          type: "danger"
        })
        : confirm("确认删除该接口？");
      if (!confirmed) return;
      const res = await fetch(`/api/user/official-apis/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.code === 200) {
        toast("已删除");
        await loadOfficialApis();
      } else {
        toast(data.message || "删除失败");
      }
    };

    const getOfficialSortSignature = () => {
      const tbody = document.getElementById("officialTbody");
      if (!tbody) return "";
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      return rows.map((row) => row.getAttribute("data-id") || "").join(",");
    };

    const syncOfficialSortNumbers = () => {
      const tbody = document.getElementById("officialTbody");
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      rows.forEach((row, index) => {
        const id = row.getAttribute("data-id");
        const sortValue = index + 1;
        const sortLabel = row.querySelector('[data-action="drag-handle"] span:last-child');
        if (sortLabel) sortLabel.textContent = String(sortValue);
        const hidden = row.querySelector(`input[data-id="${id}"][data-field="sort"]`);
        if (hidden) {
          hidden.value = String(sortValue);
        } else {
          const input = document.createElement("input");
          input.type = "hidden";
          input.setAttribute("data-field", "sort");
          input.setAttribute("data-id", id);
          input.value = String(sortValue);
          row.appendChild(input);
        }
      });
    };

    const saveOfficialSort = async () => {
      const tbody = document.getElementById("officialTbody");
      if (!tbody) return;
      const btn = document.getElementById("officialSaveSortBtn");
      const currentSignature = getOfficialSortSignature();
      const savedSignature = tbody.dataset.sortSignature || "";
      if (currentSignature && currentSignature === savedSignature) {
        setBtnLoading(btn, false, "保存排序");
        return;
      }
      setBtnIconLoading(btn, true);
      syncOfficialSortNumbers();
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      const items = rows.map((row, index) => ({
        id: row.getAttribute("data-id"),
        sort: index + 1,
      }));
      const res = await fetch("/api/user/official-apis/sort", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "排序保存失败");
      } else {
        toast("排序已保存");
      }
      await loadOfficialApis();
      setBtnIconLoading(btn, false);
    };

    const batchCheckOfficial = async () => {
      const tbody = document.getElementById("officialTbody");
      if (!tbody) return;
      const btn = document.getElementById("officialCheckAllBtn");
      setBtnLoading(btn, true, "监测中...");
      
      try {
        const buttons = tbody.querySelectorAll('button[onclick^="checkApiStatus"]');
        for (const button of buttons) {
          // 从 onclick 属性中提取 url 参数
          const onclick = button.getAttribute('onclick');
          const match = onclick.match(/checkApiStatus\('([^']+)'/);
          if (match) {
            const url = match[1];
            await checkApiStatus(url, button);
          }
        }
      } finally {
        setBtnLoading(btn, false, "全部监测");
      }
    };

    const batchToggleOfficial = async (enabled) => {
      const tbody = document.getElementById("officialTbody");
      if (!tbody) return;
      const btn = document.getElementById(enabled ? "officialEnableAllBtn" : "officialDisableAllBtn");
      setBtnLoading(btn, true, enabled ? "启用中..." : "停用中...");
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      const targets = rows.filter((row) => {
        const toggleBtn = row.querySelector('[data-action="toggle"]');
        if (!toggleBtn) return false;
        const isEnabled = toggleBtn.getAttribute("data-enabled") === "1";
        return enabled ? !isEnabled : isEnabled;
      });
      const ids = targets.map((row) => row.getAttribute("data-id")).filter(Boolean);
      if (ids.length === 0) {
        toast(enabled ? "无需启用，全部已启用" : "无需停用，全部已停用");
        setBtnLoading(btn, false, enabled ? "全部启用" : "全部停用");
        return;
      }
      const res = await fetch("/api/user/official-apis/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ids, enabled })
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "批量更新失败");
      } else {
        toast(enabled ? "已启用所有已停用接口" : "已停用所有已启用接口");
      }
      await loadOfficialApis();
      setBtnLoading(btn, false, enabled ? "全部启用" : "全部停用");
    };

    /* ===== 一键停用异常接口 ===== */
    const API_MONITOR_BTN = 'button[onclick^="checkApiStatus"]';

    const getApiRowUrl = (row) => {
      const input = row.querySelector('input[data-field="url"]');
      const value = input ? String(input.value || "").trim() : "";
      if (value) return value;
      const btn = row.querySelector(API_MONITOR_BTN);
      const onclick = btn ? btn.getAttribute("onclick") || "" : "";
      const match = onclick.match(/checkApiStatus\('([^']*)'/);
      return match ? match[1] : "";
    };

    // ok / error / unknown；没有填写 URL 的一律视为异常
    const getApiMonitorState = (row) => {
      if (!getApiRowUrl(row)) return "error";
      const btn = row.querySelector(API_MONITOR_BTN);
      if (!btn) return "unknown";
      const text = String(btn.textContent || "");
      if (text.indexOf("异常") !== -1) return "error";
      if (text.indexOf("正常") !== -1) return "ok";
      return "unknown";
    };

    const runWithConcurrency = async (tasks, limit) => {
      const total = tasks.length;
      if (!total) return;
      let cursor = 0;
      const size = Math.max(1, Math.min(limit || 1, total));
      const workers = [];
      for (let i = 0; i < size; i += 1) {
        workers.push((async () => {
          while (cursor < total) {
            const index = cursor;
            cursor += 1;
            try {
              await tasks[index]();
            } catch (err) {
              // 单条监测失败不影响整体
            }
          }
        })());
      }
      await Promise.all(workers);
    };

    const setActionButtonLabel = (btn, text) => {
      if (!btn) return;
      const label = btn.querySelector("span:last-child");
      if (label && label.tagName === "SPAN") label.textContent = text;
      else btn.textContent = text;
    };

    /**
     * 一键停用异常接口
     * 1. 先对「已启用但尚未监测」的接口并发监测
     * 2. 汇总监测结果为异常的接口
     * 3. 二次确认后调用批量停用接口
     */
    const disableAbnormalApis = async ({ tbodyId, buttonId, batchUrl, reload, label }) => {
      const tbody = document.getElementById(tbodyId);
      const btn = document.getElementById(buttonId);
      const finalLabel = label || "停用异常";
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      if (rows.length === 0) {
        toast("暂无可处理的接口");
        return;
      }

      const enabledRows = rows.filter((row) => {
        const toggle = row.querySelector('[data-action="toggle"]');
        return !!(toggle && toggle.getAttribute("data-enabled") === "1");
      });
      if (enabledRows.length === 0) {
        toast("当前没有已启用的接口");
        return;
      }

      const pending = enabledRows.filter((row) => getApiMonitorState(row) === "unknown");
      setBtnLoading(btn, true, pending.length ? `监测 0/${pending.length}` : "检查中...");
      try {
        if (pending.length) {
          let done = 0;
          const tasks = pending.map((row) => async () => {
            const monitorBtn = row.querySelector(API_MONITOR_BTN);
            const url = getApiRowUrl(row);
            if (monitorBtn && url && typeof checkApiStatus === "function") {
              await checkApiStatus(url, monitorBtn);
            }
            done += 1;
            setActionButtonLabel(btn, `监测 ${done}/${pending.length}`);
          });
          await runWithConcurrency(tasks, 4);
        }

        const abnormalRows = enabledRows.filter((row) => getApiMonitorState(row) === "error");
        const ids = abnormalRows.map((row) => row.getAttribute("data-id")).filter(Boolean);

        if (abnormalRows.length === 0) {
          toast("未发现异常接口");
          return;
        }

        const confirmed = typeof showConfirmDialog === "function"
          ? await showConfirmDialog({
            title: "停用异常接口",
            description: `检测到 ${abnormalRows.length} 个异常接口，是否全部停用？\n停用后仍可在列表中手动重新启用。`,
            confirmText: "全部停用",
            type: "danger"
          })
          : confirm(`检测到 ${abnormalRows.length} 个异常接口，是否全部停用？`);
        if (!confirmed) return;

        setActionButtonLabel(btn, "停用中...");
        const res = await fetch(batchUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ids, enabled: false })
        });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "批量停用失败");
        } else {
          toast(`已停用 ${ids.length} 个异常接口`);
        }
        await reload();
      } finally {
        setBtnLoading(btn, false, finalLabel);
      }
    };

    const loadParseApis = async () => {
      const btn = document.getElementById("loadParseApisBtn");
      const tbody = document.getElementById("parseTbody");
      const meta = document.getElementById("parseMeta");
      setBtnLoading(btn, true, "加载中...");
      try {
        const res = await fetch("/api/user/parse-apis", { headers: authHeaders() });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "获取失败");
          return;
        }
        parseApisCache = Array.isArray(data.data) ? data.data : [];
        if (meta) meta.textContent = `共 ${parseApisCache.length} 条`;
        if (tbody) {
          tbody.innerHTML = "";
          parseApisCache.forEach((item) => {
            const tr = document.createElement("tr");
            tr.setAttribute("data-id", item.id);
            tr.setAttribute("draggable", "true");
            tr.innerHTML = `
              <td class="py-2">
                <div class="inline-flex items-center gap-2 text-slate-400 cursor-move" data-action="drag-handle" title="拖拽排序">
                  <span class="text-xs">≡</span>
                  <span class="text-xs">${Number(item.sort || 0)}</span>
                </div>
              </td>
              <td class="py-2">
                <input class="border rounded px-2 py-1 w-40" value="${item.name || ""}" data-field="name" data-id="${item.id}">
              </td>
              <td>
                <input class="border rounded px-2 py-1 w-full min-w-[220px]" value="${item.url || ""}" data-field="url" data-id="${item.id}">
              </td>
              <td>
                <button class="px-2 py-1 rounded text-xs ${item.enabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}" data-action="toggle" data-id="${item.id}" data-enabled="${item.enabled ? "1" : "0"}">
                  ${item.enabled ? "已启用" : "已停用"}
                </button>
              </td>
              <td>
                <button class="px-2 py-1 rounded text-xs bg-blue-600 text-white" onclick="checkApiStatus('${item.url || ""}', this)" title="监测接口状态">
                  监测
                </button>
              </td>
              <td class="space-x-2">
                <button class="text-xs text-slate-400 cursor-not-allowed" data-action="save" data-id="${item.id}" disabled>保存</button>
                <button class="text-xs text-rose-600" data-action="delete" data-id="${item.id}">删除</button>
              </td>
            `;
            tbody.appendChild(tr);
          });
          if (parseApisCache.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="5">暂无数据</td>';
            tbody.appendChild(tr);
          }
          tbody.dataset.sortSignature = getParseSortSignature();
        }
      } finally {
        setBtnLoading(btn, false, "刷新");
      }
    };

    const addParseApi = async () => {
      const nameInput = document.getElementById("parseNameInput");
      const urlInput = document.getElementById("parseUrlInput");
      const name = (nameInput.value || "").trim();
      const url = (urlInput.value || "").trim();
      if (!name || !url) {
        toast("名称或URL不能为空");
        return;
      }
      const btn = document.getElementById("addParseBtn");
      setBtnLoading(btn, true, "提交中...");
      try {
        const res = await fetch("/api/user/parse-apis", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name, url, enabled: true })
        });
        const data = await res.json();
        if (data.code === 200) {
          nameInput.value = "";
          urlInput.value = "";
          toast("新增成功");
          await loadParseApis();
        } else {
          toast(data.message || "新增失败");
        }
      } finally {
        setBtnLoading(btn, false, "新增");
      }
    };

    const updateParseApi = async (id, payload) => {
      const res = await fetch(`/api/user/parse-apis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "更新失败");
        return false;
      }
      return true;
    };

    const deleteParseApi = async (id) => {
      const confirmed = typeof showConfirmDialog === "function"
        ? await showConfirmDialog({
          title: "删除解析接口",
          description: "确认删除该接口？删除后不可恢复。",
          confirmText: "删除",
          type: "danger"
        })
        : confirm("确认删除该接口？");
      if (!confirmed) return;
      const res = await fetch(`/api/user/parse-apis/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.code === 200) {
        toast("已删除");
        await loadParseApis();
      } else {
        toast(data.message || "删除失败");
      }
    };

    const getParseSortSignature = () => {
      const tbody = document.getElementById("parseTbody");
      if (!tbody) return "";
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      return rows.map((row) => row.getAttribute("data-id") || "").join(",");
    };

    const syncParseSortNumbers = () => {
      const tbody = document.getElementById("parseTbody");
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      rows.forEach((row, index) => {
        const id = row.getAttribute("data-id");
        const sortValue = index + 1;
        const sortLabel = row.querySelector('[data-action="drag-handle"] span:last-child');
        if (sortLabel) sortLabel.textContent = String(sortValue);
        const hidden = row.querySelector(`input[data-id="${id}"][data-field="sort"]`);
        if (hidden) {
          hidden.value = String(sortValue);
        } else {
          const input = document.createElement("input");
          input.type = "hidden";
          input.setAttribute("data-field", "sort");
          input.setAttribute("data-id", id);
          input.value = String(sortValue);
          row.appendChild(input);
        }
      });
    };

    const saveParseSort = async (shouldReload = true) => {
      const tbody = document.getElementById("parseTbody");
      if (!tbody) return;
      const btn = document.getElementById("parseSaveSortBtn");
      const currentSignature = getParseSortSignature();
      const savedSignature = tbody.dataset.sortSignature || "";
      if (currentSignature && currentSignature === savedSignature) {
        setBtnLoading(btn, false, "保存排序");
        return;
      }
      setBtnIconLoading(btn, true);
      syncParseSortNumbers();
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      const items = rows.map((row, index) => ({
        id: row.getAttribute("data-id"),
        sort: index + 1,
      }));
      const res = await fetch("/api/user/parse-apis/sort", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "排序保存失败");
      } else {
        toast("排序已保存");
      }
      if (shouldReload) {
        await loadParseApis();
      } else if (tbody) {
        tbody.dataset.sortSignature = currentSignature;
      }
      setBtnIconLoading(btn, false);
    };

    const batchToggleParse = async (enabled) => {
      const tbody = document.getElementById("parseTbody");
      if (!tbody) return;
      const btn = document.getElementById(enabled ? "parseEnableAllBtn" : "parseDisableAllBtn");
      setBtnLoading(btn, true, enabled ? "启用中..." : "停用中...");
      const rows = Array.from(tbody.querySelectorAll("tr[data-id]"));
      const targets = rows.filter((row) => {
        const toggleBtn = row.querySelector('[data-action="toggle"]');
        if (!toggleBtn) return false;
        const isEnabled = toggleBtn.getAttribute("data-enabled") === "1";
        return enabled ? !isEnabled : isEnabled;
      });
      const ids = targets.map((row) => row.getAttribute("data-id")).filter(Boolean);
      if (ids.length === 0) {
        toast(enabled ? "无需启用，全部已启用" : "无需停用，全部已停用");
        setBtnLoading(btn, false, enabled ? "全部启用" : "全部停用");
        return;
      }
      const res = await fetch("/api/user/parse-apis/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ids, enabled })
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "批量更新失败");
      } else {
        toast(enabled ? "已启用所有已停用接口" : "已停用所有已启用接口");
      }
      await loadParseApis();
      setBtnLoading(btn, false, enabled ? "全部启用" : "全部停用");
    };

