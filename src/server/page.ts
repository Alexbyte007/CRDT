export function renderHomePage(): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CRDT 隐私协同编辑器</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif;
        background: #f5f7fa;
        color: #20242a;
      }

      body {
        margin: 0;
      }

      body.login-mode main {
        display: none;
      }

      body.app-mode .login-screen {
        display: none;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 28px 14px;
        background: #ffffff;
        border-bottom: 1px solid #dfe3ea;
      }

      h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 17px;
      }

      main {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 20px;
        padding: 20px 28px 28px;
      }

      section {
        min-width: 0;
      }

      .login-screen {
        min-height: calc(100vh - 74px);
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .login-panel {
        width: min(440px, 100%);
        background: #ffffff;
        border: 1px solid #dfe3ea;
        border-radius: 8px;
        padding: 22px;
        box-shadow: 0 12px 32px rgba(31, 41, 55, 0.08);
      }

      .login-title {
        margin: 0 0 6px;
        font-size: 21px;
      }

      .login-copy {
        margin: 0 0 18px;
        color: #667085;
        line-height: 1.5;
      }

      .panel {
        background: #ffffff;
        border: 1px solid #dfe3ea;
        border-radius: 8px;
        padding: 16px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        color: #535b66;
      }

      select,
      input,
      textarea,
      button {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd2dc;
        border-radius: 6px;
        padding: 9px 10px;
        font: inherit;
      }

      textarea {
        min-height: 78px;
        resize: vertical;
      }

      button {
        cursor: pointer;
        border-color: #1f6feb;
        background: #1f6feb;
        color: #ffffff;
        font-weight: 650;
      }

      button:disabled {
        cursor: not-allowed;
        border-color: #cbd2dc;
        background: #e8ecf2;
        color: #7b8494;
      }

      button.secondary {
        background: #ffffff;
        color: #1f6feb;
      }

      button.danger {
        border-color: #c2410c;
        background: #c2410c;
      }

      .session-chip {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 10px;
        border: 1px solid #dfe3ea;
        border-radius: 6px;
        background: #f8fafc;
        color: #303741;
        font-size: 13px;
      }

      .stack {
        display: grid;
        gap: 12px;
      }

      .toolbar {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .tree {
        margin: 0;
        padding-left: 0;
        list-style: none;
      }

      .tree ul {
        margin: 8px 0 0 18px;
        padding-left: 14px;
        border-left: 1px solid #dfe3ea;
        list-style: none;
      }

      .node {
        margin: 8px 0;
        padding: 10px;
        border: 1px solid #e1e5ec;
        border-radius: 8px;
        background: #fbfcfe;
      }

      .node-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .node-title strong {
        overflow-wrap: anywhere;
      }

      .node-title input {
        flex: 1;
        min-width: 0;
        font-weight: 700;
      }

      .node-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

        .node-actions button {
        width: auto;
        padding: 6px 9px;
        font-size: 12px;
      }

      .node-policy {
        display: grid;
        gap: 6px;
        margin-top: 10px;
        max-width: 260px;
      }

      .multi-select {
        position: relative;
        display: grid;
        gap: 6px;
      }

      .multi-select summary {
        box-sizing: border-box;
        width: 100%;
        min-height: 38px;
        border: 1px solid #cbd2dc;
        border-radius: 6px;
        padding: 9px 10px;
        background: #ffffff;
        color: #20242a;
        cursor: pointer;
        list-style: none;
      }

      .multi-select summary::-webkit-details-marker {
        display: none;
      }

      .multi-select-menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        z-index: 20;
        display: grid;
        gap: 2px;
        max-height: 220px;
        overflow: auto;
        padding: 6px;
        border: 1px solid #cbd2dc;
        border-radius: 6px;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(31, 41, 55, 0.14);
      }

      .multi-select-option {
        width: 100%;
        border: 0;
        background: transparent;
        color: #20242a;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 7px 8px;
        font-size: 13px;
        font-weight: 500;
        text-align: left;
      }

      .multi-select-option:hover {
        background: #f1f5f9;
      }

      .multi-select-check {
        color: #1f6feb;
        font-weight: 800;
      }

      .meta {
        margin-top: 6px;
        font-size: 12px;
        color: #667085;
      }

      .content {
        margin-top: 8px;
        white-space: pre-wrap;
        color: #303741;
      }

      .node textarea {
        margin-top: 8px;
        min-height: 82px;
      }

      .status {
        min-height: 20px;
        font-size: 13px;
        color: #535b66;
        white-space: pre-wrap;
      }

      .modal {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.45);
        z-index: 50;
      }

      .hidden {
        display: none !important;
      }
        
      .modal.hidden {
        display: none !important;
      }

      .modal-card {
        position: relative;
        width: min(720px, 100%);
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #dfe3ea;
        padding: 18px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24);
      }

      .modal-title {
        margin: 0 0 8px;
        font-size: 18px;
      }

      .modal-copy {
        margin: 0 0 12px;
        color: #535b66;
        line-height: 1.5;
      }

      .modal-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .modal-list {
        margin: 0;
        padding: 10px 12px;
        border: 1px solid #e1e5ec;
        border-radius: 8px;
        background: #fbfcfe;
        max-height: 180px;
        overflow: auto;
        white-space: pre-wrap;
        color: #303741;
        font-size: 13px;
      }

      .modal-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
        justify-content: flex-end;
      }

      .modal-actions button {
        width: auto;
        min-width: 108px;
      }

      .sync-state {
        display: grid;
        gap: 6px;
        padding: 10px;
        border: 1px solid #e1e5ec;
        border-radius: 8px;
        background: #fbfcfe;
        font-size: 13px;
        color: #535b66;
      }

      .sync-state strong {
        color: #20242a;
      }

      .hint {
        font-size: 12px;
        color: #667085;
      }

      .admin-panel.hidden {
        display: none;
      }

      .user-table-wrap {
        overflow-x: auto;
      }

      .user-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .user-table th,
      .user-table td {
        padding: 8px 6px;
        border-bottom: 1px solid #e1e5ec;
        text-align: left;
        vertical-align: middle;
        white-space: nowrap;
      }

      .user-table th {
        color: #535b66;
        font-weight: 650;
      }

      .user-table select {
        min-width: 112px;
      }

      .user-table button {
        width: auto;
        padding: 6px 9px;
        font-size: 12px;
      }

      @media (max-width: 900px) {
        main {
          grid-template-columns: 1fr;
          padding: 16px;
        }

        header {
          align-items: stretch;
          flex-direction: column;
        }

      }
    </style>
  </head>
  <body class="login-mode">
    <header>
      <h1>CRDT 隐私协同编辑器</h1>
      <div class="session-chip" id="headerSession">未登录</div>
    </header>

    <div class="login-screen">
      <section class="login-panel stack">
        <h2 class="login-title">登录协同空间</h2>
        <p class="login-copy">请输入用户名和密码登录。也可以注册普通访客账号。</p>

        <div id="loginPanel" class="stack">
          <div>
            <label for="loginUsername">用户名</label>
            <input id="loginUsername" autocomplete="username" placeholder="例如：admin" />
          </div>
          <div>
            <label for="loginPassword">密码</label>
            <input id="loginPassword" type="password" autocomplete="current-password" placeholder="请输入密码" />
          </div>

          <div class="toolbar">
            <button id="login">登录</button>
            <button id="showRegister" class="secondary" type="button">注册账号</button>
          </div>

          <div class="hint">
            测试账号：
            管理员 admin / admin123；
            研发经理 manager / manager123；
            研发人员 member / member123；
            访客 guest / guest123。
          </div>
        </div>

        <div id="registerPanel" class="stack hidden">
          <div>
            <label for="registerUsername">用户名</label>
            <input id="registerUsername" autocomplete="username" />
          </div>
          <div>
            <label for="registerDisplayName">显示名称</label>
            <input id="registerDisplayName" />
          </div>
          <div>
            <label for="registerPassword">密码</label>
            <input id="registerPassword" type="password" autocomplete="new-password" />
          </div>
          <div>
            <label for="registerConfirmPassword">确认密码</label>
            <input id="registerConfirmPassword" type="password" autocomplete="new-password" />
          </div>
          <div class="toolbar">
            <button id="register" type="button">提交注册</button>
            <button id="hideRegister" class="secondary" type="button">取消</button>
          </div>
        </div>

        <div class="status" id="loginStatus"></div>
      </section>
    </div>

    <main>
      <section class="stack">
        <div class="panel stack">
          <div class="sync-state">
            <div>会话用户：<strong id="sessionUser">未登录</strong></div>
            <div>策略版本：<strong id="policyVersion">-</strong></div>
            <div>连接状态：<strong id="connectionState">未连接</strong></div>
            <div>离线队列：<strong id="queueLength">0</strong></div>
          </div>
          <div class="toolbar">
            <button id="refresh" class="secondary">刷新视图</button>
            <button id="connect" class="secondary">联网</button>
          </div>
          <div class="toolbar">
            <button id="syncOffline" class="secondary">同步离线操作</button>
            <button id="logout" class="secondary">登出</button>
          </div>
          <div class="status" id="status"></div>
        </div>

        <div id="userManagement" class="panel stack admin-panel hidden" aria-hidden="true">
          <h2>用户管理</h2>
          <div class="user-table-wrap">
            <table class="user-table">
              <thead>
                <tr>
                  <th>显示名称</th>
                  <th>用户名</th>
                  <th>当前身份</th>
                  <th>部门</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="userRows"></tbody>
            </table>
          </div>
          <div class="status" id="userManagementStatus"></div>
        </div>
      </section>

      <section class="stack">
        <div class="panel">
          <ul id="tree" class="tree"></ul>
        </div>
      </section>
    </main>

    <div id="deleteDialog" class="modal hidden" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="deleteDialogTitle">
        <h2 id="deleteDialogTitle" class="modal-title">删除影响分析</h2>
        <p id="deleteDialogCopy" class="modal-copy"></p>
        <div class="modal-grid">
          <div>
            <label>其他用户可见节点</label>
            <div id="deleteDialogVisibleNodes" class="modal-list"></div>
          </div>
          <div>
            <label>受影响用户</label>
            <div id="deleteDialogUsers" class="modal-list"></div>
          </div>
        </div>
        <div class="modal-actions">
          <button id="deleteDialogCancel" type="button" class="secondary">取消</button>
          <button id="deleteDialogKeepChildren" type="button" class="secondary">保留子节点</button>
          <button id="deleteDialogForce" type="button" class="danger">强制删除整棵树</button>
        </div>
      </div>
    </div>

    <div id="noticeDialog" class="modal hidden" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="noticeDialogTitle">
        <h2 id="noticeDialogTitle" class="modal-title">操作提示</h2>
        <p id="noticeDialogCopy" class="modal-copy"></p>
        <div class="modal-actions">
          <button id="noticeDialogOk" type="button">确定</button>
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
        }
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
        noticeDialogOk: document.querySelector("#noticeDialogOk")
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
        const roleSelect = document.createElement("select");
        roleSelect.innerHTML =
          '<option value="guest">访客</option>' +
          '<option value="member">研发人员</option>' +
          '<option value="manager">研发经理</option>' +
          '<option value="admin">管理员</option>';
        roleSelect.value = user.role;
        roleSelect.disabled = user.role === "admin" && adminCount <= 1;
        roleSelect.addEventListener("change", async () => {
          const previousRole = user.role;
          try {
            await updateUserRole(user.id, roleSelect.value);
          } catch (error) {
            roleSelect.value = previousRole;
            setUserManagementStatus(error.message);
          }
        });
        cell.appendChild(roleSelect);
        return cell;
      }

      function renderDepartmentCell(user) {
        const cell = document.createElement("td");
        const departmentSelect = document.createElement("select");
        departmentSelect.innerHTML =
          '<option value="all">all</option>' +
          '<option value="dev">dev</option>' +
          '<option value="external">external</option>' +
          '<option value="finance">finance</option>';
        departmentSelect.value = user.department;
        departmentSelect.addEventListener("change", async () => {
          const previousDepartment = user.department;
          try {
            await updateUserDepartment(user.id, departmentSelect.value);
          } catch (error) {
            departmentSelect.value = previousDepartment;
            setUserManagementStatus(error.message);
          }
        });
        cell.appendChild(departmentSelect);
        return cell;
      }

      function renderUserActionCell(user, adminCount) {
        const cell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
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
          visibilityPolicy.select.addEventListener("change", () =>
            syncOperationAclControls(visibilityPolicy.select, operationPolicies)
          );
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
          content.className = "content";
          content.textContent = node.content;
          box.appendChild(content);
        }

        if (node.permissions.canAddChild || node.permissions.canDelete) {
          const actions = document.createElement("div");
          actions.className = "node-actions";
          if (node.permissions.canAddChild) {
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "secondary";
            addButton.textContent = "添加子节点";
            addButton.addEventListener("click", () => addChildNode(node.id).catch((error) => setStatus(error.message)));
            actions.appendChild(addButton);
          }
          if (node.permissions.canDelete) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "danger";
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

      function renderAclSelect(label, value, onChange) {
        const policy = document.createElement("label");
        policy.className = "node-policy";
        policy.textContent = label;
        const audience = document.createElement("select");
        audience.dataset.field = "audience";
        audience.innerHTML =
          '<option value="all">所有人</option>' +
          '<option value="admin">仅管理员</option>' +
          '<option value="admin-manager">管理员和研发经理</option>' +
          '<option value="dev-team">管理员和研发团队</option>';
        audience.value = value;
        audience.addEventListener("change", () => onChange(audience.value));
        policy.appendChild(audience);
        return {
          element: policy,
          select: audience
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
            option.addEventListener("click", () => {
              if (selectedUserIds.has(user.id)) {
                selectedUserIds.delete(user.id);
              } else {
                selectedUserIds.add(user.id);
              }
              renderMenu();
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

      async function submitOperation(operation) {
        if (!state.token) return setStatus("请先登录");
        const envelope = createEnvelope(operation);
        state.offline.queue.push(envelope);
        saveOfflineQueue();
        renderSyncState();
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
        } else {
          setStatus("离线队列已同步");
        }
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
