/* 侧边栏、认证与通用 UI */
    const moduleLoaded = {
      profile: true,
      users: false,
      userAccess: false,
      roles: false,
      feedback: false,
      online: false,
      official: false,
      routeAccess: false,
      announcement: false,
      passwordReset: false,
      articles: false,
      navigation: false,
      searchKeywords: false,
      tv: false,
      shareWall: false,
    };

    const sideNav = document.getElementById("sideNav");
    const sideNavOverlay = document.getElementById("sideNavOverlay");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");

    const closeSideNav = () => {
      if (!sideNav) return;
      sideNav.classList.add("-translate-x-full");
      if (sideNavOverlay) sideNavOverlay.classList.add("hidden");
      document.body.classList.remove("drawer-open");
    };

    const openSideNav = () => {
      if (!sideNav) return;
      sideNav.classList.remove("-translate-x-full");
      if (sideNavOverlay) sideNavOverlay.classList.remove("hidden");
      document.body.classList.add("drawer-open");
    };

    const toggleSideNav = () => {
      if (!sideNav) return;
      const hidden = sideNav.classList.contains("-translate-x-full");
      if (hidden) {
        openSideNav();
      } else {
        closeSideNav();
      }
    };

    // 读取上次打开的模块（优先 URL hash，其次本地存储）
    const getSavedModule = () => {
      let saved = "";
      try {
        saved = String(location.hash || "").replace(/^#/, "").trim() || localStorage.getItem("adminActiveModule") || "";
      } catch (e) {
        saved = "";
      }
      if (!saved) return "";
      const exists = Array.from(document.querySelectorAll(".module-tab"))
        .some((tab) => tab.dataset.moduleTarget === saved);
      return exists ? saved : "";
    };

    const setActiveModule = async (name) => {
      if (!name) return;
      // 记住当前模块：刷新或重新打开时自动恢复到该模块
      try {
        localStorage.setItem("adminActiveModule", name);
        if (window.history && typeof history.replaceState === "function") {
          history.replaceState(null, "", `#${name}`);
        }
      } catch (e) {
        // 忽略隐私模式下的存储/状态写入失败
      }
      const sections = document.querySelectorAll(".module-section");
      sections.forEach((sec) => {
        const active = sec.dataset.module === name;
        sec.classList.toggle("hidden", !active);
      });
      const tabs = document.querySelectorAll(".module-tab");
      tabs.forEach((tab) => {
        const active = tab.dataset.moduleTarget === name;
        tab.classList.toggle("bg-slate-800", active);
        tab.classList.toggle("text-white", active);
        tab.classList.toggle("bg-slate-200", !active);
        tab.classList.toggle("text-slate-700", !active);
      });
      if (name === "users" && !moduleLoaded.users) {
        moduleLoaded.users = true;
        showUsersSkeleton();
        await loadUsers(currentUsersPage);
      } else if (name === "userAccess" && !moduleLoaded.userAccess) {
        moduleLoaded.userAccess = true;
        showUserAccessSkeleton();
        await loadUserAccess();
      } else if (name === "roles" && !moduleLoaded.roles) {
        moduleLoaded.roles = true;
        showRolesSkeleton();
        await loadRoles();
      } else if (name === "feedback" && !moduleLoaded.feedback) {
        moduleLoaded.feedback = true;
        showFeedbackSkeleton();
        await loadFeedback(currentFeedbackPage);
      } else if (name === "online" && !moduleLoaded.online) {
        moduleLoaded.online = true;
        showOnlineSkeleton();
        await loadOnline();
      } else if (name === "official" && !moduleLoaded.official) {
        moduleLoaded.official = true;
        showOfficialSkeleton();
        await loadOfficialApis();
        await loadParseApis();
        switchAdminApiTab("official");
      } else if (name === "routeAccess" && !moduleLoaded.routeAccess) {
        moduleLoaded.routeAccess = true;
        showRouteAccessSkeleton();
        await loadRouteAccess();
      } else if (name === "announcement" && !moduleLoaded.announcement) {
        moduleLoaded.announcement = true;
        showAnnouncementSkeleton();
        await loadAnnouncement();
      } else if (name === "passwordReset" && !moduleLoaded.passwordReset) {
        moduleLoaded.passwordReset = true;
        await loadPasswordResetSettings();
      } else if (name === "articles" && !moduleLoaded.articles) {
        moduleLoaded.articles = true;
        showArticlesSkeleton();
        await loadArticles();
      } else if (name === "navigation" && !moduleLoaded.navigation) {
        moduleLoaded.navigation = true;
        await loadNavigationSettings();
        // 添加导航设置按钮事件监听器
        const addCategoryBtn = document.getElementById('navigationAddCategoryBtn');
        if (addCategoryBtn) {
          addCategoryBtn.addEventListener('click', showAddCategoryModal);
        }
        const addSiteBtn = document.getElementById('navigationAddSiteBtn');
        if (addSiteBtn) {
          addSiteBtn.addEventListener('click', showAddSiteModal);
        }
        const saveNavigationBtn = document.getElementById('saveNavigationSettingsBtn');
        if (saveNavigationBtn) {
          saveNavigationBtn.addEventListener('click', saveNavigationSettings);
        }
        const loadNavigationBtn = document.getElementById('loadNavigationBtn');
        if (loadNavigationBtn) {
          loadNavigationBtn.addEventListener('click', loadNavigationSettings);
          loadNavigationBtn.classList.remove('hidden');
        }
      } else if (name === "searchKeywords" && !moduleLoaded.searchKeywords) {
        moduleLoaded.searchKeywords = true;
        const loadSearchKeywordsBtn = document.getElementById('loadSearchKeywordsBtn');
        await loadSearchKeywords(1, 20, loadSearchKeywordsBtn);
        // 添加搜索关键字按钮事件监听器
        if (loadSearchKeywordsBtn) {
          loadSearchKeywordsBtn.addEventListener('click', function() {
            loadSearchKeywords(currentSearchKeywordsPage, currentSearchKeywordsPageSize, this);
          });
          loadSearchKeywordsBtn.classList.remove('hidden');
        }
        const pageSizeInput = document.getElementById('searchKeywordsPageSize');
        if (pageSizeInput) {
          pageSizeInput.addEventListener('change', (e) => {
            const newPageSize = parseInt(e.target.value) || 20;
            const loadSearchKeywordsBtn = document.getElementById('loadSearchKeywordsBtn');
            loadSearchKeywords(1, newPageSize, loadSearchKeywordsBtn);
          });
        }
      } else if (name === "tv" && !moduleLoaded.tv) {
        moduleLoaded.tv = true;
        showTvSkeleton();
        await loadChannelsData();
      } else if (name === "shareWall" && !moduleLoaded.shareWall) {
        moduleLoaded.shareWall = true;
        showShareWallSkeleton();
        await loadShareWall();
      }
    };

    const redirectToLogin = () => {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login/index.html?redirect=${redirect}`;
    };

    const refreshAuthUI = async () => {
      setLoading(true, "校验登录...");
      const status = document.getElementById("authStatus");
      const logoutBtn = document.getElementById("logoutBtn");
      const loadUsersBtn = document.getElementById("loadUsersBtn");
      const loadUserAccessBtn = document.getElementById("loadUserAccessBtn");
      const loadFeedbackBtn = document.getElementById("loadFeedbackBtn");
      const loadOnlineBtn = document.getElementById("loadOnlineBtn");
      const loadOfficialApisBtn = document.getElementById("loadOfficialApisBtn");
      const officialEnableAllBtn = document.getElementById("officialEnableAllBtn");
      const officialDisableAllBtn = document.getElementById("officialDisableAllBtn");
      const officialSaveSortBtn = document.getElementById("officialSaveSortBtn");
      const parseEnableAllBtn = document.getElementById("parseEnableAllBtn");
      const parseDisableAllBtn = document.getElementById("parseDisableAllBtn");
      const parseSaveSortBtn = document.getElementById("parseSaveSortBtn");
      const loadParseApisBtn = document.getElementById("loadParseApisBtn");
      const adminTabOfficial = document.getElementById("adminTabOfficial");
      const adminTabParse = document.getElementById("adminTabParse");
      const adminOfficialSection = document.getElementById("adminOfficialSection");
      const adminParseSection = document.getElementById("adminParseSection");
      const token = getToken();
      if (!token) {
        status.textContent = isCheckingAuth ? "校验中..." : "未登录";
        logoutBtn.classList.add("hidden");
      if (loadUsersBtn) loadUsersBtn.classList.add("hidden");
      if (loadUserAccessBtn) loadUserAccessBtn.classList.add("hidden");
      if (loadFeedbackBtn) loadFeedbackBtn.classList.add("hidden");
      if (loadOnlineBtn) loadOnlineBtn.classList.add("hidden");
        if (loadOfficialApisBtn) loadOfficialApisBtn.classList.add("hidden");
        if (loadParseApisBtn) loadParseApisBtn.classList.add("hidden");
        const loadRouteAccessBtn = document.getElementById("loadRouteAccessBtn");
      if (loadRouteAccessBtn) loadRouteAccessBtn.classList.add("hidden");
      const loadRouteAccessStatsBtn = document.getElementById("loadRouteAccessStatsBtn");
      if (loadRouteAccessStatsBtn) loadRouteAccessStatsBtn.classList.add("hidden");
      const loadFavoritesBtn = document.getElementById("loadFavoritesBtn");
      const loadSharesBtn = document.getElementById("loadSharesBtn");
      const favoritesUserSelect = document.getElementById("favoritesUserSelect");
      const sharesUserSelect = document.getElementById("sharesUserSelect");
      if (loadFavoritesBtn) loadFavoritesBtn.classList.add("hidden");
      if (loadSharesBtn) loadSharesBtn.classList.add("hidden");
      if (favoritesUserSelect) favoritesUserSelect.classList.add("hidden");
      if (sharesUserSelect) sharesUserSelect.classList.add("hidden");
        if (officialEnableAllBtn) officialEnableAllBtn.classList.add("hidden");
        if (officialDisableAllBtn) officialDisableAllBtn.classList.add("hidden");
        if (officialSaveSortBtn) officialSaveSortBtn.classList.add("hidden");
        if (parseEnableAllBtn) parseEnableAllBtn.classList.add("hidden");
        if (parseDisableAllBtn) parseDisableAllBtn.classList.add("hidden");
        if (parseSaveSortBtn) parseSaveSortBtn.classList.add("hidden");
        if (loadParseApisBtn) loadParseApisBtn.classList.add("hidden");
        document.getElementById("profileBox").innerHTML = isCheckingAuth
          ? '<span class="inline-flex items-center space-x-2 text-slate-500"><span class="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span><span>加载中...</span></span>'
          : "未登录";
        isCheckingAuth = false;
        setLoading(false);
        redirectToLogin();
        return;
      }
      let res;
      let data;
      try {
        res = await fetch("/api/user/profile", { headers: authHeaders() });
        data = await res.json();
      } catch (err) {
        status.textContent = "未登录";
        logoutBtn.classList.add("hidden");
      if (loadUsersBtn) loadUsersBtn.classList.add("hidden");
      if (loadFeedbackBtn) loadFeedbackBtn.classList.add("hidden");
      if (loadOnlineBtn) loadOnlineBtn.classList.add("hidden");
      if (loadOfficialApisBtn) loadOfficialApisBtn.classList.add("hidden");
      const loadRouteAccessBtn = document.getElementById("loadRouteAccessBtn");
      if (loadRouteAccessBtn) loadRouteAccessBtn.classList.add("hidden");
      const loadFavoritesBtn = document.getElementById("loadFavoritesBtn");
      const loadSharesBtn = document.getElementById("loadSharesBtn");
      const favoritesUserSelect = document.getElementById("favoritesUserSelect");
      const sharesUserSelect = document.getElementById("sharesUserSelect");
      if (loadFavoritesBtn) loadFavoritesBtn.classList.add("hidden");
      if (loadSharesBtn) loadSharesBtn.classList.add("hidden");
      if (favoritesUserSelect) favoritesUserSelect.classList.add("hidden");
      if (sharesUserSelect) sharesUserSelect.classList.add("hidden");
        if (officialEnableAllBtn) officialEnableAllBtn.classList.add("hidden");
        if (officialDisableAllBtn) officialDisableAllBtn.classList.add("hidden");
        if (officialSaveSortBtn) officialSaveSortBtn.classList.add("hidden");
        if (parseEnableAllBtn) parseEnableAllBtn.classList.add("hidden");
        if (parseDisableAllBtn) parseDisableAllBtn.classList.add("hidden");
        if (parseSaveSortBtn) parseSaveSortBtn.classList.add("hidden");
        if (loadParseApisBtn) loadParseApisBtn.classList.add("hidden");
        renderProfileBox(null);
        toast("登录状态校验失败");
        redirectToLogin();
        isCheckingAuth = false;
        setLoading(false);
        return;
      }
      if (data.code !== 200) {
        status.textContent = "未登录";
        logoutBtn.classList.add("hidden");
      if (loadUsersBtn) loadUsersBtn.classList.add("hidden");
      if (loadFeedbackBtn) loadFeedbackBtn.classList.add("hidden");
      if (loadOnlineBtn) loadOnlineBtn.classList.add("hidden");
      if (loadOfficialApisBtn) loadOfficialApisBtn.classList.add("hidden");
      const loadFavoritesBtn = document.getElementById("loadFavoritesBtn");
      const loadSharesBtn = document.getElementById("loadSharesBtn");
      const favoritesUserSelect = document.getElementById("favoritesUserSelect");
      const sharesUserSelect = document.getElementById("sharesUserSelect");
      if (loadFavoritesBtn) loadFavoritesBtn.classList.add("hidden");
      if (loadSharesBtn) loadSharesBtn.classList.add("hidden");
      if (favoritesUserSelect) favoritesUserSelect.classList.add("hidden");
      if (sharesUserSelect) sharesUserSelect.classList.add("hidden");
        if (officialEnableAllBtn) officialEnableAllBtn.classList.add("hidden");
        if (officialDisableAllBtn) officialDisableAllBtn.classList.add("hidden");
        if (officialSaveSortBtn) officialSaveSortBtn.classList.add("hidden");
        if (parseEnableAllBtn) parseEnableAllBtn.classList.add("hidden");
        if (parseDisableAllBtn) parseDisableAllBtn.classList.add("hidden");
        if (parseSaveSortBtn) parseSaveSortBtn.classList.add("hidden");
        if (loadParseApisBtn) loadParseApisBtn.classList.add("hidden");
        renderProfileBox(null);
        redirectToLogin();
        isCheckingAuth = false;
        setLoading(false);
        return;
      }
      status.textContent = "已登录";
      logoutBtn.classList.remove("hidden");
      if (loadUsersBtn) loadUsersBtn.classList.remove("hidden");
      if (loadUserAccessBtn) loadUserAccessBtn.classList.remove("hidden");
      if (loadFeedbackBtn) loadFeedbackBtn.classList.remove("hidden");
      if (loadOnlineBtn) loadOnlineBtn.classList.remove("hidden");
      if (loadOfficialApisBtn) loadOfficialApisBtn.classList.remove("hidden");
      if (loadParseApisBtn) loadParseApisBtn.classList.remove("hidden");
      const loadRouteAccessBtn = document.getElementById("loadRouteAccessBtn");
      if (loadRouteAccessBtn) loadRouteAccessBtn.classList.remove("hidden");
      const loadRouteAccessStatsBtn = document.getElementById("loadRouteAccessStatsBtn");
      if (loadRouteAccessStatsBtn) loadRouteAccessStatsBtn.classList.remove("hidden");
      const loadFavoritesBtn = document.getElementById("loadFavoritesBtn");
      const loadSharesBtn = document.getElementById("loadSharesBtn");
      const favoritesUserSelect = document.getElementById("favoritesUserSelect");
      const sharesUserSelect = document.getElementById("sharesUserSelect");
      if (loadFavoritesBtn) loadFavoritesBtn.classList.remove("hidden");
      if (loadSharesBtn) loadSharesBtn.classList.remove("hidden");
      if (favoritesUserSelect) favoritesUserSelect.classList.remove("hidden");
      if (sharesUserSelect) sharesUserSelect.classList.remove("hidden");
      if (officialEnableAllBtn) officialEnableAllBtn.classList.remove("hidden");
      if (officialDisableAllBtn) officialDisableAllBtn.classList.remove("hidden");
      if (officialSaveSortBtn) officialSaveSortBtn.classList.remove("hidden");
      const officialDisableAbnormalBtn = document.getElementById("officialDisableAbnormalBtn");
      if (officialDisableAbnormalBtn) officialDisableAbnormalBtn.classList.remove("hidden");
      const parseDisableAbnormalBtn = document.getElementById("parseDisableAbnormalBtn");
      if (parseDisableAbnormalBtn) parseDisableAbnormalBtn.classList.remove("hidden");
      if (parseEnableAllBtn) parseEnableAllBtn.classList.remove("hidden");
      if (parseDisableAllBtn) parseDisableAllBtn.classList.remove("hidden");
      if (parseSaveSortBtn) parseSaveSortBtn.classList.remove("hidden");
      if (loadParseApisBtn) loadParseApisBtn.classList.remove("hidden");
      renderProfileBox(data.data);
      currentProfile = data.data;
      if (data.data.role !== "admin") {
        clearToken();
        status.textContent = "未登录";
        logoutBtn.classList.add("hidden");
        document.getElementById("profileBox").textContent = "仅管理员可进入，正在跳转登录...";
        toast("仅管理员可登录此页面");
        setLoading(true, "仅管理员可进入");
        isCheckingAuth = false;
        setTimeout(() => redirectToLogin(), 800);
        return;
      }
      isCheckingAuth = false;
      setLoading(false);
      if (data.data.role === "admin" && !hasAutoLoadedUsers) {
        hasAutoLoadedUsers = true;
        await setActiveModule(getSavedModule() || "profile");
      }
    };

    const switchAdminApiTab = (type) => {
      const adminTabOfficial = document.getElementById("adminTabOfficial");
      const adminTabParse = document.getElementById("adminTabParse");
      const adminOfficialSection = document.getElementById("adminOfficialSection");
      const adminParseSection = document.getElementById("adminParseSection");
      const showOfficial = type === "official";
      if (adminOfficialSection) adminOfficialSection.classList.toggle("hidden", !showOfficial);
      if (adminParseSection) adminParseSection.classList.toggle("hidden", showOfficial);
      if (adminTabOfficial) {
        adminTabOfficial.classList.toggle("bg-white", showOfficial);
        adminTabOfficial.classList.toggle("shadow", showOfficial);
        adminTabOfficial.classList.toggle("text-slate-800", showOfficial);
        adminTabOfficial.classList.toggle("text-slate-600", !showOfficial);
      }
      if (adminTabParse) {
        adminTabParse.classList.toggle("bg-white", !showOfficial);
        adminTabParse.classList.toggle("shadow", !showOfficial);
        adminTabParse.classList.toggle("text-slate-800", !showOfficial);
        adminTabParse.classList.toggle("text-slate-600", showOfficial);
      }
    };

    const showModal = (id, lock = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("hidden");
      el.classList.add("flex");
      if (id !== "disableModal") {
        document.body.style.overflow = "hidden";
        const app = document.getElementById("appContent");
        if (app) app.classList.add("hidden");
      }
      if (lock) {
        const closeBtn = el.querySelector("button");
        if (closeBtn) closeBtn.classList.add("hidden");
      }
    };
    const hideModal = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add("hidden");
      el.classList.remove("flex");
      if (id !== "disableModal") {
        document.body.style.overflow = "";
        const app = document.getElementById("appContent");
        if (app) app.classList.remove("hidden");
      }
    };

    document.getElementById("closeDisableModal").addEventListener("click", () => hideModal("disableModal"));

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/user/logout", { method: "POST", headers: authHeaders() });
      clearToken();
      toast("已退出");
      refreshAuthUI();
      redirectToLogin();
    });

    // 角色管理相关函数
