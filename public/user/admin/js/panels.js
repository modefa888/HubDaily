/* 数据面板与事件绑定 */
    const loadFavorites = async () => {
      const btn = document.getElementById("loadFavoritesBtn");
      const grid = document.getElementById("favoritesGrid");
      const meta = document.getElementById("favoritesMeta");
      setBtnLoading(btn, true, "加载中...");
      try {
        const userId = getSelectedUserId();
        const endpoint = userId ? `/api/user/${userId}/favorites` : "/user/favorites";
        const res = await fetch(endpoint, { headers: authHeaders() });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "获取喜欢失败");
          renderVideoCards([], grid);
          return;
        }
        const list = Array.isArray(data.data) ? data.data : [];
        if (meta) meta.textContent = `共 ${list.length} 条`;
        renderVideoCards(list, grid, { allowDelete: true, deleteAction: "favorite-delete" });
      } finally {
        setBtnLoading(btn, false, "刷新");
      }
    };

    const loadShares = async () => {
      const btn = document.getElementById("loadSharesBtn");
      const grid = document.getElementById("sharesGrid");
      const meta = document.getElementById("sharesMeta");
      setBtnLoading(btn, true, "加载中...");
      try {
        const userId = getSelectedUserId();
        const endpoint = userId ? `/api/user/${userId}/shares` : "/user/shares";
        const res = await fetch(endpoint, { headers: authHeaders() });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "获取分享失败");
          renderVideoCards([], grid);
          return;
        }
        const list = (Array.isArray(data.data) ? data.data : []).map((item) => ({
          ...item,
          id: item.shareId || item.id,
          shareUrl: buildShareUrl(item),
        }));
        if (meta) meta.textContent = `共 ${list.length} 条`;
        renderVideoCards(list, grid, { allowDelete: true, deleteAction: "share-delete" });
      } finally {
        setBtnLoading(btn, false, "刷新");
      }
    };

    // 加载角色列表
    const loadRolesList = async () => {
      try {
        const res = await fetch("/api/user/roles", { headers: authHeaders() });
        const data = await res.json();
        if (data.code === 200 && Array.isArray(data.data)) {
          rolesCache = data.data;
        }
      } catch (error) {
        console.error("加载角色列表失败:", error);
      }
    };

    const loadUsers = async (page = currentUsersPage) => {
      const pageSizeInput = document.getElementById("pageSizeInput");
      const pageSize = Number(pageSizeInput ? pageSizeInput.value : currentUsersPageSize) || 20;
      currentUsersPageSize = pageSize;
      const btn = document.getElementById("loadUsersBtn");
      const originalText = btn.textContent;
      btn.innerHTML = '<span class="inline-flex items-center space-x-2"><span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>加载中...</span></span>';
      btn.disabled = true;
      try {
        // 先加载角色列表
        await loadRolesList();
        
        const sortKey = statsSort.key || "";
        const sortDir = statsSort.dir || "";
        const res = await fetch(
          `/api/user/list?page=${page}&pageSize=${pageSize}&sortKey=${encodeURIComponent(sortKey)}&sortDir=${encodeURIComponent(sortDir)}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "加载失败");
          return;
        }
        currentUsersPage = data.page;
        currentUsersTotalPages = data.totalPages;
        currentUsersTotal = data.total;
        userPermissionsById = {};
        let statsMap = data.statsMap || {};
        if (!statsMap || Object.keys(statsMap).length === 0) {
          try {
            const ids = data.data.map((u) => u._id);
            const statsRes = await fetch("/api/user/stats/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ ids })
            });
            const statsData = await statsRes.json();
            if (statsData.code === 200 && statsData.data) {
              statsMap = statsData.data;
            }
          } catch (e) {
            // ignore stats errors
          }
        }
        const tbody = document.getElementById("usersTbody");
        tbody.innerHTML = "";
        const getStatValue = (u, key) => {
          const stat = statsMap[u._id] || {};
          const value = Number(stat[key] || 0);
          return Number.isFinite(value) ? value : 0;
        };
        if (statsSort.key) {
          const dir = statsSort.dir === "asc" ? 1 : -1;
          if (!data.statsMap) {
            data.data.sort((a, b) => {
              const av = getStatValue(a, statsSort.key);
              const bv = getStatValue(b, statsSort.key);
              if (av === bv) return String(a._id).localeCompare(String(b._id));
              return av > bv ? dir : -dir;
            });
          }
        }
        const updateSortButtons = () => {
          const buttons = document.querySelectorAll("#usersThead [data-sort]");
          buttons.forEach((btn) => {
            const key = btn.getAttribute("data-sort");
            const baseText = btn.getAttribute("data-base") || btn.textContent.replace(/[▲▼]\s*$/, "");
            btn.setAttribute("data-base", baseText);
            if (key === statsSort.key) {
              btn.textContent = `${baseText}${statsSort.dir === "asc" ? "▲" : "▼"}`;
            } else {
              btn.textContent = baseText;
            }
          });
        };
        updateSortButtons();
        usersCache = data.data || [];
        updateUserSelectors(usersCache);
        data.data.forEach((u) => {
            userPermissionsById[u._id] = Array.isArray(u.blockedPages) ? u.blockedPages : [];
            const stat = statsMap[u._id] || {};
          const watchSeconds = Number(stat.watchSeconds || 0);
          const watchH = String(Math.floor(watchSeconds / 3600)).padStart(2, "0");
          const watchM = String(Math.floor((watchSeconds % 3600) / 60)).padStart(2, "0");
          const watchS = String(Math.floor(watchSeconds % 60)).padStart(2, "0");
          const tr = document.createElement("tr");
          const fullId = String(u._id || "");
          const shortId = fullId.slice(-4);
          // 生成角色选项
          const roleOptions = rolesCache.map(role => {
            const roleName = String(role.name || "").trim();
            return `<option value="${roleName}" ${u.role === roleName ? "selected" : ""}>${roleName}</option>`;
          }).join("");
          
          tr.innerHTML = `
            <td class="py-2"><span class="md:hidden">${shortId}</span><span class="hidden md:inline">${fullId}</span></td>
            <td>${u.username}</td>
            <td>${u.nickname || ""}</td>
            <td>
              <select class="role-select border rounded px-2 py-1 text-sm" data-id="${u._id}">
                ${roleOptions}
              </select>
            </td>
            <td>${u.isDisabled ? "禁用" : "正常"}</td>
            <td>
              <button
                class="text-blue-600 text-xs"
                data-action="note-toggle"
                data-id="${u._id}"
                data-note="${(u.note || "").replace(/"/g, "&quot;")}"
              >查看/编辑</button>
            </td>
            <td class="text-xs text-slate-600">
              <div class="grid grid-cols-2 gap-2 min-w-[200px]">
                <div class="bg-slate-50 rounded px-2 py-1">收藏：${stat.favoriteCount || 0}</div>
                <div class="bg-slate-50 rounded px-2 py-1">分享：${stat.shareCount || 0}</div>
                <div class="bg-slate-50 rounded px-2 py-1">历史：${stat.historyCount || 0}</div>
                <div class="bg-slate-50 rounded px-2 py-1">搜索：${stat.searchCount || 0}</div>
                <div class="bg-slate-50 rounded px-2 py-1 col-span-2">时长：${watchH}:${watchM}:${watchS}</div>
              </div>
            </td>
            <td class="space-x-2">
              <button class="text-indigo-600" data-action="view-favorites" data-id="${u._id}">喜欢</button>
              <button class="text-indigo-600" data-action="view-shares" data-id="${u._id}">分享</button>
              ${u._id === (currentProfile ? currentProfile._id : "")
                ? `<span class="text-slate-400 ml-2">本人</span>`
                : `${u.role === "admin"
                    ? ""
                    : `<button class="text-emerald-600 ml-2" data-action="perm" data-id="${u._id}">权限</button>
                      <button class="text-blue-600 ml-2" data-action="toggle" data-disabled="${u.isDisabled}" data-id="${u._id}">
                        ${u.isDisabled ? "启用" : "禁用"}
                      </button>`
                  }
                  <button class="text-red-600 ml-2" data-action="delete" data-id="${u._id}">删除</button>`
              }
            </td>
          `;
          tbody.appendChild(tr);
        });
        document.getElementById("usersMeta").textContent =
          `第 ${data.page} 页 / 共 ${data.totalPages} 页，合计 ${data.total} 条`;
        renderPagination();
        const pageSizeBox = document.getElementById("pageSizeBox");
        if (pageSizeBox) pageSizeBox.classList.remove("hidden");
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    };

    const loadUserAccess = async () => {
      const btn = document.getElementById("loadUserAccessBtn");
      const tbody = document.getElementById("userAccessTbody");
      const meta = document.getElementById("userAccessMeta");
      setBtnLoading(btn, true, "加载中...");
      try {
        const res = await fetch("/api/user/list?page=1&pageSize=100", { headers: authHeaders() });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "加载失败");
          return;
        }
        const list = Array.isArray(data.data) ? data.data : [];
        if (meta) meta.textContent = `共 ${list.length} 条`;
        if (!tbody) return;
        tbody.innerHTML = "";
        list.forEach((u) => {
          const apiAccess = u.role === "admin" ? "all" : (u.apiAccess || "normal");
          const tr = document.createElement("tr");
          tr.setAttribute("data-id", u._id);
          tr.innerHTML = `
            <td class="py-2">${u._id}</td>
            <td>${u.username}</td>
            <td>${u.nickname || ""}</td>
            <td>${u.role || ""}</td>
            <td>
              <select class="border rounded px-2 py-1 text-sm w-28" data-field="apiAccess" ${u.role === "admin" ? "disabled" : ""}>
                <option value="normal" ${apiAccess === "normal" ? "selected" : ""}>普通</option>
                <option value="adult" ${apiAccess === "adult" ? "selected" : ""}>18+</option>
                <option value="all" ${apiAccess === "all" ? "selected" : ""}>全部</option>
              </select>
            </td>
            <td>
              ${u.role === "admin" ? '<span class="text-xs text-slate-400">管理员固定全量</span>' : '<button class="text-xs text-blue-600" data-action="save-access" data-id="' + u._id + '">保存</button>'}
            </td>
          `;
          tbody.appendChild(tr);
        });
        if (list.length === 0) {
          const tr = document.createElement("tr");
          tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="6">暂无数据</td>';
          tbody.appendChild(tr);
        }
      } finally {
        setBtnLoading(btn, false, "刷新");
      }
    };

    const loadFeedback = async (page = currentFeedbackPage) => {
      const btn = document.getElementById("loadFeedbackBtn");
      const tbody = document.getElementById("feedbackTbody");
      const meta = document.getElementById("feedbackMeta");
      const pageInfo = document.getElementById("feedbackPageInfo");
      const pageSizeInput = document.getElementById("feedbackPageSize");
      const pageSize = Math.min(100, Math.max(1, Number(pageSizeInput ? pageSizeInput.value : currentFeedbackPageSize) || 20));
      currentFeedbackPageSize = pageSize;
      if (pageSizeInput) pageSizeInput.value = String(pageSize);
      setBtnLoading(btn, true, "加载中...");
      try {
        const res = await fetch(`/api/user/feedbacks?page=${page}&pageSize=${pageSize}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "获取反馈失败");
          return;
        }
        currentFeedbackPage = Number(data.page || 1);
        currentFeedbackTotalPages = Number(data.totalPages || 1);
        currentFeedbackTotal = Number(data.total || 0);
        if (meta) meta.textContent = `共 ${currentFeedbackTotal} 条`;
        if (pageInfo) {
          pageInfo.textContent = `第 ${currentFeedbackPage} 页 / 共 ${currentFeedbackTotalPages} 页`;
        }
        const prevBtn = document.getElementById("feedbackPrevBtn");
        const nextBtn = document.getElementById("feedbackNextBtn");
        if (prevBtn) {
          prevBtn.disabled = currentFeedbackPage <= 1;
          prevBtn.classList.toggle("opacity-50", prevBtn.disabled);
          prevBtn.classList.toggle("cursor-not-allowed", prevBtn.disabled);
        }
        if (nextBtn) {
          nextBtn.disabled = currentFeedbackPage >= currentFeedbackTotalPages;
          nextBtn.classList.toggle("opacity-50", nextBtn.disabled);
          nextBtn.classList.toggle("cursor-not-allowed", nextBtn.disabled);
        }
        if (!tbody) return;
        tbody.innerHTML = "";
        const list = Array.isArray(data.data) ? data.data : [];
        
        // 按用户分组
        const userGroups = {};
        list.forEach((item) => {
          const username = String(item.username || "-");
          if (!userGroups[username]) {
            userGroups[username] = {
              user: item,
              messages: []
            };
          }
          userGroups[username].messages.push(item);
        });
        
        // 渲染每个用户组
        Object.values(userGroups).forEach((group) => {
          const username = String(group.user.username || "-");
          const nickname = String(group.user.userNickname || group.user.nickname || "").trim();
          const email = group.user.email || "-";
          const messageCount = group.messages.length;
          
          // 创建用户折叠行
          const userRow = document.createElement("tr");
          userRow.className = "bg-slate-50 cursor-pointer";
          userRow.setAttribute("data-action", "toggle-user-messages");
          userRow.innerHTML = `
            <td colspan="6" class="py-3 px-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="font-medium text-slate-700">${username}</div>
                  ${nickname ? `<div class="text-xs text-slate-500">${nickname}</div>` : ""}
                  ${email !== "-" ? `<div class="text-xs text-slate-500">${email}</div>` : ""}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">共 ${messageCount} 条消息</span>
                  <span class="text-xs text-slate-400">▼</span>
                </div>
              </div>
            </td>
          `;
          tbody.appendChild(userRow);
          
          // 创建用户消息行（默认隐藏）
          group.messages.forEach((item, index) => {
            const tr = document.createElement("tr");
            tr.className = "user-message-row hidden";
            tr.setAttribute("data-user", username);
            const replies = Array.isArray(item.replies) ? item.replies : [];
          const repliesHtml = replies.length
            ? `<div class="mt-2">
                <button class="text-xs text-blue-600" data-action="toggle-replies">回复 (${replies.length})</button>
                <div class="mt-2 space-y-2 hidden" data-replies-box>
                  ${replies.map((reply) => {
                    const roleLabel = reply.role === "admin" ? "管理员" : "用户";
                    return `
                      <div class="rounded border px-2 py-1 text-xs ${reply.role === "admin" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}">
                        <div class="text-slate-500">${roleLabel} · ${formatTime(reply.createdAt)}</div>
                        <div class="text-slate-700 whitespace-pre-wrap mt-1">${reply.message || ""}</div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>`
            : "";

          const timeTd = document.createElement("td");
          timeTd.className = "py-2 text-xs text-slate-500 whitespace-nowrap";
          timeTd.textContent = formatTime(item.createdAt);

          const userTd = document.createElement("td");
          userTd.className = "text-sm";
          const nickname = String(item.userNickname || item.nickname || "").trim();
          userTd.innerHTML = `
            <div class="font-medium text-slate-700">${username}</div>
            <div class="text-xs text-slate-500">${nickname || "-"}</div>
          `;

          const emailTd = document.createElement("td");
          emailTd.className = "text-xs text-slate-600 max-w-[180px] break-all";
          emailTd.textContent = item.email || "-";

          const typeTd = document.createElement("td");
          typeTd.className = "text-xs text-slate-600 whitespace-nowrap";
          typeTd.textContent = item.type || "-";

          const messageTd = document.createElement("td");
          messageTd.className = "text-xs text-slate-600 max-w-[360px]";
          messageTd.innerHTML = `
            <div class="whitespace-pre-wrap">${item.message || ""}</div>
            ${repliesHtml}
          `;

          const actionTd = document.createElement("td");
          actionTd.className = "text-xs";
          const replyBtn = document.createElement("button");
          replyBtn.className = "text-blue-600 mr-2";
          replyBtn.textContent = "回复";
          replyBtn.setAttribute("data-action", "feedback-reply");
          replyBtn.setAttribute("data-id", item.id || "");
          replyBtn.setAttribute("data-user", item.username || "");
          replyBtn.setAttribute("data-type", item.type || "");
          replyBtn.setAttribute("data-message", item.message || "");
          const delBtn = document.createElement("button");
          delBtn.className = "text-red-600";
          delBtn.textContent = "删除";
          delBtn.setAttribute("data-action", "feedback-delete");
          delBtn.setAttribute("data-id", item.id || "");
          delBtn.setAttribute("data-message", item.message || "");
          actionTd.appendChild(replyBtn);
          actionTd.appendChild(delBtn);

          tr.appendChild(timeTd);
          tr.appendChild(userTd);
          tr.appendChild(emailTd);
          tr.appendChild(typeTd);
          tr.appendChild(messageTd);
          tr.appendChild(actionTd);
          tbody.appendChild(tr);
          });
        });
        
        if (list.length === 0) {
          const tr = document.createElement("tr");
          tr.innerHTML = '<td class="py-3 text-center text-slate-500" colspan="6">暂无反馈</td>';
          tbody.appendChild(tr);
        }
        
        // 添加用户消息折叠/展开事件
        document.querySelectorAll('[data-action="toggle-user-messages"]').forEach((row) => {
          row.addEventListener('click', function() {
            // 获取当前用户行的所有后续兄弟元素，直到下一个用户行
            let nextRow = this.nextElementSibling;
            const messageRows = [];
            
            while (nextRow && !nextRow.hasAttribute('data-action')) {
              messageRows.push(nextRow);
              nextRow = nextRow.nextElementSibling;
            }
            
            const arrow = this.querySelector('.text-slate-400');
            
            messageRows.forEach((messageRow) => {
              messageRow.classList.toggle('hidden');
            });
            
            if (arrow.textContent === '▼') {
              arrow.textContent = '▲';
            } else {
              arrow.textContent = '▼';
            }
          });
        });
      } finally {
        setBtnLoading(btn, false, "刷新");
      }
    };

    document.getElementById("loadUsersBtn").addEventListener("click", async () => {
      await loadUsers(currentUsersPage);
    });
    const loadUserAccessBtn = document.getElementById("loadUserAccessBtn");
    if (loadUserAccessBtn) {
      loadUserAccessBtn.addEventListener("click", async () => {
        await loadUserAccess();
      });
    }
    const loadFeedbackBtn = document.getElementById("loadFeedbackBtn");
    if (loadFeedbackBtn) {
      loadFeedbackBtn.addEventListener("click", async () => {
        await loadFeedback(currentFeedbackPage);
      });
    }
    const feedbackPrevBtn = document.getElementById("feedbackPrevBtn");
    if (feedbackPrevBtn) {
      feedbackPrevBtn.addEventListener("click", async () => {
        if (currentFeedbackPage <= 1) return;
        await loadFeedback(currentFeedbackPage - 1);
      });
    }
    const feedbackNextBtn = document.getElementById("feedbackNextBtn");
    if (feedbackNextBtn) {
      feedbackNextBtn.addEventListener("click", async () => {
        if (currentFeedbackPage >= currentFeedbackTotalPages) return;
        await loadFeedback(currentFeedbackPage + 1);
      });
    }
    const feedbackPageSize = document.getElementById("feedbackPageSize");
    if (feedbackPageSize) {
      feedbackPageSize.addEventListener("change", async () => {
        currentFeedbackPage = 1;
        await loadFeedback(1);
      });
      feedbackPageSize.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          currentFeedbackPage = 1;
          await loadFeedback(1);
        }
      });
    }
    document.getElementById("loadOnlineBtn").addEventListener("click", async () => {
      await loadOnline();
    });
    document.getElementById("loadOfficialApisBtn").addEventListener("click", async () => {
      await loadOfficialApis();
    });
    
    // 全部监测按钮事件监听器
    const officialCheckAllBtn = document.getElementById("officialCheckAllBtn");
    if (officialCheckAllBtn) {
      officialCheckAllBtn.addEventListener("click", async () => {
        await batchCheckOfficial();
      });
      officialCheckAllBtn.classList.remove("hidden");
    }
    const officialTabAdminAdult = document.getElementById("officialTabAdminAdult");
    const officialTabAdminNormal = document.getElementById("officialTabAdminNormal");
    if (officialTabAdminAdult) {
      officialTabAdminAdult.addEventListener("click", () => applyOfficialAdminTab("adult"));
    }
    if (officialTabAdminNormal) {
      officialTabAdminNormal.addEventListener("click", () => applyOfficialAdminTab("normal"));
    }
    const adminTabOfficial = document.getElementById("adminTabOfficial");
    const adminTabParse = document.getElementById("adminTabParse");
    if (adminTabOfficial) {
      adminTabOfficial.addEventListener("click", () => switchAdminApiTab("official"));
    }
    if (adminTabParse) {
      adminTabParse.addEventListener("click", () => switchAdminApiTab("parse"));
    }
    document.getElementById("addOfficialBtn").addEventListener("click", async () => {
      await addOfficialApi();
    });
    const officialCategoryInput = document.getElementById("officialCategoryInput");
    if (officialCategoryInput) {
      officialCategoryInput.addEventListener("change", (e) => {
        const value = e.target.value;
        if (value === "adult" || value === "normal") {
          applyOfficialAdminTab(value);
        }
      });
    }
    const officialParseInput = document.getElementById("officialParseInput");
    if (officialParseInput) {
      officialParseInput.addEventListener("blur", applyParsedOfficialInput);
      officialParseInput.addEventListener("change", applyParsedOfficialInput);
    }
    document.getElementById("loadParseApisBtn").addEventListener("click", async () => {
      await loadParseApis();
    });
    document.getElementById("addParseBtn").addEventListener("click", async () => {
      await addParseApi();
    });
    document.getElementById("parseEnableAllBtn").addEventListener("click", async () => {
      await batchToggleParse(true);
    });
    document.getElementById("parseDisableAllBtn").addEventListener("click", async () => {
      await batchToggleParse(false);
    });
    document.getElementById("parseSaveSortBtn").addEventListener("click", async () => {
      await saveParseSort();
    });
    document.getElementById("officialEnableAllBtn").addEventListener("click", async () => {
      const confirmed = typeof showConfirmDialog === "function"
        ? await showConfirmDialog({
          title: "全部启用",
          description: "确认启用所有官方接口？",
          confirmText: "全部启用",
          type: "info"
        })
        : confirm("确认启用所有官方接口？");
      if (!confirmed) return;
      await batchToggleOfficial(true);
    });
    document.getElementById("officialDisableAllBtn").addEventListener("click", async () => {
      const confirmed = typeof showConfirmDialog === "function"
        ? await showConfirmDialog({
          title: "全部停用",
          description: "确认停用所有官方接口？停用后将不再对外提供。",
          confirmText: "全部停用",
          type: "danger"
        })
        : confirm("确认停用所有官方接口？");
      if (!confirmed) return;
      await batchToggleOfficial(false);
    });
    document.getElementById("officialSaveSortBtn").addEventListener("click", async () => {
      await saveOfficialSort();
    });
    const officialDisableAbnormalBtn = document.getElementById("officialDisableAbnormalBtn");
    if (officialDisableAbnormalBtn) {
      officialDisableAbnormalBtn.addEventListener("click", async () => {
        await disableAbnormalApis({
          tbodyId: "officialTbody",
          buttonId: "officialDisableAbnormalBtn",
          batchUrl: "/api/user/official-apis/batch",
          reload: loadOfficialApis,
          label: "停用异常",
        });
      });
    }
    const parseDisableAbnormalBtn = document.getElementById("parseDisableAbnormalBtn");
    if (parseDisableAbnormalBtn) {
      parseDisableAbnormalBtn.addEventListener("click", async () => {
        await disableAbnormalApis({
          tbodyId: "parseTbody",
          buttonId: "parseDisableAbnormalBtn",
          batchUrl: "/api/user/parse-apis/batch",
          reload: loadParseApis,
          label: "停用异常",
        });
      });
    }
    document.getElementById("loadRouteAccessBtn").addEventListener("click", async () => {
      await loadRouteAccess();
    });
    const routeAccessContainer = document.getElementById("routeAccessGroups");
    if (routeAccessContainer) {
      routeAccessContainer.addEventListener("change", async (e) => {
        const target = e.target;
        if (!target) return;
        if (target.matches('input[data-field="enabled"]')) {
          const row = target.closest("tr[data-key]");
          await saveRouteAccessSingle(row, { fields: ["enabled"] });
        } else if (target.matches('select[data-field="access"]')) {
          const row = target.closest("tr[data-key]");
          await saveRouteAccessSingle(row, { fields: ["access"] });
        }
      });
      routeAccessContainer.addEventListener("click", (e) => {
        const target = e.target.closest(".route-note-editable");
        if (!target) return;
        if (target.dataset.editing === "1") return;
        const row = target.closest("tr[data-key]");
        if (!row) return;
        target.dataset.editing = "1";
        const oldValue = target.getAttribute("data-value") || "";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "border rounded px-2 py-1 text-xs w-48";
        input.value = oldValue;
        target.classList.add("hidden");
        target.parentNode.appendChild(input);
        input.focus();
        // 将光标移到内容末尾，而不是选中全部
        input.setSelectionRange(input.value.length, input.value.length);
        const cleanup = async (save) => {
          const newValue = (input.value || "").trim();
          input.remove();
          target.classList.remove("hidden");
          target.dataset.editing = "0";
          if (!save) return;
          if (newValue === oldValue) return;
          target.setAttribute("data-value", newValue);
          target.textContent = newValue || "点击添加";
          await saveRouteAccessSingle(row, { fields: ["note"] });
        };
        input.addEventListener("blur", () => cleanup(true));
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            input.blur();
          } else if (ev.key === "Escape") {
            ev.preventDefault();
            cleanup(false);
          }
        });
      });
    }

    const userAccessTbody = document.getElementById("userAccessTbody");
    if (userAccessTbody) {
      userAccessTbody.addEventListener("click", async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        const id = target.getAttribute("data-id");
        if (action !== "save-access" || !id) return;
        const row = target.closest("tr");
        if (!row) return;
        const select = row.querySelector('select[data-field="apiAccess"]');
        const value = select ? String(select.value || "normal") : "normal";
        const originalText = target.textContent || "";
        target.innerHTML = '<span class="inline-flex items-center"><span class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span></span>';
        target.setAttribute("disabled", "disabled");
        try {
          const res = await fetch(`/api/user/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ apiAccess: value })
          });
          const data = await res.json();
          if (data.code === 200) {
            toast("权限已保存");
          } else {
            toast(data.message || "保存失败");
          }
        } catch (err) {
          toast("保存失败");
        } finally {
          target.removeAttribute("disabled");
          target.textContent = originalText || "保存";
        }
      });
    }
    const feedbackTbody = document.getElementById("feedbackTbody");
    if (feedbackTbody) {
      feedbackTbody.addEventListener("click", async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        // 使用 closest 方法获取最近的带有 data-action 属性的元素
        const actionElement = target.closest('[data-action]');
        if (!actionElement) return;
        const action = actionElement.getAttribute("data-action");
        if (action === "toggle-replies") {
          const row = actionElement.closest("tr");
          if (!row) return;
          const box = row.querySelector("[data-replies-box]");
          if (!box) return;
          const isHidden = box.classList.contains("hidden");
          box.classList.toggle("hidden", !isHidden);
          actionElement.textContent = isHidden
            ? actionElement.textContent.replace("回复", "收起")
            : actionElement.textContent.replace("收起", "回复");
          return;
        }
        if (action === "feedback-reply") {
          const id = actionElement.getAttribute("data-id") || "";
          const userLabel = actionElement.getAttribute("data-user") || "";
          const typeLabel = actionElement.getAttribute("data-type") || "";
          const message = actionElement.getAttribute("data-message") || "";
          const meta = [userLabel, typeLabel].filter(Boolean).join(" · ");
          openFeedbackReplyPanel(id, meta, message);
          return;
        }
        if (action === "feedback-delete") {
          const id = actionElement.getAttribute("data-id");
          const message = actionElement.getAttribute("data-message") || "";
          if (!id) return;
          // 打开删除确认弹窗
          feedbackDeleteTargetId = id;
          feedbackDeleteMessage = message;
          const modal = document.getElementById("deleteFeedbackModal");
          const contentBox = document.getElementById("deleteFeedbackContent");
          if (modal) {
            if (contentBox) {
              contentBox.textContent = message;
            }
            modal.classList.remove("hidden");
            modal.classList.add("flex");
          }
          return;
        }
      });
    }
    const profileBox = document.getElementById("profileBox");
    if (profileBox) {
      profileBox.addEventListener("click", (e) => {
        const actionBtn = e.target.closest('[data-action="random-avatar"]');
        if (actionBtn) {
          randomizeProfileAvatar();
          return;
        }
        const target = e.target.closest(".profile-editable");
        if (!target) return;
        beginInlineEdit(target);
      });
    }
    document.querySelectorAll(".module-tab").forEach((tab) => {
      tab.addEventListener("click", async () => {
        const target = tab.dataset.moduleTarget;
        if (!target) return;
        await setActiveModule(target);
        if (window.innerWidth < 768) {
          closeSideNav();
        }
      });
    });
    // 地址栏 hash 变化（手动修改或前进/后退）时切换到对应模块
    window.addEventListener("hashchange", () => {
      const name = String(location.hash || "").replace(/^#/, "").trim();
      if (!name) return;
      const exists = Array.from(document.querySelectorAll(".module-tab"))
        .some((tab) => tab.dataset.moduleTarget === name);
      if (exists) {
        setActiveModule(name);
      }
    });
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => {
        toggleSideNav();
      });
    }
    if (sideNavOverlay) {
      sideNavOverlay.addEventListener("click", () => {
        closeSideNav();
      });
    }
    document.getElementById("loadFavoritesBtn").addEventListener("click", async () => {
      await loadFavorites();
      openModal("favoritesModal");
    });
    document.getElementById("loadSharesBtn").addEventListener("click", async () => {
      await loadShares();
      openModal("sharesModal");
    });
    document.getElementById("closeFavoritesBtn").addEventListener("click", () => {
      closeModal("favoritesModal");
    });
    document.getElementById("closeSharesBtn").addEventListener("click", () => {
      closeModal("sharesModal");
    });
    const closeFeedbackReply = document.getElementById("closeFeedbackReply");
    if (closeFeedbackReply) {
      closeFeedbackReply.addEventListener("click", () => closeFeedbackReplyPanel());
    }
    const cancelFeedbackReply = document.getElementById("cancelFeedbackReply");
    if (cancelFeedbackReply) {
      cancelFeedbackReply.addEventListener("click", () => closeFeedbackReplyPanel());
    }
    const submitFeedbackReply = document.getElementById("submitFeedbackReply");
    if (submitFeedbackReply) {
      submitFeedbackReply.addEventListener("click", async () => {
        if (!feedbackReplyTargetId) return;
        const input = document.getElementById("feedbackReplyInput");
        const message = input ? String(input.value || "").trim() : "";
        if (!message) {
          toast("请输入回复内容");
          return;
        }
        setBtnLoading(submitFeedbackReply, true, "发送中...");
        try {
          const res = await fetch(`/api/user/feedbacks/${feedbackReplyTargetId}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ message })
          });
          const data = await res.json();
          if (data.code !== 200) {
            toast(data.message || "回复失败");
            return;
          }
          toast("已回复");
          closeFeedbackReplyPanel();
          await loadFeedback(currentFeedbackPage);
        } catch (err) {
          toast("回复失败");
        } finally {
          setBtnLoading(submitFeedbackReply, false, "发送回复");
        }
      });
    }

    // 删除确认弹窗事件监听器
    const closeDeleteFeedbackModal = document.getElementById("closeDeleteFeedbackModal");
    const cancelDeleteFeedback = document.getElementById("cancelDeleteFeedback");
    const confirmDeleteFeedback = document.getElementById("confirmDeleteFeedback");
    const deleteFeedbackModal = document.getElementById("deleteFeedbackModal");

    const closeDeleteFeedbackPanel = () => {
      if (deleteFeedbackModal) {
        const contentBox = document.getElementById("deleteFeedbackContent");
        if (contentBox) {
          contentBox.textContent = "";
        }
        deleteFeedbackModal.classList.add("hidden");
        deleteFeedbackModal.classList.remove("flex");
        feedbackDeleteTargetId = "";
        feedbackDeleteMessage = "";
      }
    };

    if (closeDeleteFeedbackModal) {
      closeDeleteFeedbackModal.addEventListener("click", closeDeleteFeedbackPanel);
    }

    if (cancelDeleteFeedback) {
      cancelDeleteFeedback.addEventListener("click", closeDeleteFeedbackPanel);
    }

    if (confirmDeleteFeedback) {
      confirmDeleteFeedback.addEventListener("click", async () => {
        if (!feedbackDeleteTargetId) {
          closeDeleteFeedbackPanel();
          return;
        }
        setBtnLoading(confirmDeleteFeedback, true, "删除中...");
        try {
          const res = await fetch(`/api/user/feedbacks/${feedbackDeleteTargetId}`, {
            method: "DELETE",
            headers: authHeaders(),
          });
          const data = await res.json();
          if (data.code !== 200) {
            toast(data.message || "删除失败");
            return;
          }
          toast("已删除");
          closeDeleteFeedbackPanel();
          await loadFeedback(currentFeedbackPage);
        } catch (err) {
          toast("删除失败");
        } finally {
          setBtnLoading(confirmDeleteFeedback, false, "删除");
        }
      });
    }
    const adminPlayerCloseBtn = document.getElementById("closeAdminPlayer");
    if (adminPlayerCloseBtn) {
      adminPlayerCloseBtn.addEventListener("click", () => closeAdminPlayer());
    }
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "play") {
        const url = btn.getAttribute("data-url") || "";
        const title = btn.getAttribute("data-title") || "";
        if (url) openAdminPlayer(url, title);
      } else if (action === "open") {
        const url = btn.getAttribute("data-url") || "";
        if (url) window.open(url, "_blank");
      } else if (action === "copy") {
        const shareUrl = btn.getAttribute("data-share-url") || "";
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl).then(() => toast("已复制")).catch(() => prompt("复制链接", shareUrl));
      }
    });
    const favoritesUserSelect = document.getElementById("favoritesUserSelect");
    const sharesUserSelect = document.getElementById("sharesUserSelect");
    if (favoritesUserSelect) {
      favoritesUserSelect.addEventListener("change", async (e) => {
        const value = e.target.value;
        syncUserSelects(value);
        await loadFavorites();
        await loadShares();
      });
    }
    if (sharesUserSelect) {
      sharesUserSelect.addEventListener("change", async (e) => {
        const value = e.target.value;
        syncUserSelects(value);
        await loadFavorites();
        await loadShares();
      });
    }

    const favoritesGrid = document.getElementById("favoritesGrid");
    if (favoritesGrid) {
      favoritesGrid.addEventListener("click", async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.getAttribute("data-action") !== "favorite-delete") return;
        const url = target.getAttribute("data-url") || "";
        if (!url) return;
        if (!confirm("确认删除该喜欢？")) return;
        const userId = getSelectedUserId();
        const endpoint = userId ? `/api/user/${userId}/favorites` : "/user/favorites";
        setBtnLoading(target, true, "");
        const res = await fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "删除失败");
        } else {
          toast("已删除");
          const grid = document.getElementById("favoritesGrid");
          const prevTop = grid ? grid.scrollTop : 0;
          const card = target.closest("[data-card-id]");
          if (card) card.remove();
          updateGridMeta("favoritesGrid", "favoritesMeta");
          if (grid) grid.scrollTop = prevTop;
        }
        setBtnLoading(target, false, "删除");
      });
    }

    const sharesGrid = document.getElementById("sharesGrid");
    if (sharesGrid) {
      sharesGrid.addEventListener("click", async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.getAttribute("data-action") !== "share-delete") return;
        const shareId = target.getAttribute("data-share-id") || "";
        if (!shareId) return;
        if (!confirm("确认删除该分享？")) return;
        const userId = getSelectedUserId();
        const endpoint = userId ? `/api/user/${userId}/shares` : "/user/shares";
        setBtnLoading(target, true, "");
        const res = await fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ shareId })
        });
        const data = await res.json();
        if (data.code !== 200) {
          toast(data.message || "删除失败");
        } else {
          toast("已删除");
          const grid = document.getElementById("sharesGrid");
          const prevTop = grid ? grid.scrollTop : 0;
          const card = target.closest("[data-card-id]");
          if (card) card.remove();
          updateGridMeta("sharesGrid", "sharesMeta");
          if (grid) grid.scrollTop = prevTop;
        }
        setBtnLoading(target, false, "删除");
      });
    }

    const officialTbody = document.getElementById("officialTbody");
    if (officialTbody) {
      let dragSourceRow = null;
      let sortAutoSaveTimer = null;
      officialTbody.addEventListener("dragstart", (e) => {
        const row = e.target && e.target.closest("tr[data-id]");
        if (!row) return;
        dragSourceRow = row;
        e.dataTransfer.effectAllowed = "move";
        row.classList.add("opacity-50");
      });
      officialTbody.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const overRow = e.target && e.target.closest("tr[data-id]");
        if (!overRow || overRow === dragSourceRow) return;
        const rect = overRow.getBoundingClientRect();
        const next = (e.clientY - rect.top) > rect.height / 2;
        if (next) {
          overRow.after(dragSourceRow);
        } else {
          overRow.before(dragSourceRow);
        }
      });
      officialTbody.addEventListener("drop", (e) => {
        e.preventDefault();
        if (dragSourceRow) dragSourceRow.classList.remove("opacity-50");
        dragSourceRow = null;
        syncOfficialSortNumbers();
        const currentSignature = getOfficialSortSignature();
        if (currentSignature === (officialTbody.dataset.sortSignature || "")) {
          return;
        }
        if (sortAutoSaveTimer) clearTimeout(sortAutoSaveTimer);
        sortAutoSaveTimer = setTimeout(() => {
          saveOfficialSort();
        }, 400);
      });
      officialTbody.addEventListener("dragend", () => {
        if (dragSourceRow) dragSourceRow.classList.remove("opacity-50");
        dragSourceRow = null;
      });
      officialTbody.addEventListener("input", (e) => {
        const row = e.target && e.target.closest("tr[data-id]");
        if (!row) return;
        updateRowSaveState(row);
      });
      officialTbody.addEventListener("change", (e) => {
        const row = e.target && e.target.closest("tr[data-id]");
        if (!row) return;
        updateRowSaveState(row);
      });
      officialTbody.addEventListener("click", async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        const id = target.getAttribute("data-id");
        if (!action || !id) return;
        if (action === "toggle") {
          setBtnLoading(target, true, "处理中...");
          const enabled = target.getAttribute("data-enabled") !== "1";
          const res = await fetch("/api/user/official-apis/batch", {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ ids: [id], enabled })
          });
          const data = await res.json();
          if (data.code !== 200) {
            toast(data.message || "更新失败");
          }
          await loadOfficialApis();
          setBtnLoading(target, false, enabled ? "已启用" : "已停用");
          return;
        }
        if (action === "delete") {
          setBtnLoading(target, true, "删除中...");
          await deleteOfficialApi(id);
          setBtnLoading(target, false, "删除");
          return;
        }
        if (action === "save") {
          setBtnIconLoading(target, true);
          const rowInputs = officialTbody.querySelectorAll(`[data-id="${id}"][data-field]`);
          const payload = {};
          rowInputs.forEach((input) => {
            const field = input.getAttribute("data-field");
            if (!field) return;
            if (field === "sort") {
              payload.sort = Number(input.value || 0);
            } else {
              payload[field] = input.value;
            }
          });
          const ok = await updateOfficialApi(id, payload);
          if (ok) {
            toast("已保存");
            await loadOfficialApis();
          }
          setBtnIconLoading(target, false);
        }
      });
    }

    const parseTbody = document.getElementById("parseTbody");
    if (parseTbody) {
      let dragSourceRow = null;
      let sortAutoSaveTimer = null;
      const lockBtnWidth = (btn) => {
        if (!btn) return;
        const width = btn.getBoundingClientRect().width;
        if (width) btn.style.minWidth = `${Math.ceil(width)}px`;
      };
      const unlockBtnWidth = (btn) => {
        if (!btn) return;
        btn.style.minWidth = "";
      };
      parseTbody.addEventListener("dragstart", (e) => {
        const row = e.target && e.target.closest("tr[data-id]");
        if (!row) return;
        dragSourceRow = row;
        e.dataTransfer.effectAllowed = "move";
        row.classList.add("opacity-50");
      });
      parseTbody.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const overRow = e.target && e.target.closest("tr[data-id]");
        if (!overRow || overRow === dragSourceRow) return;
        const rect = overRow.getBoundingClientRect();
        const next = (e.clientY - rect.top) > rect.height / 2;
        if (next) {
          overRow.after(dragSourceRow);
        } else {
          overRow.before(dragSourceRow);
        }
      });
      parseTbody.addEventListener("drop", (e) => {
        e.preventDefault();
        if (dragSourceRow) dragSourceRow.classList.remove("opacity-50");
        dragSourceRow = null;
        syncParseSortNumbers();
        const currentSignature = getParseSortSignature();
        if (currentSignature === (parseTbody.dataset.sortSignature || "")) {
          return;
        }
        if (sortAutoSaveTimer) clearTimeout(sortAutoSaveTimer);
        sortAutoSaveTimer = setTimeout(() => {
          saveParseSort(false);
        }, 400);
      });
      parseTbody.addEventListener("dragend", () => {
        if (dragSourceRow) dragSourceRow.classList.remove("opacity-50");
        dragSourceRow = null;
      });
      parseTbody.addEventListener("input", (e) => {
        const row = e.target && e.target.closest("tr[data-id]");
        if (!row) return;
        updateRowSaveState(row);
      });
      parseTbody.addEventListener("change", (e) => {
        const row = e.target && e.target.closest("tr[data-id]");
        if (!row) return;
        updateRowSaveState(row);
      });
      parseTbody.addEventListener("click", async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        const id = target.getAttribute("data-id");
        if (!action || !id) return;
        if (action === "toggle") {
          lockBtnWidth(target);
          setBtnLoading(target, true, "");
          const enabled = target.getAttribute("data-enabled") !== "1";
          const res = await fetch("/api/user/parse-apis/batch", {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ ids: [id], enabled })
          });
          const data = await res.json();
          if (data.code !== 200) {
            toast(data.message || "更新失败");
          }
          await loadParseApis();
          setBtnLoading(target, false, enabled ? "已启用" : "已停用");
          unlockBtnWidth(target);
          return;
        }
        if (action === "delete") {
          lockBtnWidth(target);
          setBtnLoading(target, true, "");
          await deleteParseApi(id);
          setBtnLoading(target, false, "删除");
          unlockBtnWidth(target);
          return;
        }
        if (action === "save") {
          lockBtnWidth(target);
          setBtnIconLoading(target, true);
          const rowInputs = parseTbody.querySelectorAll(`[data-id="${id}"][data-field]`);
          const payload = {};
          rowInputs.forEach((input) => {
            const field = input.getAttribute("data-field");
            if (!field) return;
            if (field === "sort") {
              payload.sort = Number(input.value || 0);
            } else {
              payload[field] = input.value;
            }
          });
          const ok = await updateParseApi(id, payload);
          if (ok) {
            toast("已保存");
            await loadParseApis();
          }
          setBtnIconLoading(target, false);
          unlockBtnWidth(target);
        }
      });
    }

    document.getElementById("pageSizeInput").addEventListener("change", async () => {
      currentUsersPage = 1;
      await loadUsers(1);
    });

    document.getElementById("paginationButtons").addEventListener("click", async (e) => {
      const btn = e.target;
      if (btn.tagName !== "BUTTON") return;
      const page = Number(btn.getAttribute("data-page"));
      if (!page || page === currentUsersPage) return;
      await loadUsers(page);
    });

    document.getElementById("usersThead").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-sort]");
      if (!btn) return;
      const key = btn.getAttribute("data-sort");
      if (!key) return;
      if (statsSort.key === key) {
        statsSort.dir = statsSort.dir === "asc" ? "desc" : "asc";
      } else {
        statsSort.key = key;
        statsSort.dir = "desc";
      }
      await loadUsers(currentUsersPage);
    });

    // 处理角色选择框的变化
    document.getElementById("usersTbody").addEventListener("change", async (e) => {
      const select = e.target;
      if (!select.classList.contains("role-select")) return;
      const id = select.getAttribute("data-id");
      const newRole = select.value;
      if (!id || !newRole) return;

      try {
        setLoading(true, "更新角色...");
        const res = await fetch("/api/user/user-role", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ userId: id, role: newRole }),
        });
        const data = await res.json();
        if (data.code === 200) {
          toast("角色更新成功");
        } else {
          toast(data.message || "更新失败");
          // 恢复原角色
          const user = usersCache.find(u => u._id === id);
          if (user) {
            select.value = user.role;
          }
        }
      } catch (error) {
        console.error("更新角色失败:", error);
        toast("更新失败");
        // 恢复原角色
        const user = usersCache.find(u => u._id === id);
        if (user) {
          select.value = user.role;
        }
      } finally {
        setLoading(false);
      }
    });

    document.getElementById("usersTbody").addEventListener("click", async (e) => {
      const btn = e.target;
      if (btn.tagName !== "BUTTON") return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if (!id || !action) return;

      if (action === "view-favorites") {
        setBtnLoading(btn, true, "");
        syncUserSelects(id);
        await loadFavorites();
        openModal("favoritesModal");
        setBtnLoading(btn, false, "喜欢");
        return;
      }

      if (action === "view-shares") {
        setBtnLoading(btn, true, "");
        syncUserSelects(id);
        await loadShares();
        openModal("sharesModal");
        setBtnLoading(btn, false, "分享");
        return;
      }

      if (action === "perm") {
        pendingPermissionUserId = id;
        const userPages = userPermissionsById[id] || [];
        const panel = document.getElementById("permissionPanel");
        const info = document.getElementById("permissionUserInfo");
        const list = document.getElementById("permissionList");
        if (info) {
          const row = btn.closest("tr");
          const cells = row ? row.querySelectorAll("td") : [];
          const username = cells[1] ? cells[1].textContent : "";
          const nickname = cells[2] ? cells[2].textContent : "";
          info.textContent = `用户：${username}${nickname ? `（${nickname}）` : ""}`;
        }
        if (!availablePages) {
          const res = await fetch("/api/user/pages", { headers: authHeaders() });
          const data = await res.json();
          if (data.code === 200 && Array.isArray(data.data)) {
            availablePages = data.data;
          } else {
            toast(data.message || "获取页面列表失败");
            return;
          }
        }
        pageAliasMap = {};
        availablePages.forEach((page) => {
          let alias = page;
          if (page === "/index.html") alias = "首页";
          else if (page.endsWith("/index.html")) {
            const seg = page.split("/").filter(Boolean);
            alias = seg.length >= 2 ? `${seg[0]} / ${seg[1]}` : seg[0];
          } else {
            const seg = page.split("/").filter(Boolean);
            alias = seg[seg.length - 1];
          }
          pageAliasMap[page] = alias;
        });
        if (list) {
          list.innerHTML = "";
          availablePages.forEach((page) => {
            const label = document.createElement("label");
            label.className = "flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50";
            label.innerHTML = `
              <input type="checkbox" class="perm-checkbox" value="${page}">
              <span>${pageAliasMap[page] || page}</span>
              <span class="text-xs text-slate-400 ml-auto">${page}</span>
            `;
            const checkbox = label.querySelector("input");
            if (checkbox && userPages.includes(page)) checkbox.checked = true;
            list.appendChild(label);
          });
        }
        if (panel) {
          panel.classList.remove("hidden");
          panel.classList.add("flex");
        }
        return;
      }

      if (action === "toggle") {
        const isDisabled = btn.getAttribute("data-disabled") === "true";
        const nextDisabled = !isDisabled;
        if (nextDisabled) {
          pendingDisableUserId = id;
          const row = btn.closest("tr");
          const cells = row ? row.querySelectorAll("td") : [];
          const username = cells[1] ? cells[1].textContent : "";
          const nickname = cells[2] ? cells[2].textContent : "";
          document.getElementById("disableUserName").textContent = username;
          document.getElementById("disableUserNickname").textContent = nickname;
          document.getElementById("disableReasonInput").value = "";
          showModal("disableModal");
          return;
        }
        if (!confirm("确认启用该用户？")) return;
        const res = await fetch(`/api/user/${id}/disable`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ disabled: false, reason: "" })
        });
        const data = await res.json();
        if (data.code === 200) {
          toast("已启用");
          document.getElementById("loadUsersBtn").click();
        } else {
          toast(data.message || "操作失败");
        }
        return;
      }

      if (action === "delete") {
        if (!confirm("确认删除用户？")) return;
        const res = await fetch(`/api/user/${id}`, { method: "DELETE", headers: authHeaders() });
        const data = await res.json();
        if (data.code === 200) {
          toast("已删除");
          document.getElementById("loadUsersBtn").click();
        } else {
          toast(data.message || "删除失败");
        }
      }
    });

    document.getElementById("confirmDisableBtn").addEventListener("click", async () => {
      if (!pendingDisableUserId) return;
      const reason = document.getElementById("disableReasonInput").value.trim();
      const btn = document.getElementById("confirmDisableBtn");
      const originalText = btn.textContent;
      btn.innerHTML = '<span class="inline-flex items-center space-x-2"><span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>禁用中...</span></span>';
      btn.disabled = true;
      const res = await fetch(`/api/user/${pendingDisableUserId}/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ disabled: true, reason })
      });
      const data = await res.json();
      if (data.code === 200) {
        toast("已禁用");
        hideModal("disableModal");
        document.getElementById("loadUsersBtn").click();
      } else {
        toast(data.message || "操作失败");
      }
      pendingDisableUserId = null;
      btn.disabled = false;
      btn.textContent = originalText;
    });

    document.getElementById("usersTbody").addEventListener("click", async (e) => {
      const target = e.target;
      if (target.tagName !== "BUTTON") return;
      const action = target.getAttribute("data-action");

      if (action === "note-toggle") {
        const id = target.getAttribute("data-id");
        const note = target.getAttribute("data-note") || "";
        if (!id) return;
        pendingNoteUserId = id;
        const panel = document.getElementById("notePanel");
        const input = document.getElementById("notePanelInput");
        if (input) {
          input.value = note;
          input.focus();
        }
        if (panel) {
          panel.classList.remove("hidden");
          panel.classList.add("flex");
        }
        return;
      }
    });

    const hideNotePanel = () => {
      const panel = document.getElementById("notePanel");
      if (panel) {
        panel.classList.add("hidden");
        panel.classList.remove("flex");
      }
      pendingNoteUserId = null;
    };

    document.getElementById("closeNotePanel").addEventListener("click", hideNotePanel);
    document.getElementById("cancelNotePanel").addEventListener("click", hideNotePanel);

    document.getElementById("saveNotePanel").addEventListener("click", async () => {
      if (!pendingNoteUserId) return;
      const btn = document.getElementById("saveNotePanel");
      const originalText = btn.textContent;
      btn.innerHTML = '<span class="inline-flex items-center gap-2"><span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>保存中...</span></span>';
      btn.disabled = true;
      const input = document.getElementById("notePanelInput");
      const note = input ? input.value.trim() : "";
      const res = await fetch(`/api/user/${pendingNoteUserId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ note })
      });
      const data = await res.json();
      if (data.code === 200) {
        toast("备注已更新");
        const toggleBtn = document.querySelector(`[data-action="note-toggle"][data-id="${pendingNoteUserId}"]`);
        if (toggleBtn) toggleBtn.setAttribute("data-note", note.replace(/"/g, "&quot;"));
        hideNotePanel();
      } else {
        toast(data.message || "更新失败");
      }
      btn.disabled = false;
      btn.textContent = originalText;
    });

    const hidePermissionPanel = () => {
      const panel = document.getElementById("permissionPanel");
      if (panel) {
        panel.classList.add("hidden");
        panel.classList.remove("flex");
      }
      pendingPermissionUserId = null;
    };

    document.getElementById("closePermissionPanel").addEventListener("click", hidePermissionPanel);
    document.getElementById("cancelPermissionPanel").addEventListener("click", hidePermissionPanel);

    document.getElementById("savePermissionPanel").addEventListener("click", async () => {
      if (!pendingPermissionUserId) return;
      const btn = document.getElementById("savePermissionPanel");
      const originalText = btn.textContent;
      btn.innerHTML = '<span class="inline-flex items-center gap-2"><span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>保存中...</span></span>';
      btn.disabled = true;
      const list = document.getElementById("permissionList");
      const selected = list
        ? Array.from(list.querySelectorAll(".perm-checkbox:checked")).map((el) => el.value)
        : [];
      const res = await fetch(`/api/user/${pendingPermissionUserId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ pages: selected })
      });
      const data = await res.json();
      if (data.code === 200) {
        toast("权限已更新");
        userPermissionsById[pendingPermissionUserId] = selected;
        hidePermissionPanel();
      } else {
        toast(data.message || "更新失败");
      }
      btn.disabled = false;
      btn.textContent = originalText;
    });

    document.getElementById("permSelectAll").addEventListener("click", () => {
      const list = document.getElementById("permissionList");
      if (!list) return;
      list.querySelectorAll(".perm-checkbox").forEach((el) => {
        el.checked = true;
      });
    });

    document.getElementById("permClearAll").addEventListener("click", () => {
      const list = document.getElementById("permissionList");
      if (!list) return;
      list.querySelectorAll(".perm-checkbox").forEach((el) => {
        el.checked = false;
      });
    });

    // 搜索关键字相关函数
