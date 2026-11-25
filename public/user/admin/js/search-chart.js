/* 搜索关键词与图表 */
    const loadSearchKeywords = async (page = 1, pageSize = 20, btn = null) => {
      if (btn) setBtnLoading(btn, true, '加载中...');
      try {
        const response = await fetch(`/api/user/search-keywords?page=${page}&pageSize=${pageSize}`, {
          headers: authHeaders()
        });
        const data = await response.json();
        if (data.code === 200) {
          renderSearchKeywords(data.data.items);
          currentSearchKeywordsTotal = data.data.total;
          currentSearchKeywordsTotalPages = Math.ceil(data.data.total / pageSize);
          currentSearchKeywordsPage = page;
          currentSearchKeywordsPageSize = pageSize;
          renderSearchKeywordsPagination();
          document.getElementById('searchKeywordsMeta').textContent = `共 ${data.data.total} 条记录`;
          // 加载图表数据
          await loadKeywordsChart();
        } else {
          toast('加载失败：' + data.message);
        }
      } catch (err) {
        toast('加载失败：网络错误');
      } finally {
        if (btn) setBtnLoading(btn, false, '刷新');
      }
    };

    const renderSearchKeywords = (keywords) => {
      const tbody = document.getElementById('searchKeywordsTbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      
      // 按用户分组
      const userGroups = {};
      keywords.forEach(item => {
        const username = item.username || '未知用户';
        if (!userGroups[username]) {
          userGroups[username] = [];
        }
        userGroups[username].push(item);
      });
      
      // 渲染每个用户组
      Object.entries(userGroups).forEach(([username, items]) => {
        // 创建用户折叠行
        const userRow = document.createElement('tr');
        userRow.className = 'bg-slate-50 cursor-pointer';
        userRow.setAttribute('data-action', 'toggle-user-keywords');
        userRow.innerHTML = `
          <td colspan="4" class="py-3 px-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="font-medium text-slate-700">${username}</div>
                <div class="text-xs text-slate-500">共 ${items.length} 个搜索关键字</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">▼</span>
              </div>
            </div>
          </td>
        `;
        tbody.appendChild(userRow);
        
        // 创建关键字行（默认隐藏）
        items.forEach((item, index) => {
          const tr = document.createElement('tr');
          tr.className = 'user-keyword-row hidden';
          tr.setAttribute('data-user', username);
          tr.innerHTML = `
            <td class="py-2">${item.keyword}</td>
            <td>${username}</td>
            <td>${new Date(item.timestamp).toLocaleString()}</td>
            <td class="text-blue-600 hover:underline"><a href="${item.url}" target="_blank">查看</a></td>
          `;
          tbody.appendChild(tr);
        });
      });
      
      // 添加折叠/展开事件
      document.querySelectorAll('[data-action="toggle-user-keywords"]').forEach((row) => {
        row.addEventListener('click', function() {
          // 获取当前用户行的所有后续兄弟元素，直到下一个用户行
          let nextRow = this.nextElementSibling;
          const keywordRows = [];
          
          while (nextRow && !nextRow.hasAttribute('data-action')) {
            keywordRows.push(nextRow);
            nextRow = nextRow.nextElementSibling;
          }
          
          const arrow = this.querySelector('.text-slate-400');
          
          keywordRows.forEach((keywordRow) => {
            keywordRow.classList.toggle('hidden');
          });
          
          if (arrow.textContent === '▼') {
            arrow.textContent = '▲';
          } else {
            arrow.textContent = '▼';
          }
        });
      });
    };

    const renderSearchKeywordsPagination = () => {
      const buttonsContainer = document.getElementById('searchKeywordsPaginationButtons');
      const infoElement = document.getElementById('searchKeywordsPaginationInfo');
      if (!buttonsContainer || !infoElement) return;
      
      infoElement.textContent = `第 ${currentSearchKeywordsPage} / ${currentSearchKeywordsTotalPages} 页`;
      buttonsContainer.innerHTML = '';
      
      // 上一页按钮
      const prevBtn = document.createElement('button');
      prevBtn.className = 'px-2 py-1 rounded border text-slate-600';
      prevBtn.textContent = '上一页';
      prevBtn.disabled = currentSearchKeywordsPage === 1;
      prevBtn.onclick = () => {
        const loadSearchKeywordsBtn = document.getElementById('loadSearchKeywordsBtn');
        loadSearchKeywords(currentSearchKeywordsPage - 1, currentSearchKeywordsPageSize, loadSearchKeywordsBtn);
      };
      buttonsContainer.appendChild(prevBtn);
      
      // 页码按钮
      const maxVisiblePages = 5;
      let startPage = Math.max(1, currentSearchKeywordsPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(currentSearchKeywordsTotalPages, startPage + maxVisiblePages - 1);
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `px-2 py-1 rounded border ${i === currentSearchKeywordsPage ? 'bg-blue-600 text-white' : 'text-slate-600'}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
          const loadSearchKeywordsBtn = document.getElementById('loadSearchKeywordsBtn');
          loadSearchKeywords(i, currentSearchKeywordsPageSize, loadSearchKeywordsBtn);
        };
        buttonsContainer.appendChild(pageBtn);
      }
      
      // 下一页按钮
      const nextBtn = document.createElement('button');
      nextBtn.className = 'px-2 py-1 rounded border text-slate-600';
      nextBtn.textContent = '下一页';
      nextBtn.disabled = currentSearchKeywordsPage === currentSearchKeywordsTotalPages;
      nextBtn.onclick = () => {
        const loadSearchKeywordsBtn = document.getElementById('loadSearchKeywordsBtn');
        loadSearchKeywords(currentSearchKeywordsPage + 1, currentSearchKeywordsPageSize, loadSearchKeywordsBtn);
      };
      buttonsContainer.appendChild(nextBtn);
    };

    const loadKeywordsChart = async () => {
      try {
        const response = await fetch('/api/user/search-keywords/stats', {
          headers: authHeaders()
        });
        const data = await response.json();
        console.log('搜索关键字统计数据:', data);
        if (data.code === 200) {
          console.log('词云数据:', data.data);
          renderKeywordsChart(data.data);
          renderTopKeywordsRank(data.data);
        } else {
          console.error('API 返回错误:', data.message);
        }
      } catch (err) {
        console.error('加载图表数据失败:', err);
      }
    };

    const renderTopKeywordsRank = (stats) => {
      const topKeywordsList = document.getElementById('topKeywordsList');
      if (!topKeywordsList) return;
      
      // 按搜索次数排序并取前5
      const top5Keywords = [...stats].sort((a, b) => b.count - a.count).slice(0, 5);
      
      topKeywordsList.innerHTML = top5Keywords.map((item, index) => {
        return `
          <li class="flex items-center gap-2">
            <span class="w-5 h-5 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-300 text-white' : index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'}">
              ${index + 1}
            </span>
            <span class="flex-1">${item.keyword}</span>
            <span class="text-slate-500">${item.count}次</span>
          </li>
        `;
      }).join('');
    };

    const renderKeywordsChart = (stats) => {
      const ctx = document.getElementById('keywordsChart');
      if (!ctx) return;
      
      // 销毁现有图表
      if (keywordsChart) {
        keywordsChart.destroy();
      }
      
      // 准备图表数据
      const labels = stats.map(item => item.keyword);
      const data = stats.map(item => item.count);
      
      // 创建新图表
      keywordsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: '搜索次数',
            data: data,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            title: {
              display: true,
              text: '热门搜索关键字'
            }
          }
        }
      });
    };
    (async () => {
      await refreshAuthUI();
      initButtonOrder();
      setupButtonDrag();
    })();
