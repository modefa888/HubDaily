/*!
 * 自定义二次确认弹窗（替代原生 confirm）
 * 用法：const ok = await showConfirmDialog({ title, description, confirmText, cancelText, type });
 * type: "danger"（危险操作/红色）| "info"（普通操作/蓝色，默认）
 * 返回 Promise<boolean>：确认 true，取消/关闭 false
 */
(function () {
    "use strict";

    if (window.showConfirmDialog) return;

    var MASK_CLASS = "adm-confirm-mask";
    var BODY_CLASS = "adm-confirm-open";
    var CLOSE_MS = 140;
    var activeDialog = null;

    var ICONS = {
        danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    };

    function destroy(dialog, result) {
        if (!dialog || dialog.closed) return;
        dialog.closed = true;
        document.removeEventListener("keydown", dialog.onKeydown, true);
        dialog.mask.classList.add("closing");
        window.setTimeout(function () {
            if (dialog.mask.parentNode) dialog.mask.parentNode.removeChild(dialog.mask);
            if (!document.querySelector("." + MASK_CLASS)) {
                document.body.classList.remove(BODY_CLASS);
            }
            dialog.resolve(result);
        }, CLOSE_MS);
    }

    function close(result) {
        destroy(activeDialog, result);
        activeDialog = null;
    }

    window.showConfirmDialog = function (options) {
        var opts = options || {};
        var type = opts.type === "danger" ? "danger" : "info";

        // 同一时间只保留一个确认框
        if (activeDialog) {
            close(false);
        }

        return new Promise(function (resolve) {
            var mask = document.createElement("div");
            mask.className = MASK_CLASS;
            mask.innerHTML =
                '<div class="adm-confirm" role="dialog" aria-modal="true">' +
                '  <div class="adm-confirm-head">' +
                '    <div class="adm-confirm-icon ' + type + '">' + (ICONS[type] || ICONS.info) + '</div>' +
                '    <div class="adm-confirm-text">' +
                '      <h3 class="adm-confirm-title"></h3>' +
                '      <p class="adm-confirm-desc"></p>' +
                '    </div>' +
                '  </div>' +
                '  <div class="adm-confirm-actions">' +
                '    <button type="button" class="adm-confirm-btn cancel"></button>' +
                '    <button type="button" class="adm-confirm-btn ok ' + type + '"></button>' +
                '  </div>' +
                '</div>';

            var titleEl = mask.querySelector(".adm-confirm-title");
            var descEl = mask.querySelector(".adm-confirm-desc");
            var cancelBtn = mask.querySelector(".adm-confirm-btn.cancel");
            var okBtn = mask.querySelector(".adm-confirm-btn.ok");

            titleEl.textContent = opts.title || "请确认";
            var desc = opts.description == null ? "" : String(opts.description);
            if (desc) {
                descEl.textContent = desc;
            } else {
                descEl.style.display = "none";
            }
            cancelBtn.textContent = opts.cancelText || "取消";
            okBtn.textContent = opts.confirmText || "确认";

            var dialog = {
                mask: mask,
                resolve: resolve,
                closed: false,
                onKeydown: null
            };

            dialog.onKeydown = function (e) {
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    close(false);
                } else if (e.key === "Enter" && !e.isComposing) {
                    if (document.activeElement === cancelBtn) return;
                    e.preventDefault();
                    close(true);
                }
            };

            cancelBtn.addEventListener("click", function () { close(false); });
            okBtn.addEventListener("click", function () { close(true); });
            mask.addEventListener("mousedown", function (e) {
                if (e.target === mask) close(false);
            });

            document.body.appendChild(mask);
            document.body.classList.add(BODY_CLASS);
            document.addEventListener("keydown", dialog.onKeydown, true);
            activeDialog = dialog;

            window.setTimeout(function () {
                if (okBtn.isConnected) okBtn.focus();
            }, 30);
        });
    };
})();
