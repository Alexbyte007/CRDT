export function renderHomePage(): string {
  return `<!doctype html>
<html lang="zh-CN" data-theme="light">

  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CRDT 隐私协同编辑器</title>
    <style>
    :root {
      --bg: #f5f7fb;
      --surface: rgba(255,255,255,.78);
      --surface-solid: #ffffff;
      --surface-2: #eef3ff;
      --text: #172033;
      --muted: #68758e;
      --line: rgba(83, 102, 135, .18);
      --brand: #4f46e5;
      --brand-2: #06b6d4;
      --brand-3: #7c3aed;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
      --shadow: 0 24px 70px rgba(35, 45, 90, .14);
      --shadow-soft: 0 14px 42px rgba(35, 45, 90, .10);
      --radius-xl: 28px;
      --radius-lg: 22px;
      --radius-md: 16px;
      --radius-sm: 12px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    html[data-theme="dark"] {
      --bg: #0b1020;
      --surface: rgba(17, 24, 39, .78);
      --surface-solid: #111827;
      --surface-2: rgba(79, 70, 229, .13);
      --text: #edf2ff;
      --muted: #94a3b8;
      --line: rgba(148, 163, 184, .20);
      --shadow: 0 24px 70px rgba(0, 0, 0, .35);
      --shadow-soft: 0 14px 42px rgba(0, 0, 0, .26);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(circle at 10% 0%, rgba(79,70,229,.20), transparent 34rem),
        radial-gradient(circle at 92% 10%, rgba(6,182,212,.19), transparent 30rem),
        radial-gradient(circle at 50% 100%, rgba(124,58,237,.12), transparent 34rem),
        var(--bg);
      overflow-x: hidden;
    }
    body.login-mode .app-mode-only { display: none !important; }
    body.app-mode .login-screen { display: none !important; }

    button, input, textarea, select { font: inherit; }
    button {
      border: 0; cursor: pointer;
      transition: transform .16s ease, box-shadow .16s ease, background .16s ease, opacity .16s ease;
    }
    button:active { transform: translateY(1px) scale(.99); }
    button:disabled { cursor: not-allowed; opacity: .46; transform: none; box-shadow: none; }

    .glass {
      background: var(--surface);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-soft);
    }

    .topbar {
      height: 72px; display: flex; align-items: center; justify-content: space-between;
      gap: 16px; padding: 14px 24px; position: sticky; top: 0; z-index: 40;
      border-bottom: 1px solid var(--line);
      background: color-mix(in srgb, var(--bg) 66%, transparent);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-mark {
      width: 42px; height: 42px; border-radius: 15px; display: grid; place-items: center;
      color: white; background: linear-gradient(135deg, var(--brand), var(--brand-2));
      box-shadow: 0 14px 28px rgba(79,70,229,.26); font-weight: 900; letter-spacing: -.05em; font-size: 14px;
    }
    .brand-title { display: flex; flex-direction: column; line-height: 1.12; }
    .brand-title strong { font-size: 15px; letter-spacing: -.02em; }
    
    .topbar-actions { display: flex; align-items: center; gap: 10px; }

    .btn {
      border-radius: 14px; padding: 10px 14px; background: var(--surface-solid); color: var(--text);
      border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center;
      gap: 8px; min-height: 40px; box-shadow: 0 10px 20px rgba(35,45,90,.06); text-decoration: none;
    }
    .btn:hover { box-shadow: 0 14px 28px rgba(35,45,90,.11); transform: translateY(-1px); }
    .btn.primary { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; border-color: transparent; box-shadow: 0 16px 34px rgba(79,70,229,.25); }
    .btn.danger { color: #fff; background: linear-gradient(135deg, #ef4444, #f97316); border-color: transparent; }
    .btn.small { min-height: 32px; padding: 7px 10px; border-radius: 11px; font-size: 12px; }
    .btn.secondary { background: var(--surface-solid); color: var(--brand); }
    
    .icon-btn {
      width: 40px; height: 40px; border-radius: 14px; border: 1px solid var(--line);
      color: var(--text); background: var(--surface-solid); box-shadow: 0 10px 20px rgba(35,45,90,.06);
      display: grid; place-items: center;
    }
    
    .user-pill {
      display: flex; align-items: center; gap: 10px; padding: 7px 10px 7px 7px;
      border-radius: 999px; border: 1px solid var(--line); background: var(--surface-solid);
    }
    .user-pill.hidden { display: none; }
    .avatar {
      width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
      color: white; font-weight: 800; background: linear-gradient(135deg, var(--brand), var(--brand-3));
      box-shadow: inset 0 0 0 2px rgba(255,255,255,.22); flex: 0 0 auto;
    }

    .auth-page {
      min-height: calc(100vh - 74px); display: grid; place-items: center; padding: 32px;
    }
    .auth-card {
      border-radius: 26px; padding: 26px; width: min(100%, 480px);
    }
    .auth-card-head { display: grid; gap: 6px; margin-bottom: 20px; text-align: center; }
    .auth-card-head h2 { margin: 0; font-size: 24px; line-height: 1.15; }
    .auth-card-head p { margin: 0; color: var(--muted); font-size: 13px; }

    .form-grid { display: grid; gap: 15px; }
    .row { display: flex; gap: 10px; align-items: center; }
    .hidden { display: none !important; }
    
    label { display: grid; gap: 8px; font-size: 13px; color: var(--muted); font-weight: 650; }
    input, textarea, select {
      width: 100%; color: var(--text); background: var(--surface-solid);
      border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px;
      outline: none; transition: border-color .16s ease, box-shadow .16s ease;
      box-sizing: border-box;
    }
    select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2368758e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
      cursor: pointer;
    }
    input:focus, textarea:focus, select:focus {
      border-color: color-mix(in srgb, var(--brand) 70%, white);
      box-shadow: 0 0 0 4px rgba(79,70,229,.12);
    }
    
    .hint { color: var(--muted); font-size: 12px; line-height: 1.6; }

    .main {
      flex: 1; display: grid; grid-template-columns: 300px minmax(0, 1fr);
      gap: 22px; padding: 22px; min-height: calc(100vh - 72px);
    }
    .sidebar {
      border-radius: var(--radius-xl); padding: 18px; display: flex; flex-direction: column; gap: 16px;
      position: sticky; top: 94px; align-self: start;
    }
    .nav-section-title {
      color: var(--muted); font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin: 6px 6px 0;
    }
    .mini-card {
      border-radius: 20px; padding: 15px; background: var(--surface-solid); border: 1px solid var(--line);
    }
    .mini-card h4 { margin: 0 0 8px; font-size: 13px; }
    .demo-account-list { display: grid; gap: 9px; }
    .demo-account-list div { display: grid; gap: 2px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13px;}
    .demo-account-list div:last-child { border-bottom: 0; padding-bottom: 0; }
    .demo-account-list strong { font-size: 12px; color: var(--muted); }
    
    .nav-list { display: grid; gap: 8px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 16px;
      color: var(--muted); border: 1px solid transparent; background: transparent; text-align: left; width: 100%;
    }
    .nav-item:hover {
      color: var(--text); background: var(--surface-solid); border-color: var(--line); box-shadow: 0 10px 22px rgba(35,45,90,.06);
    }

    .content { min-width: 0; display: flex; flex-direction: column; gap: 18px; justify-content: flex-start; }
    .employee-work-grid { display: flex; flex-direction: row; gap: 24px; align-items: flex-start; }
    .employee-table-card { flex: 1; min-width: 0; }
    .employee-log-card { width: 320px; flex-shrink: 0; }
    .section-card { border-radius: var(--radius-xl); padding: 32px; }
    .section-head.compact { margin-bottom: 24px; }
    .section-head h3 { margin: 0 0 6px; font-size: 20px; letter-spacing: -.03em; }
    .section-head p { margin: 0; color: var(--muted); line-height: 1.6; font-size: 13px; }
    
    .employee-log-section { display: grid; gap: 10px; margin-top: 16px; }
    .employee-log-section h4 { margin: 0; font-size: 13px; color: var(--muted); }
    .log-empty {
      border: 1px dashed var(--line); border-radius: 14px; padding: 14px; color: var(--muted);
      font-size: 12px; background: color-mix(in srgb, var(--surface-solid) 75%, transparent);
    }

    /* Node & Tree CSS */
    .tree { margin: 0; padding-left: 0; list-style: none; }
    .tree ul { margin: 8px 0 0 18px; padding-left: 14px; border-left: 1px solid var(--line); list-style: none; }
    .node {
      margin: 12px 0; padding: 20px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface-solid);
      box-shadow: var(--shadow-soft);
    }
    .node-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .node-title strong { overflow-wrap: anywhere; font-size: 15px; }
    .node-title input { flex: 1; min-width: 0; font-weight: 700; font-size: 15px; }
    .node-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .node-actions button { width: auto; padding: 6px 12px; font-size: 12px; }
    
    .meta { margin-top: 6px; font-size: 12px; color: var(--muted); }
    .node-content { margin-top: 8px; white-space: pre-wrap; color: var(--text); font-size: 14px; line-height: 1.6; }
    .node textarea { margin-top: 8px; min-height: 82px; resize: vertical; }
    
    .node-policy { display: grid; gap: 6px; margin-top: 10px; max-width: 260px; }
    .multi-select { position: relative; display: block; }
    .multi-select summary {
      box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid var(--line);
      border-radius: 16px; padding: 12px 14px; background: var(--surface-solid); color: var(--text);
      cursor: pointer; list-style: none; font-size: 13px;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2368758e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
    }
    .multi-select summary:hover {
       border-color: var(--line);
       box-shadow: 0 10px 22px rgba(35,45,90,.06);
    }
    .multi-select summary:focus {
      border-color: color-mix(in srgb, var(--brand) 70%, white);
      box-shadow: 0 0 0 4px rgba(79,70,229,.12);
    }
    .multi-select summary::-webkit-details-marker { display: none; }
    .multi-select-menu {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20; display: grid; gap: 2px;
      max-height: 220px; overflow: auto; padding: 6px; border: 1px solid var(--line); border-radius: 16px;
      background: var(--surface-solid); box-shadow: 0 12px 28px rgba(31, 41, 55, 0.14);
    }
    .multi-select-option {
      width: 100%; border: 0; background: transparent; color: var(--text); display: flex; align-items: center;
      justify-content: space-between; gap: 8px; padding: 7px 8px; font-size: 13px; font-weight: 500; text-align: left;
      border-radius: 8px; cursor: pointer;
    }
    .multi-select-option:hover,
    .multi-select-option:focus { background: var(--surface-2); color: var(--brand); }
      .policy-select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2368758e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
        cursor: pointer;
        min-height: 44px;
        font-size: 13px;
        color: var(--text);
        border: 1px solid var(--line);
        border-radius: 16px;
        background-color: var(--surface-solid);
        width: 100%;
        box-sizing: border-box;
      }
      .policy-select:hover {
         border-color: var(--line);
         box-shadow: 0 10px 22px rgba(35,45,90,.06);
      }
      .policy-select:focus {
        border-color: color-mix(in srgb, var(--brand) 70%, white);
        box-shadow: 0 0 0 4px rgba(79,70,229,.12);
      }
    .multi-select-check { color: var(--brand); font-weight: 800; }

    .modal {
      position: fixed; inset: 0; display: grid; place-items: center; padding: 20px;
      background: rgba(15, 23, 42, 0.45); z-index: 50;
    }
    .modal.hidden { display: none !important; }
    .modal-card {
      position: relative; width: min(720px, 100%); background: var(--surface-solid);
      border-radius: 24px; border: 1px solid var(--line); padding: 24px;
      box-shadow: var(--shadow); color: var(--text);
    }
    .modal-title { margin: 0 0 8px; font-size: 20px; }
    .modal-copy { margin: 0 0 16px; color: var(--muted); line-height: 1.6; font-size: 14px; }
    .modal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
    .modal-list {
      margin: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px;
      background: var(--surface-2); max-height: 180px; overflow: auto; white-space: pre-wrap;
      color: var(--text); font-size: 13px;
    }
    .modal-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; justify-content: flex-end; }
    .modal-actions button { width: auto; min-width: 108px; }

    @media (max-width: 900px) {
      .main { grid-template-columns: 1fr; padding: 16px; }
      .employee-work-grid { flex-direction: column; }
      .employee-log-card { width: 100%; }
      .topbar { flex-direction: column; height: auto; align-items: stretch; }
    }
    </style>
  </head>
  <body class="login-mode">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" style="font-size: 14px;">CRDT</div>
        <div class="brand-title">
          <strong>CRDT 隐私协同编辑器</strong>
        </div>
      </div>
      <div class="topbar-center">
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" id="themeToggle" title="切换主题" onclick="document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; this.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾';">☾</button>
        <div class="user-pill app-mode-only" id="headerUserPill">
          <span class="avatar">U</span>
          <span class="small-text strong" id="headerSession">未登录</span>
        </div>
        <button class="btn small app-mode-only" id="logout">退出</button>
      </div>
    </header>

    <div class="login-screen auth-page">
      <section class="auth-card glass" id="loginPanelContainer">
        <div class="auth-card-head">
          <h2>登录协同空间</h2>
          <p>请输入用户名和密码登录。也可以注册普通访客账号。</p>
        </div>
        <div id="loginPanel" class="form-grid">
           <label>用户名 <input id="loginUsername" autocomplete="username" placeholder="例如：admin" /></label>
           <label>密码 <input id="loginPassword" type="password" autocomplete="current-password" placeholder="请输入密码" /></label>
           <div class="row">
             <button id="login" class="btn primary">登录</button>
             <button id="showRegister" class="btn secondary" type="button">注册账号</button>
           </div>
           <div class="hint" style="grid-column: 1 / -1;">
            测试账号：管理员 admin / admin123；研发经理 manager / manager123；研发人员 member / member123；访客 guest / guest123。
           </div>
        </div>

        <div id="registerPanel" class="form-grid hidden">
          <label>用户名 <input id="registerUsername" autocomplete="username" /></label>
          <label>显示名称 <input id="registerDisplayName" /></label>
          <label>密码 <input id="registerPassword" type="password" autocomplete="new-password" /></label>
          <label>确认密码 <input id="registerConfirmPassword" type="password" autocomplete="new-password" /></label>
          <div class="row">
            <button id="register" class="btn primary" type="button">提交注册</button>
            <button id="hideRegister" class="btn secondary" type="button">取消</button>
          </div>
        </div>

        <div class="status" id="loginStatus" style="margin-top: 16px; color: var(--muted); font-size: 13px;"></div>
      </section>
    </div>

    <main class="main employee-main app-mode-only">
      <aside class="sidebar glass">
        <div class="nav-section-title">状态与控制</div>
        
        <div class="mini-card">
          <h4>同步状态</h4>
          <div class="demo-account-list">
            <div><strong style="color:var(--text);">会话用户</strong> <span id="sessionUser" style="color:var(--muted);">未登录</span></div>
            <div><strong style="color:var(--text);">策略版本</strong> <span id="policyVersion" style="color:var(--muted);">-</span></div>
            <div><strong style="color:var(--text);">连接状态</strong> <span id="connectionState" style="color:var(--muted);">未连接</span></div>
            <div><strong style="color:var(--text);">离线队列</strong> <span id="queueLength" style="color:var(--muted);">0</span></div>
          </div>
        </div>

        <div class="nav-list">
          <button class="nav-item" id="refresh"><span>⟳</span>刷新视图</button>
          <button class="nav-item" id="connect"><span>⚡</span>联网</button>
          <button class="nav-item" id="syncOffline"><span>↥</span>同步离线操作</button>
        </div>
        <div class="status" id="status" style="color: var(--muted); font-size: 12px; margin-top: 8px;"></div>

      </aside>

      <section class="content employee-content">
        <div id="userManagement" class="section-card glass admin-panel hidden" aria-hidden="true" style="margin-bottom: 18px;">
          <div class="section-head compact">
            <div>
              <h3>用户管理</h3>
              <p>管理系统中的用户角色与部门权限。</p>
            </div>
          </div>
          <div class="user-table-wrap" style="overflow-x: auto; margin-top: 8px;">
            <table class="user-table" style="width: 100%; font-size: 13px; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--line);">
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">显示名称</th>
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">用户名</th>
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">当前身份</th>
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">部门</th>
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">创建时间</th>
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">操作</th>
                </tr>
              </thead>
              <tbody id="userRows"></tbody>
            </table>
          </div>
          <div class="status" id="userManagementStatus" style="color: var(--muted); font-size: 12px; margin-top: 8px;"></div>
        </div>

        <div class="employee-work-grid">
          <section class="section-card glass employee-table-card">
            <div class="section-head compact">
              <div>
                <h3>项目空间</h3>
                <p>管理和查看协同树节点。</p>
              </div>
            </div>
            <ul id="tree" class="tree"></ul>
          </section>

          <aside class="section-card glass employee-log-card">
            <div class="section-head compact">
              <div>
                <h3>操作日志</h3>
                <p>记录本地视图操作、同步状态和后端合并结果。</p>
              </div>
            </div>
            
            <div class="employee-log-section">
              <h4>本地操作</h4>
              <div id="localLogList">
                <div class="log-empty">还没有本地编辑。</div>
              </div>
            </div>
            
            <div class="employee-log-section">
              <h4>远端合并结果</h4>
              <div id="remoteLogList">
                <div class="log-empty">等待后端返回或 WebSocket 更新。</div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <div id="deleteDialog" class="modal hidden" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="deleteDialogTitle">
        <h2 id="deleteDialogTitle" class="modal-title">删除影响分析</h2>
        <p id="deleteDialogCopy" class="modal-copy"></p>
        <div class="modal-grid">
          <div>
            <label style="color:var(--text);">其他用户可见节点</label>
            <div id="deleteDialogVisibleNodes" class="modal-list"></div>
          </div>
          <div>
            <label style="color:var(--text);">受影响用户</label>
            <div id="deleteDialogUsers" class="modal-list"></div>
          </div>
        </div>
        <div class="modal-actions">
          <button id="deleteDialogCancel" type="button" class="btn secondary">取消</button>
          <button id="deleteDialogKeepChildren" type="button" class="btn secondary">保留子节点</button>
          <button id="deleteDialogForce" type="button" class="btn danger">强制删除整棵树</button>
        </div>
      </div>
    </div>

    <div id="noticeDialog" class="modal hidden" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="noticeDialogTitle">
        <h2 id="noticeDialogTitle" class="modal-title">操作提示</h2>
        <p id="noticeDialogCopy" class="modal-copy"></p>
        <div class="modal-actions">
          <button id="noticeDialogOk" type="button" class="btn primary">确定</button>
        </div>
      </div>
    </div>

<script>
      const state = {
        token: "",
        user: null,
        users: [],
        policyVersion: 0,
        view: null,
        stateVector: "",
        socket: null,
        editing: {
          timers: {},
          drafts: {}
        },
        offline: {
          connected: false,
          queue: loadStoredOfflineQueue()
        },
        localLog: [],
        remoteLog: []
      };

      const els = {
        loginPanel: document.querySelector("#loginPanel"),
        loginUsername: document.querySelector("#loginUsername"),
        loginPassword: document.querySelector("#loginPassword"),
        showRegister: document.querySelector("#showRegister"),
        hideRegister: document.querySelector("#hideRegister"),
        registerPanel: document.querySelector("#registerPanel"),
        registerUsername: document.querySelector("#registerUsername"),
        registerDisplayName: document.querySelector("#registerDisplayName"),
        registerPassword: document.querySelector("#registerPassword"),
        registerConfirmPassword: document.querySelector("#registerConfirmPassword"),
        register: document.querySelector("#register"),
        login: document.querySelector("#login"),
        loginStatus: document.querySelector("#loginStatus"),
        logout: document.querySelector("#logout"),
        refresh: document.querySelector("#refresh"),
        connect: document.querySelector("#connect"),
        headerSession: document.querySelector("#headerSession"),
        sessionUser: document.querySelector("#sessionUser"),
        policyVersion: document.querySelector("#policyVersion"),
        connectionState: document.querySelector("#connectionState"),
        queueLength: document.querySelector("#queueLength"),
        syncOffline: document.querySelector("#syncOffline"),
        status: document.querySelector("#status"),
        tree: document.querySelector("#tree"),
        userManagement: document.querySelector("#userManagement"),
        userRows: document.querySelector("#userRows"),
        userManagementStatus: document.querySelector("#userManagementStatus"),
        deleteDialog: document.querySelector("#deleteDialog"),
        deleteDialogCopy: document.querySelector("#deleteDialogCopy"),
        deleteDialogVisibleNodes: document.querySelector("#deleteDialogVisibleNodes"),
        deleteDialogUsers: document.querySelector("#deleteDialogUsers"),
        deleteDialogCancel: document.querySelector("#deleteDialogCancel"),
        deleteDialogKeepChildren: document.querySelector("#deleteDialogKeepChildren"),
        deleteDialogForce: document.querySelector("#deleteDialogForce"),
        noticeDialog: document.querySelector("#noticeDialog"),
        noticeDialogTitle: document.querySelector("#noticeDialogTitle"),
        noticeDialogCopy: document.querySelector("#noticeDialogCopy"),
        noticeDialogOk: document.querySelector("#noticeDialogOk"),
        localLogList: document.querySelector("#localLogList"),
        remoteLogList: document.querySelector("#remoteLogList")
      };

      const offlineStorageKey = "crdt-editor-offline-queue-v1";
      let deleteDialogResolver = null;
      let noticeDialogResolver = null;

      function currentUserId() {
        return state.user ? state.user.id : "";
      }

      function setStatus(text) {
        els.status.textContent = text;
      }

      function setUserManagementStatus(text) {
        els.userManagementStatus.textContent = text;
      }

      function setLoginStatus(text) {
        els.loginStatus.textContent = text;
      }

      function clearRegisterForm() {
        els.registerUsername.value = "";
        els.registerDisplayName.value = "";
        els.registerPassword.value = "";
        els.registerConfirmPassword.value = "";
      }

      function clearLoginPassword() {
        els.loginPassword.value = "";
      }

      function loadStoredOfflineQueue() {
        try {
          const raw = window.localStorage.getItem("crdt-editor-offline-queue-v1");
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      function saveOfflineQueue() {
        try {
          window.localStorage.setItem(offlineStorageKey, JSON.stringify(state.offline.queue));
        } catch {
          setStatus("离线队列保存失败");
        }
      }

      async function requestJson(url, options) {
        const requestOptions = options ? { ...options } : {};
        const headers = new Headers(requestOptions.headers || {});
        if (state.token) {
          headers.set("authorization", "Bearer " + state.token);
        }
        requestOptions.headers = headers;
        const response = await fetch(url, requestOptions);
        const body = await response.json();
        if (!response.ok || body.ok === false) {
          throw new Error(body.error ? body.error.message : "请求失败");
        }
        return body;
      }

      async function login() {
        if (state.socket) {
          state.socket.close();
          state.socket = null;
        }
        state.token = "";
        setLoginStatus("正在登录...");
        const body = await requestJson("/api/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username: els.loginUsername.value,
            password: els.loginPassword.value
          })
        });
        state.token = body.token;
        state.user = body.user;
        state.policyVersion = body.policyVersion || 0;
        await loadAdminUsers();
        clearAllAutoSaveTimers();
        state.editing.drafts = {};
        setLoginStatus("");
        setStatus("已登录：" + state.user.name);
        await loadView();
        render();
        connectWebSocket();
      }

      async function logout() {
        try {
          if (state.token) {
            await requestJson("/api/logout", { method: "POST" });
          }
        } finally {
          if (state.socket) {
            state.socket.close();
            state.socket = null;
          }
          state.token = "";
          state.user = null;
          state.users = [];
          state.view = null;
          state.stateVector = "";
          state.offline.connected = false;
          clearAllAutoSaveTimers();
          state.editing.drafts = {};

          els.registerPanel.classList.add("hidden");
          els.loginPanel.classList.remove("hidden");
          els.loginPassword.value = "";
          els.registerPassword.value = "";
          els.registerConfirmPassword.value = "";
          
          render();
          setLoginStatus("已登出");
        }
      }

      async function loadView() {
        if (!state.token) {
          setStatus("请先登录");
          return;
        }
        const body = await requestJson("/api/view");
        state.view = body.view || body;
        state.stateVector = body.stateVector || state.stateVector;
        state.policyVersion = body.policyVersion || state.policyVersion;
      }

      async function refreshSession() {
        if (!state.token) {
          return;
        }
        const body = await requestJson("/api/session");
        state.user = body.user;
        state.policyVersion = body.policyVersion || state.policyVersion;
        await loadAdminUsers();
      }

      async function loadAdminUsers() {
        if (!state.token || !state.user || state.user.role !== "admin") {
          state.users = [];
          return;
        }
        const body = await requestJson("/api/users");
        state.users = body.users || [];
        state.policyVersion = body.policyVersion || state.policyVersion;
      }

      async function registerAccount() {
        setLoginStatus("正在注册...");
        const body = await requestJson("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username: els.registerUsername.value,
            displayName: els.registerDisplayName.value,
            password: els.registerPassword.value,
            confirmPassword: els.registerConfirmPassword.value
          })
        });

        state.token = body.token;
        state.user = body.user;
        state.policyVersion = body.policyVersion || 0;

        clearRegisterForm();
        clearLoginPassword();

        els.registerPanel.classList.add("hidden");
        els.loginPanel.classList.remove("hidden");

        clearAllAutoSaveTimers();
        state.editing.drafts = {};
        setLoginStatus("");
        setStatus("已注册并登录：" + state.user.name);
        await loadView();
        render();
        connectWebSocket();
      }

      function pushLog(kind, title, detail = "") {
        const entry = {
          title,
          detail,
          time: new Date().toLocaleTimeString("zh-CN", { hour12: false })
        };
        const target = kind === "remote" ? state.remoteLog : state.localLog;
        target.unshift(entry);
        if (target.length > 8) target.length = 8;
      }

      function renderLogs() {
        function formatLog(entries, emptyText) {
          if (!entries || entries.length === 0) {
            return '<div class="log-empty">' + emptyText + '</div>';
          }
          return entries.map(entry => {
            return '<div class="employee-log-item">' +
              '<span>' + escapeHtml(entry.time) + '</span>' +
              '<strong>' + escapeHtml(entry.title) + '</strong>' +
              (entry.detail ? '<em>' + escapeHtml(entry.detail) + '</em>' : '') +
              '</div>';
          }).join('');
        }
        if (els.localLogList) els.localLogList.innerHTML = formatLog(state.localLog, "还没有本地编辑。");
        if (els.remoteLogList) els.remoteLogList.innerHTML = formatLog(state.remoteLog, "等待后端返回或 WebSocket 更新。");
      }

      function render() {
        const focus = captureEditorFocus();
        document.body.className = state.user ? "app-mode" : "login-mode";
        if (state.user) {
          els.headerSession.classList.remove("hidden");
          els.headerSession.textContent = state.user.name + " / " + state.user.role;
        } else {
          els.headerSession.classList.add("hidden");
          els.headerSession.textContent = "";
        }
        els.tree.innerHTML = "";
        renderUserManagement();
        renderSyncState();
        renderLogs();
        if (!state.view) return;
        for (const root of state.view.roots) {
          els.tree.appendChild(renderNode(root));
        }
        restoreEditorFocus(focus);
      }

      function renderSyncState() {
        const currentQueue = queueForCurrentUser();
        els.sessionUser.textContent = state.user
          ? state.user.name + " / " + state.user.role + " / " + state.user.department
          : "未登录";
        els.policyVersion.textContent = state.policyVersion ? String(state.policyVersion) : "-";
        els.connectionState.textContent = isSocketActive()
          ? state.offline.connected
            ? "已连接"
            : "连接中"
          : "离线";
        els.queueLength.textContent = String(currentQueue.length);
        els.syncOffline.disabled = !state.token || currentQueue.length === 0;
        els.refresh.disabled = !state.token;
        els.connect.disabled = !state.token;
        els.connect.textContent = isSocketActive() ? "断网" : "联网";
      }

      function renderUserManagement() {
        if (!state.user || state.user.role !== "admin") {
          els.userManagement.classList.add("hidden");
          els.userManagement.setAttribute("aria-hidden", "true");
          els.userRows.innerHTML = "";
          setUserManagementStatus("");
          return;
        }

        els.userManagement.classList.remove("hidden");
        els.userManagement.setAttribute("aria-hidden", "false");
        els.userRows.innerHTML = "";
        const adminCount = state.users.filter((user) => user.role === "admin").length;

        for (const user of state.users) {
          const row = document.createElement("tr");
          appendTextCell(row, user.name);
          appendTextCell(row, user.username || user.id);
          row.appendChild(renderRoleCell(user, adminCount));
          row.appendChild(renderDepartmentCell(user));
          appendTextCell(row, formatTimestamp(user.createdAt));
          row.appendChild(renderUserActionCell(user, adminCount));
          els.userRows.appendChild(row);
        }
      }

      function appendTextCell(row, text) {
        const cell = document.createElement("td");
        cell.textContent = text || "-";
        row.appendChild(cell);
      }

      function renderRoleCell(user, adminCount) {
        const cell = document.createElement("td");
        const roleSelect = createCustomSelect(
          [
            { value: "guest", label: "访客" },
            { value: "member", label: "研发人员" },
            { value: "manager", label: "研发经理" },
            { value: "admin", label: "管理员" }
          ],
          user.role,
          async (newValue) => {
            const previousRole = user.role;
            try {
              await updateUserRole(user.id, newValue);
            } catch (error) {
              roleSelect.value = previousRole;
              setUserManagementStatus(error.message);
            }
          },
          user.role === "admin" && adminCount <= 1
        );
        cell.appendChild(roleSelect.element);
        return cell;
      }

      function renderDepartmentCell(user) {
        const cell = document.createElement("td");
        const departmentSelect = createCustomSelect(
          [
            { value: "all", label: "all" },
            { value: "dev", label: "dev" },
            { value: "external", label: "external" },
            { value: "finance", label: "finance" }
          ],
          user.department,
          async (newValue) => {
            const previousDepartment = user.department;
            try {
              await updateUserDepartment(user.id, newValue);
            } catch (error) {
              departmentSelect.value = previousDepartment;
              setUserManagementStatus(error.message);
            }
          }
        );
        cell.appendChild(departmentSelect.element);
        return cell;
      }

      function renderUserActionCell(user, adminCount) {
        const cell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn small danger";
        deleteButton.textContent = "删除";
        deleteButton.disabled =
          user.id === state.user.id || (user.role === "admin" && adminCount <= 1);
        deleteButton.addEventListener("click", () =>
          deleteUserAccount(user).catch((error) => setUserManagementStatus(error.message))
        );
        cell.appendChild(deleteButton);
        return cell;
      }

      function formatTimestamp(value) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return "-";
        }
        return new Date(value).toLocaleString("zh-CN", { hour12: false });
      }

      function renderNode(node) {
        const li = document.createElement("li");
        const box = document.createElement("div");
        box.className = "node";
        const draft = getNodeDraft(node);

        const titleRow = document.createElement("div");
        titleRow.className = "node-title";
        if (node.permissions.canRename) {
          const titleInput = document.createElement("input");
          titleInput.value = draft.title;
          titleInput.placeholder = "节点标题";
          titleInput.dataset.nodeId = node.id;
          titleInput.dataset.field = "title";
          titleInput.addEventListener("input", () => {
            getNodeDraft(node).title = titleInput.value;
            scheduleAutoSave(node.id);
          });
          titleInput.addEventListener("blur", () => autoSaveNode(node.id).catch((error) => setStatus(error.message)));
          titleRow.appendChild(titleInput);
        } else {
          const title = document.createElement("strong");
          title.textContent = node.title;
          titleRow.appendChild(title);
        }
        box.appendChild(titleRow);

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = node.id + " · " + node.type + " · " + permissionText(node.permissions);
        box.appendChild(meta);

        if (node.permissions.canEditAcl && node.acl && node.acl.visibility) {
          const policyPanel = document.createElement("div");
          policyPanel.className = "node-policy";
          const visibilityPolicy = renderAclSelect("谁能看", audienceFromAcl(node.acl), (audience) =>
            updateNodeAcl(node.id, aclPatchFromAudience(audience), "节点查看权限已更新")
          );
          const editPolicy = renderAclSelect("谁能改", audienceFromRoles(node.acl.contentEditableRoles), (audience) =>
            updateNodeAcl(
              node.id,
              { contentEditableRoles: rolesFromAudience(audience) },
              "节点编辑权限已更新"
            )
          );
          const addPolicy = renderAclSelect("谁能添加子节点", audienceFromRoles(node.acl.childAddableRoles), (audience) =>
            updateNodeAcl(
              node.id,
              { childAddableRoles: rolesFromAudience(audience) },
              "节点添加权限已更新"
            )
          );
          const deletePolicy = renderAclSelect("谁能删除", audienceFromRoles(node.acl.deletableRoles), (audience) =>
            updateNodeAcl(
              node.id,
              { deletableRoles: rolesFromAudience(audience) },
              "节点删除权限已更新"
            )
          );
          const operationPolicies = [editPolicy, addPolicy, deletePolicy];
          visibilityPolicy.select.onChangeHook = () =>
            syncOperationAclControls(visibilityPolicy.select, operationPolicies);
          syncOperationAclControls(visibilityPolicy.select, operationPolicies);
          policyPanel.appendChild(visibilityPolicy.element);
          policyPanel.appendChild(editPolicy.element);
          policyPanel.appendChild(addPolicy.element);
          policyPanel.appendChild(deletePolicy.element);
          if (node.children && node.children.length > 0) {
            const advancedPolicy = renderAdvancedPermissionSelect(
              "删除冲突高级权限",
              node.acl.advancedPermissions,
              (userIds) =>
                updateNodeAcl(
                  node.id,
                  { advancedPermissions: { deleteConflictResolverUserIds: userIds } },
                  "删除冲突高级权限已更新"
                )
            );
            policyPanel.appendChild(advancedPolicy.element);
          }
          box.appendChild(policyPanel);
        }

        if (node.permissions.canEditContent) {
          const contentInput = document.createElement("textarea");
          contentInput.value = draft.content;
          contentInput.placeholder = "节点内容";
          contentInput.dataset.nodeId = node.id;
          contentInput.dataset.field = "content";
          contentInput.addEventListener("input", () => {
            getNodeDraft(node).content = contentInput.value;
            scheduleAutoSave(node.id);
          });
          contentInput.addEventListener("blur", () => autoSaveNode(node.id).catch((error) => setStatus(error.message)));
          box.appendChild(contentInput);
        } else if (node.content) {
          const content = document.createElement("div");
          content.className = "node-content";
          content.textContent = node.content;
          box.appendChild(content);
        }

        if (node.permissions.canAddChild || node.permissions.canDelete) {
          const actions = document.createElement("div");
          actions.className = "node-actions";
          if (node.permissions.canAddChild) {
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "btn small secondary";
            addButton.textContent = "添加子节点";
            addButton.addEventListener("click", () => addChildNode(node.id).catch((error) => setStatus(error.message)));
            actions.appendChild(addButton);
          }
          if (node.permissions.canDelete) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "btn small danger";
            deleteButton.textContent = "删除";
            deleteButton.addEventListener("click", () =>
              deleteTreeNode(node.id).catch((error) => showNoticeDialog("操作失败", error.message))
            );
            actions.appendChild(deleteButton);
          }
          box.appendChild(actions);
        }

        li.appendChild(box);
        if (node.children && node.children.length > 0) {
          const ul = document.createElement("ul");
          for (const child of node.children) ul.appendChild(renderNode(child));
          li.appendChild(ul);
        }
        return li;
      }

      function createCustomSelect(optionsList, currentValue, onChange, disabled = false) {
        const details = document.createElement("details");
        details.className = "multi-select";
        if (disabled) details.style.pointerEvents = "none";
        if (disabled) details.style.opacity = "0.6";
        
        const summary = document.createElement("summary");
        const menu = document.createElement("div");
        menu.className = "multi-select-menu";
        
        let currentValueState = currentValue;

        function renderMenu() {
          const selectedOption = optionsList.find((opt) => opt.value === currentValueState);
          summary.textContent = selectedOption ? selectedOption.label : "";
          menu.innerHTML = "";
          for (const opt of optionsList) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "multi-select-option";
            btn.innerHTML = "<span>" + escapeHtml(opt.label) + "</span><span class=\\\"multi-select-check\\\">" + (currentValueState === opt.value ? "✓" : "") + "</span>";
            btn.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (disabled) return;
              currentValueState = opt.value;
              renderMenu();
              details.open = false;
              if (onChange) onChange(currentValueState);
            });
            menu.appendChild(btn);
          }
        }
        
        renderMenu();
        details.appendChild(summary);
        details.appendChild(menu);
        
        return {
          element: details,
          get value() { return currentValueState; },
          set value(v) { currentValueState = v; renderMenu(); },
          set disabled(d) { 
            disabled = d; 
            details.style.pointerEvents = d ? "none" : "auto";
            details.style.opacity = d ? "0.6" : "1";
          }
        };
      }

      function renderAclSelect(label, value, onChange) {
        const policy = document.createElement("label");
        policy.className = "node-policy";
        policy.textContent = label;
        const customSelect = createCustomSelect(
          [
            { value: "all", label: "所有人" },
            { value: "admin", label: "仅管理员" },
            { value: "admin-manager", label: "管理员和研发经理" },
            { value: "dev-team", label: "管理员和研发团队" }
          ],
          value,
          (val) => {
             if (customSelect.onChangeHook) customSelect.onChangeHook(val);
             onChange(val);
          }
        );
        customSelect.element.dataset.field = "audience";
        policy.appendChild(customSelect.element);
        return {
          element: policy,
          select: customSelect
        };
      }

      function renderAdvancedPermissionSelect(label, advancedPermissions, onChange) {
        const policy = document.createElement("label");
        policy.className = "node-policy";
        policy.textContent = label;
        const selectedUserIds = new Set(
          (advancedPermissions && advancedPermissions.deleteConflictResolverUserIds) || []
        );
        const assignableUsers = state.users.filter((user) => user.role !== "admin");
        const details = document.createElement("details");
        details.className = "multi-select";
        details.dataset.field = "advanced-delete-conflict";
        const summary = document.createElement("summary");
        const menu = document.createElement("div");
        menu.className = "multi-select-menu";

        function selectedLabel() {
          if (selectedUserIds.size === 0) return "无高级授权";
          const selectedUsers = assignableUsers.filter((user) => selectedUserIds.has(user.id));
          if (selectedUsers.length <= 2) {
            return selectedUsers.map((user) => user.name).join("、");
          }
          return "已授权 " + selectedUsers.length + " 人";
        }

        function renderMenu() {
          summary.textContent = selectedLabel();
          menu.innerHTML = "";
          for (const user of assignableUsers) {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "multi-select-option";
            option.dataset.userId = user.id;
            option.innerHTML =
              "<span>" +
              escapeHtml(user.name + " / " + user.role + " / " + user.department) +
              "</span><span class=\\\"multi-select-check\\\">" +
              (selectedUserIds.has(user.id) ? "✓" : "") +
              "</span>";
            option.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (selectedUserIds.has(user.id)) {
                selectedUserIds.delete(user.id);
              } else {
                selectedUserIds.add(user.id);
              }
              renderMenu();
              details.open = true;
              onChange(Array.from(selectedUserIds));
            });
            menu.appendChild(option);
          }
        }

        renderMenu();
        details.appendChild(summary);
        details.appendChild(menu);
        if (assignableUsers.length === 0) {
          details.setAttribute("aria-disabled", "true");
        }
        const hint = document.createElement("span");
        hint.className = "hint";
        hint.textContent = "点击下拉项可多选，✓ 表示已授权";
        policy.appendChild(details);
        policy.appendChild(hint);
        return {
          element: policy,
          select: details
        };
      }

      function syncOperationAclControls(visibilitySelect, operationPolicies) {
        const adminOnly = visibilitySelect.value === "admin";
        for (const policy of operationPolicies) {
          policy.select.disabled = adminOnly;
          if (adminOnly) {
            policy.select.value = "admin";
          }
        }
      }

      function captureEditorFocus() {
        const active = document.activeElement;
        if (!active || active.dataset.nodeId === undefined || active.dataset.field === undefined) {
          return null;
        }
        return {
          nodeId: active.dataset.nodeId,
          field: active.dataset.field,
          selectionStart: active.selectionStart,
          selectionEnd: active.selectionEnd
        };
      }

      function restoreEditorFocus(focus) {
        if (!focus) return;
        const selector =
          '[data-node-id="' + cssEscape(focus.nodeId) + '"][data-field="' + cssEscape(focus.field) + '"]';
        const next = els.tree.querySelector(selector);
        if (!next) return;
        next.focus();
        if (typeof next.setSelectionRange === "function") {
          const length = next.value.length;
          const start = Math.min(focus.selectionStart ?? length, length);
          const end = Math.min(focus.selectionEnd ?? start, length);
          next.setSelectionRange(start, end);
        }
      }

      function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
          return window.CSS.escape(value);
        }
        return String(value).replaceAll('"', '\\"');
      }

      function getNodeDraft(node) {
        const existing = state.editing.drafts[node.id];
        if (existing && (existing.title !== existing.originalTitle || existing.content !== existing.originalContent)) {
          return existing;
        }

        const draft = {
          title: node.title,
          content: node.content || "",
          originalTitle: node.title,
          originalContent: node.content || ""
        };
        state.editing.drafts[node.id] = draft;
        return draft;
      }

      function permissionText(permissions) {
        return Object.entries(permissions)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(", ") || "只读";
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      function createEnvelope(operation) {
        return {
          id: "op-" + currentUserId() + "-" + Date.now() + "-" + Math.random().toString(16).slice(2),
          userId: currentUserId(),
          policyVersion: state.policyVersion,
          baseStateVector: state.stateVector,
          createdAt: Date.now(),
          operation
        };
      }

      function isSocketOpen() {
        return state.socket && state.socket.readyState === WebSocket.OPEN;
      }

      function isSocketActive() {
        return (
          state.socket &&
          (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)
        );
      }

      function queueForCurrentUser() {
        return state.offline.queue.filter((envelope) => envelope.userId === currentUserId());
      }

      function removeQueuedOperations(ids) {
        const completed = new Set(ids);
        state.offline.queue = state.offline.queue.filter((envelope) => !completed.has(envelope.id));
        saveOfflineQueue();
      }

      function clearAutoSaveTimer(nodeId) {
        const timer = state.editing.timers[nodeId];
        if (timer) {
          window.clearTimeout(timer);
          delete state.editing.timers[nodeId];
        }
      }

      function clearAllAutoSaveTimers() {
        for (const nodeId of Object.keys(state.editing.timers)) {
          clearAutoSaveTimer(nodeId);
        }
      }

      function scheduleAutoSave(nodeId) {
        clearAutoSaveTimer(nodeId);
        state.editing.timers[nodeId] = window.setTimeout(() => {
          delete state.editing.timers[nodeId];
          autoSaveNode(nodeId).catch((error) => setStatus(error.message));
        }, 600);
      }

      async function autoSaveNode(nodeId) {
        const draft = state.editing.drafts[nodeId];
        if (!draft) return;
        clearAutoSaveTimer(nodeId);
        const title = draft.title;
        const content = draft.content;
        const operations = [];

        if (title !== draft.originalTitle) {
          if (!title.trim()) {
            draft.title = draft.originalTitle;
            render();
            setStatus("标题不能为空");
            return;
          }
          operations.push({ type: "renameNode", nodeId, title });
          draft.originalTitle = title;
        }

        if (content !== draft.originalContent) {
          operations.push({ type: "updateContent", nodeId, content });
          draft.originalContent = content;
        }

        for (const operation of operations) {
          await submitOperation(operation);
        }

        if (operations.length > 0) {
          setStatus(isSocketOpen() ? "编辑已实时提交" : "离线编辑已进入队列");
        }
      }

      async function addChildNode(parentId) {
        await submitOperation({
          type: "addNode",
          parentId,
          title: "新节点",
          content: ""
        });
      }

      async function updateUserRole(userId, role) {
        setUserManagementStatus("正在更新身份...");
        const existingUser = state.users.find((user) => user.id === userId);
        const body = await requestJson("/api/users/" + encodeURIComponent(userId), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            role,
            department: departmentForRole(role, existingUser ? existingUser.department : "")
          })
        });
        if (state.user && body.user && body.user.id === state.user.id) {
          state.user = body.user;
        }
        await refreshSession();
        await loadView();
        render();
        setUserManagementStatus("身份已更新，权限视图已刷新");
      }

      async function updateUserDepartment(userId, department) {
        setUserManagementStatus("正在更新部门...");
        const body = await requestJson("/api/users/" + encodeURIComponent(userId), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ department })
        });
        if (state.user && body.user && body.user.id === state.user.id) {
          state.user = body.user;
        }
        await refreshSession();
        await loadView();
        render();
        setUserManagementStatus("部门已更新，权限视图已刷新");
      }

      function departmentForRole(role, currentDepartment) {
        if (role === "member" || role === "manager") {
          return currentDepartment && currentDepartment !== "external" && currentDepartment !== "all"
            ? currentDepartment
            : "dev";
        }
        if (role === "guest") {
          return "external";
        }
        if (role === "admin") {
          return currentDepartment || "all";
        }
        return currentDepartment || "external";
      }

      async function deleteUserAccount(user) {
        if (!window.confirm("确认删除账号 " + (user.username || user.id) + "？")) {
          return;
        }
        setUserManagementStatus("正在删除账号...");
        const body = await requestJson("/api/users/" + encodeURIComponent(user.id), {
          method: "DELETE"
        });
        state.offline.queue = state.offline.queue.filter((envelope) => envelope.userId !== body.deletedUserId);
        saveOfflineQueue();
        await refreshSession();
        await loadView();
        render();
        setUserManagementStatus("账号已删除，权限视图已刷新");
      }

      async function deleteTreeNode(nodeId) {
        if (!window.confirm("确定要删除该节点吗？")) return;
        const impact = await requestJson("/api/delete-impact?nodeId=" + encodeURIComponent(nodeId));
        if (!impact.blocksSilentDelete) {
          await submitOperation({ type: "deleteNode", nodeId });
          delete state.editing.drafts[nodeId];
          return;
        }

        if (!impact.canResolveConflict) {
          await showNoticeDialog("删除被拒绝", formatDeleteRejectedMessage(impact));
          return;
        }

        const choice = await showDeleteImpactDialog(impact);
        if (!choice) {
          return;
        }

        if (choice === "keepChildren") {
          await submitOperation({ type: "deleteNodeKeepChildren", nodeId });
          delete state.editing.drafts[nodeId];
          return;
        }

        await submitOperation({ type: "deleteNode", nodeId, confirmedImpact: true });
        delete state.editing.drafts[nodeId];
      }

      function formatDeleteRejectedMessage(impact) {
        const childProjects = impact.visibleNodes
          .map((node) => node.title + " (" + node.id + ")")
          .join("、");
        return (
          "删除被拒绝：该父项目下存在更低权限用户仍可见的子项目。\\n" +
          "请联系管理员申请权限，或者先处理 " + (childProjects || "相关子项目") + "。"
        );
      }

      function formatDeleteImpact(impact) {
        const visibleNodes = impact.visibleNodes
          .map((node) => "- " + node.title + " (" + node.id + ")")
          .join("\\n");
        const affectedUsers = impact.affectedUsers
          .map((user) => "- " + user.name + " / " + user.role + " / " + user.department)
          .join("\\n");
        return (
          "删除已阻止：该子树包含其他用户可见内容。\\n" +
          "将删除节点数：" + impact.deleteCount + "\\n" +
          "其他用户可见节点：\\n" + (visibleNodes || "- 无") + "\\n" +
          "受影响用户：\\n" + (affectedUsers || "- 无")
        );
      }

      function showDeleteImpactDialog(impact) {
        return new Promise((resolve) => {
          if (deleteDialogResolver) {
            deleteDialogResolver(null);
          }
          deleteDialogResolver = resolve;
          els.deleteDialogCopy.textContent = formatDeleteImpactCopy(impact);
          els.deleteDialogVisibleNodes.textContent = formatDeleteImpactList(impact.visibleNodes, "暂无");
          els.deleteDialogUsers.textContent = formatDeleteImpactList(impact.affectedUsers, "暂无");
          els.deleteDialogKeepChildren.disabled = impact.deleteCount <= 1;
          els.deleteDialog.classList.remove("hidden");
          els.deleteDialog.setAttribute("aria-hidden", "false");
          setStatus(
            impact.blocksSilentDelete
              ? "检测到其他用户可见内容，请选择处理方式"
              : "请确认删除方式"
          );
        });
      }

      function closeDeleteImpactDialog(result) {
        if (!deleteDialogResolver) return;
        const resolve = deleteDialogResolver;
        deleteDialogResolver = null;
        els.deleteDialog.classList.add("hidden");
        els.deleteDialog.setAttribute("aria-hidden", "true");
        resolve(result);
      }

      function showNoticeDialog(title, message) {
        return new Promise((resolve) => {
          if (noticeDialogResolver) {
            noticeDialogResolver();
          }
          noticeDialogResolver = resolve;
          els.noticeDialogTitle.textContent = title;
          els.noticeDialogCopy.textContent = message;
          els.noticeDialog.classList.remove("hidden");
          els.noticeDialog.setAttribute("aria-hidden", "false");
        });
      }

      function closeNoticeDialog() {
        if (!noticeDialogResolver) return;
        const resolve = noticeDialogResolver;
        noticeDialogResolver = null;
        els.noticeDialog.classList.add("hidden");
        els.noticeDialog.setAttribute("aria-hidden", "true");
        resolve();
      }

      function formatDeleteImpactCopy(impact) {
        return (
          "将删除 " +
          impact.deleteCount +
          " 个节点。选择一种处理方式："
        );
      }

      function formatDeleteImpactList(items, emptyText) {
        if (!items || items.length === 0) {
          return emptyText;
        }
        return items
          .map((item) =>
            "name" in item
              ? "- " + item.name + " / " + item.role + " / " + item.department
              : "- " + item.title + " (" + item.id + ")"
          )
          .join("\\n");
      }

      function audienceFromAcl(acl) {
        const roles = acl.allowedRoles || [];
        if (acl.visibility === "public") return "all";
        if (acl.visibility === "restricted" && sameRoles(roles, ["admin"])) return "admin";
        if (acl.visibility === "restricted" && sameRoles(roles, ["admin", "manager"])) return "admin-manager";
        if (acl.visibility === "restricted" && sameRoles(roles, ["admin", "manager", "member"])) return "dev-team";
        if (acl.visibility === "department" && sameRoles(roles, ["admin", "manager", "member"])) return "dev-team";
        return "all";
      }

      function audienceFromRoles(roles) {
        const normalized = roles || [];
        if (sameRoles(normalized, ["admin"])) return "admin";
        if (sameRoles(normalized, ["admin", "manager"])) return "admin-manager";
        if (sameRoles(normalized, ["admin", "manager", "member"])) return "dev-team";
        if (sameRoles(normalized, ["admin", "manager", "member", "guest"])) return "all";
        return "admin";
      }

      function sameRoles(left, right) {
        return left.length === right.length && right.every((role) => left.includes(role));
      }

      function rolesFromAudience(audience) {
        if (audience === "admin") return ["admin"];
        if (audience === "admin-manager") return ["admin", "manager"];
        if (audience === "dev-team") return ["admin", "manager", "member"];
        return ["admin", "manager", "member", "guest"];
      }

      function aclPatchFromAudience(audience) {
        if (audience === "admin") {
          return {
            visibility: "restricted",
            allowedRoles: ["admin"],
            contentEditableRoles: ["admin"],
            childAddableRoles: ["admin"],
            deletableRoles: ["admin"]
          };
        }
        if (audience === "admin-manager") {
          return {
            visibility: "restricted",
            allowedRoles: ["admin", "manager"]
          };
        }
        if (audience === "dev-team") {
          return {
            visibility: "restricted",
            allowedRoles: ["admin", "manager", "member"]
          };
        }
        return {
          visibility: "public",
          allowedRoles: ["admin", "manager", "member", "guest"]
        };
      }

      async function updateNodeAcl(nodeId, aclPatch, message) {
        await submitOperation({
          type: "updateAcl",
          nodeId,
          aclPatch
        });
        setStatus(message);
      }

      async function submitOperation(operation, customLogTitle) {
        if (!state.token) return setStatus("请先登录");
        const envelope = createEnvelope(operation);
        state.offline.queue.push(envelope);
        saveOfflineQueue();
        renderSyncState();
        const logTitle = customLogTitle || (operation.type === "renameNode" ? "重命名节点" : 
                         operation.type === "updateContent" ? "更新内容" : 
                         operation.type === "addNode" ? "添加节点" : 
                         operation.type === "deleteNode" || operation.type === "deleteNodeKeepChildren" ? "删除节点" : 
                         operation.type === "updateAcl" ? "修改权限" : operation.type);
        pushLog("local", logTitle, JSON.stringify(operation));
        renderLogs();
        if (isSocketOpen()) {
          state.socket.send(JSON.stringify({ type: "operation", envelope }));
          setStatus("操作已发送，等待确认");
        } else {
          setStatus("WebSocket 离线，操作已进入队列");
        }
      }

      async function syncOfflineQueue() {
        if (!state.token) return setStatus("请先登录");
        const operations = queueForCurrentUser();
        if (operations.length === 0) {
          renderSyncState();
          return;
        }

        const body = await requestJson("/api/operations/batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ operations })
        });
        removeQueuedOperations(
          []
            .concat(body.applied || [], body.skipped || [])
            .concat((body.rejected || []).map((item) => item.id).filter(Boolean))
        );
        state.view = body.view;
        state.stateVector = body.stateVector || state.stateVector;
        await refreshSession();
        render();

        if (body.rejected && body.rejected.length > 0) {
          setStatus("同步完成，" + body.rejected.length + " 个操作被拒绝");
          pushLog("remote", "离线队列同步部分失败", operations.length + " 个操作, " + body.rejected.length + " 拒绝");
        } else {
          setStatus("离线队列已同步");
          pushLog("remote", "离线队列已同步", operations.length + " 个操作");
        }
        renderLogs();
      }

      els.login.addEventListener("click", () => login().catch((error) => setLoginStatus(error.message)));
      els.logout.addEventListener("click", () => logout().catch((error) => setStatus(error.message)));
      els.refresh.addEventListener("click", async () => {
        try {
          await refreshSession();
          await loadView();
          render();
        } catch (error) {
          setStatus(error.message);
        }
      });
      els.syncOffline.addEventListener("click", async () => {
        try {
          await syncOfflineQueue();
        } catch (error) {
          setStatus(error.message);
        }
      });
      els.deleteDialogCancel.addEventListener("click", () => closeDeleteImpactDialog(null));
      els.deleteDialogKeepChildren.addEventListener("click", () => closeDeleteImpactDialog("keepChildren"));
      els.deleteDialogForce.addEventListener("click", () => closeDeleteImpactDialog("forceDelete"));
      els.deleteDialog.addEventListener("click", (event) => {
        if (event.target === els.deleteDialog) {
          closeDeleteImpactDialog(null);
        }
      });
      els.noticeDialogOk.addEventListener("click", () => closeNoticeDialog());
      els.noticeDialog.addEventListener("click", (event) => {
        if (event.target === els.noticeDialog) {
          closeNoticeDialog();
        }
      });

      els.showRegister.addEventListener("click", () => {
        els.loginPanel.classList.add("hidden");
        els.registerPanel.classList.remove("hidden");
        setLoginStatus("");
      });

      els.hideRegister.addEventListener("click", () => {
        clearRegisterForm();
        els.registerPanel.classList.add("hidden");
        els.loginPanel.classList.remove("hidden");
        setLoginStatus("");
      });

      els.register.addEventListener("click", () =>
        registerAccount().catch((error) => setLoginStatus(error.message))
      );

      function disconnectWebSocket(message) {
        const socket = state.socket;
        state.socket = null;
        state.offline.connected = false;
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
        renderSyncState();
        setStatus(message || "已切换为离线状态，后续操作会进入离线队列");
      }

      function connectWebSocket() {
        if (!state.token) return setStatus("请先登录");
        if (isSocketActive()) return disconnectWebSocket();
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(protocol + "//" + location.host + "/ws?token=" + encodeURIComponent(state.token));
        state.socket = socket;
        state.offline.connected = false;
        renderSyncState();
        setStatus("正在联网...");
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "view" || message.type === "operationApplied") {
            state.view = message.view;
            state.stateVector = message.stateVector || state.stateVector;
            state.policyVersion = message.policyVersion || state.policyVersion;
            if (message.type === "operationApplied" && message.operationId) {
              removeQueuedOperations([message.operationId]);
            }
            pushLog("remote", "远端视图已更新", message.type === "operationApplied" ? "已合并操作" : "接收到最新视图");
            refreshSession()
              .catch((error) => setStatus(error.message))
              .finally(() => {
                render();
                setStatus("WebSocket 已更新视图");
              });
          }
          if (message.type === "error") setStatus(message.error.message);
        };
        socket.onopen = async () => {
          if (state.socket !== socket) return;
          state.offline.connected = true;
          renderSyncState();
          setStatus("WebSocket 已连接");
          try {
            await syncOfflineQueue();
          } catch (error) {
            setStatus(error.message);
          }
        };
        socket.onclose = () => {
          if (state.socket !== socket) return;
          state.socket = null;
          state.offline.connected = false;
          renderSyncState();
          setStatus("WebSocket 已断开");
        };
        socket.onerror = () => {
          if (state.socket !== socket) return;
          state.socket = null;
          state.offline.connected = false;
          renderSyncState();
        };
      }

      els.connect.addEventListener("click", () => {
        connectWebSocket();
      });

      window.localStorage.removeItem("crdt-editor-session-token-v1");
      render();
    </script>
  </body>
</html>`;
}