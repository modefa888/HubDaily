/*!
 * 自定义美化下拉框
 * 原理：保留原生 <select>（取值 / change 事件 / 表单语义完全不变），
 *       仅隐藏系统弹层，改用自定义面板渲染选项。
 * 因此后台已有脚本中的 select.value、select.selectedIndex、
 * select.addEventListener('change') 等写法无需改动。
 */
(function () {
    "use strict";

    if (window.__csxSelectInited) return;
    window.__csxSelectInited = true;

    var canHover = !window.matchMedia || window.matchMedia("(hover: hover)").matches;

    var panel = null;
    var activeSelect = null;
    var items = [];
    var highlight = -1;
    var typeBuffer = "";
    var typeTimer = null;

    var CHECK_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"/></svg>';

    function isEnhanceable(el) {
        return !!el && el.tagName === "SELECT" && el.multiple === false && (el.size || 0) <= 1;
    }

    function fire(el, type) {
        var evt;
        try {
            evt = new Event(type, { bubbles: true });
        } catch (err) {
            evt = document.createEvent("HTMLEvents");
            evt.initEvent(type, true, false);
        }
        el.dispatchEvent(evt);
    }

    function ensurePanel() {
        if (panel) return panel;
        panel = document.createElement("div");
        panel.className = "csx-panel";
        panel.setAttribute("role", "listbox");
        // 在选项上按下鼠标时不抢焦点，避免 select 失焦导致面板关闭
        panel.addEventListener("mousedown", function (e) {
            var item = e.target && e.target.closest ? e.target.closest(".csx-item") : null;
            if (!item || item.classList.contains("csx-disabled")) return;
            e.preventDefault();
            choose(Number(item.getAttribute("data-index")));
        });
        document.body.appendChild(panel);
        return panel;
    }

    function build(select) {
        ensurePanel();
        panel.textContent = "";
        items = [];
        var list = document.createElement("div");
        list.className = "csx-list";
        var lastGroup = null;

        for (var i = 0; i < select.options.length; i++) {
            var opt = select.options[i];
            var group = opt.parentNode && opt.parentNode.tagName === "OPTGROUP" ? opt.parentNode : null;
            if (group && group !== lastGroup) {
                var groupLabel = document.createElement("div");
                groupLabel.className = "csx-group";
                groupLabel.textContent = group.label || "";
                list.appendChild(groupLabel);
            }
            lastGroup = group;

            var item = document.createElement("div");
            item.className = "csx-item";
            item.setAttribute("role", "option");
            item.setAttribute("data-index", String(i));
            if (i === select.selectedIndex) {
                item.classList.add("csx-selected");
                item.setAttribute("aria-selected", "true");
            }
            if (opt.disabled) item.classList.add("csx-disabled");
            if (opt.value === "") item.classList.add("csx-placeholder");

            var label = document.createElement("span");
            label.className = "csx-item-label";
            label.textContent = opt.textContent || "";

            var check = document.createElement("span");
            check.className = "csx-check";
            check.innerHTML = CHECK_SVG;

            item.appendChild(label);
            item.appendChild(check);
            list.appendChild(item);
            items.push(item);
        }

        if (!items.length) {
            var empty = document.createElement("div");
            empty.className = "csx-group";
            empty.textContent = "暂无可选项";
            list.appendChild(empty);
        }
        panel.appendChild(list);
    }

    function layout() {
        if (!panel || !activeSelect) return;
        var rect = activeSelect.getBoundingClientRect();
        var gap = 6;
        var viewportW = window.innerWidth;
        var viewportH = window.innerHeight;
        var width = Math.min(Math.max(rect.width, 150), 320, viewportW - 16);

        panel.style.width = width + "px";
        panel.style.minWidth = width + "px";

        var contentHeight = panel.scrollHeight;
        var spaceBelow = viewportH - rect.bottom - gap - 8;
        var spaceAbove = rect.top - gap - 8;
        var openUp = contentHeight > spaceBelow && spaceAbove > spaceBelow;
        // +2 预留取整误差，避免内容刚好放得下时仍出现滚动条
        var maxHeight = Math.max(96, Math.min(contentHeight + 2, openUp ? spaceAbove : spaceBelow, 320));

        panel.style.maxHeight = maxHeight + "px";
        panel.style.top = openUp
            ? Math.max(8, rect.top - gap - Math.min(contentHeight, maxHeight)) + "px"
            : (rect.bottom + gap) + "px";
        panel.style.left = Math.min(Math.max(8, rect.left), Math.max(8, viewportW - width - 8)) + "px";
    }

    function setHighlight(index, scrollIntoView) {
        if (!items.length) return;
        if (index < 0) index = 0;
        if (index >= items.length) index = items.length - 1;
        for (var i = 0; i < items.length; i++) {
            items[i].classList.toggle("csx-hl", i === index);
        }
        highlight = index;
        if (scrollIntoView && items[index]) {
            items[index].scrollIntoView({ block: "nearest" });
        }
    }

    function moveHighlight(delta) {
        if (!items.length) return;
        var next = highlight;
        for (var step = 0; step < items.length; step++) {
            next += delta;
            if (next < 0 || next >= items.length) return;
            if (!items[next].classList.contains("csx-disabled")) {
                setHighlight(next, true);
                return;
            }
        }
    }

    function open(select) {
        if (!select || select.disabled) return;
        if (activeSelect && activeSelect !== select) close();
        build(select);
        activeSelect = select;
        select.classList.add("csx-on");
        panel.classList.add("csx-open");
        layout();
        setHighlight(Math.max(0, select.selectedIndex), true);
    }

    function close() {
        if (panel) panel.classList.remove("csx-open");
        if (activeSelect) activeSelect.classList.remove("csx-on");
        activeSelect = null;
        items = [];
        highlight = -1;
        typeBuffer = "";
    }

    function choose(index) {
        var select = activeSelect;
        if (!select) return;
        var option = select.options[index];
        if (!option || option.disabled) return;
        var changed = select.selectedIndex !== index;
        select.selectedIndex = index;
        close();
        if (changed) {
            fire(select, "input");
            fire(select, "change");
        }
        if (document.activeElement !== select && typeof select.focus === "function") select.focus();
    }

    function onMouseDown(e) {
        var select = e.currentTarget;
        if (select.disabled || e.button !== 0) return;
        e.preventDefault();
        var wasOpen = activeSelect === select;
        if (document.activeElement !== select) select.focus();
        if (wasOpen) {
            close();
        } else {
            open(select);
        }
    }

    function onKeyDown(e) {
        var select = e.currentTarget;
        var isOpen = activeSelect === select;

        switch (e.key) {
            case "Escape":
                if (isOpen) {
                    e.preventDefault();
                    close();
                }
                return;
            case "Tab":
                if (isOpen) close();
                return;
            case "Enter":
            case " ":
                e.preventDefault();
                if (isOpen) choose(highlight);
                else open(select);
                return;
            case "ArrowDown":
            case "ArrowUp":
                e.preventDefault();
                if (!isOpen) {
                    open(select);
                    return;
                }
                moveHighlight(e.key === "ArrowDown" ? 1 : -1);
                return;
            case "Home":
            case "End":
                if (!isOpen) return;
                e.preventDefault();
                setHighlight(e.key === "Home" ? 0 : items.length - 1, true);
                return;
            default:
                break;
        }

        // 输入首字母快速定位
        if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            typeBuffer += e.key.toLowerCase();
            clearTimeout(typeTimer);
            typeTimer = setTimeout(function () { typeBuffer = ""; }, 700);
            for (var i = 0; i < select.options.length; i++) {
                var text = (select.options[i].textContent || "").toLowerCase();
                if (text.indexOf(typeBuffer) === 0) {
                    if (isOpen) {
                        setHighlight(i, true);
                    } else if (select.selectedIndex !== i) {
                        select.selectedIndex = i;
                        fire(select, "input");
                        fire(select, "change");
                    }
                    break;
                }
            }
        }
    }

    function onBlur(e) {
        if (activeSelect === e.currentTarget) close();
    }

    function enhance(select) {
        if (!isEnhanceable(select) || select.getAttribute("data-csx") === "1") return;
        select.setAttribute("data-csx", "1");
        select.classList.add("csx");
        // 触屏设备保留系统原生弹层，只做视觉美化
        if (!canHover) return;
        select.addEventListener("mousedown", onMouseDown);
        select.addEventListener("keydown", onKeyDown);
        select.addEventListener("blur", onBlur);
    }

    function enhanceTree(root) {
        if (!root) return;
        if (root.nodeType !== 1) return;
        if (root.tagName === "SELECT") {
            enhance(root);
            return;
        }
        if (!root.querySelectorAll) return;
        var list = root.querySelectorAll("select");
        for (var i = 0; i < list.length; i++) enhance(list[i]);
    }

    function init() {
        var all = document.querySelectorAll("select");
        for (var i = 0; i < all.length; i++) enhance(all[i]);

        // 表格/面板会被频繁重新渲染，监听后自动增强新出现的下拉框
        var observer = new MutationObserver(function (records) {
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var nodes = record.addedNodes;
                for (var n = 0; n < nodes.length; n++) {
                    if (nodes[n].nodeType === 1) enhanceTree(nodes[n]);
                }
                if (!activeSelect) continue;
                var removed = record.removedNodes;
                for (var k = 0; k < removed.length; k++) {
                    var node = removed[k];
                    if (node.nodeType === 1 && (node === activeSelect || (node.contains && node.contains(activeSelect)))) {
                        close();
                    }
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // 点击面板与下拉框以外的区域时关闭
        document.addEventListener("mousedown", function (e) {
            if (!activeSelect) return;
            if (panel && panel.contains(e.target)) return;
            if (e.target === activeSelect) return;
            close();
        }, true);

        window.addEventListener("resize", function () {
            if (activeSelect) layout();
        });

        window.addEventListener("scroll", function (e) {
            if (!activeSelect) return;
            if (panel && panel.contains(e.target)) return;
            close();
        }, true);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
