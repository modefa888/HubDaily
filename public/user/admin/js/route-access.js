/* 路由访问控制 */
    const getRouteAccessKey = (method, path) => `${String(method || "").toUpperCase()} ${String(path || "").trim()}`;

    const loadRouteAccessStats = async () => {
      const btn = document.getElementById("loadRouteAccessStatsBtn");
      const statsContainer = document.getElementById("routeAccessStats");
      const statsTbody = document.getElementById("routeAccessStatsTbody");
      setBtnLoading(btn, true, "加载中...");
      try {
        const statsRes = await fetch("/api/user/route-access-stats", { headers: authHeaders() });
        const statsData = await statsRes.json();
        if (statsData.code !== 200) {
          toast(statsData.message || "获取统计失败");
          return;
        }
        const stats = Array.isArray(statsData.data) ? statsData.data : [];
        if (statsTbody) {
          statsTbody.innerHTML = "";
          if (stats.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="6">暂无统计数据</td>';
            statsTbody.appendChild(tr);
          } else {
            stats.forEach((item) => {
              const successRate = item.total > 0 ? ((item.success / item.total) * 100).toFixed(1) : "0.0";
              const tr = document.createElement("tr");
              tr.innerHTML = `
                <td class="py-2 text-xs text-slate-700">${item.path}</td>
                <td>${item.total}</td>
                <td class="text-green-600">${item.success}</td>
                <td class="text-red-600">${item.failed}</td>
                <td>${successRate}%</td>
                <td class="text-xs text-slate-500">${formatTime(item.updatedAt)}</td>
              `;
              statsTbody.appendChild(tr);
            });
          }
        }
        if (statsContainer) {
          statsContainer.classList.remove("hidden");
        }
      } finally {
        setBtnLoading(btn, false, "加载统计");
      }
    };

    // 绑定加载统计按钮事件
    if (document.getElementById("loadRouteAccessStatsBtn")) {
      document.getElementById("loadRouteAccessStatsBtn").addEventListener("click", loadRouteAccessStats);
    }

    const loadRouteAccess = async () => {
      const btn = document.getElementById("loadRouteAccessBtn");
      const container = document.getElementById("routeAccessGroups");
      const meta = document.getElementById("routeAccessMeta");
      setBtnLoading(btn, true, "加载中...");
      try {
        const [rulesRes, allRes, statsRes] = await Promise.all([
          fetch("/api/user/route-access", { headers: authHeaders() }),
          fetch("/api/all"),
          fetch("/api/user/route-access-stats", { headers: authHeaders() })
        ]);
        const rulesData = await rulesRes.json();
        const allData = await allRes.json();
        const statsData = await statsRes.json();
        if (rulesData.code !== 200) {
          toast(rulesData.message || "获取规则失败");
          return;
        }
        routeAccessRulesCache = Array.isArray(rulesData.data) ? rulesData.data : [];
        const ruleMap = new Map(routeAccessRulesCache.map((r) => [getRouteAccessKey(r.method, r.path), r]));
        
        // 处理统计数据
        const statsMap = new Map();
        if (statsData.code === 200 && Array.isArray(statsData.data)) {
          statsData.data.forEach(stat => {
            statsMap.set(stat.path, stat);
          });
        }
        
        const modules = Array.isArray(allData?.data) ? allData.data : [];
        const groups = [];
        modules.forEach((mod) => {
          const stack = Array.isArray(mod?.stack) ? mod.stack : [];
          const items = [];
          stack.forEach((layer) => {
            const path = layer?.path;
            const methods = Array.isArray(layer?.methods) ? layer.methods : [];
            methods
              .filter((m) => m && m !== "HEAD" && m !== "OPTIONS")
              .forEach((m) => {
                if (!path) return;
                items.push({ method: m, path });
              });
          });
          const map = new Map();
          items.forEach((item) => {
            const key = getRouteAccessKey(item.method, item.path);
            if (!map.has(key)) map.set(key, item);
          });
          const list = Array.from(map.values()).sort((a, b) => {
            if (a.path !== b.path) return a.path.localeCompare(b.path);
            return String(a.method).localeCompare(String(b.method));
          });
          const folder = String(mod?.folder || "unknown");
          const file = String(mod?.file || "unknown.js");
          groups.push({
            folder,
            file,
            name: mod?.name || mod?.title || "未命名模块",
            subtitle: mod?.subtitle || "",
            list,
          });
        });
        routeAccessRoutesCache = groups.flatMap((g) => g.list);
        if (meta) meta.textContent = `共 ${routeAccessRoutesCache.length} 条`;
        if (container) {
          container.innerHTML = "";
          const folderMap = new Map();
          groups.forEach((group) => {
            if (!folderMap.has(group.folder)) folderMap.set(group.folder, []);
            folderMap.get(group.folder).push(group);
          });
          Array.from(folderMap.entries()).forEach(([folderName, files]) => {
            const folderDetails = document.createElement("details");
            folderDetails.className = "border rounded-lg bg-slate-50";
            folderDetails.innerHTML = `
              <summary class="cursor-pointer px-3 py-2 font-medium text-slate-800 flex items-center justify-between">
                <span>${folderName}</span>
                <span class="text-xs text-slate-500">${files.length} 个文件</span>
              </summary>
            `;
            files.forEach((fileGroup) => {
              const fileDetails = document.createElement("details");
              fileDetails.className = "ml-4 mr-3 mb-3 border rounded bg-white";
              fileDetails.innerHTML = `
                <summary class="cursor-pointer px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div class="font-medium text-slate-700">${fileGroup.file}</div>
                  <div class="text-xs text-slate-500">${fileGroup.name}${fileGroup.subtitle ? ` · ${fileGroup.subtitle}` : ""} · ${fileGroup.list.length} 条</div>
                </summary>
                <div class="px-3 pb-3 overflow-auto">
                  <table class="min-w-full text-sm">
                    <thead class="text-left text-slate-500">
                      <tr>
                        <th class="py-2">方法</th>
                        <th>路径</th>
                        <th>备注</th>
                        <th>访问级别</th>
                        <th>启用</th>
                        <th>状态</th>
                        <th>总访问</th>
                        <th>成功</th>
                        <th>失败</th>
                        <th>成功率</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y" data-group="route-access"></tbody>
                  </table>
                </div>
              `;
              const tbody = fileDetails.querySelector('tbody[data-group="route-access"]');
              if (tbody) {
                if (fileGroup.list.length === 0) {
                  const tr = document.createElement("tr");
                  tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="10">暂无接口</td>';
                  tbody.appendChild(tr);
                } else {
                  fileGroup.list.forEach((item) => {
                    const key = getRouteAccessKey(item.method, item.path);
                    const rule = ruleMap.get(key);
                    const access = rule ? String(rule.access || "open") : "open";
                    const enabled = rule ? rule.enabled !== false : false;
                    const note = rule ? String(rule.note || "") : "";
                    
                    // 获取统计数据
                    const stat = statsMap.get(item.path);
                    const total = stat ? stat.total : 0;
                    const success = stat ? stat.success : 0;
                    const failed = stat ? stat.failed : 0;
                    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : "0.0";
                    
                    const tr = document.createElement("tr");
                    tr.setAttribute("data-key", key);
                    tr.setAttribute("data-method", item.method);
                    tr.setAttribute("data-path", item.path);
                    tr.setAttribute("data-initial-access", access);
                    tr.setAttribute("data-initial-enabled", enabled ? "1" : "0");
                    tr.setAttribute("data-initial-note", note);
                    tr.innerHTML = `
                      <td class="py-2">${item.method}</td>
                      <td class="text-xs text-slate-700">${item.path}</td>
                      <td class="text-xs text-slate-700">
                        <span class="route-note-editable border-b border-dashed border-slate-300 cursor-text" data-value="${note.replace(/"/g, "&quot;")}">${note || "点击添加"}</span>
                      </td>
                      <td>
                        <select class="border rounded px-2 py-1 text-sm" data-field="access">
                          <option value="open">开放</option>
                          <option value="user">登录用户</option>
                          <option value="admin">管理员</option>
                        </select>
                      </td>
                      <td>
                        <input type="checkbox" data-field="enabled">
                      </td>
                      <td class="text-xs text-slate-500" data-field="status">${rule ? "已配置" : "未配置"}</td>
                      <td class="text-xs">${total}</td>
                      <td class="text-xs text-green-600">${success}</td>
                      <td class="text-xs text-red-600">${failed}</td>
                      <td class="text-xs">${successRate}%</td>
                    `;
                    const accessSelect = tr.querySelector('select[data-field="access"]');
                    const enabledInput = tr.querySelector('input[data-field="enabled"]');
                    if (accessSelect) accessSelect.value = access;
                    if (enabledInput) enabledInput.checked = enabled;
                    tbody.appendChild(tr);
                  });
                }
              }
              folderDetails.appendChild(fileDetails);
            });
            container.appendChild(folderDetails);
          });
          if (groups.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-500 py-6">暂无数据</div>';
          }
        }
      } finally {
        setBtnLoading(btn, false, "刷新");
      }
    };

    const saveRouteAccessSingle = async (row, options = {}) => {
      if (!row) return;
      const method = row.getAttribute("data-method") || "";
      const path = row.getAttribute("data-path") || "";
      const access = row.querySelector('select[data-field="access"]')?.value || "open";
      const enabled = !!row.querySelector('input[data-field="enabled"]')?.checked;
      const note = row.querySelector('.route-note-editable')?.getAttribute("data-value") || "";
      const initialAccess = row.getAttribute("data-initial-access") || "open";
      const initialEnabled = row.getAttribute("data-initial-enabled") === "1";
      const initialNote = row.getAttribute("data-initial-note") || "";
      const fields = Array.isArray(options.fields) && options.fields.length > 0 ? options.fields : ["access", "enabled"];
      const changes = {};
      if (fields.includes("access") && access !== initialAccess) changes.access = access;
      if (fields.includes("enabled") && enabled !== initialEnabled) changes.enabled = enabled;
      if (fields.includes("note") && note !== initialNote) changes.note = note;
      const hasChanges = Object.keys(changes).length > 0;
      if (!hasChanges) return;
      const res = await fetch("/api/user/route-access/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ items: [{ method, path, ...changes }] }),
      });
      const data = await res.json();
      if (data.code !== 200) {
        toast(data.message || "更新失败");
        if (changes.enabled !== undefined) {
          row.querySelector('input[data-field="enabled"]').checked = initialEnabled;
        }
        if (changes.access !== undefined) {
          row.querySelector('select[data-field="access"]').value = initialAccess;
        }
        return;
      }
      if (changes.access !== undefined) row.setAttribute("data-initial-access", access);
      if (changes.enabled !== undefined) row.setAttribute("data-initial-enabled", enabled ? "1" : "0");
      if (changes.note !== undefined) row.setAttribute("data-initial-note", note);
      const statusEl = row.querySelector('[data-field="status"]');
      if (statusEl) statusEl.textContent = enabled ? "已配置" : "未配置";
      toast("已更新");
    };

