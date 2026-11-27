(function () {
  if (window.__customDialogInstalled) return;
  window.__customDialogInstalled = true;

  const STYLE_ID = "hub-custom-dialog-style";
  const installStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .hcd-overlay {
        position: fixed; inset: 0; z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        background: rgba(2, 6, 16, .72);
        backdrop-filter: blur(6px);
        animation: hcd-fade .18s ease;
      }
      .hcd-box {
        width: min(430px, 100%);
        border: 1px solid rgba(94, 234, 212, .35);
        border-radius: 16px;
        background: linear-gradient(145deg, rgba(13, 22, 42, .98), rgba(7, 12, 25, .98));
        box-shadow: 0 24px 70px rgba(0, 0, 0, .55), 0 0 32px rgba(34, 211, 238, .12);
        color: #e8f1ff;
        overflow: hidden;
        animation: hcd-in .22s ease;
        font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      }
      .hcd-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(94, 234, 212, .16);
        background: rgba(34, 211, 238, .06);
      }
      .hcd-title {
        font-size: 14px; font-weight: 600; letter-spacing: .5px;
        background: linear-gradient(120deg, #fff, #a5f3fc 60%, #c4b5fd);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .hcd-close {
        border: none; background: transparent; color: #8294b4;
        font-size: 18px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 6px;
      }
      .hcd-close:hover { color: #fff; background: rgba(255, 255, 255, .08); }
      .hcd-body { padding: 18px; }
      .hcd-message {
        font-size: 13px; line-height: 1.7; color: #cbd5e1;
        white-space: pre-wrap; word-break: break-word;
      }
      .hcd-input {
        width: 100%; margin-top: 12px; padding: 10px 12px;
        border: 1px solid rgba(94, 234, 212, .3); border-radius: 10px;
        background: rgba(4, 9, 20, .8); color: #a5f3fc;
        font-family: SFMono-Regular, Consolas, monospace; font-size: 12px;
        outline: none; user-select: text;
      }
      .hcd-input:focus { border-color: rgba(94, 234, 212, .7); box-shadow: 0 0 0 3px rgba(34, 211, 238, .12); }
      .hcd-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 18px 18px; }
      .hcd-btn {
        min-width: 76px; padding: 8px 16px; border-radius: 9px;
        border: 1px solid rgba(148, 163, 184, .3); background: rgba(148, 163, 184, .1);
        color: #cbd5e1; font-size: 13px; cursor: pointer; transition: all .18s ease;
      }
      .hcd-btn:hover { background: rgba(148, 163, 184, .18); color: #fff; }
      .hcd-btn.primary {
        border-color: rgba(94, 234, 212, .6);
        background: linear-gradient(120deg, rgba(34, 211, 238, .9), rgba(125, 211, 252, .85));
        color: #04121f; font-weight: 600;
        box-shadow: 0 6px 18px rgba(34, 211, 238, .2);
      }
      .hcd-btn.primary:hover { box-shadow: 0 10px 24px rgba(34, 211, 238, .32); transform: translateY(-1px); }
      .hcd-overlay.hcd-light { background: rgba(15, 23, 42, .38); }
      .hcd-overlay.hcd-light .hcd-box {
        border-color: rgba(148, 163, 184, .45);
        background: linear-gradient(145deg, #ffffff, #f8fafc);
        box-shadow: 0 24px 70px rgba(15, 23, 42, .22), 0 0 0 1px rgba(255, 255, 255, .7) inset;
        color: #0f172a;
      }
      .hcd-overlay.hcd-light .hcd-head {
        border-bottom-color: #e2e8f0;
        background: #f8fafc;
      }
      .hcd-overlay.hcd-light .hcd-title {
        background: none;
        -webkit-background-clip: border-box;
        background-clip: border-box;
        -webkit-text-fill-color: #0f172a;
        color: #0f172a;
      }
      .hcd-overlay.hcd-light .hcd-close { color: #64748b; }
      .hcd-overlay.hcd-light .hcd-close:hover { background: #e2e8f0; color: #0f172a; }
      .hcd-overlay.hcd-light .hcd-message { color: #334155; }
      .hcd-overlay.hcd-light .hcd-input {
        border-color: #cbd5e1;
        background: #ffffff;
        color: #0f172a;
      }
      .hcd-overlay.hcd-light .hcd-input:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, .14);
      }
      .hcd-overlay.hcd-light .hcd-btn {
        border-color: #cbd5e1;
        background: #f1f5f9;
        color: #334155;
      }
      .hcd-overlay.hcd-light .hcd-btn:hover { background: #e2e8f0; color: #0f172a; }
      .hcd-overlay.hcd-light .hcd-btn.primary {
        border-color: #0ea5e9;
        background: linear-gradient(120deg, #0ea5e9, #38bdf8);
        color: #ffffff;
        box-shadow: 0 6px 18px rgba(14, 165, 233, .22);
      }
      @keyframes hcd-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes hcd-in { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
    `;
    document.head.appendChild(style);
  };

  const close = (overlay) => {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  window.showCustomDialog = (options = {}) => {
    installStyles();
    const type = options.type || "alert";
    const title = options.title || (type === "prompt" ? "请输入" : type === "confirm" ? "确认操作" : "提示");
    const message = options.message == null ? "" : String(options.message);
    const defaultValue = options.defaultValue == null ? "" : String(options.defaultValue);
    const theme = options.theme
      || (document.body.classList.contains("theme-light") ? "light" : (document.body.getAttribute("data-ui-theme") || "dark"));

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = `hcd-overlay hcd-${theme === "light" ? "light" : "dark"}`;
      overlay.innerHTML = `
        <div class="hcd-box" role="dialog" aria-modal="true">
          <div class="hcd-head">
            <span class="hcd-title"></span>
            <button class="hcd-close" type="button" aria-label="关闭">×</button>
          </div>
          <div class="hcd-body">
            <div class="hcd-message"></div>
            ${type === "prompt" ? '<input class="hcd-input" type="text" spellcheck="false" />' : ""}
          </div>
          <div class="hcd-actions"></div>
        </div>
      `;
      overlay.querySelector(".hcd-title").textContent = title;
      overlay.querySelector(".hcd-message").textContent = message;
      const input = overlay.querySelector(".hcd-input");
      if (input) input.value = defaultValue;

      const actions = overlay.querySelector(".hcd-actions");
      const addButton = (text, primary, onClick) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `hcd-btn${primary ? " primary" : ""}`;
        btn.textContent = text;
        btn.addEventListener("click", onClick);
        actions.appendChild(btn);
        return btn;
      };

      const finish = (value) => {
        document.removeEventListener("keydown", onKey);
        close(overlay);
        resolve(value);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          finish(type === "confirm" ? false : type === "prompt" ? null : undefined);
        } else if (e.key === "Enter" && type !== "confirm") {
          finish(type === "prompt" ? (input ? input.value : defaultValue) : true);
        }
      };

      overlay.querySelector(".hcd-close").addEventListener("click", () => {
        finish(type === "confirm" ? false : type === "prompt" ? null : undefined);
      });
      overlay.addEventListener("mousedown", (e) => {
        if (e.target === overlay) finish(type === "confirm" ? false : type === "prompt" ? null : undefined);
      });

      if (type === "confirm") {
        addButton("取消", false, () => finish(false));
        addButton("确定", true, () => finish(true));
      } else if (type === "prompt") {
        addButton("复制", false, () => {
          const value = input ? input.value : defaultValue;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).catch(() => {});
          } else if (input) {
            input.select();
            document.execCommand("copy");
          }
        });
        addButton("取消", false, () => finish(null));
        addButton("确定", true, () => finish(input ? input.value : defaultValue));
        setTimeout(() => {
          if (input) { input.focus(); input.select(); }
        }, 0);
      } else {
        addButton("确定", true, () => finish(true));
      }

      document.body.appendChild(overlay);
      document.addEventListener("keydown", onKey);
    });
  };

  window.uiAlert = (message, title) => window.showCustomDialog({ type: "alert", title, message });
  window.uiConfirm = (message, title) => window.showCustomDialog({ type: "confirm", title, message });
  window.uiPrompt = (message, defaultValue, title) => window.showCustomDialog({ type: "prompt", title, message, defaultValue });

  const nativePrompt = window.prompt ? window.prompt.bind(window) : null;
  window.prompt = function (message, defaultValue) {
    window.uiPrompt(message, defaultValue == null ? "" : defaultValue, "请输入");
    return defaultValue == null ? "" : defaultValue;
  };
  const nativeAlert = window.alert ? window.alert.bind(window) : null;
  window.alert = function (message) {
    window.uiAlert(message, "提示");
  };
  window.__nativePrompt = nativePrompt;
  window.__nativeAlert = nativeAlert;
})();
