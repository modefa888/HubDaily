/* 骨架屏 */
    const showUsersSkeleton = () => {
      const tbody = document.getElementById('usersTbody');
      if (!tbody) return;
      tbody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse">
          <td class="py-2"><div class="h-4 bg-slate-200 rounded w-20"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-24"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-24"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-48"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
        </tr>
      `).join('');
    };

    const showUserAccessSkeleton = () => {
      const tbody = document.getElementById('userAccessTbody');
      if (!tbody) return;
      tbody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse">
          <td class="py-2"><div class="h-4 bg-slate-200 rounded w-20"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-24"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-24"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
        </tr>
      `).join('');
    };

    const showFeedbackSkeleton = () => {
      const tbody = document.getElementById('feedbackTbody');
      if (!tbody) return;
      tbody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse">
          <td class="py-2"><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-24"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-64"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-40"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
        </tr>
      `).join('');
    };

    const showOnlineSkeleton = () => {
      const tbody = document.getElementById('onlineTbody');
      if (!tbody) return;
      tbody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse">
          <td class="py-2"><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-24"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-40"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-48"></div></td>
        </tr>
      `).join('');
    };

    const showOfficialSkeleton = () => {
      const tbody = document.getElementById('officialTbody');
      if (!tbody) return;
      tbody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse">
          <td class="py-2"><div class="h-4 bg-slate-200 rounded w-12"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-64"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
        </tr>
      `).join('');
    };

    const showRouteAccessSkeleton = () => {
      const container = document.getElementById('routeAccessGroups');
      if (!container) return;
      container.innerHTML = `
        <div class="animate-pulse space-y-4">
          ${Array(3).fill('').map(() => `
            <div class="border rounded-lg p-4">
              <div class="h-4 bg-slate-200 rounded w-40 mb-3"></div>
              <div class="space-y-2">
                ${Array(4).fill('').map(() => `
                  <div class="flex items-center gap-2">
                    <div class="h-4 w-4 bg-slate-200 rounded"></div>
                    <div class="h-3 bg-slate-200 rounded w-64"></div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    };

    const showAnnouncementSkeleton = () => {
      const container = document.getElementById('announcementList');
      if (!container) return;
      container.innerHTML = `
        <div class="animate-pulse space-y-4">
          ${Array(3).fill('').map(() => `
            <div class="border rounded-lg p-4">
              <div class="h-4 bg-slate-200 rounded w-40 mb-2"></div>
              <div class="h-3 bg-slate-200 rounded w-full mb-2"></div>
              <div class="h-3 bg-slate-200 rounded w-2/3 mb-3"></div>
              <div class="flex justify-between items-center">
                <div class="h-3 bg-slate-200 rounded w-32"></div>
                <div class="h-8 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    };

    const showArticlesSkeleton = () => {
      const container = document.getElementById('articlesList');
      const meta = document.getElementById('articlesMeta');
      if (meta) {
        meta.innerHTML = '<div class="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>';
      }
      if (!container) return;
      container.innerHTML = `
        <div class="animate-pulse space-y-4">
          ${Array(3).fill('').map(() => `
            <div class="border rounded-lg p-4">
              <div class="h-4 bg-slate-200 rounded w-64 mb-2"></div>
              <div class="h-3 bg-slate-200 rounded w-full mb-2"></div>
              <div class="h-3 bg-slate-200 rounded w-2/3 mb-3"></div>
              <div class="flex flex-wrap gap-2 mb-3">
                ${Array(3).fill('').map(() => `<div class="h-6 bg-slate-200 rounded-full w-20"></div>`).join('')}
              </div>
              <div class="flex justify-between items-center">
                <div class="h-3 bg-slate-200 rounded w-40"></div>
                <div class="h-8 bg-slate-200 rounded w-40"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    };

    const showRolesSkeleton = () => {
      const tbody = document.getElementById('rolesTbody');
      if (!tbody) return;
      tbody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse">
          <td class="py-2"><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-64"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
        </tr>
      `).join('');
    };
    
    // 显示电视管理骨架屏
    const showTvSkeleton = () => {
      const tbody = document.getElementById('channelsTbody');
      if (!tbody) return;
      tbody.innerHTML = Array(5).fill('').map(() => `
        <tr class="animate-pulse">
          <td class="py-2"><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-64"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-96"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-16"></div></td>
          <td><div class="h-4 bg-slate-200 rounded w-64"></div></td>
        </tr>
      `).join('');
    };
    
    // 显示分享墙管理骨架屏
    const showShareWallSkeleton = () => {
      const grid = document.getElementById('shareWallGrid');
      if (!grid) return;
      grid.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          ${Array(8).fill('').map(() => `
            <div class="video-card" style="position: relative; overflow: hidden; border-radius: 12px; background: rgba(30, 41, 59, 0.8); transition: all 0.3s ease;">
              <div class="thumb-wrapper" style="position: relative; aspect-ratio: 3/4; overflow: hidden;">
                <div class="h-full w-full bg-slate-200 animate-pulse"></div>
              </div>
              <div class="info" style="padding: 12px;">
                <div class="h-4 bg-slate-200 rounded animate-pulse mb-4"></div>
                <div class="space-y-2">
                  <div class="h-3 bg-slate-200 rounded animate-pulse"></div>
                  <div class="h-3 bg-slate-200 rounded animate-pulse w-3/4"></div>
                  <div class="h-3 bg-slate-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    };
    
    // 显示密码重置设置骨架屏
    const showPasswordResetSkeleton = () => {
      const container = document.querySelector('[data-module="passwordReset"]');
      if (!container) return;
      const content = container.querySelector('.space-y-4');
      if (!content) return;
      content.innerHTML = `
        <div class="space-y-4 animate-pulse">
          <div class="space-y-2">
            <div class="h-4 bg-slate-200 rounded w-64"></div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 bg-slate-200 rounded"></div>
                <div class="h-3 bg-slate-200 rounded w-32"></div>
              </div>
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 bg-slate-200 rounded"></div>
                <div class="h-3 bg-slate-200 rounded w-32"></div>
              </div>
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 bg-slate-200 rounded"></div>
                <div class="h-3 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-4 bg-slate-200 rounded w-64"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div class="h-10 bg-slate-200 rounded"></div>
              <div class="h-10 bg-slate-200 rounded"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div class="h-10 bg-slate-200 rounded"></div>
              <div class="h-10 bg-slate-200 rounded"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div class="h-10 bg-slate-200 rounded"></div>
              <div class="flex items-end">
                <div class="h-10 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-4 bg-slate-200 rounded w-64"></div>
            <div class="h-10 bg-slate-200 rounded"></div>
            <div class="h-10 bg-slate-200 rounded"></div>
            <div class="h-20 bg-slate-200 rounded"></div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <div class="h-10 bg-slate-200 rounded w-32"></div>
          </div>
        </div>
      `;
    };
    
    // 显示导航设置骨架屏
    const showNavigationSkeleton = () => {
      const container = document.querySelector('[data-module="navigation"]');
      if (!container) return;
      const content = container.querySelector('.space-y-6');
      if (!content) return;
      content.innerHTML = `
        <div class="space-y-4 animate-pulse">
          <div class="space-y-4">
            <div class="h-4 bg-slate-200 rounded w-64"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="h-3 bg-slate-200 rounded w-32"></div>
                <div class="h-10 bg-slate-200 rounded"></div>
              </div>
              <div class="space-y-2">
                <div class="h-3 bg-slate-200 rounded w-32"></div>
                <div class="h-10 bg-slate-200 rounded"></div>
              </div>
              <div class="md:col-span-2 space-y-2">
                <div class="h-3 bg-slate-200 rounded w-32"></div>
                <div class="h-10 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
          <div class="space-y-4">
            <div class="h-4 bg-slate-200 rounded w-64"></div>
            <div class="flex items-center space-x-4">
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 bg-slate-200 rounded"></div>
                <div class="h-3 bg-slate-200 rounded w-32"></div>
              </div>
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 bg-slate-200 rounded"></div>
                <div class="h-3 bg-slate-200 rounded w-32"></div>
              </div>
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 bg-slate-200 rounded"></div>
                <div class="h-3 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          </div>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="h-4 bg-slate-200 rounded w-64"></div>
              <div class="h-10 bg-slate-200 rounded w-32"></div>
            </div>
            <div class="space-y-3">
              ${Array(3).fill('').map(() => `
                <div class="h-20 bg-slate-200 rounded"></div>
              `).join('')}
            </div>
          </div>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="h-4 bg-slate-200 rounded w-64"></div>
              <div class="h-10 bg-slate-200 rounded w-32"></div>
            </div>
            <div class="space-y-3">
              ${Array(3).fill('').map(() => `
                <div class="h-20 bg-slate-200 rounded"></div>
              `).join('')}
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <div class="h-10 bg-slate-200 rounded w-32"></div>
          </div>
        </div>
      `;
    };
    
    // 显示搜索关键字骨架屏
    const showSearchKeywordsSkeleton = () => {
      const container = document.querySelector('[data-module="searchKeywords"]');
      if (!container) return;
      const chartContainer = container.querySelector('.space-y-4');
      if (!chartContainer) return;
      chartContainer.innerHTML = `
        <div class="space-y-4 animate-pulse">
          <div class="h-4 bg-slate-200 rounded w-64"></div>
          <div class="bg-slate-50 rounded-lg p-4 relative">
            <div class="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg shadow p-3 max-w-[200px] z-10">
              <div class="h-3 bg-slate-200 rounded w-40 mb-2"></div>
              <div class="space-y-2">
                ${Array(5).fill('').map(() => `
                  <div class="h-3 bg-slate-200 rounded w-32"></div>
                `).join('')}
              </div>
            </div>
            <div class="h-52 bg-slate-200 rounded"></div>
          </div>
          <div class="overflow-auto">
            <table class="min-w-full text-sm">
              <thead class="text-left text-slate-500">
                <tr>
                  <th class="py-2"><div class="h-4 bg-slate-200 rounded w-32"></div></th>
                  <th><div class="h-4 bg-slate-200 rounded w-32"></div></th>
                  <th><div class="h-4 bg-slate-200 rounded w-32"></div></th>
                  <th><div class="h-4 bg-slate-200 rounded w-32"></div></th>
                </tr>
              </thead>
              <tbody class="divide-y">
                ${Array(5).fill('').map(() => `
                  <tr>
                    <td class="py-2"><div class="h-4 bg-slate-200 rounded w-40"></div></td>
                    <td><div class="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td><div class="h-4 bg-slate-200 rounded w-48"></div></td>
                    <td><div class="h-4 bg-slate-200 rounded w-64"></div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    };

