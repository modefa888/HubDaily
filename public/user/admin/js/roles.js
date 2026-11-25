/* 角色管理 */
    const loadRoles = async () => {
      const meta = document.getElementById("rolesMeta");
      const btn = document.getElementById("loadRolesBtn");
      const addBtn = document.getElementById("addRoleBtn");
      if (!meta) return;

      meta.textContent = "加载中...";
      if (btn) setBtnLoading(btn, true, "");

      try {
        const res = await fetch("/api/user/roles", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.code === 200 && Array.isArray(data.data)) {
            renderRolesList(data.data);
          } else {
            renderRolesList([]);
          }
        } else {
          renderRolesList([]);
        }

        meta.textContent = "加载完成";
      } catch (error) {
        console.error("加载角色失败:", error);
        meta.textContent = "加载失败";
        toast("加载角色时遇到问题");
      } finally {
        if (btn) setBtnLoading(btn, false, "刷新");
        if (addBtn) addBtn.classList.remove("hidden");
      }
    };

    const renderRolesList = (roles) => {
      const tbody = document.getElementById("rolesTbody");
      if (!tbody) return;

      if (roles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 px-4 text-center text-slate-500">暂无角色</td></tr>';
        return;
      }

      tbody.innerHTML = roles.map(role => {
        const name = String(role.name || "").trim();
        const description = String(role.description || "").trim();
        const permissionsCount = role.permissionsCount || (Array.isArray(role.permissions) ? role.permissions.length : 0);
        const userCount = role.userCount || 0;
        const createdAt = formatTime(role.createdAt);

        return `
          <tr>
            <td class="py-2">${name}</td>
            <td>${description || "-"}</td>
            <td>${permissionsCount}</td>
            <td>${userCount}</td>
            <td>${createdAt}</td>
            <td>
              <div class="flex items-center gap-2">
                <button class="px-2 py-1 rounded text-xs bg-blue-600 text-white" onclick="editRole('${name}')">编辑</button>
                <button class="px-2 py-1 rounded text-xs bg-rose-600 text-white" onclick="deleteRole('${name}')">删除</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    };

    // 显示添加角色悬浮框
    window.showAddRoleModal = () => {
      const modal = document.getElementById('addRoleModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.getElementById('addRoleName').value = '';
        document.getElementById('addRoleDescription').value = '';
      }
    };

    // 隐藏添加角色悬浮框
    const hideAddRoleModal = () => {
      const modal = document.getElementById('addRoleModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    };

    // 显示编辑角色悬浮框
    window.editRole = async (name) => {
      console.log('编辑角色:', name);
      try {
        // 获取角色详情
        const res = await fetch(`/api/user/role/${encodeURIComponent(name)}`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.code === 200 && data.data) {
          const role = data.data;
          const modal = document.getElementById('editRoleModal');
          if (modal) {
            document.getElementById('editRoleOldName').value = name;
            document.getElementById('editRoleName').value = role.name || '';
            document.getElementById('editRoleDescription').value = role.description || '';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
          }
        } else {
          toast(data.message || "获取角色信息失败");
        }
      } catch (error) {
        console.error("获取角色信息失败:", error);
        toast("获取角色信息失败");
      }
    };

    // 隐藏编辑角色悬浮框
    const hideEditRoleModal = () => {
      const modal = document.getElementById('editRoleModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    };

    // 显示删除角色悬浮框
    window.deleteRole = (name) => {
      console.log('删除角色:', name);
      const modal = document.getElementById('deleteRoleModal');
      if (modal) {
        document.getElementById('deleteRoleName').value = name;
        document.getElementById('deleteRoleMessage').textContent = `确定要删除角色 "${name}" 吗？`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    };

    // 隐藏删除角色悬浮框
    const hideDeleteRoleModal = () => {
      const modal = document.getElementById('deleteRoleModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    };

    // 添加角色
    const addRole = async () => {
      const name = document.getElementById('addRoleName').value.trim();
      const description = document.getElementById('addRoleDescription').value.trim();
      
      if (!name) {
        toast("角色名称不能为空");
        return;
      }

      try {
        const res = await fetch("/api/user/role", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name, description }),
        });

        const data = await res.json();
        if (data.code === 200) {
          toast("角色添加成功");
          hideAddRoleModal();
          await loadRoles();
        } else {
          toast(data.message || "添加失败");
        }
      } catch (error) {
        console.error("添加角色失败:", error);
        toast("添加失败");
      }
    };

    // 更新角色
    const updateRole = async () => {
      const oldName = document.getElementById('editRoleOldName').value;
      const name = document.getElementById('editRoleName').value.trim();
      const description = document.getElementById('editRoleDescription').value.trim();
      
      if (!name) {
        toast("角色名称不能为空");
        return;
      }

      try {
        const res = await fetch(`/api/user/role/${encodeURIComponent(oldName)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name, description }),
        });

        const data = await res.json();
        if (data.code === 200) {
          toast("角色更新成功");
          hideEditRoleModal();
          await loadRoles();
        } else {
          toast(data.message || "更新失败");
        }
      } catch (error) {
        console.error("更新角色失败:", error);
        toast("更新失败");
      }
    };

    // 确认删除角色
    const confirmDeleteRole = async () => {
      const name = document.getElementById('deleteRoleName').value;
      
      try {
        const res = await fetch(`/api/user/role/${encodeURIComponent(name)}`, {
          method: "DELETE",
          headers: authHeaders(),
        });

        const data = await res.json();
        if (data.code === 200) {
          toast("角色删除成功");
          hideDeleteRoleModal();
          await loadRoles();
        } else {
          toast(data.message || "删除失败");
        }
      } catch (error) {
        console.error("删除角色失败:", error);
        toast("删除失败");
      }
    };

    // 绑定角色管理相关事件
    if (document.getElementById("loadRolesBtn")) {
      document.getElementById("loadRolesBtn").addEventListener("click", loadRoles);
    }

    if (document.getElementById("addRoleBtn")) {
      const addRoleBtn = document.getElementById("addRoleBtn");
      console.log('添加角色按钮:', addRoleBtn);
      addRoleBtn.addEventListener("click", function() {
        console.log('添加角色按钮被点击');
        showAddRoleModal();
      });
    }

    // 绑定角色管理悬浮框事件
    // 添加角色悬浮框
    if (document.getElementById("closeAddRoleModal")) {
      document.getElementById("closeAddRoleModal").addEventListener("click", hideAddRoleModal);
    }
    if (document.getElementById("cancelAddRole")) {
      document.getElementById("cancelAddRole").addEventListener("click", hideAddRoleModal);
    }
    if (document.getElementById("submitAddRole")) {
      document.getElementById("submitAddRole").addEventListener("click", addRole);
    }

    // 编辑角色悬浮框
    if (document.getElementById("closeEditRoleModal")) {
      document.getElementById("closeEditRoleModal").addEventListener("click", hideEditRoleModal);
    }
    if (document.getElementById("cancelEditRole")) {
      document.getElementById("cancelEditRole").addEventListener("click", hideEditRoleModal);
    }
    if (document.getElementById("submitEditRole")) {
      document.getElementById("submitEditRole").addEventListener("click", updateRole);
    }

    // 删除角色悬浮框
    if (document.getElementById("closeDeleteRoleModal")) {
      document.getElementById("closeDeleteRoleModal").addEventListener("click", hideDeleteRoleModal);
    }
    if (document.getElementById("cancelDeleteRole")) {
      document.getElementById("cancelDeleteRole").addEventListener("click", hideDeleteRoleModal);
    }
    if (document.getElementById("submitDeleteRole")) {
      document.getElementById("submitDeleteRole").addEventListener("click", confirmDeleteRole);
    }

