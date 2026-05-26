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

      .node.selected {
        border-color: #1f6feb;
        box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.12);
      }

      .node-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .node-title button {
        width: auto;
        padding: 5px 8px;
        font-size: 12px;
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

      pre {
        overflow: auto;
        max-height: 260px;
        margin: 0;
        padding: 12px;
        border-radius: 8px;
        background: #111827;
        color: #f9fafb;
        font-size: 12px;
      }

      .status {
        min-height: 20px;
        font-size: 13px;
        color: #535b66;
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
        <div>
          <h2 class="login-title">登录协同空间</h2>
          <p class="login-copy">选择一个演示账号登录。登录后服务端会签发会话 token，所有视图和编辑操作都按会话身份校验。</p>
        </div>
        <div>
          <label for="loginUser">登录用户</label>
          <select id="loginUser">
            <option value="u-admin">管理员 / admin / all</option>
            <option value="u-dev-manager">研发经理 / manager / dev</option>
            <option value="u-dev-member">研发成员 / member / dev</option>
            <option value="u-guest">访客 / guest / external</option>
          </select>
        </div>
        <button id="login">登录</button>
        <div class="status" id="loginStatus"></div>
      </section>
    </div>

    <main>
      <section class="panel stack">
        <div class="sync-state">
          <div>会话用户：<strong id="sessionUser">未登录</strong></div>
          <div>策略版本：<strong id="policyVersion">-</strong></div>
          <div>连接状态：<strong id="connectionState">未连接</strong></div>
          <div>离线队列：<strong id="queueLength">0</strong></div>
        </div>
        <div class="toolbar">
          <button id="refresh" class="secondary">刷新视图</button>
          <button id="connect" class="secondary">连接 WS</button>
        </div>
        <div class="toolbar">
          <button id="syncOffline" class="secondary">同步离线操作</button>
          <button id="logout" class="secondary">登出</button>
        </div>
        <div>
          <label for="selected">选中节点 ID</label>
          <input id="selected" readonly />
        </div>
        <div>
          <label for="title">标题</label>
          <input id="title" placeholder="新标题或新节点标题" />
        </div>
        <div>
          <label for="content">内容</label>
          <textarea id="content" placeholder="节点内容"></textarea>
        </div>
        <div class="toolbar">
          <button id="rename">重命名</button>
          <button id="updateContent">改内容</button>
        </div>
        <div class="toolbar">
          <button id="addChild">添加子节点</button>
          <button id="deleteNode" class="danger">删除节点</button>
        </div>
        <div class="status" id="status"></div>
      </section>

      <section class="stack">
        <div class="panel">
          <ul id="tree" class="tree"></ul>
        </div>
      </section>
    </main>

    <script>
      const state = {
        token: "",
        user: null,
        policyVersion: 0,
        view: null,
        stateVector: "",
        selectedId: "",
        socket: null,
        offline: {
          connected: false,
          queue: loadStoredOfflineQueue()
        }
      };

      const els = {
        loginUser: document.querySelector("#loginUser"),
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
        selected: document.querySelector("#selected"),
        title: document.querySelector("#title"),
        content: document.querySelector("#content"),
        rename: document.querySelector("#rename"),
        updateContent: document.querySelector("#updateContent"),
        addChild: document.querySelector("#addChild"),
        deleteNode: document.querySelector("#deleteNode"),
        status: document.querySelector("#status"),
        tree: document.querySelector("#tree")
      };

      const offlineStorageKey = "crdt-editor-offline-queue-v1";

      function currentUserId() {
        return state.user ? state.user.id : els.loginUser.value;
      }

      function setStatus(text) {
        els.status.textContent = text;
      }

      function setLoginStatus(text) {
        els.loginStatus.textContent = text;
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
          body: JSON.stringify({ userId: els.loginUser.value })
        });
        state.token = body.token;
        state.user = body.user;
        state.policyVersion = body.policyVersion || 0;
        state.selectedId = "";
        els.selected.value = "";
        setLoginStatus("");
        setStatus("已登录：" + state.user.name);
        await loadView();
        render();
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
          state.view = null;
          state.stateVector = "";
          state.offline.connected = false;
          state.selectedId = "";
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

      function render() {
        document.body.className = state.user ? "app-mode" : "login-mode";
        els.headerSession.textContent = state.user
          ? state.user.name + " / " + state.user.role
          : "未登录";
        els.tree.innerHTML = "";
        renderSyncState();
        if (!state.view) return;
        for (const root of state.view.roots) {
          els.tree.appendChild(renderNode(root));
        }
      }

      function renderSyncState() {
        const currentQueue = queueForCurrentUser();
        els.sessionUser.textContent = state.user
          ? state.user.name + " / " + state.user.role + " / " + state.user.department
          : "未登录";
        els.policyVersion.textContent = state.policyVersion ? String(state.policyVersion) : "-";
        els.connectionState.textContent = state.offline.connected ? "已连接" : "离线";
        els.queueLength.textContent = String(currentQueue.length);
        els.syncOffline.disabled = !state.token || currentQueue.length === 0;
        els.refresh.disabled = !state.token;
        els.connect.disabled = !state.token;
      }

      function renderNode(node) {
        const li = document.createElement("li");
        const box = document.createElement("div");
        box.className = "node" + (node.id === state.selectedId ? " selected" : "");
        box.innerHTML =
          '<div class="node-title"><strong>' +
          escapeHtml(node.title) +
          '</strong><button type="button">选择</button></div>' +
          '<div class="meta">' +
          node.id +
          " · " +
          node.type +
          " · " +
          permissionText(node.permissions) +
          "</div>" +
          (node.content ? '<div class="content">' + escapeHtml(node.content) + "</div>" : "");
        box.querySelector("button").addEventListener("click", () => selectNode(node));
        li.appendChild(box);
        if (node.children && node.children.length > 0) {
          const ul = document.createElement("ul");
          for (const child of node.children) ul.appendChild(renderNode(child));
          li.appendChild(ul);
        }
        return li;
      }

      function selectNode(node) {
        state.selectedId = node.id;
        els.selected.value = node.id;
        els.title.value = node.title;
        els.content.value = node.content || "";
        render();
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

      function queueForCurrentUser() {
        return state.offline.queue.filter((envelope) => envelope.userId === currentUserId());
      }

      function removeQueuedOperations(ids) {
        const completed = new Set(ids);
        state.offline.queue = state.offline.queue.filter((envelope) => !completed.has(envelope.id));
        saveOfflineQueue();
      }

      async function submitOperation(operation) {
        if (!state.token) return setStatus("请先登录");
        const envelope = createEnvelope(operation);
        state.offline.queue.push(envelope);
        saveOfflineQueue();
        render();
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

      els.rename.addEventListener("click", async () => {
        if (!state.selectedId) return setStatus("请先选择节点");
        try {
          await submitOperation({ type: "renameNode", nodeId: state.selectedId, title: els.title.value });
        } catch (error) {
          setStatus(error.message);
        }
      });

      els.updateContent.addEventListener("click", async () => {
        if (!state.selectedId) return setStatus("请先选择节点");
        try {
          await submitOperation({ type: "updateContent", nodeId: state.selectedId, content: els.content.value });
        } catch (error) {
          setStatus(error.message);
        }
      });

      els.addChild.addEventListener("click", async () => {
        if (!state.selectedId) return setStatus("请先选择父节点");
        try {
          await submitOperation({
            type: "addNode",
            parentId: state.selectedId,
            title: els.title.value || "新节点",
            content: els.content.value || ""
          });
        } catch (error) {
          setStatus(error.message);
        }
      });

      els.deleteNode.addEventListener("click", async () => {
        if (!state.selectedId) return setStatus("请先选择节点");
        if (!window.confirm("确定删除当前节点吗？")) return;
        try {
          await submitOperation({ type: "deleteNode", nodeId: state.selectedId });
          state.selectedId = "";
          els.selected.value = "";
          render();
        } catch (error) {
          setStatus(error.message);
        }
      });

      els.connect.addEventListener("click", () => {
        if (!state.token) return setStatus("请先登录");
        if (state.socket) state.socket.close();
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(protocol + "//" + location.host + "/ws?token=" + encodeURIComponent(state.token));
        state.socket = socket;
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "view" || message.type === "operationApplied") {
            state.view = message.view;
            state.stateVector = message.stateVector || state.stateVector;
            if (message.type === "operationApplied" && message.operationId) {
              removeQueuedOperations([message.operationId]);
            }
            render();
            setStatus("WebSocket 已更新视图");
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
          state.offline.connected = false;
          renderSyncState();
          setStatus("WebSocket 已断开");
        };
        socket.onerror = () => {
          if (state.socket !== socket) return;
          state.offline.connected = false;
          renderSyncState();
        };
      });

      window.localStorage.removeItem("crdt-editor-session-token-v1");
      render();
    </script>
  </body>
</html>`;
}
