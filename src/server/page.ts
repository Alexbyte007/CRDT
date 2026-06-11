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
    .employee-log-list { display: grid; gap: 8px; }
    .employee-log-item {
      display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 8px;
      padding: 10px 12px; border: 1px solid var(--line); border-left-width: 4px;
      border-radius: 14px; background: color-mix(in srgb, var(--surface-solid) 86%, transparent);
      box-shadow: 0 10px 20px rgba(35,45,90,.04);
    }
    .employee-log-item span {
      grid-column: 1; grid-row: 1;
      color: var(--muted); font-family: var(--mono); font-size: 11px; line-height: 1.5;
    }
    .employee-log-item small {
      grid-column: 1; grid-row: 2;
      color: var(--muted); font-size: 11px; line-height: 1.4; font-weight: 500;
      overflow-wrap: anywhere;
    }
    .employee-log-item strong {
      grid-column: 2; grid-row: 1;
      min-width: 0; color: var(--text); font-size: 12px; line-height: 1.45; font-weight: 800;
      overflow-wrap: anywhere;
    }
    .employee-log-item em {
      grid-column: 2; grid-row: 2;
      color: var(--muted); font-size: 11px; line-height: 1.45; font-style: normal;
      overflow-wrap: anywhere;
    }
    .employee-log-item.local { border-left-color: var(--brand); }
    .employee-log-item.remote { border-left-color: var(--brand-2); background: rgba(6,182,212,.08); }
    .employee-log-item.failed { border-left-color: var(--danger); background: rgba(220,38,38,.08); }
    .log-empty {
      border: 1px dashed var(--line); border-radius: 14px; padding: 14px; color: var(--muted);
      font-size: 12px; background: color-mix(in srgb, var(--surface-solid) 75%, transparent);
    }

    /* Hybrid Tree Workspace */
    .tree {
      margin: 0; padding: 8px 0 0; list-style: none;
      position: relative;
    }
    .tree-workspace {
      display: grid; gap: 0;
    }
    .tree ul {
      margin: 0; padding-left: 0; list-style: none;
    }
    .tree-item {
      position: relative; padding-left: calc(var(--depth, 0) * 34px);
    }
    .tree-item::before {
      content: ""; position: absolute; left: calc(var(--depth, 0) * 34px + 17px);
      top: 0; bottom: 0; width: 2px;
      background: linear-gradient(180deg, rgba(79,70,229,.25), rgba(6,182,212,.12));
      border-radius: 999px;
    }
    .tree-item:last-child::before { bottom: calc(100% - 38px); }
    .tree-branch {
      position: absolute; left: calc(var(--depth, 0) * 34px + 17px); top: 37px;
      width: 28px; height: 2px; border-radius: 999px;
      background: linear-gradient(90deg, rgba(79,70,229,.35), rgba(6,182,212,.18));
    }
    .node-shell {
      position: relative; display: grid; grid-template-columns: 36px minmax(0, 1fr);
      gap: 12px; padding: 8px 0 8px 0;
    }
    .tree-toggle {
      width: 32px; height: 32px; margin-top: 13px; border-radius: 12px;
      border: 1px solid var(--line); background: var(--surface-solid); color: var(--brand);
      display: grid; place-items: center; box-shadow: 0 10px 20px rgba(35,45,90,.07);
      z-index: 2;
    }
    .tree-toggle::before {
      content: ""; width: 8px; height: 8px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
      transform: rotate(-45deg); transition: transform .22s ease;
    }
    .tree-toggle.expanded::before { transform: rotate(45deg); }
    .tree-toggle.empty {
      pointer-events: none; background: color-mix(in srgb, var(--surface-solid) 72%, transparent);
      color: var(--muted); opacity: .46;
    }
    .tree-toggle.empty::before {
      width: 7px; height: 7px; border: 2px solid currentColor; border-radius: 50%; transform: none;
    }
    .node {
      min-width: 0; border: 1px solid var(--line); border-radius: 18px;
      background: color-mix(in srgb, var(--surface-solid) 94%, var(--surface-2));
      box-shadow: 0 16px 38px rgba(35,45,90,.09);
      overflow: hidden; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }
    .node:hover {
      border-color: color-mix(in srgb, var(--brand) 28%, var(--line));
      box-shadow: 0 20px 44px rgba(35,45,90,.12);
    }
    .node[data-detail-expanded="true"] {
      background: var(--surface-solid);
      box-shadow: 0 22px 50px rgba(35,45,90,.12);
    }
    .node-summary {
      display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 12px;
      align-items: center; padding: 14px 16px; cursor: pointer;
    }
    .node-kind {
      width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center;
      color: white; background: linear-gradient(135deg, var(--brand), var(--brand-2));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.2), 0 12px 22px rgba(79,70,229,.18);
      font-weight: 900; font-size: 12px;
    }
    .node-kind.task { background: linear-gradient(135deg, #7c3aed, #4f46e5); }
    .node-kind.doc { background: linear-gradient(135deg, #0284c7, #06b6d4); }
    .node-kind.folder { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
    .node-title {
      min-width: 0; display: grid; gap: 7px;
    }
    .node-title strong { overflow-wrap: anywhere; font-size: 15px; line-height: 1.35; }
    .node-title input { min-width: 0; font-weight: 800; font-size: 15px; padding: 9px 11px; border-radius: 12px; }
    .node-meta-line {
      display: flex; flex-wrap: wrap; gap: 7px; align-items: center;
      color: var(--muted); font-size: 12px;
    }
    .node-chip,
    .node-child-count {
      display: inline-flex; align-items: center; gap: 5px; min-height: 24px;
      padding: 4px 8px; border-radius: 999px; border: 1px solid var(--line);
      background: var(--surface-2); color: var(--muted); font-size: 12px; font-weight: 800;
      white-space: nowrap;
    }
    .node-child-count { color: var(--brand); background: rgba(79,70,229,.10); }
    .node-expand-indicator {
      width: 30px; height: 30px; border-radius: 11px;
      display: grid; place-items: center; color: var(--muted);
      background: var(--surface-2); border: 1px solid var(--line);
      transition: transform .2s ease, color .2s ease, background .2s ease;
    }
    .node-expand-indicator::before {
      content: ""; width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
      transform: rotate(45deg);
    }
    .node[data-detail-expanded="true"] .node-expand-indicator {
      color: var(--brand); background: rgba(79,70,229,.10); transform: rotate(180deg);
    }
    .node-detail-shell,
    .tree-children-shell {
      display: grid; grid-template-rows: 0fr;
      transition: grid-template-rows .32s cubic-bezier(.2,.8,.2,1), opacity .24s ease, transform .24s ease;
      opacity: 0; transform: translateY(-5px);
    }
    .tree-children-shell {
      grid-column: 2;
    }
    .node-detail-shell.expanded,
    .tree-children-shell.expanded {
      grid-template-rows: 1fr; opacity: 1; transform: translateY(0);
    }
    .node-detail-inner,
    .tree-children-inner {
      min-height: 0; overflow: hidden;
    }
    .node-detail-inner {
      display: grid; gap: 12px; padding: 14px 16px 16px 70px;
      border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
    }
    .tree-children-inner {
      padding-top: 2px;
    }
    .node-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .node-actions button { width: auto; padding: 6px 12px; font-size: 12px; }
    .node-markdown-preview {
      display: grid; gap: 10px; padding: 12px 14px;
      border: 1px solid var(--line); border-radius: 16px; background: var(--surface-2);
      box-shadow: 0 10px 24px rgba(35,45,90,.05);
    }
    .node-markdown-preview-head {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      color: var(--muted); font-size: 12px; font-weight: 800;
    }
    .node-markdown-preview-head .btn { width: auto; padding: 6px 10px; font-size: 12px; }
    .node-markdown-preview-body {
      max-height: 220px; overflow: auto; padding-right: 4px;
    }
    .markdown-empty {
      margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6;
    }
    .markdown-drawer-backdrop {
      position: fixed; inset: 0; z-index: 60; display: flex; justify-content: flex-end;
      padding: 18px; background: rgba(15, 23, 42, .28);
      animation: markdownBackdropIn .18s ease both;
    }
    .markdown-drawer-backdrop.hidden { display: none !important; }
    .markdown-drawer {
      width: min(880px, calc(100vw - 36px)); height: calc(100vh - 36px);
      display: grid; grid-template-rows: auto auto minmax(0, 1fr);
      overflow: hidden; border: 1px solid var(--line); border-radius: 24px;
      background: var(--surface-solid); box-shadow: var(--shadow);
      animation: markdownDrawerIn .24s cubic-bezier(.2,.8,.2,1) both;
    }
    .markdown-drawer-head {
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
      padding: 16px 18px; border-bottom: 1px solid var(--line);
      background: color-mix(in srgb, var(--surface-solid) 92%, var(--surface-2));
    }
    .markdown-drawer-title { min-width: 0; display: grid; gap: 3px; }
    .markdown-drawer-title h2 {
      margin: 0; color: var(--text); font-size: 16px; line-height: 1.35; overflow-wrap: anywhere;
    }
    .markdown-drawer-title span { color: var(--muted); font-size: 12px; }
    .markdown-drawer-actions { display: flex; align-items: center; gap: 8px; }
    .markdown-mode-tabs {
      display: inline-flex; align-items: center; padding: 3px; gap: 3px;
      border: 1px solid var(--line); border-radius: 999px; background: var(--surface-2);
    }
    .markdown-mode-tabs button,
    .markdown-tool-btn {
      width: auto; min-width: 34px; min-height: 32px; border: 0; border-radius: 999px;
      padding: 6px 10px; color: var(--muted); background: transparent; font-weight: 800;
      cursor: pointer; transition: background .18s ease, color .18s ease, transform .18s ease;
    }
    .markdown-mode-tabs button:hover,
    .markdown-tool-btn:hover { color: var(--brand); background: rgba(79,70,229,.10); }
    .markdown-mode-tabs button.active {
      color: var(--brand); background: var(--surface-solid); box-shadow: 0 6px 16px rgba(35,45,90,.08);
    }
    .markdown-tool-btn:active { transform: translateY(1px); }
    .markdown-editor-toolbar {
      display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
      padding: 10px 14px; border-bottom: 1px solid var(--line); background: var(--surface-solid);
    }
    .markdown-toolbar-divider {
      width: 1px; height: 24px; background: var(--line); margin: 0 2px;
    }
    .markdown-editor-grid {
      min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      background: var(--surface-solid);
    }
    .markdown-editor-grid.write-only,
    .markdown-editor-grid.preview-only { grid-template-columns: minmax(0, 1fr); }
    .markdown-editor-pane,
    .markdown-preview-pane { min-height: 0; overflow: auto; }
    .markdown-editor-pane.hidden,
    .markdown-preview-pane.hidden { display: none; }
    .markdown-preview-pane {
      border-left: 1px solid var(--line); background: color-mix(in srgb, var(--surface-solid) 88%, var(--surface-2));
    }
    .markdown-editor-grid.preview-only .markdown-preview-pane { border-left: 0; }
    .markdown-editor-textarea {
      display: block; width: 100%; height: 100%; min-height: 480px; box-sizing: border-box;
      border: 0; border-radius: 0; resize: none; outline: none; background: var(--surface-solid);
      color: var(--text); padding: 18px 20px; font-family: var(--mono); font-size: 14px; line-height: 1.75;
    }
    .markdown-editor-textarea:focus { box-shadow: inset 0 0 0 2px rgba(79,70,229,.38); }
    .markdown-body {
      color: var(--text); font-size: 14px; line-height: 1.68; overflow-wrap: anywhere;
    }
    .markdown-preview-pane .markdown-body { padding: 18px 20px; }
    .markdown-body > *:first-child { margin-top: 0; }
    .markdown-body > *:last-child { margin-bottom: 0; }
    .markdown-body h1,
    .markdown-body h2,
    .markdown-body h3 { margin: 18px 0 10px; line-height: 1.28; color: var(--text); }
    .markdown-body h1 { font-size: 24px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
    .markdown-body h2 { font-size: 20px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
    .markdown-body h3 { font-size: 16px; }
    .markdown-body p { margin: 9px 0; }
    .markdown-body ul,
    .markdown-body ol { margin: 9px 0; padding-left: 24px; }
    .markdown-body li { margin: 4px 0; }
    .markdown-body blockquote {
      margin: 12px 0; padding: 8px 12px; border-left: 4px solid var(--brand);
      color: var(--muted); background: rgba(79,70,229,.08); border-radius: 0 12px 12px 0;
    }
    .markdown-body code {
      padding: 2px 5px; border-radius: 6px; background: rgba(99,102,241,.12);
      color: var(--brand); font-family: var(--mono); font-size: .92em;
    }
    .markdown-body pre {
      margin: 12px 0; overflow: auto; padding: 12px 14px; border: 1px solid var(--line);
      border-radius: 14px; background: #0f172a; color: #e2e8f0;
    }
    .markdown-body pre code {
      padding: 0; border-radius: 0; background: transparent; color: inherit;
    }
    .markdown-body table {
      width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px;
    }
    .markdown-body th,
    .markdown-body td { border: 1px solid var(--line); padding: 7px 9px; text-align: left; }
    .markdown-body th { background: var(--surface-2); }
    @keyframes markdownBackdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes markdownDrawerIn {
      from { opacity: 0; transform: translateX(24px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .node textarea { min-height: 88px; resize: vertical; }
    .node-policy {
      display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      max-width: 760px;
    }
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
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 9999; display: grid; gap: 2px;
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
      .tree-item { padding-left: calc(var(--depth, 0) * 20px); }
      .tree-item::before { left: calc(var(--depth, 0) * 20px + 16px); }
      .tree-branch { left: calc(var(--depth, 0) * 20px + 16px); width: 20px; }
      .node-shell { grid-template-columns: 32px minmax(0, 1fr); gap: 8px; }
      .node-summary { grid-template-columns: 36px minmax(0, 1fr) 28px; gap: 9px; padding: 12px; }
      .node-kind { width: 36px; height: 36px; border-radius: 12px; font-size: 11px; }
      .node-detail-inner { padding: 12px; }
      .node-policy { grid-template-columns: 1fr; max-width: none; }
      .markdown-drawer-backdrop { padding: 10px; }
      .markdown-drawer { width: calc(100vw - 20px); height: calc(100vh - 20px); border-radius: 18px; }
      .markdown-drawer-head { align-items: stretch; flex-direction: column; }
      .markdown-drawer-actions { justify-content: space-between; }
      .markdown-editor-grid { grid-template-columns: 1fr; }
      .markdown-preview-pane { border-left: 0; border-top: 1px solid var(--line); }
      .markdown-editor-textarea { min-height: 360px; }
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
            <div><strong style="color:var(--text);">待同步</strong> <span id="pendingQueueLength" style="color:var(--muted);">0</span></div>
            <div><strong style="color:var(--text);">发送中</strong> <span id="sendingQueueLength" style="color:var(--muted);">0</span></div>
            <div><strong style="color:var(--text);">已确认</strong> <span id="ackedQueueLength" style="color:var(--muted);">0</span></div>
            <div><strong style="color:var(--text);">同步失败</strong> <span id="rejectedQueueLength" style="color:var(--muted);">0</span></div>
            <div><strong style="color:var(--text);">最后心跳</strong> <span id="lastHeartbeat" style="color:var(--muted);">-</span></div>
            <div><strong style="color:var(--text);">最后同步</strong> <span id="lastSync" style="color:var(--muted);">-</span></div>
          </div>
        </div>

        <div class="nav-list">
          <button class="nav-item" id="refresh"><span>⟳</span>刷新视图</button>
          <button class="nav-item" id="connect"><span>⚡</span>模拟断网</button>
          <button class="nav-item" id="syncOffline"><span>↥</span>同步离线操作</button>
        </div>
        <div class="status" id="status" style="color: var(--muted); font-size: 12px; margin-top: 8px;"></div>

      </aside>

      <section class="content employee-content">
        <div id="userManagement" class="section-card glass admin-panel hidden" aria-hidden="true" style="margin-bottom: 18px; position: relative; z-index: 10;">
          <div class="section-head compact">
            <div>
              <h3>用户管理</h3>
              <p>管理系统中的用户角色与部门权限。</p>
            </div>
          </div>
          <div class="user-table-wrap" style="margin-top: 8px;">
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
            <ul id="tree" class="tree tree-workspace"></ul>
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

    <div id="markdownDrawerBackdrop" class="markdown-drawer-backdrop hidden" aria-hidden="true">
      <aside id="markdownEditorDrawer" class="markdown-drawer" role="dialog" aria-modal="true" aria-labelledby="markdownDrawerTitle"></aside>
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
        treeUi: {
          expandedDetailNodeIds: {},
          expandedTreeNodeIds: {}
        },
        markdownEditor: {
          activeNodeId: null,
          mode: "write"
        },
        offline: {
          connected: false,
          simulated: false,
          connectionStatus: "offline",
          lastPongAt: 0,
          lastSyncAt: 0,
          syncInFlight: false,
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
        pendingQueueLength: document.querySelector("#pendingQueueLength"),
        sendingQueueLength: document.querySelector("#sendingQueueLength"),
        ackedQueueLength: document.querySelector("#ackedQueueLength"),
        rejectedQueueLength: document.querySelector("#rejectedQueueLength"),
        lastHeartbeat: document.querySelector("#lastHeartbeat"),
        lastSync: document.querySelector("#lastSync"),
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
        markdownDrawerBackdrop: document.querySelector("#markdownDrawerBackdrop"),
        markdownEditorDrawer: document.querySelector("#markdownEditorDrawer"),
        localLogList: document.querySelector("#localLogList"),
        remoteLogList: document.querySelector("#remoteLogList")
      };

      const offlineStorageKey = "crdt-editor-offline-queue-v1";
      const ACK_RETENTION_MS = 30_000;
      const SEND_TIMEOUT_MS = 15_000;
      const HEARTBEAT_INTERVAL_MS = 5_000;
      const HEARTBEAT_TIMEOUT_MS = 15_000;
      const AUTO_SYNC_INTERVAL_MS = 5_000;
      const RECONNECT_INTERVAL_MS = 5_000;
      const MAX_REJECTED_ITEMS = 100;
      const MAX_QUEUE_SIZE = 1000;
      const operationLogLimit = 20;
      const operationLogKeys = new Set();
      const operationLogClassNames = {
        local: "employee-log-item local",
        remote: "employee-log-item remote",
        failed: "employee-log-item failed"
      };
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
          return Array.isArray(parsed)
            ? parsed.map(normalizeOfflineQueueItem).filter(Boolean)
            : [];
        } catch {
          return [];
        }
      }

      function normalizeOfflineQueueItem(item) {
        if (!item || typeof item !== "object" || !item.id || !item.operation) {
          return null;
        }
        return {
          ...item,
          status: ["pending", "sending", "acked", "rejected"].includes(item.status)
            ? item.status
            : "pending",
          attempts: Number.isFinite(item.attempts) ? item.attempts : 0,
          createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now()
        };
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
          const errorName = body.error ? body.error.name : "";
          if (errorName === "AuthenticationError") {
            logout();
            throw new Error(body.error ? body.error.message : "登录已失效，请重新登录。");
          }
          throw new Error(body.error ? body.error.message : "请求失败");
        }
        return body;
      }

      async function login() {
        if (state.socket) {
          state.socket.close();
          state.socket = null;
        }
        state.offline.simulated = false;
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
          state.offline.simulated = false;
          state.offline.connectionStatus = "offline";
          state.offline.lastPongAt = 0;
          state.offline.lastSyncAt = 0;
          state.offline.syncInFlight = false;
          clearAllAutoSaveTimers();
          state.editing.drafts = {};
          state.markdownEditor.activeNodeId = null;

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

      function appendOperationLog(entry) {
        const kind = entry.kind || "local";
        const target = kind === "remote" ? state.remoteLog : state.localLog;
        const key = entry.key || "";
        if (key && operationLogKeys.has(key)) return;

        if (entry.coalesceKey) {
          const existingIndex = target.findIndex((item) => item.coalesceKey === entry.coalesceKey);
          if (existingIndex >= 0) {
            const removed = target.splice(existingIndex, 1);
            for (const item of removed) {
              if (item.key) operationLogKeys.delete(item.key);
            }
          }
        }

        const normalized = {
          kind,
          operator: entry.operator || "",
          title: entry.title || "记录操作",
          detail: entry.detail || "",
          time: entry.time || new Date().toLocaleTimeString("zh-CN", { hour12: false }),
          createdAt: entry.createdAt || Date.now(),
          key,
          coalesceKey: entry.coalesceKey || ""
        };
        target.unshift(normalized);
        if (key) operationLogKeys.add(key);
        if (target.length > operationLogLimit) {
          const removed = target.splice(operationLogLimit);
          for (const item of removed) {
            if (item.key) operationLogKeys.delete(item.key);
          }
        }
      }

      function renderOperationLogs() {
        function formatLog(entries, emptyText) {
          if (!entries || entries.length === 0) {
            return '<div class="log-empty">' + emptyText + '</div>';
          }
          const rows = entries.slice().sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
          return '<div class="employee-log-list">' + rows.map(entry => {
            const className = operationLogClassNames[entry.kind] || operationLogClassNames.local;
            return '<div class="' + escapeHtml(className) + '">' +
              '<span>' + escapeHtml(entry.time) + '</span>' +
              (entry.operator ? '<small>' + escapeHtml(entry.operator) + '</small>' : '') +
              '<strong>' + escapeHtml(entry.title) + '</strong>' +
              (entry.detail ? '<em>' + escapeHtml(entry.detail) + '</em>' : '') +
              '</div>';
          }).join('') + '</div>';
        }
        if (els.localLogList) els.localLogList.innerHTML = formatLog(state.localLog, "还没有本地编辑。");
        if (els.remoteLogList) els.remoteLogList.innerHTML = formatLog(state.remoteLog, "等待后端返回或 WebSocket 更新。");
      }

      function findViewNodeById(nodeId, nodes) {
        if (!nodeId) return null;
        for (const node of nodes || []) {
          if (node.id === nodeId) return node;
          const found = findViewNodeById(nodeId, node.children || []);
          if (found) return found;
        }
        return null;
      }

      function resolveNodeTitle(nodeId) {
        const draft = state.editing.drafts[nodeId];
        if (draft && draft.title) return draft.title;
        const node = state.view ? findViewNodeById(nodeId, state.view.roots) : null;
        return node && node.title ? node.title : nodeId || "未知节点";
      }

      function quotedNodeTitle(value) {
        return "「" + (value || "未知节点") + "」";
      }

      function targetNodeIdFromOperation(operation) {
        return operation.nodeId || operation.parentId || operation.targetNodeId || "";
      }

      function formatViewOperation(operation, customLogTitle) {
        if (!operation || !operation.type) {
          return { title: customLogTitle || "执行未知操作", detail: "" };
        }

        const targetNodeId = targetNodeIdFromOperation(operation);
        const targetTitle = resolveNodeTitle(targetNodeId);
        const target = quotedNodeTitle(targetTitle);

        if (customLogTitle) {
          return { title: customLogTitle, detail: targetNodeId ? "目标节点 " + target : "" };
        }

        if (operation.type === "updateContent") {
          return {
            title: "修改节点「" + targetTitle + "」内容",
            detail: "内容已更新"
          };
        }

        if (operation.type === "addNode" || operation.type === "insertNode") {
          const childTitle = operation.title || "新节点";
          const parentTitle = resolveNodeTitle(operation.parentId);
          return {
            title: "新增子节点「" + childTitle + "」",
            detail: operation.parentId ? "父节点 " + quotedNodeTitle(parentTitle) : ""
          };
        }

        if (operation.type === "deleteNode") {
          return {
            title: "删除节点" + target,
            detail: operation.confirmedImpact ? "已确认删除影响" : ""
          };
        }

        if (operation.type === "deleteNodeKeepChildren") {
          return {
            title: "删除节点" + target,
            detail: "保留子节点"
          };
        }

        if (operation.type === "renameNode" || operation.type === "updateTitle") {
          const nextTitle = operation.title || operation.newTitle || "";
          return {
            title: "重命名节点" + target,
            detail: nextTitle ? "新名称 " + quotedNodeTitle(nextTitle) : ""
          };
        }

        if (operation.type === "updateAcl") {
          return {
            title: "调整节点" + target + "权限",
            detail: "访问策略已更新"
          };
        }

        return {
          title: "执行操作「" + operation.type + "」",
          detail: targetNodeId ? "目标节点 " + target : "已记录操作摘要"
        };
      }

      function operationFailurePrefix(operation) {
        if (!operation || !operation.type) return "操作失败：";
        if (operation.type === "deleteNode" || operation.type === "deleteNodeKeepChildren") return "删除失败：";
        if (operation.type === "addNode" || operation.type === "insertNode") return "新增失败：";
        if (operation.type === "renameNode" || operation.type === "updateTitle") return "重命名失败：";
        if (operation.type === "updateContent") return "修改失败：";
        if (operation.type === "updateAcl") return "权限更新失败：";
        return "操作失败：";
      }

      function formatOperationFailure(operation, error) {
        const reason = error && error.message ? error.message : String(error || "未知原因");
        const summary = formatViewOperation(operation);
        return {
          kind: "failed",
          title: operationFailurePrefix(operation) + reason,
          detail: summary.title,
          coalesceKey: "failed:" + (operation ? operation.type : "unknown") + ":" + targetNodeIdFromOperation(operation || {}) + ":" + reason
        };
      }

      function logOperationFailure(operation, error) {
        appendOperationLog(formatOperationFailure(operation, error));
        renderOperationLogs();
      }

      function findQueuedEnvelope(operationId, queue) {
        if (!operationId) return null;
        return (queue || state.offline.queue).find((envelope) => envelope.id === operationId) || null;
      }

      function operationLabel(operationType) {
        const labels = {
          addNode: "新增子节点",
          deleteNode: "删除节点",
          deleteNodeKeepChildren: "删除节点（保留子节点）",
          renameNode: "重命名节点",
          updateContent: "修改节点内容",
          updateAcl: "修改节点权限",
          updateAttrs: "修改节点属性"
        };
        return labels[operationType] || ("执行操作「" + operationType + "」");
      }

      function formatRemoteOperationMessage(message, envelope) {
        if (message.type === "operationApplied") {
          const summary = envelope && envelope.operation ? formatViewOperation(envelope.operation) : null;
          return {
            kind: "remote",
            operator: state.user ? state.user.name : "",
            title: "服务端已合并本操作",
            detail: message.deduplicated
              ? "重复操作已跳过"
              : summary
                ? summary.title
                : "本地队列已确认",
            key: "remote:applied:" + (message.operationId || message.stateVector || Date.now())
          };
        }

        // view 类型：显示操作者身份
        if (message.change) {
          const c = message.change;
          const desc = operationLabel(c.operationType);
          return {
            kind: "remote",
            operator: c.userName,
            title: desc,
            detail: c.nodeTitle ? "目标: 「" + c.nodeTitle + "」" : (c.nodeId ? "节点: " + c.nodeId : ""),
            key: "remote:view:" + (c.userId || "") + ":" + (c.operationType || "") + ":" + (message.stateVector || Date.now())
          };
        }

        // 无 change 信息的 view 消息（如初始连接或 HTTP API 触发），不记录日志
        return null;
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
        renderOperationLogs();
        if (!state.view) {
          renderMarkdownEditorDrawer();
          restoreEditorFocus(focus);
          return;
        }
        for (const root of state.view.roots) {
          els.tree.appendChild(renderNode(root, 0));
        }
        renderMarkdownEditorDrawer();
        restoreEditorFocus(focus);
      }

      function renderSyncState() {
        const currentQueue = queueForCurrentUser();
        const stats = queueStatsForCurrentUser();
        els.sessionUser.textContent = state.user
          ? state.user.name + " / " + state.user.role + " / " + state.user.department
          : "未登录";
        els.policyVersion.textContent = state.policyVersion ? String(state.policyVersion) : "-";
        els.connectionState.textContent = connectionStatusLabel();
        els.queueLength.textContent = String(currentQueue.length);
        els.pendingQueueLength.textContent = String(stats.pending);
        els.sendingQueueLength.textContent = String(stats.sending);
        els.ackedQueueLength.textContent = String(stats.acked);
        els.rejectedQueueLength.textContent = String(stats.rejected);
        els.lastHeartbeat.textContent = state.offline.lastPongAt
          ? secondsAgo(state.offline.lastPongAt)
          : "-";
        els.lastSync.textContent = state.offline.lastSyncAt
          ? secondsAgo(state.offline.lastSyncAt)
          : "-";
        els.syncOffline.disabled = !state.token || syncableQueueForCurrentUser().length === 0;
        els.refresh.disabled = !state.token;
        els.connect.disabled = !state.token;
        els.connect.textContent = state.offline.simulated ? "恢复联网" : "模拟断网";
      }

      function connectionStatusLabel() {
        if (state.offline.simulated || state.offline.connectionStatus === "simulated-offline") {
          return "模拟离线";
        }
        if (state.offline.connectionStatus === "stale") return "心跳超时";
        if (state.offline.connectionStatus === "connected") return "已连接";
        if (state.offline.connectionStatus === "connecting") return "连接中";
        return "离线";
      }

      function secondsAgo(timestamp) {
        const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
        return seconds + " 秒前";
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
        const isSelf = state.user && user.id === state.user.id;
        const allOptions = [
          { value: "guest", label: "访客" },
          { value: "member", label: "研发人员" },
          { value: "manager", label: "研发经理" },
          { value: "admin", label: "管理员" }
        ];
        const roleOptions = isSelf ? allOptions : allOptions.filter((opt) => opt.value !== "admin");
        const roleSelect = createCustomSelect(
          roleOptions,
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

      function hasNodeChildren(node) {
        return Boolean(node.children && node.children.length > 0);
      }

      function hasExplicitTreeState(map, nodeId) {
        return Object.prototype.hasOwnProperty.call(map, nodeId);
      }

      function isDetailExpanded(node, depth) {
        if (hasExplicitTreeState(state.treeUi.expandedDetailNodeIds, node.id)) {
          return state.treeUi.expandedDetailNodeIds[node.id];
        }
        return depth === 0;
      }

      function isTreeExpanded(node, depth) {
        if (!hasNodeChildren(node)) return false;
        if (hasExplicitTreeState(state.treeUi.expandedTreeNodeIds, node.id)) {
          return state.treeUi.expandedTreeNodeIds[node.id];
        }
        return depth <= 1;
      }

      function toggleNodeDetails(node, depth) {
        state.treeUi.expandedDetailNodeIds[node.id] = !isDetailExpanded(node, depth);
        render();
      }

      function toggleNodeChildren(node, depth) {
        if (!hasNodeChildren(node)) return;
        state.treeUi.expandedTreeNodeIds[node.id] = !isTreeExpanded(node, depth);
        render();
      }

      function shouldIgnoreNodeSummaryClick(event) {
        const target = event.target;
        return Boolean(
          target &&
          target.closest &&
          target.closest("button, input, textarea, select, details, summary, label, .multi-select, .node-actions, .node-policy")
        );
      }

      function nodeTypeAbbreviation(type) {
        if (type === "folder") return "DIR";
        if (type === "task") return "TSK";
        return "DOC";
      }

      function nodeTypeLabel(type) {
        if (type === "folder") return "目录";
        if (type === "task") return "任务";
        return "文档";
      }

      function findNodeById(nodeId, nodes) {
        for (const node of nodes || []) {
          if (node.id === nodeId) return node;
          const found = findNodeById(nodeId, node.children || []);
          if (found) return found;
        }
        return null;
      }

      function activeMarkdownNode() {
        if (!state.view || !state.markdownEditor.activeNodeId) return null;
        return findNodeById(state.markdownEditor.activeNodeId, state.view.roots);
      }

      function openMarkdownEditor(nodeId) {
        state.markdownEditor.activeNodeId = nodeId;
        if (!state.markdownEditor.mode) {
          state.markdownEditor.mode = "write";
        }
        renderMarkdownEditorDrawer();
        window.requestAnimationFrame(() => {
          const editor = document.querySelector("#markdownContentEditor");
          if (editor) editor.focus();
        });
      }

      function closeMarkdownEditor() {
        const node = activeMarkdownNode();
        if (node) {
          autoSaveNode(node.id).catch((error) => setStatus(error.message));
        }
        state.markdownEditor.activeNodeId = null;
        renderMarkdownEditorDrawer();
      }

      function setMarkdownEditorMode(mode) {
        state.markdownEditor.mode = mode;
        renderMarkdownEditorDrawer();
      }

      function appendMarkdownPreview(container, node, draft) {
        if (!node.permissions.canEditContent && !draft.content) return;

        const preview = document.createElement("div");
        preview.className = "node-markdown-preview";
        preview.dataset.nodeId = node.id;

        const head = document.createElement("div");
        head.className = "node-markdown-preview-head";
        const label = document.createElement("span");
        label.textContent = node.permissions.canEditContent ? "Markdown 文档" : "Markdown 预览";
        head.appendChild(label);

        if (node.permissions.canEditContent) {
          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "btn small secondary";
          editButton.textContent = "编辑 Markdown";
          editButton.addEventListener("click", (event) => {
            event.stopPropagation();
            openMarkdownEditor(node.id);
          });
          head.appendChild(editButton);
        }
        preview.appendChild(head);

        const body = document.createElement("div");
        body.className = "markdown-body node-markdown-preview-body";
        body.innerHTML = markdownToHtml(draft.content);
        preview.appendChild(body);
        container.appendChild(preview);
      }

      function renderMarkdownEditorDrawer() {
        if (!els.markdownDrawerBackdrop || !els.markdownEditorDrawer) return;

        const node = activeMarkdownNode();
        if (!node) {
          state.markdownEditor.activeNodeId = null;
          els.markdownDrawerBackdrop.classList.add("hidden");
          els.markdownDrawerBackdrop.setAttribute("aria-hidden", "true");
          els.markdownEditorDrawer.innerHTML = "";
          return;
        }

        const draft = getNodeDraft(node);
        const canEdit = Boolean(node.permissions.canEditContent);
        const mode = canEdit ? state.markdownEditor.mode || "write" : "preview";
        const showEditor = canEdit && mode !== "preview";
        const showPreview = mode !== "write";
        const gridClass =
          mode === "write" ? " write-only" : mode === "preview" ? " preview-only" : "";

        els.markdownDrawerBackdrop.classList.remove("hidden");
        els.markdownDrawerBackdrop.setAttribute("aria-hidden", "false");
        els.markdownEditorDrawer.innerHTML =
          '<div class="markdown-drawer-head">' +
            '<div class="markdown-drawer-title">' +
              '<h2 id="markdownDrawerTitle">' + escapeHtml(draft.title || node.title || "未命名节点") + '</h2>' +
              '<span>' + escapeHtml(node.id) + ' / ' + escapeHtml(nodeTypeLabel(node.type)) + '</span>' +
            '</div>' +
            '<div class="markdown-drawer-actions">' +
              '<div id="markdownEditorMode" class="markdown-mode-tabs" aria-label="Markdown 视图模式">' +
                '<button type="button" data-markdown-mode="write" class="' + (mode === "write" ? "active" : "") + '"' + (!canEdit ? " disabled" : "") + '>Write</button>' +
                '<button type="button" data-markdown-mode="preview" class="' + (mode === "preview" ? "active" : "") + '>Preview</button>' +
                '<button type="button" data-markdown-mode="split" class="' + (mode === "split" ? "active" : "") + '"' + (!canEdit ? " disabled" : "") + '>Split</button>' +
              '</div>' +
              '<button type="button" class="btn small secondary" data-md-close>关闭</button>' +
            '</div>' +
          '</div>' +
          '<div class="markdown-editor-toolbar" aria-label="Markdown 工具栏">' +
            '<button type="button" class="markdown-tool-btn" title="标题" data-md-insert="# ">H</button>' +
            '<button type="button" class="markdown-tool-btn" title="加粗" data-md-wrap="**">B</button>' +
            '<button type="button" class="markdown-tool-btn" title="斜体" data-md-wrap="_">I</button>' +
            '<button type="button" class="markdown-tool-btn" title="引用" data-md-insert="&gt; ">Quote</button>' +
            '<button type="button" class="markdown-tool-btn" title="行内代码" data-md-wrap="&#96;">Code</button>' +
            '<button type="button" class="markdown-tool-btn" title="链接" data-md-insert="[标题](https://)">Link</button>' +
            '<span class="markdown-toolbar-divider" aria-hidden="true"></span>' +
            '<button type="button" class="markdown-tool-btn" title="无序列表" data-md-insert="- ">List</button>' +
            '<button type="button" class="markdown-tool-btn" title="有序列表" data-md-insert="1. ">1.</button>' +
            '<button type="button" class="markdown-tool-btn" title="任务列表" data-md-insert="- [ ] ">Task</button>' +
            '<button type="button" class="markdown-tool-btn" title="代码块" data-md-action="code-block">Block</button>' +
          '</div>' +
          '<div class="markdown-editor-grid' + gridClass + '">' +
            '<section class="markdown-editor-pane' + (showEditor ? "" : " hidden") + '">' +
              '<textarea id="markdownContentEditor" class="markdown-editor-textarea" data-node-id="' + escapeHtml(node.id) + '" data-field="content" spellcheck="false" placeholder="用 Markdown 记录节点说明、任务拆解、接口草稿或协作笔记...">' + escapeHtml(draft.content) + '</textarea>' +
            '</section>' +
            '<section class="markdown-preview-pane' + (showPreview ? "" : " hidden") + '" aria-label="Markdown 预览">' +
              '<div id="markdownLivePreview" class="markdown-body">' + markdownToHtml(draft.content) + '</div>' +
            '</section>' +
          '</div>';

        bindMarkdownEditorDrawer(node, canEdit);
      }

      function bindMarkdownEditorDrawer(node, canEdit) {
        els.markdownDrawerBackdrop.onclick = (event) => {
          if (event.target === els.markdownDrawerBackdrop) closeMarkdownEditor();
        };

        const closeButton = els.markdownEditorDrawer.querySelector("[data-md-close]");
        if (closeButton) {
          closeButton.addEventListener("click", closeMarkdownEditor);
        }

        for (const button of els.markdownEditorDrawer.querySelectorAll("[data-markdown-mode]")) {
          button.addEventListener("click", () => {
            if (button.disabled) return;
            setMarkdownEditorMode(button.dataset.markdownMode);
          });
        }

        els.markdownEditorDrawer.onkeydown = (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeMarkdownEditor();
            return;
          }
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            autoSaveNode(node.id).catch((error) => setStatus(error.message));
          }
        };

        const editor = els.markdownEditorDrawer.querySelector("#markdownContentEditor");
        if (!canEdit || !editor) return;

        editor.addEventListener("input", () => {
          getNodeDraft(node).content = editor.value;
          scheduleAutoSave(node.id);
          refreshMarkdownPreview(node.id, editor.value);
        });
        editor.addEventListener("blur", () => autoSaveNode(node.id).catch((error) => setStatus(error.message)));

        for (const button of els.markdownEditorDrawer.querySelectorAll("[data-md-insert]")) {
          button.addEventListener("click", () => {
            insertMarkdownAtCursor(button.getAttribute("data-md-insert") || "");
          });
        }

        for (const button of els.markdownEditorDrawer.querySelectorAll("[data-md-wrap]")) {
          button.addEventListener("click", () => {
            wrapMarkdownSelection(button.getAttribute("data-md-wrap") || "");
          });
        }

        const codeBlockButton = els.markdownEditorDrawer.querySelector('[data-md-action="code-block"]');
        if (codeBlockButton) {
          codeBlockButton.addEventListener("click", () => {
            const fence = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
            insertMarkdownAtCursor(fence + "\\ncode\\n" + fence, 4, 4);
          });
        }
      }

      function insertMarkdownAtCursor(text, selectOffset = null, selectLength = 0) {
        const editor = document.querySelector("#markdownContentEditor");
        if (!editor) return;
        const start = editor.selectionStart || 0;
        const end = editor.selectionEnd || start;
        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        const prefix = before && !before.endsWith("\\n") ? "\\n" : "";
        const suffix = after && !text.endsWith("\\n") ? "\\n" : "";
        editor.value = before + prefix + text + suffix + after;
        const cursorStart = before.length + prefix.length + (selectOffset === null ? text.length : selectOffset);
        const cursorEnd = selectOffset === null ? cursorStart : cursorStart + selectLength;
        editor.focus();
        editor.setSelectionRange(cursorStart, cursorEnd);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }

      function wrapMarkdownSelection(wrapper) {
        const editor = document.querySelector("#markdownContentEditor");
        if (!editor || !wrapper) return;
        const start = editor.selectionStart || 0;
        const end = editor.selectionEnd || start;
        const selected = editor.value.slice(start, end);
        const fallback = "文本";
        const nextText = selected || fallback;
        editor.value = editor.value.slice(0, start) + wrapper + nextText + wrapper + editor.value.slice(end);
        const nextStart = start + wrapper.length;
        const nextEnd = nextStart + nextText.length;
        editor.focus();
        editor.setSelectionRange(nextStart, nextEnd);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }

      function refreshMarkdownPreview(nodeId, markdown) {
        const previewHtml = markdownToHtml(markdown);
        const drawerPreview = document.querySelector("#markdownLivePreview");
        if (drawerPreview) drawerPreview.innerHTML = previewHtml;
        const nodePreview = els.tree.querySelector(
          '.node[data-node-id="' + cssEscape(nodeId) + '"] .node-markdown-preview-body'
        );
        if (nodePreview) nodePreview.innerHTML = previewHtml;
      }

      function markdownToHtml(markdown) {
        const source = String(markdown || "").replace(/\\r\\n/g, "\\n");
        if (!source.trim()) {
          return '<p class="markdown-empty">暂无内容，点击编辑 Markdown 开始记录。</p>';
        }

        const codeBlocks = [];
        const fencePattern = new RegExp("\\\\x60\\\\x60\\\\x60(?:[a-zA-Z0-9_-]+)?\\\\n?([\\\\s\\\\S]*?)\\\\x60\\\\x60\\\\x60", "g");
        const prepared = source.replace(fencePattern, (match, code) => {
          const token = "::CODE_BLOCK_" + codeBlocks.length + "::";
          codeBlocks.push("<pre><code>" + escapeHtml(String(code).replace(/\\n$/, "")) + "</code></pre>");
          return "\\n\\n" + token + "\\n\\n";
        });

        const html = prepared
          .split(/\\n{2,}/)
          .map((block) => renderMarkdownBlock(block, codeBlocks))
          .filter(Boolean)
          .join("");

        return html || '<p class="markdown-empty">暂无内容，点击编辑 Markdown 开始记录。</p>';
      }

      function renderMarkdownBlock(block, codeBlocks) {
        const trimmed = block.trim();
        if (!trimmed) return "";

        const codeMatch = trimmed.match(/^::CODE_BLOCK_(\\d+)::$/);
        if (codeMatch) return codeBlocks[Number(codeMatch[1])] || "";

        const lines = trimmed.split("\\n");
        if (lines.length >= 2 && looksLikeMarkdownTable(lines)) {
          return renderMarkdownTable(lines);
        }

        const heading = trimmed.match(/^(#{1,3})\\s+(.+)$/);
        if (heading) {
          const level = heading[1].length;
          return "<h" + level + ">" + renderInlineMarkdown(heading[2]) + "</h" + level + ">";
        }

        if (lines.every((line) => /^[-*]\\s+/.test(line.trim()))) {
          return "<ul>" + lines.map((line) => "<li>" + renderInlineMarkdown(line.trim().replace(/^[-*]\\s+/, "")) + "</li>").join("") + "</ul>";
        }

        if (lines.every((line) => /^\\d+[.)]\\s+/.test(line.trim()))) {
          return "<ol>" + lines.map((line) => "<li>" + renderInlineMarkdown(line.trim().replace(/^\\d+[.)]\\s+/, "")) + "</li>").join("") + "</ol>";
        }

        if (lines.every((line) => /^>\\s?/.test(line.trim()))) {
          const quote = lines.map((line) => line.trim().replace(/^>\\s?/, "")).join("<br />");
          return "<blockquote>" + renderInlineMarkdown(quote) + "</blockquote>";
        }

        return "<p>" + lines.map(renderInlineMarkdown).join("<br />") + "</p>";
      }

      function looksLikeMarkdownTable(lines) {
        if (!lines[0].includes("|") || !lines[1].includes("|")) return false;
        return /^\\s*\\|?\\s*:?-{3,}:?\\s*(\\|\\s*:?-{3,}:?\\s*)+\\|?\\s*$/.test(lines[1]);
      }

      function splitMarkdownTableRow(line) {
        return line
          .trim()
          .replace(/^\\|/, "")
          .replace(/\\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
      }

      function renderMarkdownTable(lines) {
        const headers = splitMarkdownTableRow(lines[0]);
        const rows = lines.slice(2).map(splitMarkdownTableRow);
        return (
          "<table><thead><tr>" +
          headers.map((header) => "<th>" + renderInlineMarkdown(header) + "</th>").join("") +
          "</tr></thead><tbody>" +
          rows
            .map((row) => "<tr>" + row.map((cell) => "<td>" + renderInlineMarkdown(cell) + "</td>").join("") + "</tr>")
            .join("") +
          "</tbody></table>"
        );
      }

      function renderInlineMarkdown(value) {
        let text = escapeHtml(value);
        text = text.replace(/\\x60([^\\x60]+)\\x60/g, "<code>$1</code>");
        text = text.replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
        text = text.replace(/(^|\\s)_([^_]+)_/g, "$1<em>$2</em>");
        text = text.replace(/\\[([^\\]]+)\\]\\(([^\\s)]+)\\)/g, (match, label, href) => {
          const safeHref = safeMarkdownUrl(href);
          if (!safeHref) return match;
          return '<a href="' + escapeHtml(safeHref) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
        });
        return text;
      }

      function safeMarkdownUrl(value) {
        const url = String(value || "").trim();
        if (/^https?:\\/\\//i.test(url) || url.startsWith("#") || url.startsWith("/")) {
          return url;
        }
        return "";
      }

      function renderNode(node, depth = 0) {
        const li = document.createElement("li");
        li.className = "tree-item";
        li.style.setProperty("--depth", String(depth));

        const branch = document.createElement("span");
        branch.className = "tree-branch";
        li.appendChild(branch);

        const shell = document.createElement("div");
        shell.className = "node-shell";

        const childCount = node.children ? node.children.length : 0;
        const childrenExpanded = isTreeExpanded(node, depth);
        const detailsExpanded = isDetailExpanded(node, depth);

        const childToggle = document.createElement("button");
        childToggle.type = "button";
        childToggle.className = "tree-toggle" + (childrenExpanded ? " expanded" : "") + (childCount === 0 ? " empty" : "");
        childToggle.setAttribute("aria-label", childCount > 0 ? "展开或收缩子节点" : "没有子节点");
        childToggle.setAttribute("aria-expanded", childrenExpanded ? "true" : "false");
        childToggle.disabled = childCount === 0;
        childToggle.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleNodeChildren(node, depth);
        });
        shell.appendChild(childToggle);

        const box = document.createElement("article");
        box.className = "node";
        box.dataset.nodeId = node.id;
        box.dataset.detailExpanded = detailsExpanded ? "true" : "false";
        const draft = getNodeDraft(node);

        const summary = document.createElement("div");
        summary.className = "node-summary";
        summary.tabIndex = 0;
        summary.setAttribute("role", "button");
        summary.setAttribute("aria-expanded", detailsExpanded ? "true" : "false");
        summary.addEventListener("click", (event) => {
          if (shouldIgnoreNodeSummaryClick(event)) return;
          toggleNodeDetails(node, depth);
        });
        summary.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggleNodeDetails(node, depth);
        });

        const typeBadge = document.createElement("span");
        typeBadge.className = "node-kind " + (node.type || "doc");
        typeBadge.textContent = nodeTypeAbbreviation(node.type);
        summary.appendChild(typeBadge);

        const titleBlock = document.createElement("div");
        titleBlock.className = "node-title";
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
          titleBlock.appendChild(titleInput);
        } else {
          const title = document.createElement("strong");
          title.textContent = node.title;
          titleBlock.appendChild(title);
        }

        const meta = document.createElement("div");
        meta.className = "node-meta-line";
        const idChip = document.createElement("span");
        idChip.className = "node-chip";
        idChip.textContent = node.id;
        const typeChip = document.createElement("span");
        typeChip.className = "node-chip";
        typeChip.textContent = nodeTypeLabel(node.type);
        const permissionChip = document.createElement("span");
        permissionChip.className = "node-chip";
        permissionChip.textContent = permissionText(node.permissions);
        const childChip = document.createElement("span");
        childChip.className = "node-child-count";
        childChip.textContent = childCount + " 个子节点";
        meta.appendChild(idChip);
        meta.appendChild(typeChip);
        meta.appendChild(permissionChip);
        meta.appendChild(childChip);
        titleBlock.appendChild(meta);
        summary.appendChild(titleBlock);

        const detailIndicator = document.createElement("span");
        detailIndicator.className = "node-expand-indicator";
        detailIndicator.setAttribute("aria-hidden", "true");
        summary.appendChild(detailIndicator);
        box.appendChild(summary);

        const detailShell = document.createElement("div");
        detailShell.className = "node-detail-shell" + (detailsExpanded ? " expanded" : "");
        const detailInner = document.createElement("div");
        detailInner.className = "node-detail-inner";

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
          detailInner.appendChild(policyPanel);
        }

        appendMarkdownPreview(detailInner, node, draft);

        if (node.permissions.canAddChild || node.permissions.canDelete) {
          const actions = document.createElement("div");
          actions.className = "node-actions";
          if (node.permissions.canAddChild) {
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "btn small secondary";
            addButton.textContent = "添加子节点";
            addButton.addEventListener("click", () =>
              addChildNode(node.id).catch((error) => {
                logOperationFailure({ type: "addNode", parentId: node.id, title: "子节点" }, error);
                setStatus(error.message);
              })
            );
            actions.appendChild(addButton);
          }
          if (node.permissions.canDelete) {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "btn small danger";
            deleteButton.textContent = "删除";
            deleteButton.addEventListener("click", () =>
              deleteTreeNode(node.id).catch((error) => {
                logOperationFailure({ type: "deleteNode", nodeId: node.id }, error);
                showNoticeDialog("操作失败", error.message);
              })
            );
            actions.appendChild(deleteButton);
          }
          detailInner.appendChild(actions);
        }

        detailShell.appendChild(detailInner);
        box.appendChild(detailShell);
        shell.appendChild(box);

        if (node.children && node.children.length > 0) {
          const childrenShell = document.createElement("div");
          childrenShell.className = "tree-children-shell" + (childrenExpanded ? " expanded" : "");
          const childrenInner = document.createElement("div");
          childrenInner.className = "tree-children-inner";
          const ul = document.createElement("ul");
          for (const child of node.children) ul.appendChild(renderNode(child, depth + 1));
          childrenInner.appendChild(ul);
          childrenShell.appendChild(childrenInner);
          shell.appendChild(childrenShell);
        }
        li.appendChild(shell);
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

        // 下拉框互斥：同时只能打开一个
        details.addEventListener("toggle", () => {
          if (details.open) {
            // 关闭用户管理区域其他下拉框
            const userRows = document.querySelector("#userRows");
            if (userRows) {
              for (const other of userRows.querySelectorAll(".multi-select")) {
                if (other !== details && other.open) {
                  other.open = false;
                }
              }
            }
          }
        });

        // 点击页面其他地方关闭用户管理下拉框
        if (!window.__customSelectGlobalClickBound) {
          window.__customSelectGlobalClickBound = true;
          document.addEventListener("click", (event) => {
            const target = event.target;
            if (!target || !target.closest) return;
            if (target.closest(".multi-select")) return;
            const userRows = document.querySelector("#userRows");
            if (!userRows) return;
            for (const detailsEl of userRows.querySelectorAll(".multi-select")) {
              if (detailsEl.open) {
                detailsEl.open = false;
              }
            }
          });
        }

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
        const next = els.tree.querySelector(selector) || document.querySelector(selector);
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
          operation,
          status: "pending",
          attempts: 0
        };
      }

      function isSocketOpen() {
        return state.socket && state.socket.readyState === WebSocket.OPEN;
      }

      function isConnectionUsable() {
        return (
          !state.offline.simulated &&
          state.offline.connectionStatus === "connected" &&
          isSocketOpen()
        );
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

      function queueStatsForCurrentUser() {
        const stats = {
          pending: 0,
          sending: 0,
          acked: 0,
          rejected: 0
        };
        for (const item of queueForCurrentUser()) {
          if (item.status === "sending") stats.sending += 1;
          else if (item.status === "acked") stats.acked += 1;
          else if (item.status === "rejected") stats.rejected += 1;
          else stats.pending += 1;
        }
        return stats;
      }

      function syncableQueueForCurrentUser() {
        const now = Date.now();
        return queueForCurrentUser()
          .filter((item) =>
            item.status === "pending" ||
            (item.status === "sending" && (!item.lastAttemptAt || now - item.lastAttemptAt > SEND_TIMEOUT_MS))
          )
          .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));
      }

      function markQueueItemsSending(items) {
        const now = Date.now();
        for (const item of items) {
          item.status = "sending";
          item.attempts = (item.attempts || 0) + 1;
          item.lastAttemptAt = now;
          delete item.error;
        }
        saveOfflineQueue();
      }

      function markQueueItemsAcked(ids) {
        const completed = new Set(ids);
        const now = Date.now();
        for (const item of state.offline.queue) {
          if (completed.has(item.id)) {
            item.status = "acked";
            item.ackedAt = now;
            delete item.error;
          }
        }
        compactOfflineQueue();
        saveOfflineQueue();
      }

      function markQueueItemsRejected(rejections) {
        const now = Date.now();
        for (const rejected of rejections || []) {
          const item = state.offline.queue.find((entry) => entry.id === rejected.id);
          if (!item) continue;
          item.status = "rejected";
          item.rejectedAt = now;
          item.error = rejected.error || {
            name: "Error",
            message: "服务器拒绝该操作"
          };
        }
        compactOfflineQueue();
        saveOfflineQueue();
      }

      function removeQueuedOperations(ids) {
        markQueueItemsAcked(ids);
      }

      function compactOfflineQueue() {
        const now = Date.now();
        state.offline.queue = state.offline.queue.filter((item) => {
          if (item.status !== "acked") return true;
          return !item.ackedAt || now - item.ackedAt <= ACK_RETENTION_MS;
        });

        const rejected = state.offline.queue
          .filter((item) => item.status === "rejected")
          .sort((left, right) => (right.rejectedAt || 0) - (left.rejectedAt || 0));
        const keepRejected = new Set(rejected.slice(0, MAX_REJECTED_ITEMS).map((item) => item.id));
        state.offline.queue = state.offline.queue.filter(
          (item) => item.status !== "rejected" || keepRejected.has(item.id)
        );
      }

      function canEnqueueOperation() {
        const activeCount = queueForCurrentUser().filter((item) => item.status !== "acked").length;
        if (activeCount >= MAX_QUEUE_SIZE) {
          setStatus("离线队列过长，请先恢复联网同步");
          return false;
        }
        return true;
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
          const rejectedMessage = formatDeleteRejectedMessage(impact);
          logOperationFailure({ type: "deleteNode", nodeId }, new Error(rejectedMessage));
          await showNoticeDialog("删除被拒绝", rejectedMessage);
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
        compactOfflineQueue();
        if (!canEnqueueOperation()) {
          saveOfflineQueue();
          renderSyncState();
          return;
        }
        const envelope = createEnvelope(operation);
        state.offline.queue.push(envelope);
        saveOfflineQueue();
        renderSyncState();
        const summary = formatViewOperation(operation, customLogTitle);
        appendOperationLog({
          kind: "local",
          operator: state.user ? state.user.name : "",
          title: summary.title,
          detail: summary.detail,
          coalesceKey: "local:" + operation.type + ":" + targetNodeIdFromOperation(operation)
        });
        renderOperationLogs();
        if (isConnectionUsable()) {
          sendQueuedOperation(envelope);
          setStatus("操作已发送，等待确认");
        } else if (state.offline.simulated) {
          setStatus("模拟离线中，操作已进入队列");
        } else {
          setStatus("WebSocket 离线，操作已进入队列");
        }
      }

      function sendQueuedOperation(envelope) {
        if (!isConnectionUsable()) return false;
        try {
          markQueueItemsSending([envelope]);
          state.socket.send(JSON.stringify({ type: "operation", envelope }));
          appendOperationLog({
            kind: "local",
            title: "操作已发送",
            detail: formatViewOperation(envelope.operation).title,
            coalesceKey: "sending:" + envelope.id
          });
          renderOperationLogs();
          return true;
        } catch (error) {
          envelope.status = "pending";
          envelope.error = {
            name: "SendError",
            message: error && error.message ? error.message : String(error)
          };
          saveOfflineQueue();
          return false;
        }
      }

      async function syncOfflineQueue(options) {
        if (!state.token) return setStatus("请先登录");
        if (state.offline.syncInFlight) return;
        const operations = syncableQueueForCurrentUser();
        if (operations.length === 0) {
          compactOfflineQueue();
          saveOfflineQueue();
          renderSyncState();
          return;
        }

        state.offline.syncInFlight = true;
        markQueueItemsSending(operations);
        renderSyncState();
        try {
          const body = await requestJson("/api/operations/batch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ operations })
          });
          markQueueItemsAcked([].concat(body.applied || [], body.skipped || []));
          markQueueItemsRejected(body.rejected || []);
          state.offline.lastSyncAt = Date.now();
          state.view = body.view;
          state.stateVector = body.stateVector || state.stateVector;
          await refreshSession();
          render();

          if (body.rejected && body.rejected.length > 0) {
            setStatus("同步完成，" + body.rejected.length + " 个操作被拒绝");
            appendOperationLog({
              kind: "remote",
              title: "离线队列同步部分完成",
              detail: operations.length + " 个操作中 " + body.rejected.length + " 个被拒绝",
              key: "remote:batch-partial:" + operations.map((envelope) => envelope.id).join("|")
            });
            for (const rejected of body.rejected) {
              const envelope = findQueuedEnvelope(rejected.id, operations);
              const failure = formatOperationFailure(
                envelope ? envelope.operation : null,
                rejected.error && rejected.error.message ? rejected.error : "服务器拒绝该操作"
              );
              failure.key = "failed:batch:" + (rejected.id || failure.title);
              appendOperationLog(failure);
            }
          } else if (!options || !options.silent) {
            setStatus("离线队列已同步");
            appendOperationLog({
              kind: "remote",
              title: "离线队列同步完成",
              detail: operations.length + " 个离线操作已确认",
              key: "remote:batch:" + operations.map((envelope) => envelope.id).join("|")
            });
          }
          renderOperationLogs();
        } catch (error) {
          for (const item of operations) {
            if (item.status === "sending") {
              item.status = "pending";
              item.error = {
                name: "SyncError",
                message: error && error.message ? error.message : String(error)
              };
            }
          }
          saveOfflineQueue();
          if (!options || !options.silent) {
            setStatus(error.message);
          }
        } finally {
          state.offline.syncInFlight = false;
          compactOfflineQueue();
          saveOfflineQueue();
          renderSyncState();
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
        state.offline.connectionStatus = state.offline.simulated ? "simulated-offline" : "offline";
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
        renderSyncState();
        if (message) {
          setStatus(message);
        }
      }

      function toggleSimulatedNetwork() {
        if (!state.token) return setStatus("请先登录");
        if (state.offline.simulated) {
          state.offline.simulated = false;
          state.offline.connectionStatus = "offline";
          appendOperationLog({
            kind: "local",
            title: "恢复联网",
            detail: "准备重连 WebSocket 并同步离线队列",
            key: "network:online:" + Date.now()
          });
          renderOperationLogs();
          renderSyncState();
          connectWebSocket();
          return;
        }
        state.offline.simulated = true;
        state.offline.connectionStatus = "simulated-offline";
        appendOperationLog({
          kind: "local",
          title: "模拟断网",
          detail: "已暂停 WebSocket 实时同步",
          key: "network:offline:" + Date.now()
        });
        renderOperationLogs();
        disconnectWebSocket("已切换为模拟离线，后续操作会进入离线队列");
      }

      function sendHeartbeat() {
        if (!state.token || state.offline.simulated || !isSocketOpen()) return;
        try {
          state.socket.send(JSON.stringify({ type: "ping" }));
        } catch {
          markConnectionStale("心跳发送失败，连接可能已失效");
        }
      }

      function markConnectionStale(message) {
        if (state.offline.simulated) return;
        if (state.offline.connectionStatus !== "stale") {
          appendOperationLog({
            kind: "failed",
            title: "心跳超时，进入离线",
            detail: message || "超过 " + Math.round(HEARTBEAT_TIMEOUT_MS / 1000) + " 秒未收到服务器响应",
            key: "network:stale:" + Date.now()
          });
          renderOperationLogs();
        }
        const socket = state.socket;
        state.socket = null;
        state.offline.connected = false;
        state.offline.connectionStatus = "stale";
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
        renderSyncState();
      }

      function checkHeartbeatTimeout() {
        if (!state.token || state.offline.simulated) return;
        if (!isSocketOpen()) return;
        if (!state.offline.lastPongAt) return;
        if (Date.now() - state.offline.lastPongAt > HEARTBEAT_TIMEOUT_MS) {
          markConnectionStale();
        }
      }

      function autoReconnectIfNeeded() {
        if (!state.token || state.offline.simulated || isSocketActive()) return;
        connectWebSocket({ auto: true });
      }

      async function autoSyncOfflineQueue() {
        compactOfflineQueue();
        saveOfflineQueue();
        renderSyncState();
        if (!isConnectionUsable()) return;
        if (syncableQueueForCurrentUser().length === 0) return;
        await syncOfflineQueue({ silent: true });
      }

      function connectWebSocket() {
        if (!state.token) return setStatus("请先登录");
        if (state.offline.simulated) return setStatus("当前处于模拟离线，请先点击恢复联网");
        if (isSocketActive()) return setStatus("WebSocket 已连接或正在连接");
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(protocol + "//" + location.host + "/ws?token=" + encodeURIComponent(state.token));
        state.socket = socket;
        state.offline.connected = false;
        state.offline.connectionStatus = "connecting";
        renderSyncState();
        setStatus("正在联网...");
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "pong") {
            state.offline.lastPongAt = Date.now();
            state.offline.connected = true;
            state.offline.connectionStatus = "connected";
            renderSyncState();
            syncOfflineQueue({ silent: true }).catch((error) => setStatus(error.message));
            return;
          }
          if (message.type === "view" || message.type === "operationApplied") {
            const appliedEnvelope = message.type === "operationApplied"
              ? findQueuedEnvelope(message.operationId)
              : null;
            state.view = message.view;
            state.stateVector = message.stateVector || state.stateVector;
            state.policyVersion = message.policyVersion || state.policyVersion;
            if (message.type === "operationApplied" && message.operationId) {
              removeQueuedOperations([message.operationId]);
            }
            // 只记录有 change 信息的远端消息（跳过无操作者的通用广播）
            const logEntry = formatRemoteOperationMessage(message, appliedEnvelope);
            if (logEntry) {
              appendOperationLog(logEntry);
              renderOperationLogs();
            }
            refreshSession()
              .catch((error) => setStatus(error.message))
              .finally(() => {
                render();
                setStatus("WebSocket 已更新视图");
              });
          }
          if (message.type === "error") {
            appendOperationLog({
              kind: "failed",
              title: "操作失败：" + message.error.message,
              detail: "服务端返回错误",
              coalesceKey: "failed:socket:" + message.error.message
            });
            renderOperationLogs();
            setStatus(message.error.message);
            if (message.error.name === "AuthenticationError") {
              logout();
            }
          }
        };
        socket.onopen = async () => {
          if (state.socket !== socket) return;
          state.offline.connected = false;
          state.offline.connectionStatus = "connecting";
          renderSyncState();
          setStatus("WebSocket 已连接，等待心跳确认");
          sendHeartbeat();
        };
        socket.onclose = (event) => {
          if (state.socket !== socket) return;
          state.socket = null;
          state.offline.connected = false;
          if (event.code === 4001) {
            setLoginStatus("该账号已在其他地方登录，当前会话已失效。");
            logout();
            return;
          }
          state.offline.connectionStatus = state.offline.simulated ? "simulated-offline" : "offline";
          renderSyncState();
          if (!state.offline.simulated) {
            setStatus("WebSocket 已断开");
          }
        };
        socket.onerror = () => {
          if (state.socket !== socket) return;
          state.socket = null;
          state.offline.connected = false;
          state.offline.connectionStatus = "offline";
          renderSyncState();
        };
      }

      els.connect.addEventListener("click", () => {
        toggleSimulatedNetwork();
      });

      window.setInterval(() => {
        sendHeartbeat();
        checkHeartbeatTimeout();
      }, HEARTBEAT_INTERVAL_MS);

      window.setInterval(() => {
        autoSyncOfflineQueue().catch((error) => setStatus(error.message));
      }, AUTO_SYNC_INTERVAL_MS);

      window.setInterval(() => {
        autoReconnectIfNeeded();
      }, RECONNECT_INTERVAL_MS);

      window.localStorage.removeItem("crdt-editor-session-token-v1");
      render();
    </script>
  </body>
</html>`;
}
