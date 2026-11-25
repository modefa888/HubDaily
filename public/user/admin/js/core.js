/* 全局状态与基础工具 */
    const TOKEN_KEY = "userToken";
    const toast = (msg) => {
      const el = document.getElementById("toast");
      el.textContent = msg;
      el.classList.remove("hidden");
      setTimeout(() => el.classList.add("hidden"), 1800);
    };

    const setLoading = (isLoading, text = "处理中...") => {
      const overlay = document.getElementById("loadingOverlay");
      const label = document.getElementById("loadingText");
      if (!overlay || !label) return;
      label.textContent = text;
      if (isLoading) {
        overlay.classList.remove("hidden");
      } else {
        overlay.classList.add("hidden");
      }
    };

    // 模块切换时的处理
    const handleModuleChange = (moduleName) => {
      // 隐藏所有模块
      document.querySelectorAll('.module-section').forEach(section => {
        section.classList.add('hidden');
      });
      
      // 显示当前模块
      const currentSection = document.querySelector(`[data-module="${moduleName}"]`);
      if (currentSection) {
        currentSection.classList.remove('hidden');
        
        // 根据模块名称执行相应的初始化
        switch (moduleName) {
          case 'tv':
            loadChannelsData();
            break;
          // 其他模块的初始化...
        }
      }
    };

    // 初始化模块切换
    const initModuleTabs = () => {
      document.querySelectorAll('.module-tab').forEach(tab => {
        tab.addEventListener('click', function() {
          // 移除所有标签的激活状态
          document.querySelectorAll('.module-tab').forEach(t => {
            t.classList.remove('bg-slate-800', 'text-white');
            t.classList.add('bg-slate-200', 'text-slate-700');
          });
          
          // 添加当前标签的激活状态
          this.classList.remove('bg-slate-200', 'text-slate-700');
          this.classList.add('bg-slate-800', 'text-white');
          
          // 切换模块
          const moduleTarget = this.getAttribute('data-module-target');
          handleModuleChange(moduleTarget);
        });
      });
    };

    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
      // 初始化模块切换
      initModuleTabs();
      
      // 默认显示第一个模块
      handleModuleChange('profile');
    });

    const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
    const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
    const clearToken = () => localStorage.removeItem(TOKEN_KEY);

    let isCheckingAuth = true;
    let hasAutoLoadedUsers = false;
    let currentProfile = null;
    let pendingDisableUserId = null;
    let pendingNoteUserId = null;
    let currentUsersPage = 1;
    let currentUsersPageSize = 20;
    let currentUsersTotalPages = 1;
    let currentUsersTotal = 0;
    let currentFeedbackPage = 1;
    let currentFeedbackPageSize = 20;
    let currentFeedbackTotalPages = 1;
    let currentFeedbackTotal = 0;
    let pendingPermissionUserId = null;
    let availablePages = null;
    let pageAliasMap = {};
    let userPermissionsById = {};
    let statsSort = { key: "", dir: "" };
    let officialApisCache = [];
    let parseApisCache = [];
    let routeAccessRulesCache = [];
    let routeAccessRoutesCache = [];
    let usersCache = [];
    let rolesCache = [];
    let feedbackReplyTargetId = "";
    let feedbackDeleteTargetId = "";

