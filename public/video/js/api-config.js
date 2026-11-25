/* 官方接口与 Host 配置 */

        // 官方推荐接口
        let officialApiCache = null;

        function setOfficialApiLoading(messageHtml) {
            if (officialApiListAdult) officialApiListAdult.innerHTML = messageHtml;
            if (officialApiListNormal) officialApiListNormal.innerHTML = messageHtml;
        }

        function getOfficialListSignature(list) {
            if (!Array.isArray(list)) return '';
            const normalized = list
                .filter(item => item && (item.url || item.name))
                .map(item => ({
                    name: String(item.name || '').trim(),
                    url: String(item.url || '').trim(),
                    category: normalizeCategory(item.category || ''),
                    type: String(item.type || '').trim()
                }))
                .sort((a, b) => {
                    const keyA = `${a.url}||${a.name}`;
                    const keyB = `${b.url}||${b.name}`;
                    return keyA.localeCompare(keyB);
                });
            return JSON.stringify(normalized);
        }

        function syncOfficialApiListCache(remoteList) {
            if (!Array.isArray(remoteList)) return;
            const remoteSignature = getOfficialListSignature(remoteList);
            let localSignature = '';
            try {
                localSignature = localStorage.getItem(OFFICIAL_API_LIST_SIGNATURE_KEY) || '';
            } catch (e) {
                localSignature = '';
            }
            if (remoteSignature && remoteSignature !== localSignature) {
                try {
                    localStorage.setItem(OFFICIAL_API_LIST_KEY, JSON.stringify(remoteList));
                    localStorage.setItem(OFFICIAL_API_LIST_SIGNATURE_KEY, remoteSignature);
                } catch (e) {
                    // ignore storage errors
                }
            }
        }

        function fetchOfficialApis(force) {
            if (!officialApiListAdult && !officialApiListNormal) return;
            if (officialApiCache && !force) {
                renderOfficialApis(officialApiCache);
                return;
            }
            
            setOfficialApiLoading(`<div class="text-xs text-gray-500">正在获取官方推荐...</div>`);
            
            const userToken = getUserToken ? getUserToken() : '';
            fetch(getOfficialApiUrl(), {
                headers: userToken ? { Authorization: `Bearer ${userToken}` } : {}
            })
                .then(res => {
                    if (res.status === 401) {
                        setOfficialApiLoading(`<div class="text-xs text-red-500">访问已过期，请重新验证</div>`);
                        revokeAccess('访问已过期，请重新登录');
                        throw new Error('unauthorized');
                    }
                    return res.json();
                })
                .then(data => {
                    if (!data || data.code !== 200 || !Array.isArray(data.data)) {
                        throw new Error('官方接口返回异常');
                    }
                    syncOfficialApiListCache(data.data);
                    officialApiCache = data;
                    renderOfficialApis(data);
                })
                .catch(err => {
                    if (err && err.message === 'unauthorized') {
                        return;
                    }
                    console.error('获取官方接口失败:', err);
                    setOfficialApiLoading(`<div class="text-xs text-red-500">获取失败，请稍后再试</div>`);
                });
        }

        function renderOfficialApis(data) {
            if (!data || !Array.isArray(data.data)) {
                setOfficialApiLoading(`<div class="text-xs text-gray-500">暂无官方推荐</div>`);
                if (officialApiCount) {
                    officialApiCount.textContent = '0';
                }
                if (officialApiCountAdult) {
                    officialApiCountAdult.textContent = '0';
                }
                if (officialApiCountNormal) {
                    officialApiCountNormal.textContent = '0';
                }
                if (officialApiCountAdult2) {
                    officialApiCountAdult2.textContent = '0';
                }
                if (officialApiCountNormal2) {
                    officialApiCountNormal2.textContent = '0';
                }
                if (officialApiCount2) {
                    officialApiCount2.textContent = '0';
                }
                if (aggregateApiList) {
                    aggregateApiList.innerHTML = `
                        <div class="text-xs text-gray-500">暂无可选接口</div>
                    `;
                }
                return;
            }

            syncOfficialApiListCache(data.data);
            
            const metaText = [data.title, data.subtitle].filter(Boolean).join(' · ');
            const metaHtml = metaText
                ? `<div class="text-xs text-gray-500 mb-2">${metaText}</div>`
                : '';

            const grouped = data.data.reduce((acc, item) => {
                const category = normalizeCategory(item.category);
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
            }, {});

            const renderItems = (list) => list.map(item => `
                <div class="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                    <div class="min-w-0 mr-2">
                        <div class="text-xs text-gray-700 truncate">${item.name || '官方推荐'}</div>
                        <div class="text-[11px] text-gray-500 truncate">${item.url || ''}</div>
                    </div>
                    <button 
                        onclick="selectHost('${item.url || ''}', '${item.name || ''}')"
                        class="text-xs text-primary hover:underline whitespace-nowrap shrink-0 ml-2 inline-flex items-center"
                    >使用</button>
                </div>
            `).join('');

            const adultList = grouped.adult || [];
            const normalList = grouped.normal || [];

            if (officialApiCount) {
                officialApiCount.textContent = String(data.data.length);
            }
                if (officialApiCountAdult) {
                    officialApiCountAdult.textContent = String(adultList.length);
                }
                if (officialApiCountNormal) {
                    officialApiCountNormal.textContent = String(normalList.length);
                }
                if (officialApiCountAdult2) {
                    officialApiCountAdult2.textContent = String(adultList.length);
                }
                if (officialApiCountNormal2) {
                    officialApiCountNormal2.textContent = String(normalList.length);
                }
                if (officialApiCount2) {
                    officialApiCount2.textContent = String(data.data.length);
                }

            if (officialApiListAdult) {
                officialApiListAdult.innerHTML = `
                    ${metaHtml}
                    ${adultList.length ? renderItems(adultList) : '<div class="text-xs text-gray-500">暂无摩西接口</div>'}
                `;
            }
            if (officialApiListNormal) {
                officialApiListNormal.innerHTML = `
                    ${metaHtml}
                    ${normalList.length ? renderItems(normalList) : '<div class="text-xs text-gray-500">暂无普通接口</div>'}
                `;
            }

            renderAggregateApiSelection(data.data);
            const latestOfficialName = getOfficialNameByUrl(host);
            if (host && latestOfficialName) {
                const savedName = localStorage.getItem('apiHostName') || '';
                if (latestOfficialName !== savedName) {
                    hostName = latestOfficialName;
                    localStorage.setItem('apiHostName', latestOfficialName);
                }
            }
            updateHostNameDisplay(host);
            updateCustomTypeSelect();
        }

        async function getOfficialApis() {
            if (officialApiCache && Array.isArray(officialApiCache.data)) {
                const cached = officialApiCache.data.filter(item => item && item.url);
                ensureDefaultAggregateSelection(cached);
                return cached;
            }
            const token = getUserToken ? getUserToken() : '';
            const res = await fetch(getOfficialApiUrl(), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (data && data.code === 200 && Array.isArray(data.data)) {
                syncOfficialApiListCache(data.data);
                officialApiCache = data;
                ensureDefaultAggregateSelection(data.data);
                renderAggregateApiSelection(data.data);
                return data.data.filter(item => item && item.url);
            }
            return [];
        }

        function getOfficialLabel(item) {
            if (item && item.name) return item.name;
            if (item && item.url) return getHostNameFromUrl(item.url);
            return '官方推荐';
        }

        function getAggregateApiSelection() {
            try {
                const raw = localStorage.getItem('aggregateApiSelection');
                const list = raw ? JSON.parse(raw) : [];
                return Array.isArray(list) ? list : [];
            } catch (e) {
                return [];
            }
        }

        function getAggregateApiSelectionNames() {
            try {
                const raw = localStorage.getItem('aggregateApiSelectionNames');
                const list = raw ? JSON.parse(raw) : [];
                return Array.isArray(list) ? list : [];
            } catch (e) {
                return [];
            }
        }

        function setAggregateApiSelection(urls) {
            const unique = Array.from(new Set((urls || []).filter(Boolean)));
            localStorage.setItem('aggregateApiSelection', JSON.stringify(unique));
            if (aggregateSelectedCount) {
                aggregateSelectedCount.textContent = String(unique.length);
            }
        }

        function setAggregateApiSelectionNames(names) {
            const unique = Array.from(new Set((names || []).filter(Boolean)));
            localStorage.setItem('aggregateApiSelectionNames', JSON.stringify(unique));
        }

        function setAggregateSelectionCleared(cleared) {
            localStorage.setItem('aggregateSelectionCleared', cleared ? '1' : '0');
        }

        function isAggregateSelectionCleared() {
            return localStorage.getItem('aggregateSelectionCleared') === '1';
        }

        function resolveAggregateSelection(apis) {
            const selectedUrls = getAggregateApiSelection();
            const list = (apis || []).filter(item => item && item.url);
            if (selectedUrls.length > 0) {
                setAggregateSelectionCleared(false);
                const urlSet = new Set(list.map(item => item.url));
                const matched = selectedUrls.filter(url => urlSet.has(url));
                if (matched.length > 0) {
                    if (matched.length !== selectedUrls.length) {
                        setAggregateApiSelection(matched);
                    }
                    return matched;
                }
            }
            if (isAggregateSelectionCleared()) return [];
            const names = getAggregateApiSelectionNames();
            if (!names.length) return [];
            if (list.length === 0) return [];
            const nameMap = new Map(list.map(item => [item.name || '', item.url]));
            const resolved = names.map(name => nameMap.get(name)).filter(Boolean);
            if (resolved.length > 0) {
                setAggregateApiSelection(resolved);
            }
            return resolved;
        }

        function ensureDefaultAggregateSelection(apis) {
            const current = resolveAggregateSelection(apis);
            if (current.length > 0) return current;
            if (isAggregateSelectionCleared()) return [];
            const list = (apis || []).filter(item => item && item.url);
            const defaults = list.slice(0, 3).map(item => item.url).filter(Boolean);
            const defaultNames = list.slice(0, 3).map(item => item.name).filter(Boolean);
            setAggregateApiSelection(defaults);
            setAggregateApiSelectionNames(defaultNames);
            return defaults;
        }

        function renderAggregateApiSelection(apis) {
            if (!aggregateApiListAdult || !aggregateApiListNormal) return;
            const list = (apis || []).filter(item => item && item.url);
            if (list.length === 0) {
                const emptyHtml = `<div class="text-xs text-gray-500">暂无可选接口</div>`;
                aggregateApiListAdult.innerHTML = emptyHtml;
                aggregateApiListNormal.innerHTML = emptyHtml;
                if (aggregateSelectedCount) {
                    aggregateSelectedCount.textContent = '0';
                }
                return;
            }
            const selected = ensureDefaultAggregateSelection(list);
            if (aggregateSelectedCount) {
                aggregateSelectedCount.textContent = String(selected.length);
            }
            const grouped = list.reduce((acc, item) => {
                const category = normalizeCategory(item.category);
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
            }, {});
            const renderItems = (items) => items.map(item => {
                const checked = selected.includes(item.url) ? 'checked' : '';
                return `
                    <label class="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                        <div class="min-w-0 mr-2">
                            <div class="text-xs text-gray-700 truncate">${item.name || '官方推荐'}</div>
                            <div class="text-[11px] text-gray-500 truncate">${item.url || ''}</div>
                        </div>
                        <input 
                            type="checkbox" 
                            class="w-4 h-4"
                            ${checked}
                            onchange="toggleAggregateApi('${item.url}', '${item.name || ''}')"
                        >
                    </label>
                `;
            }).join('');
            const adultList = grouped.adult || [];
            const normalList = grouped.normal || [];
            aggregateApiListAdult.innerHTML = adultList.length ? renderItems(adultList) : `<div class="text-xs text-gray-500">暂无摩西接口</div>`;
            aggregateApiListNormal.innerHTML = normalList.length ? renderItems(normalList) : `<div class="text-xs text-gray-500">暂无普通接口</div>`;
        }

        function toggleAggregateApi(url, name = '') {
            const selected = getAggregateApiSelection();
            const selectedNames = getAggregateApiSelectionNames();
            const index = selected.indexOf(url);
            if (index >= 0) {
                selected.splice(index, 1);
                const nameIndex = selectedNames.indexOf(name);
                if (nameIndex >= 0) selectedNames.splice(nameIndex, 1);
            } else {
                selected.push(url);
                if (name) selectedNames.push(name);
            }
            setAggregateSelectionCleared(false);
            setAggregateApiSelection(selected);
            setAggregateApiSelectionNames(selectedNames);
        }

        function selectAllAggregateApis() {
            const list = (officialApiCache && officialApiCache.data) ? officialApiCache.data : [];
            // 只选择当前选中 tab 对应的接口
            const filteredList = list.filter(item => {
                const category = normalizeCategory(item.category);
                return category === currentAggregateTab;
            });
            const currentUrls = filteredList.map(item => item.url).filter(Boolean);
            const currentNames = filteredList.map(item => item.name).filter(Boolean);
            
            // 获取当前已选择的接口
            const selected = getAggregateApiSelection();
            const selectedNames = getAggregateApiSelectionNames();
            
            // 移除当前 tab 已选择的接口
            const otherUrls = selected.filter(url => {
                const item = list.find(i => i.url === url);
                if (!item) return true;
                const category = normalizeCategory(item.category);
                return category !== currentAggregateTab;
            });
            
            const otherNames = selectedNames.filter((name, index) => {
                const url = selected[index];
                const item = list.find(i => i.url === url);
                if (!item) return true;
                const category = normalizeCategory(item.category);
                return category !== currentAggregateTab;
            });
            
            // 合并其他 tab 已选择的接口和当前 tab 全选的接口
            const newUrls = [...otherUrls, ...currentUrls];
            const newNames = [...otherNames, ...currentNames];
            
            setAggregateSelectionCleared(false);
            setAggregateApiSelection(newUrls);
            setAggregateApiSelectionNames(newNames);
            renderAggregateApiSelection(list);
        }

        function clearAggregateApis() {
            const list = (officialApiCache && officialApiCache.data) ? officialApiCache.data : [];
            // 只清除当前选中 tab 对应的接口
            const selected = getAggregateApiSelection();
            const selectedNames = getAggregateApiSelectionNames();
            
            // 保留其他 tab 已选择的接口
            const newUrls = selected.filter(url => {
                const item = list.find(i => i.url === url);
                if (!item) return true;
                const category = normalizeCategory(item.category);
                return category !== currentAggregateTab;
            });
            
            const newNames = selectedNames.filter((name, index) => {
                const url = selected[index];
                const item = list.find(i => i.url === url);
                if (!item) return true;
                const category = normalizeCategory(item.category);
                return category !== currentAggregateTab;
            });
            
            setAggregateSelectionCleared(newUrls.length === 0);
            setAggregateApiSelection(newUrls);
            setAggregateApiSelectionNames(newNames);
            renderAggregateApiSelection(list);
        }

        function resetAggregateApis() {
            const list = (officialApiCache && officialApiCache.data) ? officialApiCache.data : [];
            // 只重置当前选中 tab 对应的接口
            const filteredList = list.filter(item => {
                const category = normalizeCategory(item.category);
                return category === currentAggregateTab;
            });
            const defaults = filteredList.slice(0, 3).map(item => item.url).filter(Boolean);
            const defaultNames = filteredList.slice(0, 3).map(item => item.name).filter(Boolean);
            
            // 获取当前已选择的接口
            const selected = getAggregateApiSelection();
            const selectedNames = getAggregateApiSelectionNames();
            
            // 保留其他 tab 已选择的接口
            const otherUrls = selected.filter(url => {
                const item = list.find(i => i.url === url);
                if (!item) return true;
                const category = normalizeCategory(item.category);
                return category !== currentAggregateTab;
            });
            
            const otherNames = selectedNames.filter((name, index) => {
                const url = selected[index];
                const item = list.find(i => i.url === url);
                if (!item) return true;
                const category = normalizeCategory(item.category);
                return category !== currentAggregateTab;
            });
            
            // 合并其他 tab 已选择的接口和当前 tab 重置的接口
            const newUrls = [...otherUrls, ...defaults];
            const newNames = [...otherNames, ...defaultNames];
            
            setAggregateSelectionCleared(newUrls.length === 0);
            setAggregateApiSelection(newUrls);
            setAggregateApiSelectionNames(newNames);
            renderAggregateApiSelection(list);
        }

        // Host历史记录
        function getHostHistory() {
            return JSON.parse(localStorage.getItem('hostHistory') || '[]');
        }

        function saveHostHistory(value) {
            const history = getHostHistory();
            const existingIndex = history.findIndex(item => item === value);
            if (existingIndex >= 0) {
                history.splice(existingIndex, 1);
            }
            history.unshift(value);
            if (history.length > 10) {
                history.splice(10);
            }
            localStorage.setItem('hostHistory', JSON.stringify(history));
        }

        function renderHostHistory() {
            const history = getHostHistory();
            if (history.length === 0) {
                hostHistoryList.innerHTML = `
                    <div class="text-xs text-gray-500">暂无历史记录</div>
                `;
                return;
            }
            hostHistoryList.innerHTML = history.map(item => `
                <div class="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                    <div class="text-xs text-gray-700 truncate mr-2">${item}</div>
                    <div class="flex items-center space-x-2">
                        <button 
                            onclick="selectHost('${item}', '')"
                            class="text-xs text-primary hover:underline"
                        >使用</button>
                        <button 
                            onclick="removeHostHistory('${item}')"
                            class="text-xs text-gray-500 hover:text-red-500"
                        >删除</button>
                    </div>
                </div>
            `).join('');
        }

        function toggleHostHistory() {
            hostHistoryWrap.classList.toggle('hidden');
            if (!hostHistoryWrap.classList.contains('hidden')) {
                renderHostHistory();
            }
            if (hostHistoryToggleButton) {
                hostHistoryToggleButton.textContent = hostHistoryWrap.classList.contains('hidden') ? '展开' : '收起';
            }
        }

        function getManualHostType() {
            const value = localStorage.getItem(CUSTOM_API_TYPE_KEY);
            return value === 'normal' || value === 'adult' ? value : 'adult';
        }

        function updateCustomTypeSelect() {
            if (!customTypeSelect) return;
            const officialName = getOfficialNameByUrl(host);
            const rawCategory = getOfficialCategoryByUrl(host);
            const isOfficial = !!officialName || !!rawCategory;
            if (isOfficial) {
                const officialCategory = normalizeCategory(rawCategory);
                if (officialCategory === 'normal' || officialCategory === 'adult') {
                    customTypeSelect.value = officialCategory;
                } else {
                    const savedType = localStorage.getItem(OFFICIAL_API_TYPE_KEY);
                    customTypeSelect.value = savedType === 'normal' || savedType === 'adult' ? savedType : 'adult';
                }
                customTypeSelect.disabled = true;
                customTypeSelect.classList.add('opacity-60', 'cursor-not-allowed');
                return;
            }
            customTypeSelect.disabled = false;
            customTypeSelect.classList.remove('opacity-60', 'cursor-not-allowed');
            customTypeSelect.value = getManualHostType();
        }

        function selectHost(value, name = '') {
            hostInput.value = value;
            host = value;
            localStorage.setItem('apiHost', host);
            hostName = name || getOfficialNameByUrl(host) || getHostNameFromUrl(host);
            localStorage.setItem('apiHostName', hostName);
            const rawCategory = getOfficialCategoryByUrl(host);
            const officialCategory = normalizeCategory(rawCategory);
            if (rawCategory && (officialCategory === 'normal' || officialCategory === 'adult')) {
                localStorage.setItem(OFFICIAL_API_TYPE_KEY, officialCategory);
                switchOfficialTab(officialCategory);
            } else if (customTypeSelect) {
                const manualType = customTypeSelect.value;
                if (manualType === 'normal' || manualType === 'adult') {
                    localStorage.setItem(CUSTOM_API_TYPE_KEY, manualType);
                }
            }
            
            // 检查当前接口是否为普通接口
            const currentCategory = getCurrentHostCategory();
            if (currentCategory === 'normal') {
                // 如果是普通接口，检查隐私遮挡是否开启
                const privacyEnabled = isPrivacyModeEnabled();
                if (privacyEnabled) {
                    // 如果开启，关闭隐私遮挡
                    if (privacySwitch) {
                        privacySwitch.checked = false;
                        togglePrivacyMode();
                    }
                }
            }
            
            updateHostNameDisplay(host);
            updateCustomTypeSelect();
            saveHostHistory(host);
            showToast('已切换Host');
            if (!hostModal.classList.contains('translate-x-full')) {
                toggleHostModal();
            }
            if (videoList.children.length === 0) {
                loadInitialData();
            }
        }

        function getCurrentHostDisplayName(url) {
            if (!url) return '未设置';
            const officialName = getOfficialNameByUrl(url);
            if (officialName) {
                const category = normalizeCategory(getOfficialCategoryByUrl(url));
                const savedType = localStorage.getItem(OFFICIAL_API_TYPE_KEY);
                const typeValue = category === 'normal' || category === 'adult'
                    ? category
                    : (savedType === 'normal' || savedType === 'adult' ? savedType : '');
                const typeLabel = typeValue === 'normal' ? '普通' : (typeValue === 'adult' ? '摩西' : '');
                return typeLabel ? `${officialName}·${typeLabel}` : officialName;
            }
            const savedName = hostName || localStorage.getItem('apiHostName') || '';
            if (savedName) {
                const savedType = localStorage.getItem(CUSTOM_API_TYPE_KEY) || localStorage.getItem(OFFICIAL_API_TYPE_KEY);
                const typeLabel = savedType === 'normal' ? '普通' : (savedType === 'adult' ? '摩西' : '');
                return typeLabel ? `${savedName}·${typeLabel}` : savedName;
            }
            return '自定义';
        }

        function updateHostNameDisplay(url) {
            if (!hostNameDisplay) return;
            hostNameDisplay.textContent = getCurrentHostDisplayName(url);
        }

        function getHostNameFromUrl(url) {
            try {
                const hostname = new URL(url).hostname;
                return hostname.replace(/^www\./, '');
            } catch (e) {
                return '';
            }
        }

        function getHostLabel() {
            if (hostName) return hostName;
            const name = getOfficialNameByUrl(host) || getHostNameFromUrl(host);
            return name || '未知来源';
        }

        function normalizeCategory(value) {
            const raw = String(value || '').toLowerCase();
            if (!raw) return 'adult';
            if (raw.includes('normal') || raw.includes('common') || raw.includes('普通')) return 'normal';
            if (raw.includes('adult') || raw.includes('18') || raw.includes('sex') || raw.includes('成人')) return 'adult';
            return raw === 'vod' ? 'adult' : raw;
        }

        function getOfficialCategoryByUrl(url) {
            if (!url) return '';
            const list = officialApiCache && Array.isArray(officialApiCache.data)
                ? officialApiCache.data
                : (() => {
                    try {
                        const raw = localStorage.getItem(OFFICIAL_API_LIST_KEY);
                        return raw ? JSON.parse(raw) : [];
                    } catch (e) {
                        return [];
                    }
                })();
            const match = (list || []).find(item => item && item.url === url);
            return match && match.category ? match.category : '';
        }

        function getOfficialCategoryByName(name) {
            if (!name) return '';
            const list = officialApiCache && Array.isArray(officialApiCache.data)
                ? officialApiCache.data
                : (() => {
                    try {
                        const raw = localStorage.getItem(OFFICIAL_API_LIST_KEY);
                        return raw ? JSON.parse(raw) : [];
                    } catch (e) {
                        return [];
                    }
                })();
            const match = (list || []).find(item => item && item.name === name);
            return match && match.category ? match.category : '';
        }

        function getCurrentHostCategory() {
            const rawCategory = getOfficialCategoryByUrl(host);
            if (rawCategory) {
                const category = normalizeCategory(rawCategory);
                if (category === 'normal' || category === 'adult') return category;
            }
            const customType = localStorage.getItem(CUSTOM_API_TYPE_KEY);
            if (customType === 'normal' || customType === 'adult') return customType;
            const savedType = localStorage.getItem(OFFICIAL_API_TYPE_KEY);
            return savedType === 'normal' || savedType === 'adult' ? savedType : 'adult';
        }

        function getOfficialNameByUrl(url) {
            if (!url) return '';
            const list = officialApiCache && Array.isArray(officialApiCache.data)
                ? officialApiCache.data
                : (() => {
                    try {
                        const raw = localStorage.getItem(OFFICIAL_API_LIST_KEY);
                        return raw ? JSON.parse(raw) : [];
                    } catch (e) {
                        return [];
                    }
                })();
            const match = (list || []).find(item => item && item.url === url);
            return match && match.name ? match.name : '';
        }

        function removeHostHistory(value) {
            const history = getHostHistory().filter(item => item !== value);
            localStorage.setItem('hostHistory', JSON.stringify(history));
            renderHostHistory();
        }
        

        
