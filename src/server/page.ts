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
      --success: #22c55e;
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

    /* ── Online presence badge (topbar center) ── */
    .topbar-center {
      position: absolute; left: 50%; transform: translateX(-50%);
      pointer-events: none;
    }
    .online-count-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 16px; border-radius: 999px;
      background: rgba(22, 163, 74, 0.08); border: 1px solid rgba(22, 163, 74, 0.2);
      font-size: 13px; font-weight: 600;
      pointer-events: auto;
    }
    .online-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: var(--success, #16a34a);
      animation: presence-pulse 2s ease-in-out infinite;
      flex-shrink: 0;
    }
    .online-count-text {
      color: var(--success, #16a34a);
    }
    @keyframes presence-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
      50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(22,163,74,0); }
    }

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
    .avatar-lg {
      width: 64px; height: 64px; font-size: 24px;
    }

    /* ── User dropdown ── */
    .user-pill { position: relative; cursor: pointer; }
    .user-dropdown {
      position: absolute; top: calc(100% + 6px); right: 0; z-index: 100;
      min-width: 160px; padding: 6px; border-radius: var(--radius-md);
      background: var(--surface-solid); border: 1px solid var(--line);
      box-shadow: var(--shadow-soft);
      opacity: 0; visibility: hidden; transform: translateY(-6px);
      transition: opacity .16s ease, transform .16s ease, visibility .16s;
      pointer-events: none;
    }
    .user-pill:hover .user-dropdown,
    .user-dropdown.show {
      opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto;
    }
    .user-dropdown-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 9px 12px; border: 0; border-radius: var(--radius-sm);
      background: transparent; color: var(--text); font-size: 13px; font-weight: 500;
      cursor: pointer; text-align: left; transition: background .12s ease;
    }
    .user-dropdown-item:hover { background: var(--surface-2); color: var(--brand); }
    .user-dropdown-sep { height: 1px; margin: 4px 8px; background: var(--line); }

    /* ── Settings modal ── */
    .settings-card {
      width: min(620px, 100%); height: 460px; max-height: 80vh; overflow: hidden;
      display: flex; flex-direction: column;
    }
    .settings-close {
      position: absolute; top: 16px; right: 16px; z-index: 1;
      width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--line);
      background: var(--surface-solid); color: var(--muted); font-size: 14px;
      cursor: pointer; display: grid; place-items: center;
      transition: color .14s ease, border-color .14s ease;
    }
    .settings-close:hover { color: var(--text); border-color: var(--muted); }
    .settings-layout { display: flex; flex: 1; overflow: hidden; }
    .settings-sidebar {
      width: 170px; flex: 0 0 170px; border-right: 1px solid var(--line);
      padding: 8px; display: flex; flex-direction: column; gap: 4px;
      background: var(--surface-2); border-radius: var(--radius-lg) 0 0 var(--radius-lg);
    }
    .settings-tab {
      width: 100%; padding: 10px 12px; border: 0; border-radius: var(--radius-sm);
      background: transparent; color: var(--muted); font-size: 13px; font-weight: 600;
      text-align: left; cursor: pointer; transition: all .14s ease;
    }
    .settings-tab:hover { background: var(--surface-solid); color: var(--text); }
    .settings-tab.active {
      background: var(--surface-solid); color: var(--brand);
      box-shadow: inset 3px 0 0 var(--brand);
    }
    .settings-content {
      flex: 1; padding: 24px 28px; overflow-y: auto; display: grid;
      align-content: start; gap: 20px;
    }
    .settings-panel { display: grid; gap: 20px; }
    .settings-panel.hidden { display: none; }
    .settings-panel h3 {
      margin: 0 0 -8px; font-size: 17px; font-weight: 750; color: var(--text);
    }
    .settings-section {
      display: grid; gap: 6px;
    }
    .settings-section label {
      display: grid; gap: 5px; font-size: 12px; color: var(--muted); font-weight: 700;
    }
    .settings-section label .hint { font-weight: 400; color: var(--muted); }
    .settings-row {
      display: flex; align-items: center; gap: 10px;
    }
    .settings-row input { flex: 1; }
    .settings-row button { width: auto; flex: 0 0 auto; }
    .settings-section input {
      width: 100%; min-height: 38px; border: 1px solid var(--line); border-radius: 11px;
      padding: 8px 12px; background: var(--surface-solid); color: var(--text);
      font-size: 13px; outline: none;
      transition: border-color .14s ease, box-shadow .14s ease;
    }
    .settings-section input:focus {
      border-color: color-mix(in srgb, var(--brand) 70%, white);
      box-shadow: 0 0 0 3px rgba(79,70,229,.10);
    }
    .settings-section input:disabled {
      opacity: 0.55; background: var(--surface-2); color: var(--muted);
      cursor: not-allowed;
    }

    /* ── Toggle switch ── */
    .toggle-switch {
      position: relative; display: inline-block; width: 46px; height: 26px; flex: 0 0 auto;
    }
    .toggle-switch input { display: none; }
    .toggle-slider {
      position: absolute; inset: 0; border-radius: 26px; background: var(--line);
      cursor: pointer; transition: background .18s ease;
    }
    .toggle-slider::after {
      content: ""; position: absolute; top: 3px; left: 3px;
      width: 20px; height: 20px; border-radius: 50%;
      background: var(--surface-solid); box-shadow: 0 2px 6px rgba(0,0,0,.12);
      transition: transform .18s ease;
    }
    .toggle-switch input:checked + .toggle-slider {
      background: linear-gradient(135deg, var(--brand), var(--brand-2));
    }
    .toggle-switch input:checked + .toggle-slider::after {
      transform: translateX(20px);
    }

    /* ── Avatar editor ── */
    .avatar-editor {
      display: flex; align-items: center; gap: 14px;
    }
    .avatar-editor .avatar {
      cursor: pointer; transition: transform .14s ease;
    }
    .avatar-editor .avatar:hover { transform: scale(1.08); }
    .avatar-editor .hint { color: var(--muted); font-size: 12px; }

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
    .section-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .section-head.compact { margin-bottom: 24px; }
    .section-head h3 { margin: 0 0 6px; font-size: 20px; letter-spacing: -.03em; }
    .section-head p { margin: 0; color: var(--muted); line-height: 1.6; font-size: 13px; }

    /* ── Log limit selector ── */
    .log-limit-select { position: relative; flex: 0 0 auto; }
    .log-limit-select summary {
      display: grid; place-items: center;
      width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 10px;
      background: var(--surface-solid); color: var(--muted); font-size: 16px;
      cursor: pointer; list-style: none; line-height: 1;
    }
    .log-limit-select summary::-webkit-details-marker { display: none; }
    .log-limit-select summary:hover { border-color: var(--muted); color: var(--text); }
    .log-limit-select[open] summary { border-color: var(--brand); color: var(--brand); }
    .log-limit-menu {
      position: absolute; top: calc(100% + 4px); right: 0; z-index: 100;
      min-width: 130px; padding: 4px; border-radius: var(--radius-sm);
      background: var(--surface-solid); border: 1px solid var(--line);
      box-shadow: var(--shadow-soft); display: grid; gap: 1px;
    }
    .log-limit-option {
      width: 100%; padding: 7px 10px; border: 0; border-radius: 8px;
      background: transparent; color: var(--text); font-size: 12px; font-weight: 500;
      text-align: left; cursor: pointer; transition: background .1s ease;
    }
    .log-limit-option:hover { background: var(--surface-2); color: var(--brand); }
    .log-limit-option.active { color: var(--brand); font-weight: 700; }

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

    /* ── Indicator column: expand arrow + presence icon stacked ── */
    .node-indicator-col {
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      align-self: start;
    }
    .node-presence-icon {
      display: flex; align-items: center; justify-content: center;
      position: relative;
      width: 28px; height: 28px; cursor: default;
    }
    .node-presence-icon::before {
      content: "👤"; font-size: 14px; line-height: 1;
    }
    .presence-dot {
      position: absolute; bottom: -1px; right: -1px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #9ca3af; /* gray = no one editing */
      border: 1.5px solid var(--bg, #fff);
      transition: background 0.25s ease;
    }
    .presence-dot.active {
      background: var(--success, #16a34a); /* green = someone is editing */
      box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.25);
    }
    /* ── Global presence tooltip (body-level, escapes node overflow) ── */
    .presence-tooltip {
      display: none; position: fixed; z-index: 100000;
      min-width: 140px; padding: 6px; border-radius: 12px;
      background: var(--surface-solid, #fff); border: 1px solid var(--line, #e5e7eb);
      box-shadow: 0 10px 30px rgba(0,0,0,0.18);
      white-space: nowrap; pointer-events: none;
    }
    .presence-tooltip.show {
      display: block;
    }
    .presence-user-row {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 8px; border-radius: 8px; font-size: 12px;
    }
    .presence-user-row + .presence-user-row {
      margin-top: 2px;
    }
    .presence-empty-hint {
      color: var(--muted); font-size: 12px; padding: 6px 4px;
      text-align: center;
    }
    .presence-user-avatar {
      width: 22px; height: 22px; border-radius: 50%;
      display: grid; place-items: center;
      color: #fff; font-size: 10px; font-weight: 700; flex-shrink: 0;
    }
    .presence-user-name {
      color: var(--text, #1f2937); font-weight: 500;
    }

    .node-expand-indicator {
      width: 28px; height: 28px; border-radius: 10px;
      display: grid; place-items: center; color: var(--muted);
      background: var(--surface-2); border: 1px solid var(--line);
      transition: transform .2s ease, color .2s ease, background .2s ease;
      flex-shrink: 0;
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
    .task-attrs-panel,
    .module-filter-panel {
      display: grid; gap: 10px; padding: 12px 14px;
      border: 1px solid var(--line); border-radius: 16px; background: var(--surface-solid);
      box-shadow: 0 10px 24px rgba(35,45,90,.05);
    }
    .task-attrs-grid,
    .module-filter-grid,
    .module-stat-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;
    }
    .task-attrs-panel label,
    .module-filter-panel label {
      display: grid; gap: 5px; color: var(--muted); font-size: 12px; font-weight: 800;
    }
    .task-attrs-panel input,
    .task-attrs-panel select,
    .module-filter-panel input,
    .module-filter-panel select {
      width: 100%; min-height: 34px; border: 1px solid var(--line); border-radius: 11px;
      padding: 7px 9px; background: var(--surface-solid); color: var(--text); font-size: 13px;
    }
    .task-attrs-panel .multi-select summary,
    .module-filter-panel .multi-select summary {
      min-height: 34px; border-radius: 11px; padding: 7px 9px; font-size: 13px;
      background-position: right 9px center; padding-right: 30px;
    }
    .task-attrs-panel .multi-select-menu,
    .module-filter-panel .multi-select-menu {
      border-radius: 11px; font-size: 13px;
    }
    .task-attrs-panel .multi-select-option,
    .module-filter-panel .multi-select-option {
      padding: 6px 8px; font-size: 13px;
    }
    .module-stat {
      display: grid; gap: 2px; padding: 8px 10px; border-radius: 12px;
      background: var(--surface-2); border: 1px solid var(--line);
    }
    .module-stat span { color: var(--muted); font-size: 11px; font-weight: 800; }
    .module-stat strong { font-size: 14px; }
    .module-batch-panel {
      display: grid; gap: 10px; padding-top: 10px; border-top: 1px solid var(--line);
    }
    .module-batch-row {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center;
    }
    .module-batch-row .btn { width: auto; min-height: 34px; padding: 6px 10px; }
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
      position: relative; border-left: 1px solid var(--line);
      background: color-mix(in srgb, var(--surface-solid) 88%, var(--surface-2));
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
    .markdown-body[data-md-preview-editable="true"] {
      min-height: 120px; border-radius: 14px; outline: none; cursor: text;
      transition: background .16s ease, box-shadow .16s ease;
    }
    .markdown-body[data-md-preview-editable="true"]:focus {
      background: color-mix(in srgb, var(--surface-solid) 82%, var(--surface-2));
      box-shadow: inset 0 0 0 2px rgba(79,70,229,.36);
    }
    .node-markdown-preview-body[data-md-preview-editable="true"] {
      padding: 8px; margin: -8px; padding-right: 8px;
    }
    .markdown-body[data-md-preview-editable="true"][data-empty="true"]::before {
      content: attr(data-placeholder); color: var(--muted); font-size: 13px;
    }
    .markdown-body[data-md-preview-editable="true"] a { cursor: text; }
    .markdown-body > *:first-child { margin-top: 0; }
    .markdown-body > *:last-child { margin-bottom: 0; }
    .markdown-body h1,
    .markdown-body h2,
    .markdown-body h3,
    .markdown-body h4,
    .markdown-body h5 { margin: 18px 0 10px; line-height: 1.28; color: var(--text); }
    .markdown-body h1 { font-size: 24px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
    .markdown-body h2 { font-size: 20px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
    .markdown-body h3 { font-size: 16px; }
    .markdown-body h4 { font-size: 15px; }
    .markdown-body h5 { font-size: 14px; color: var(--muted); }
    .markdown-body p { margin: 9px 0; }
    .markdown-body ul,
    .markdown-body ol { margin: 9px 0; padding-left: 24px; }
    .markdown-body li { margin: 4px 0; }
    .markdown-body .markdown-task-list { padding-left: 4px; list-style: none; }
    .markdown-body .markdown-task-list li {
      display: flex; align-items: flex-start; gap: 8px;
    }
    .markdown-task-checkbox {
      width: 14px; height: 14px; flex: 0 0 auto; margin-top: .32em;
      border: 1.5px solid var(--muted); border-radius: 4px; background: var(--surface-solid);
    }
    .markdown-task-list li[data-md-task-checked="true"] .markdown-task-checkbox {
      border-color: var(--brand); background: rgba(79,70,229,.16);
    }
    .markdown-body blockquote {
      margin: 12px 0; padding: 8px 12px; border-left: 4px solid var(--brand);
      color: var(--muted); background: rgba(79,70,229,.08); border-radius: 0 12px 12px 0;
    }
    .markdown-highlight-block {
      margin: 12px 0; padding: 10px 12px; border: 1px solid rgba(217,119,6,.22);
      border-radius: 12px; background: rgba(245,158,11,.15); color: var(--text);
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
    .markdown-block-menu-trigger {
      position: fixed; z-index: 90; width: 28px; height: 28px; border-radius: 8px;
      display: grid; place-items: center; border: 1px solid var(--line);
      color: var(--muted); background: var(--surface-solid); box-shadow: 0 8px 22px rgba(35,45,90,.13);
    }
    .markdown-block-menu-trigger:hover,
    .markdown-block-menu-trigger.active { color: var(--brand); border-color: rgba(79,70,229,.32); }
    .markdown-block-menu-panel {
      position: fixed; z-index: 91; width: 252px; padding: 10px;
      border: 1px solid var(--line); border-radius: 14px; background: var(--surface-solid);
      box-shadow: var(--shadow-soft);
    }
    .markdown-block-menu-grid {
      display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px;
    }
    .markdown-block-menu-option {
      min-width: 0; min-height: 34px; border-radius: 9px; padding: 6px;
      display: grid; place-items: center; color: var(--text); background: transparent;
      font-size: 13px; font-weight: 800;
    }
    .markdown-block-menu-option:hover { background: var(--surface-2); color: var(--brand); }
    .markdown-block-menu-wide {
      grid-column: span 2; justify-items: start; padding-inline: 9px; font-weight: 700;
    }
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
    <div id="presenceTooltip" class="presence-tooltip"></div>
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
        <button class="btn small app-mode-only" id="undoBtn" title="撤销 (Ctrl+Z)" disabled>↶ 撤销</button>
        <button class="btn small app-mode-only" id="redoBtn" title="重做 (Ctrl+Y)" disabled>↷ 重做</button>
        <button class="icon-btn" id="themeToggle" title="切换主题" onclick="document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; this.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾';">☾</button>
        <div class="user-pill app-mode-only" id="headerUserPill">
          <span class="avatar" id="headerAvatar">U</span>
          <span class="small-text strong" id="headerSession">未登录</span>
          <div class="user-dropdown" id="userDropdown">
            <button class="user-dropdown-item" id="settingsBtn">⚙ 账号管理</button>
            <div class="user-dropdown-sep"></div>
            <button class="user-dropdown-item" id="switchAccountBtn">↪ 切换账号</button>
          </div>
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
          <button class="nav-item" id="syncOffline"><span>↥</span>同步离线操作</button>
        </div>
        <div class="status" id="status" style="color: var(--muted); font-size: 12px; margin-top: 8px;"></div>

      </aside>

      <section class="content employee-content">
        <div id="userManagement" class="section-card glass admin-panel hidden" aria-hidden="true" style="margin-bottom: 18px; position: relative; z-index: 10;">
          <div class="section-head compact">
            <div>
              <h3>用户管理</h3>
              <p>管理系统中的用户身份，节点权限由角色与 ACL 配置共同决定。</p>
            </div>
          </div>
          <div class="user-table-wrap" style="margin-top: 8px;">
            <table class="user-table" style="width: 100%; font-size: 13px; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--line);">
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">显示名称</th>
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">用户名</th>
                  <th style="padding: 10px 14px; color: var(--muted); font-weight: 600;">当前身份</th>
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
              <button id="addRootNode" type="button" class="btn small secondary hidden">添加一级节点</button>
            </div>
            <ul id="tree" class="tree tree-workspace"></ul>
          </section>

          <aside class="section-card glass employee-log-card">
            <div class="section-head compact">
              <div>
                <h3>操作日志</h3>
                <p>记录本地视图操作、同步状态和后端合并结果。</p>
              </div>
              <details class="log-limit-select" id="logLimitSelect">
                <summary id="logLimitSummary" title="显示 20 条">☰</summary>
                <div class="log-limit-menu" id="logLimitMenu"></div>
              </details>
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

    <div id="confirmDialog" class="modal hidden" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true">
        <h2 id="confirmDialogTitle" class="modal-title">确认操作</h2>
        <p id="confirmDialogCopy" class="modal-copy"></p>
        <div class="modal-actions">
          <button id="confirmDialogCancel" type="button" class="btn secondary">取消</button>
          <button id="confirmDialogOk" type="button" class="btn primary">确定</button>
        </div>
      </div>
    </div>

    <div id="addNodeDialog" class="modal hidden" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true">
        <h2 class="modal-title">添加任务节点</h2>
        <p id="addNodeParentInfo" class="modal-copy"></p>
        <div style="display:grid;gap:14px;">
          <label style="display:grid;gap:5px;font-size:12px;color:var(--muted);font-weight:700;">
            <span>节点名称</span>
            <input id="addNodeTitle" type="text" placeholder="输入节点名称" style="width:100%;min-height:38px;border:1px solid var(--line);border-radius:11px;padding:8px 12px;background:var(--surface-solid);color:var(--text);font-size:13px;outline:none;">
          </label>
          <div id="addNodeAclArea"></div>
        </div>
        <div class="modal-actions">
          <button id="addNodeDialogCancel" type="button" class="btn secondary">取消</button>
          <button id="addNodeDialogOk" type="button" class="btn primary">确定</button>
        </div>
      </div>
    </div>

    <div id="settingsDialog" class="modal hidden" aria-hidden="true">
      <div class="modal-card settings-card" role="dialog" aria-modal="true">
        <button class="settings-close" id="settingsClose" type="button" title="关闭">✕</button>
        <div class="settings-layout">
          <div class="settings-sidebar">
            <button class="settings-tab active" data-tab="general">通用设置</button>
            <button class="settings-tab" data-tab="account">账号与安全</button>
          </div>
          <div class="settings-content">
            <div class="settings-panel" id="settingsPanelGeneral">
              <h3>外观</h3>
              <div class="settings-section">
                <div class="settings-row">
                  <label style="flex:1;"><span>深色模式</span><span class="hint">切换浅色 / 深色主题</span></label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="darkModeToggle">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <h3>偏好</h3>
              <div class="settings-section">
                <label>
                  <span>界面语言</span>
                  <select disabled style="width:100%;min-height:38px;border:1px solid var(--line);border-radius:11px;padding:8px 12px;background:var(--surface-2);color:var(--muted);font-size:13px;cursor:not-allowed;opacity:0.55;">
                    <option selected>简体中文</option>
                  </select>
                  <span class="hint" style="font-weight:400;">更多语言将在后续版本支持</span>
                </label>
              </div>
              <h3>数据</h3>
              <div class="settings-section">
                <div class="settings-row">
                  <label style="flex:1;"><span>清除本地缓存</span><span class="hint">移除离线操作队列和草稿数据</span></label>
                  <button class="btn small secondary" id="clearCacheBtn">清除缓存</button>
                </div>
              </div>
            </div>
            <div class="settings-panel hidden" id="settingsPanelAccount">
              <h3>头像</h3>
              <div class="settings-section">
                <div class="avatar-editor">
                  <span class="avatar avatar-lg" id="settingsAvatar" title="点击上传头像图片">U</span>
                  <input type="file" accept="image/*" id="avatarFileInput" style="display:none;">
                  <div>
                    <button class="btn small secondary" id="uploadAvatarBtn">上传图片</button>
                    <button class="btn small" id="removeAvatarBtn" style="margin-left:6px;">移除自定义头像</button>
                    <div class="hint" style="margin-top:4px;">支持 JPG / PNG，图片将被缩放至 128×128</div>
                  </div>
                </div>
              </div>
              <h3>个人信息</h3>
              <div class="settings-section">
                <label>
                  <span>用户名</span>
                  <input id="settingsUsername" type="text" disabled>
                </label>
                <label>
                  <span>昵称</span>
                  <div class="settings-row">
                    <input id="settingsName" type="text" placeholder="输入新的昵称">
                    <button class="btn small primary" id="saveNameBtn">保存</button>
                  </div>
                </label>
              </div>
              <h3>修改密码</h3>
              <div class="settings-section">
                <label>
                  <span>当前密码</span>
                  <input id="settingsCurrentPassword" type="password" placeholder="输入当前密码">
                </label>
                <label>
                  <span>新密码</span>
                  <input id="settingsNewPassword" type="password" placeholder="输入新密码">
                </label>
                <label>
                  <span>确认新密码</span>
                  <input id="settingsConfirmPassword" type="password" placeholder="再次输入新密码">
                </label>
                <button class="btn primary" id="changePasswordBtn" style="width:auto;justify-self:start;">修改密码</button>
              </div>
              <span id="settingsProfileStatus" style="font-size:12px;color:var(--muted);margin-top:4px;"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="markdownDrawerBackdrop" class="markdown-drawer-backdrop hidden" aria-hidden="true">
      <aside id="markdownEditorDrawer" class="markdown-drawer" role="dialog" aria-modal="true" aria-labelledby="markdownDrawerTitle"></aside>
    </div>
    <button id="markdownBlockMenuTrigger" class="markdown-block-menu-trigger hidden" type="button" title="块格式" aria-label="块格式">⋮</button>
    <div id="markdownBlockMenuPanel" class="markdown-block-menu-panel hidden" role="menu" aria-label="Markdown 块格式">
      <div class="markdown-block-menu-grid">
        <button type="button" class="markdown-block-menu-option" data-md-block-format="paragraph" role="menuitem" title="正文">T</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="h1" role="menuitem" title="一级标题">H1</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="h2" role="menuitem" title="二级标题">H2</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="h3" role="menuitem" title="三级标题">H3</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="h4" role="menuitem" title="四级标题">H4</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="h5" role="menuitem" title="五级标题">H5</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="bullet-list" role="menuitem" title="项目列表">•</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="ordered-list" role="menuitem" title="编号列表">1.</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="todo-list" role="menuitem" title="待办列表">☑</button>
        <button type="button" class="markdown-block-menu-option" data-md-block-format="quote" role="menuitem" title="引用文字">❞</button>
        <button type="button" class="markdown-block-menu-option markdown-block-menu-wide" data-md-block-format="highlight" role="menuitem" title="高亮块">高亮</button>
        <button type="button" class="markdown-block-menu-option markdown-block-menu-wide" data-md-block-format="code-block" role="menuitem" title="代码块">&lt;/&gt;</button>
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
        onlineUsers: [],
        onlineCountPolled: 0,
        presence: {
          focusedNodeId: null,
          _sendTimer: null
        },
        editing: {
          timers: {},
          drafts: {},
          filterTimer: null
        },
        treeUi: {
          expandedDetailNodeIds: {},
          expandedTreeNodeIds: {},
          taskFilters: {}
        },
        markdownEditor: {
          activeNodeId: null,
          mode: "write"
        },
        offline: {
          connected: false,
          connectionStatus: "offline",
          lastPongAt: 0,
          lastSyncAt: 0,
          reconnectingFromFailure: false,
          syncInFlight: false,
          queue: loadStoredOfflineQueue()
        },
        localLog: [],
        remoteLog: [],
        undo: {
          canUndo: false,
          canRedo: false,
          undoCount: 0,
          redoCount: 0,
          undoInFlight: false,
          redoInFlight: false
        }
      };

      const els = {
        topbarCenter: document.querySelector(".topbar-center"),
        presenceTooltip: document.querySelector("#presenceTooltip"),
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
        addRootNode: document.querySelector("#addRootNode"),
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
        markdownBlockMenuTrigger: document.querySelector("#markdownBlockMenuTrigger"),
        markdownBlockMenuPanel: document.querySelector("#markdownBlockMenuPanel"),
        localLogList: document.querySelector("#localLogList"),
        remoteLogList: document.querySelector("#remoteLogList"),
        logLimitSelect: document.querySelector("#logLimitSelect"),
        logLimitSummary: document.querySelector("#logLimitSummary"),
        logLimitMenu: document.querySelector("#logLimitMenu"),
        undoBtn: document.querySelector("#undoBtn"),
        redoBtn: document.querySelector("#redoBtn"),
        headerAvatar: document.querySelector("#headerAvatar"),
        headerPill: document.querySelector("#headerUserPill"),
        userDropdown: document.querySelector("#userDropdown"),
        settingsBtn: document.querySelector("#settingsBtn"),
        switchAccountBtn: document.querySelector("#switchAccountBtn"),
        settingsDialog: document.querySelector("#settingsDialog"),
        settingsClose: document.querySelector("#settingsClose"),
        settingsPanelGeneral: document.querySelector("#settingsPanelGeneral"),
        settingsPanelAccount: document.querySelector("#settingsPanelAccount"),
        darkModeToggle: document.querySelector("#darkModeToggle"),
        settingsAvatar: document.querySelector("#settingsAvatar"),
        settingsUsername: document.querySelector("#settingsUsername"),
        settingsName: document.querySelector("#settingsName"),
        saveNameBtn: document.querySelector("#saveNameBtn"),
        settingsCurrentPassword: document.querySelector("#settingsCurrentPassword"),
        settingsNewPassword: document.querySelector("#settingsNewPassword"),
        settingsConfirmPassword: document.querySelector("#settingsConfirmPassword"),
        changePasswordBtn: document.querySelector("#changePasswordBtn"),
        settingsProfileStatus: document.querySelector("#settingsProfileStatus"),
        clearCacheBtn: document.querySelector("#clearCacheBtn"),
        confirmDialog: document.querySelector("#confirmDialog"),
        confirmDialogTitle: document.querySelector("#confirmDialogTitle"),
        confirmDialogCopy: document.querySelector("#confirmDialogCopy"),
        confirmDialogCancel: document.querySelector("#confirmDialogCancel"),
        confirmDialogOk: document.querySelector("#confirmDialogOk"),
        addNodeDialog: document.querySelector("#addNodeDialog"),
        addNodeParentInfo: document.querySelector("#addNodeParentInfo"),
        addNodeTitle: document.querySelector("#addNodeTitle"),
        addNodeAclArea: document.querySelector("#addNodeAclArea"),
        addNodeDialogCancel: document.querySelector("#addNodeDialogCancel"),
        addNodeDialogOk: document.querySelector("#addNodeDialogOk"),
        avatarFileInput: document.querySelector("#avatarFileInput"),
        uploadAvatarBtn: document.querySelector("#uploadAvatarBtn"),
        removeAvatarBtn: document.querySelector("#removeAvatarBtn")
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
      const LOG_LIMIT_OPTIONS = [
        { value: 0, label: "不显示" },
        { value: 5, label: "显示 5 条" },
        { value: 10, label: "显示 10 条" },
        { value: 20, label: "显示 20 条" },
        { value: Infinity, label: "完全显示" }
      ];
      let activeMarkdownBlockMenuTarget = null;

      function loadLogLimit() {
        const raw = window.localStorage.getItem("crdt-log-limit");
        if (raw) {
          const parsed = Number(raw);
          if (parsed === 0) return 0;
          if (parsed === 5) return 5;
          if (parsed === 10) return 10;
          if (parsed === 20) return 20;
          if (!Number.isFinite(parsed) || parsed < 0) return Infinity;
        }
        return 20; // default
      }

      function saveLogLimit(limit) {
        window.localStorage.setItem("crdt-log-limit", String(limit));
      }

      let operationLogLimit = loadLogLimit();
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

      function resetOperationLogs() {
        state.localLog = [];
        state.remoteLog = [];
        operationLogKeys.clear();
        renderOperationLogs();
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
        const rawBody = await response.text();
        let body = {};
        if (rawBody.trim()) {
          try {
            body = JSON.parse(rawBody);
          } catch (error) {
            if (isLikelyNetworkError(error)) {
              throw error;
            }
            throw new TypeError("Network response ended before a valid JSON body was available.");
          }
        } else if (!response.ok) {
          body = {
            ok: false,
            error: {
              name: "NetworkError",
              message: "Network response ended before a valid JSON body was available."
            }
          };
        } else {
          throw new TypeError("Network response ended before a valid JSON body was available.");
        }
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
        resetOperationLogs();
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
          state.offline.connectionStatus = "offline";
          state.offline.lastPongAt = 0;
          state.offline.lastSyncAt = 0;
          state.offline.syncInFlight = false;
          clearAllAutoSaveTimers();
          state.editing.drafts = {};
          state.markdownEditor.activeNodeId = null;
          resetOperationLogs();

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
        resetOperationLogs();

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
        if (els.localLogList) {
          els.localLogList.innerHTML = formatLog(localLogWithQueueEntries(), "还没有本地编辑。");
        }
        if (els.remoteLogList) els.remoteLogList.innerHTML = formatLog(state.remoteLog, "等待后端返回或 WebSocket 更新。");
      }

      function localLogWithQueueEntries() {
        const entries = state.localLog.slice();
        const existingKeys = new Set(entries.map((entry) => entry.key).filter(Boolean));
        for (const item of queueForCurrentUser()) {
          if (item.status !== "pending" && item.status !== "sending") continue;
          const key = "queue-visible:" + item.id + ":" + item.status;
          if (existingKeys.has(key)) continue;
          const summary = formatViewOperation(item.operation);
          entries.push({
            kind: "local",
            operator: state.user ? state.user.name : "",
            title: (item.status === "sending" ? "正在发送：" : "等待同步：") + summary.title,
            detail: summary.detail || (item.status === "sending" ? "等待服务端确认" : "操作已保留在离线队列"),
            time: new Date(item.createdAt || Date.now()).toLocaleTimeString("zh-CN", { hour12: false }),
            createdAt: item.createdAt || Date.now(),
            key,
            coalesceKey: ""
          });
        }
        return entries;
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
          if (operation.parentId === null) {
            return {
              title: "新增一级节点「" + childTitle + "」",
              detail: "添加到项目空间根部"
            };
          }
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
        // Handle undo/redo prefixes: "undo:renameNode" → "撤销重命名节点"
        if (operationType && typeof operationType === "string") {
          if (operationType.startsWith("undo:")) {
            return "撤销" + operationLabel(operationType.slice(5));
          }
          if (operationType.startsWith("redo:")) {
            return "重做" + operationLabel(operationType.slice(5));
          }
        }
        const labels = {
          addNode: "新增子节点",
          deleteNode: "删除节点",
          deleteNodeKeepChildren: "删除节点（保留子节点）",
          renameNode: "重命名节点",
          updateContent: "修改节点内容",
          updateAcl: "修改节点权限",
          updateAttrs: "修改节点属性",
          resurrectNode: "删除节点",
          resurrectNodeKeepChildren: "删除节点（保留子节点）"
        };
        return labels[operationType] || ("操作「" + operationType + "」");
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
          // Resolve node title from the current view for undo/redo operations
          const nodeTitle = c.nodeTitle || resolveNodeTitle(c.nodeId);
          const detail = nodeTitle && nodeTitle !== c.nodeId
            ? "「" + nodeTitle + "」"
            : (c.nodeId ? "节点: " + c.nodeId : "");
          return {
            kind: "remote",
            operator: c.userName,
            title: desc,
            detail: detail,
            key: "remote:view:" + (c.userId || "") + ":" + (c.operationType || "") + ":" + (message.stateVector || Date.now())
          };
        }

        // 无 change 信息的 view 消息（如初始连接或 HTTP API 触发），不记录日志
        return null;
      }

      function formatBatchSyncResult(result, operations) {
        const envelope = result && result.id ? findQueuedEnvelope(result.id, operations) : null;
        const summary = envelope && envelope.operation ? formatViewOperation(envelope.operation) : null;
        const title = summary ? summary.title : (result.nodeTitle || result.operationType || "离线操作");
        if (result.status === "applied") {
          return {
            kind: "remote",
            title: "已合并：" + title,
            detail: result.reason || (summary ? summary.detail || "" : "已成功同步"),
            key: "remote:batch-result:" + (result.id || Date.now())
          };
        }
        if (result.status === "skipped") {
          return {
            kind: "remote",
            title: "已跳过：" + title,
            detail: result.reason || "重复提交，服务端已忽略",
            key: "remote:batch-result:" + (result.id || Date.now())
          };
        }
        return {
          kind: "remote",
          title: "已拒绝：" + title,
          detail: result.reason || (result.error && result.error.message) || "服务端拒绝该操作",
          key: "remote:batch-result:" + (result.id || Date.now())
        };
      }

      function renderOnlineIndicator() {
        if (!els.topbarCenter) return;
        // Logged in: use real-time WebSocket data (self excluded, so +1)
        // Login screen: use HTTP polling count (includes all users)
        const onlineCount = state.user
          ? state.onlineUsers.length + 1
          : state.onlineCountPolled;
        els.topbarCenter.innerHTML =
          '<div class="online-count-badge">' +
            '<span class="online-dot"></span>' +
            '<span class="online-count-text">在线人数 ' + onlineCount + '</span>' +
          '</div>';
      }

      function getEditorsByNode() {
        const map = {};
        for (const user of state.onlineUsers) {
          if (user.nodeId) {
            if (!map[user.nodeId]) map[user.nodeId] = [];
            map[user.nodeId].push(user);
          }
        }
        return map;
      }

      function renderNodeEditingIndicators() {
        const editorsByNode = getEditorsByNode();
        for (const nodeEl of document.querySelectorAll(".node")) {
          const nodeId = nodeEl.dataset.nodeId;
          const editors = editorsByNode[nodeId] || [];
          const dot = nodeEl.querySelector(".presence-dot");
          if (!dot) continue;
          if (editors.length > 0) {
            dot.classList.add("active");
          } else {
            dot.classList.remove("active");
          }
        }
      }

      function escapeAttr(value) {
        return String(value).replace(/[^\w#,()\-.\s]/g, "");
      }

      function render() {
        const focus = captureEditorFocus();
        document.body.className = state.user ? "app-mode" : "login-mode";
        if (state.user) {
          els.headerSession.classList.remove("hidden");
          els.headerSession.textContent = state.user.name + " / " + state.user.role;
          updateAvatar(els.headerAvatar, state.user);
        } else {
          els.headerSession.classList.add("hidden");
          els.headerSession.textContent = "";
          els.headerAvatar.textContent = "U";
        }
        els.tree.innerHTML = "";
        renderUserManagement();
        renderSyncState();
        renderOperationLogs();
        renderRootActions();
        if (!state.view) {
          renderMarkdownEditorDrawer();
          restoreEditorFocus(focus);
          renderOnlineIndicator();
          return;
        }
        for (const root of state.view.roots) {
          els.tree.appendChild(renderNode(root, 0, null));
        }
        renderMarkdownEditorDrawer();
        restoreEditorFocus(focus);
        renderOnlineIndicator();
        renderNodeEditingIndicators();
      }

      function renderSyncState() {
        const currentQueue = queueForCurrentUser();
        const stats = queueStatsForCurrentUser();
        els.sessionUser.textContent = state.user
          ? state.user.name + " / " + state.user.role
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
        els.undoBtn.disabled = !state.undo.canUndo || state.undo.undoInFlight || state.undo.redoInFlight;
        els.redoBtn.disabled = !state.undo.canRedo || state.undo.undoInFlight || state.undo.redoInFlight;
        els.undoBtn.title = state.undo.canUndo
          ? "撤销 (Ctrl+Z) — " + state.undo.undoCount + " 条可撤销"
          : "撤销 (Ctrl+Z)";
        els.redoBtn.title = state.undo.canRedo
          ? "重做 (Ctrl+Y) — " + state.undo.redoCount + " 条可重做"
          : "重做 (Ctrl+Y)";
      }

      function renderRootActions() {
        if (!els.addRootNode) return;
        const canAddRoot = Boolean(state.user && state.user.role === "admin");
        els.addRootNode.classList.toggle("hidden", !canAddRoot);
        els.addRootNode.disabled = !canAddRoot;
      }

      function connectionStatusLabel() {
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

      function taskStatusLabel(value) {
        if (value === "todo") return "待办";
        if (value === "doing") return "进行中";
        if (value === "done") return "已完成";
        return "-";
      }

      function taskPriorityLabel(value) {
        return value ? value + " 级" : "-";
      }

      function isTaskNode(node) {
        return node && node.type === "task";
      }

      function canSeeBudget(node) {
        return Boolean(node && node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, "budget"));
      }

      function hasTaskAttr(node, key) {
        return Boolean(node && node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, key));
      }

      function directTaskChildren(node) {
        return (node.children || []).filter((child) => isTaskNode(child));
      }

      function isModuleNode(node, depth) {
        return depth === 1;
      }

      function canAddChildAtDepth(depth) {
        return depth < 2;
      }

      function defaultTaskFilter() {
        return {
          priority: "",
          status: "",
          minBudget: "",
          maxBudget: "",
          keyword: ""
        };
      }

      function taskFilterFor(nodeId) {
        if (!state.treeUi.taskFilters[nodeId]) {
          state.treeUi.taskFilters[nodeId] = defaultTaskFilter();
        }
        return state.treeUi.taskFilters[nodeId];
      }

      function taskMatchesFilter(task, filter) {
        const attrs = task.attrs || {};
        if (filter.priority && attrs.priority !== filter.priority) return false;
        if (filter.status && attrs.taskStatus !== filter.status) return false;
        if (filter.keyword) {
          const text = String((task.title || "") + " " + (task.content || "")).toLowerCase();
          if (!text.includes(filter.keyword.trim().toLowerCase())) return false;
        }
        if (hasTaskAttr(task, "budget")) {
          const budget = Number(attrs.budget);
          if (filter.minBudget !== "" && budget < Number(filter.minBudget)) return false;
          if (filter.maxBudget !== "" && budget > Number(filter.maxBudget)) return false;
        }
        return true;
      }

      function isTaskFilterActive(filter) {
        return Boolean(filter.priority || filter.status || filter.minBudget || filter.maxBudget || filter.keyword);
      }

      function filteredModuleChildren(moduleNode) {
        const filter = taskFilterFor(moduleNode.id);
        if (!isTaskFilterActive(filter)) {
          return moduleNode.children || [];
        }
        return (moduleNode.children || []).filter((child) => taskMatchesFilter(child, filter));
      }

      function taskStats(tasks) {
        const stats = {
          count: tasks.length,
          a: 0,
          b: 0,
          c: 0,
          budgetCount: 0,
          budgetTotal: 0
        };
        for (const task of tasks) {
          const attrs = task.attrs || {};
          if (attrs.priority === "A") stats.a += 1;
          if (attrs.priority === "B") stats.b += 1;
          if (attrs.priority === "C") stats.c += 1;
          if (hasTaskAttr(task, "budget")) {
            stats.budgetCount += 1;
            stats.budgetTotal += Number(attrs.budget || 0);
          }
        }
        stats.budgetAverage = stats.budgetCount > 0 ? stats.budgetTotal / stats.budgetCount : 0;
        return stats;
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
        sendPresence(nodeId);
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
        clearPresence();
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
        if (node.permissions.canEditContent) {
          body.contentEditable = "true";
          body.spellcheck = false;
          body.setAttribute("role", "textbox");
          body.setAttribute("aria-multiline", "true");
          body.dataset.nodeId = node.id;
          body.dataset.field = "content";
          body.dataset.mdPreviewEditable = "true";
          body.dataset.mdPreviewScope = "tree";
          body.dataset.placeholder = "直接编辑预览内容";
        }
        body.innerHTML = markdownPreviewHtml(draft.content, node.permissions.canEditContent);
        setEditableMarkdownEmptyState(body);
        bindEditableMarkdownPreview(body, node);
        preview.appendChild(body);
        container.appendChild(preview);
      }

      function appendTaskAttrsPanel(container, node) {
        if (!isTaskNode(node)) return;
        const attrs = node.attrs || {};
        const panel = document.createElement("div");
        panel.className = "task-attrs-panel";

        const head = document.createElement("div");
        head.className = "node-markdown-preview-head";
        const title = document.createElement("span");
        title.textContent = "任务属性";
        head.appendChild(title);
        panel.appendChild(head);

        const grid = document.createElement("div");
        grid.className = "task-attrs-grid";
        grid.appendChild(renderTaskAttrControl(node, "priority", "优先级", [
          { value: "", label: "未设置" },
          { value: "A", label: "A 级" },
          { value: "B", label: "B 级" },
          { value: "C", label: "C 级" }
        ], attrs.priority || "", node.permissions.canEditPriority));
        if (canSeeBudget(node)) {
          grid.appendChild(renderTaskBudgetControl(node));
        }
        grid.appendChild(renderTaskAttrControl(node, "taskStatus", "任务状态", [
          { value: "", label: "未设置" },
          { value: "todo", label: "待办" },
          { value: "doing", label: "进行中" },
          { value: "done", label: "已完成" }
        ], attrs.taskStatus || "", node.permissions.canEditTaskStatus));
        panel.appendChild(grid);
        container.appendChild(panel);
      }

      function renderTaskAttrControl(node, attrName, labelText, options, value, canEdit) {
        const label = document.createElement("label");
        label.textContent = labelText;
        if (!canEdit) {
          const readonly = document.createElement("strong");
          readonly.textContent = attrName === "priority" ? taskPriorityLabel(value) : taskStatusLabel(value);
          label.appendChild(readonly);
          return label;
        }
        const customSelect = createCustomSelect(
          options,
          value,
          (newVal) =>
            updateTaskAttr(node.id, attrName, newVal || undefined).catch((error) => setStatus(error.message)),
          false
        );
        customSelect.element.dataset.nodeId = node.id;
        customSelect.element.dataset.field = "attrs." + attrName;
        label.appendChild(customSelect.element);
        return label;
      }

      function renderTaskBudgetControl(node) {
        const label = document.createElement("label");
        label.textContent = "经费预算";
        const value = node.attrs && node.attrs.budget !== undefined ? String(node.attrs.budget) : "";
        if (!node.permissions.canEditBudget) {
          const readonly = document.createElement("strong");
          readonly.textContent = value || "-";
          label.appendChild(readonly);
          return label;
        }
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "100";
        input.value = value;
        input.dataset.nodeId = node.id;
        input.dataset.field = "attrs.budget";
        input.addEventListener("change", () =>
          updateTaskAttr(node.id, "budget", input.value === "" ? undefined : Number(input.value)).catch((error) =>
            setStatus(error.message)
          )
        );
        label.appendChild(input);
        return label;
      }

      function appendModuleFilterPanel(container, node, depth) {
        if (!isModuleNode(node, depth)) return;
        const allTasks = directTaskChildren(node);
        const filter = taskFilterFor(node.id);
        const filteredTasks = allTasks.filter((task) => taskMatchesFilter(task, filter));
        const allStats = taskStats(allTasks);
        const filteredStats = taskStats(filteredTasks);
        const budgetVisible = allTasks.some((task) => canSeeBudget(task));

        const panel = document.createElement("div");
        panel.className = "module-filter-panel";
        const head = document.createElement("div");
        head.className = "node-markdown-preview-head";
        const title = document.createElement("span");
        title.textContent = "当前模块任务筛选";
        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "btn small secondary";
        clear.textContent = "清空筛选";
        clear.disabled = !isTaskFilterActive(filter);
        clear.addEventListener("click", () => {
          state.treeUi.taskFilters[node.id] = defaultTaskFilter();
          render();
        });
        head.appendChild(title);
        head.appendChild(clear);
        panel.appendChild(head);

        const controls = document.createElement("div");
        controls.className = "module-filter-grid";
        controls.appendChild(renderModuleFilterSelect(node.id, "priority", "优先级", [
          { value: "", label: "全部" },
          { value: "A", label: "A 级" },
          { value: "B", label: "B 级" },
          { value: "C", label: "C 级" }
        ], filter.priority));
        controls.appendChild(renderModuleFilterSelect(node.id, "status", "状态", [
          { value: "", label: "全部" },
          { value: "todo", label: "待办" },
          { value: "doing", label: "进行中" },
          { value: "done", label: "已完成" }
        ], filter.status));
        if (budgetVisible) {
          controls.appendChild(renderModuleFilterInput(node.id, "minBudget", "预算最小值", filter.minBudget, "number"));
          controls.appendChild(renderModuleFilterInput(node.id, "maxBudget", "预算最大值", filter.maxBudget, "number"));
        }
        controls.appendChild(renderModuleFilterInput(node.id, "keyword", "关键词", filter.keyword, "text"));
        panel.appendChild(controls);

        const stats = document.createElement("div");
        stats.className = "module-stat-grid";
        stats.appendChild(renderModuleStat("当前可见任务数", allStats.count));
        stats.appendChild(renderModuleStat("筛选后任务数", filteredStats.count));
        stats.appendChild(renderModuleStat("A 级任务", filteredStats.a));
        stats.appendChild(renderModuleStat("B 级任务", filteredStats.b));
        stats.appendChild(renderModuleStat("C 级任务", filteredStats.c));
        if (budgetVisible) {
          stats.appendChild(renderModuleStat("预算总额", filteredStats.budgetTotal));
          stats.appendChild(renderModuleStat("平均预算", filteredStats.budgetCount ? filteredStats.budgetAverage.toFixed(2) : "-"));
        }
        panel.appendChild(stats);
        appendModuleBatchUpdatePanel(panel, node, filteredTasks);
        container.appendChild(panel);
      }

      function appendModuleBatchUpdatePanel(panel, moduleNode, filteredTasks) {
        const editableTasks = filteredTasks.filter((task) => task.permissions && task.permissions.canEditContent);
        const section = document.createElement("div");
        section.className = "module-batch-panel";

        const head = document.createElement("div");
        head.className = "node-markdown-preview-head";
        const title = document.createElement("span");
        title.textContent = "批量更新当前筛选结果";
        const scope = document.createElement("span");
        scope.textContent = "筛选 " + filteredTasks.length + " 个，可编辑 " + editableTasks.length + " 个";
        head.appendChild(title);
        head.appendChild(scope);
        section.appendChild(head);

        const controls = document.createElement("div");
        controls.className = "module-filter-grid";
        controls.appendChild(renderBatchSelectControl(moduleNode, editableTasks, "priority", "批量设置优先级", [
          { value: "", label: "选择优先级" },
          { value: "A", label: "A 级" },
          { value: "B", label: "B 级" },
          { value: "C", label: "C 级" }
        ]));
        controls.appendChild(renderBatchSelectControl(moduleNode, editableTasks, "taskStatus", "批量设置状态", [
          { value: "", label: "选择状态" },
          { value: "todo", label: "待办" },
          { value: "doing", label: "进行中" },
          { value: "done", label: "已完成" }
        ]));
        controls.appendChild(renderBatchBudgetControl(moduleNode, editableTasks));
        section.appendChild(controls);

        if (filteredTasks.length === 0) {
          const empty = document.createElement("div");
          empty.className = "status";
          empty.textContent = "当前筛选结果为空，无法批量更新。";
          section.appendChild(empty);
        } else if (editableTasks.length === 0) {
          const empty = document.createElement("div");
          empty.className = "status";
          empty.textContent = "当前筛选结果无可编辑任务。";
          section.appendChild(empty);
        }

        panel.appendChild(section);
      }

      function renderBatchSelectControl(moduleNode, editableTasks, attrName, labelText, options) {
        const label = document.createElement("label");
        label.textContent = labelText;
        const row = document.createElement("div");
        row.className = "module-batch-row";
        let selectedValue = "";
        const customSelect = createCustomSelect(
          options,
          "",
          (newValue) => {
            selectedValue = newValue;
          },
          editableTasks.length === 0
        );
        customSelect.element.dataset.moduleBatch = attrName;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn small secondary";
        button.textContent = "应用";
        button.disabled = editableTasks.length === 0;
        button.addEventListener("click", () => {
          if (!selectedValue) {
            setStatus("请选择要批量设置的" + labelText.replace("批量设置", ""));
            return;
          }
          applyBatchTaskAttr(moduleNode, editableTasks, attrName, selectedValue);
        });
        row.appendChild(customSelect.element);
        row.appendChild(button);
        label.appendChild(row);
        return label;
      }

      function renderBatchBudgetControl(moduleNode, editableTasks) {
        const label = document.createElement("label");
        label.textContent = "批量设置预算";
        const row = document.createElement("div");
        row.className = "module-batch-row";
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "100";
        input.placeholder = "输入预算";
        input.dataset.moduleBatch = "budget";
        input.disabled = editableTasks.length === 0;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn small secondary";
        button.textContent = "应用";
        button.disabled = editableTasks.length === 0;
        button.addEventListener("click", () => {
          if (input.value === "" || Number.isNaN(Number(input.value)) || Number(input.value) < 0) {
            setStatus("请输入有效预算");
            return;
          }
          applyBatchTaskAttr(moduleNode, editableTasks, "budget", Number(input.value));
        });
        row.appendChild(input);
        row.appendChild(button);
        label.appendChild(row);
        return label;
      }

      function renderModuleFilterSelect(nodeId, key, labelText, options, value) {
        const label = document.createElement("label");
        label.textContent = labelText;
        const customSelect = createCustomSelect(
          options,
          value,
          (newVal) => {
            taskFilterFor(nodeId)[key] = newVal;
            render();
          },
          false
        );
        customSelect.element.dataset.moduleFilter = key;
        label.appendChild(customSelect.element);
        return label;
      }

      function renderModuleFilterInput(nodeId, key, labelText, value, type) {
        const label = document.createElement("label");
        label.textContent = labelText;
        const input = document.createElement("input");
        input.type = type;
        input.value = value || "";
        if (type === "number") {
          input.min = "0";
          input.step = "100";
        }
        input.dataset.nodeId = nodeId;
        input.dataset.field = "moduleFilter." + key;
        input.dataset.moduleFilter = key;
        input.addEventListener("input", () => {
          taskFilterFor(nodeId)[key] = input.value;
          scheduleFilterRender();
        });
        label.appendChild(input);
        return label;
      }

      function scheduleFilterRender() {
        if (state.editing.filterTimer) {
          window.clearTimeout(state.editing.filterTimer);
        }
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        state.editing.filterTimer = window.setTimeout(() => {
          state.editing.filterTimer = null;
          render();
          window.scrollTo(scrollX, scrollY);
        }, 250);
      }

      function renderModuleStat(labelText, value) {
        const item = document.createElement("div");
        item.className = "module-stat";
        const label = document.createElement("span");
        label.textContent = labelText;
        const strong = document.createElement("strong");
        strong.textContent = String(value);
        item.appendChild(label);
        item.appendChild(strong);
        return item;
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
                '<button type="button" data-markdown-mode="preview" class="' + (mode === "preview" ? "active" : "") + '">Preview</button>' +
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
              '<div id="markdownLivePreview" class="markdown-body"' + editableMarkdownPreviewAttrs(node, canEdit, "drawer") + '>' + markdownPreviewHtml(draft.content, canEdit) + '</div>' +
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
        const livePreview = els.markdownEditorDrawer.querySelector("#markdownLivePreview");
        if (!canEdit) return;
        bindEditableMarkdownPreview(livePreview, node);
        if (!editor) return;

        editor.addEventListener("input", () => {
          syncMarkdownDraft(node, editor.value);
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

      function editableMarkdownPreviewAttrs(node, canEdit, scope) {
        if (!canEdit) return "";
        return (
          ' contenteditable="true" spellcheck="false" role="textbox" aria-multiline="true"' +
          ' data-node-id="' + escapeHtml(node.id) + '"' +
          ' data-field="content" data-md-preview-editable="true" data-md-preview-scope="' + escapeHtml(scope || "drawer") + '"' +
          ' data-placeholder="直接编辑预览内容"'
        );
      }

      function markdownPreviewHtml(markdown, editable) {
        const source = String(markdown || "");
        if (editable && !source.trim()) return "";
        return markdownToHtml(source);
      }

      function bindEditableMarkdownPreview(preview, node) {
        if (!preview || preview.dataset.mdPreviewEditable !== "true") return;
        if (preview.dataset.mdPreviewBound === "true") return;
        preview.dataset.mdPreviewBound = "true";
        setEditableMarkdownEmptyState(preview);
        preview.addEventListener("input", () => syncMarkdownDraftFromPreview(node, preview));
        preview.addEventListener("blur", () => {
          autoSaveNode(node.id).catch((error) => setStatus(error.message));
          window.requestAnimationFrame(() => {
            if (state.presence.focusedNodeId === node.id) {
              clearPresence();
            }
          });
        });
        preview.addEventListener("focus", () => {
          sendPresence(node.id);
          updateMarkdownBlockMenuForSelection(preview);
        });
        preview.addEventListener("keyup", () => updateMarkdownBlockMenuForSelection(preview));
        preview.addEventListener("mouseup", () => updateMarkdownBlockMenuForSelection(preview));
        preview.addEventListener("paste", handleEditableMarkdownPaste);
        preview.addEventListener("click", (event) => {
          if (event.target && event.target.closest && event.target.closest("a")) {
            event.preventDefault();
          }
          updateMarkdownBlockMenuForSelection(preview);
        });
        preview.addEventListener("keydown", (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            autoSaveNode(node.id).catch((error) => setStatus(error.message));
          }
        });
      }

      function editablePreviewFromSelection() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        let node = selection.anchorNode;
        if (node && node.nodeType === 3) node = node.parentElement;
        return node && node.closest ? node.closest('[data-md-preview-editable="true"]') : null;
      }

      function closestMarkdownBlockFromSelection(preview) {
        const selection = window.getSelection();
        let node = selection && selection.anchorNode ? selection.anchorNode : null;
        if (!node || !preview.contains(node)) return firstEditableMarkdownBlock(preview);
        if (node.nodeType === 3) node = node.parentElement;
        while (node && node !== preview) {
          if (node.nodeType === 1) {
            const element = node;
            const tag = element.tagName.toLowerCase();
            if (tag === "li") return element;
            if (element.parentElement === preview && isEditableMarkdownBlock(element)) return element;
          }
          node = node.parentElement;
        }
        return firstEditableMarkdownBlock(preview) || preview;
      }

      function firstEditableMarkdownBlock(preview) {
        return Array.from(preview.children || []).find(isEditableMarkdownBlock) || preview;
      }

      function isEditableMarkdownBlock(element) {
        if (!element || !element.tagName) return false;
        return /^(h[1-6]|p|div|ul|ol|blockquote|pre|table|section|article|li)$/i.test(element.tagName);
      }

      function selectionCaretRect(block) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0).cloneRange();
          range.collapse(true);
          const rect = range.getBoundingClientRect();
          if (rect && rect.height > 0 && rect.width >= 0) return rect;
        }
        return block.getBoundingClientRect();
      }

      function updateMarkdownBlockMenuForSelection(preview) {
        const activePreview = preview || editablePreviewFromSelection();
        if (!activePreview || activePreview.dataset.mdPreviewEditable !== "true") {
          hideMarkdownBlockMenu();
          return;
        }
        if (document.activeElement !== activePreview) return;
        const block = closestMarkdownBlockFromSelection(activePreview);
        if (!block) {
          hideMarkdownBlockMenu();
          return;
        }
        const blockRect = block.getBoundingClientRect();
        if (blockRect.width === 0 && blockRect.height === 0) {
          hideMarkdownBlockMenu();
          return;
        }
        const caretRect = selectionCaretRect(block);
        const top = Math.max(8, Math.min(window.innerHeight - 34, (caretRect.top || blockRect.top) - 3));
        const left = Math.max(8, blockRect.left - 36);
        activeMarkdownBlockMenuTarget = { preview: activePreview, block };
        els.markdownBlockMenuTrigger.style.top = top + "px";
        els.markdownBlockMenuTrigger.style.left = left + "px";
        els.markdownBlockMenuTrigger.classList.remove("hidden");
      }

      function hideMarkdownBlockMenu() {
        if (els.markdownBlockMenuTrigger) els.markdownBlockMenuTrigger.classList.add("hidden");
        closeMarkdownBlockMenuPanel();
        activeMarkdownBlockMenuTarget = null;
      }

      function openMarkdownBlockMenuPanel() {
        if (!activeMarkdownBlockMenuTarget) return;
        const triggerRect = els.markdownBlockMenuTrigger.getBoundingClientRect();
        const panelWidth = 252;
        const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, triggerRect.right + 8));
        const top = Math.max(8, Math.min(window.innerHeight - 260, triggerRect.top - 4));
        els.markdownBlockMenuTrigger.classList.add("active");
        els.markdownBlockMenuPanel.style.left = left + "px";
        els.markdownBlockMenuPanel.style.top = top + "px";
        els.markdownBlockMenuPanel.classList.remove("hidden");
      }

      function closeMarkdownBlockMenuPanel() {
        if (els.markdownBlockMenuTrigger) els.markdownBlockMenuTrigger.classList.remove("active");
        if (els.markdownBlockMenuPanel) els.markdownBlockMenuPanel.classList.add("hidden");
      }

      function markdownBlockPlainText(block) {
        if (!block) return "";
        if (block.tagName && block.tagName.toLowerCase() === "pre") {
          const code = block.querySelector("code");
          return String((code || block).textContent || "").trim();
        }
        return String(block.textContent || "").replace(/\\u00a0/g, " ").trim();
      }

      function createMarkdownBlockElement(format, text) {
        const safeText = text || (format === "code-block" ? "code" : "正文");
        if (/^h[1-5]$/.test(format)) {
          const heading = document.createElement(format);
          heading.textContent = safeText;
          return heading;
        }
        if (format === "bullet-list" || format === "ordered-list" || format === "todo-list") {
          const list = document.createElement(format === "ordered-list" ? "ol" : "ul");
          if (format === "todo-list") list.className = "markdown-task-list";
          const item = document.createElement("li");
          if (format === "todo-list") {
            item.dataset.mdTaskItem = "true";
            item.dataset.mdTaskChecked = "false";
            const checkbox = document.createElement("span");
            checkbox.className = "markdown-task-checkbox";
            checkbox.setAttribute("aria-hidden", "true");
            item.appendChild(checkbox);
          }
          item.appendChild(document.createTextNode(safeText));
          list.appendChild(item);
          return list;
        }
        if (format === "quote") {
          const quote = document.createElement("blockquote");
          quote.textContent = safeText;
          return quote;
        }
        if (format === "highlight") {
          const highlight = document.createElement("div");
          highlight.className = "markdown-highlight-block";
          highlight.dataset.mdBlock = "highlight";
          highlight.textContent = safeText;
          return highlight;
        }
        if (format === "code-block") {
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          code.textContent = safeText;
          pre.appendChild(code);
          return pre;
        }
        const paragraph = document.createElement("p");
        paragraph.textContent = safeText;
        return paragraph;
      }

      function replacementTargetForMarkdownBlock(block, preview) {
        if (!block || block === preview) return preview;
        if (block.tagName && block.tagName.toLowerCase() === "li") {
          const list = block.closest("ul,ol");
          return list && preview.contains(list) ? list : block;
        }
        return block;
      }

      function applyMarkdownBlockFormat(format) {
        const target = activeMarkdownBlockMenuTarget;
        if (!target || !target.preview) return;
        const preview = target.preview;
        const node = state.view ? findNodeById(preview.dataset.nodeId, state.view.roots) : null;
        if (!node) return;
        const currentBlock = target.block && preview.contains(target.block)
          ? target.block
          : closestMarkdownBlockFromSelection(preview);
        const replaceTarget = replacementTargetForMarkdownBlock(currentBlock, preview);
        const replacement = createMarkdownBlockElement(format, markdownBlockPlainText(currentBlock));
        if (replaceTarget === preview) {
          preview.innerHTML = "";
          preview.appendChild(replacement);
        } else {
          replaceTarget.replaceWith(replacement);
        }
        preview.focus({ preventScroll: true });
        placeCaretAtEnd(replacement);
        syncMarkdownDraftFromPreview(node, preview);
        closeMarkdownBlockMenuPanel();
        activeMarkdownBlockMenuTarget = { preview, block: replacement };
        updateMarkdownBlockMenuForSelection(preview);
      }

      function placeCaretAtEnd(element) {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function handleEditableMarkdownPaste(event) {
        const text = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
        if (!text) return;
        event.preventDefault();
        insertPlainTextAtSelection(text);
      }

      function insertPlainTextAtSelection(text) {
        if (document.queryCommandSupported && document.queryCommandSupported("insertText")) {
          document.execCommand("insertText", false, text);
          return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const fragment = document.createDocumentFragment();
        const lines = String(text).replace(/\\r\\n/g, "\\n").split("\\n");
        lines.forEach((line, index) => {
          if (index > 0) fragment.appendChild(document.createElement("br"));
          fragment.appendChild(document.createTextNode(line));
        });
        const last = fragment.lastChild;
        range.insertNode(fragment);
        if (last) {
          range.setStartAfter(last);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        if (document.activeElement) {
          document.activeElement.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }

      function syncMarkdownDraftFromPreview(node, preview) {
        const markdown = markdownPreviewToMarkdown(preview);
        syncMarkdownDraft(node, markdown, { skipPreviewElement: preview });
        setEditableMarkdownEmptyState(preview);
      }

      function syncMarkdownDraft(node, markdown, options = {}) {
        const draft = getNodeDraft(node);
        draft.content = markdown;
        scheduleAutoSave(node.id);

        const editor = document.querySelector(
          '#markdownContentEditor[data-node-id="' + cssEscape(node.id) + '"]'
        );
        if (editor && editor.value !== markdown) {
          editor.value = markdown;
        }

        refreshMarkdownPreview(node.id, markdown, {
          skipPreviewElement: options.skipPreviewElement || null
        });
      }

      function setEditableMarkdownEmptyState(preview) {
        if (!preview || preview.dataset.mdPreviewEditable !== "true") return;
        const text = String(preview.textContent || "").replace(/\\u00a0/g, " ").trim();
        preview.dataset.empty = text ? "false" : "true";
      }

      function markdownPreviewToMarkdown(preview) {
        if (!preview) return "";
        return normalizeMarkdown(markdownBlocksFromNodes(preview.childNodes, "").join("\\n\\n"));
      }

      function markdownBlocksFromNodes(nodes, indent) {
        const blocks = [];
        let inlineBuffer = "";

        function flushInlineBuffer() {
          const text = normalizeMarkdown(inlineBuffer);
          if (text) blocks.push(indent + text);
          inlineBuffer = "";
        }

        for (const node of Array.from(nodes || [])) {
          if (node.nodeType === 3) {
            inlineBuffer += node.textContent || "";
            continue;
          }
          if (node.nodeType !== 1) continue;
          const element = node;
          if (element.classList && element.classList.contains("markdown-empty")) continue;
          const tag = element.tagName.toLowerCase();
          if (tag === "br") {
            inlineBuffer += "\\n";
            continue;
          }

          const block = markdownBlockFromElement(element, indent);
          if (block) {
            flushInlineBuffer();
            blocks.push(block);
          } else {
            inlineBuffer += inlineMarkdownFromNode(element);
          }
        }

        flushInlineBuffer();
        return blocks.filter(Boolean);
      }

      function markdownBlockFromElement(element, indent) {
        const tag = element.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
          const level = Math.min(Number(tag.slice(1)), 3);
          const text = normalizeMarkdown(inlineMarkdownFromChildren(element));
          return text ? "#".repeat(level) + " " + text : "";
        }
        if (tag === "ul" || tag === "ol") {
          return markdownListFromElement(element, tag === "ol", indent);
        }
        if (tag === "blockquote") {
          const nested = markdownBlocksFromNodes(element.childNodes, "").join("\\n\\n");
          const text = nested || normalizeMarkdown(inlineMarkdownFromChildren(element));
          return text
            ? text.split("\\n").map((line) => "> " + line).join("\\n")
            : "";
        }
        if (
          (tag === "div" || tag === "section" || tag === "article") &&
          (element.dataset.mdBlock === "highlight" || element.classList.contains("markdown-highlight-block"))
        ) {
          const text = normalizeMarkdown(inlineMarkdownFromChildren(element));
          return text ? text.split("\\n").map((line) => "!! " + line).join("\\n") : "";
        }
        if (tag === "pre") {
          const fence = String.fromCharCode(96).repeat(3);
          const codeElement = element.querySelector("code");
          const code = String((codeElement || element).textContent || "").replace(/\\n$/, "");
          return fence + "\\n" + code + "\\n" + fence;
        }
        if (tag === "table") {
          return markdownTableFromElement(element);
        }
        if (hasMarkdownBlockChild(element)) {
          return markdownBlocksFromNodes(element.childNodes, indent).join("\\n\\n");
        }
        if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
          return normalizeMarkdown(inlineMarkdownFromChildren(element));
        }
        return "";
      }

      function hasMarkdownBlockChild(element) {
        return Array.from(element.children || []).some((child) =>
          /^(h[1-6]|p|div|ul|ol|blockquote|pre|table|section|article)$/i.test(child.tagName)
        );
      }

      function markdownListFromElement(list, ordered, indent) {
        const items = [];
        let index = 1;
        const taskList = list.classList && list.classList.contains("markdown-task-list");
        for (const child of Array.from(list.children || [])) {
          if (child.tagName.toLowerCase() !== "li") continue;
          const taskItem = taskList || child.dataset.mdTaskItem === "true";
          const marker = taskItem
            ? "- [" + (child.dataset.mdTaskChecked === "true" ? "x" : " ") + "] "
            : ordered
              ? String(index) + ". "
              : "- ";
          const item = markdownListItemToMarkdown(child, marker, indent);
          if (item) items.push(item);
          index += 1;
        }
        return items.join("\\n");
      }

      function markdownListItemToMarkdown(item, marker, indent) {
        const inlineParts = [];
        const nestedBlocks = [];
        for (const child of Array.from(item.childNodes || [])) {
          if (child.nodeType === 1 && /^(ul|ol)$/i.test(child.tagName)) {
            nestedBlocks.push(markdownListFromElement(child, child.tagName.toLowerCase() === "ol", indent + "  "));
          } else {
            inlineParts.push(inlineMarkdownFromNode(child));
          }
        }

        const text = normalizeMarkdown(inlineParts.join(""));
        const lines = text ? text.split("\\n") : [""];
        const rendered = [indent + marker + lines[0]];
        for (const line of lines.slice(1)) {
          rendered.push(indent + "  " + line);
        }
        for (const nested of nestedBlocks) {
          if (nested) rendered.push(nested);
        }
        return rendered.join("\\n");
      }

      function markdownTableFromElement(table) {
        const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
          Array.from(row.children || [])
            .filter((cell) => /^(th|td)$/i.test(cell.tagName))
            .map((cell) => markdownTableCell(inlineMarkdownFromChildren(cell)))
        ).filter((row) => row.length > 0);
        if (rows.length === 0) return "";
        const columnCount = Math.max(...rows.map((row) => row.length));
        const normalized = rows.map((row) => {
          const cells = row.slice();
          while (cells.length < columnCount) cells.push("");
          return cells;
        });
        const header = normalized[0];
        const divider = header.map(() => "---");
        const body = normalized.slice(1);
        return [header, divider].concat(body).map((row) => "| " + row.join(" | ") + " |").join("\\n");
      }

      function markdownTableCell(value) {
        return normalizeMarkdown(String(value || "").replace(/\\|/g, "/")).replace(/\\n/g, " ");
      }

      function inlineMarkdownFromChildren(element) {
        return Array.from(element.childNodes || []).map(inlineMarkdownFromNode).join("");
      }

      function inlineMarkdownFromNode(node) {
        if (!node) return "";
        if (node.nodeType === 3) {
          return String(node.textContent || "").replace(/\\u00a0/g, " ");
        }
        if (node.nodeType !== 1) return "";
        const element = node;
        if (element.classList && element.classList.contains("markdown-empty")) return "";
        if (element.classList && element.classList.contains("markdown-task-checkbox")) return "";
        const tag = element.tagName.toLowerCase();
        if (tag === "br") return "\\n";
        if (tag === "strong" || tag === "b") {
          return wrapInlineMarkdown("**", inlineMarkdownFromChildren(element));
        }
        if (tag === "em" || tag === "i") {
          return wrapInlineMarkdown("_", inlineMarkdownFromChildren(element));
        }
        if (tag === "code" && (!element.parentElement || element.parentElement.tagName.toLowerCase() !== "pre")) {
          const tick = String.fromCharCode(96);
          return tick + String(element.textContent || "") + tick;
        }
        if (tag === "a") {
          const label = normalizeMarkdown(inlineMarkdownFromChildren(element));
          const href = safeMarkdownUrl(element.getAttribute("href") || "");
          return href && label ? "[" + label + "](" + href + ")" : label;
        }
        return inlineMarkdownFromChildren(element);
      }

      function wrapInlineMarkdown(wrapper, text) {
        const normalized = normalizeMarkdown(text);
        return normalized ? wrapper + normalized + wrapper : "";
      }

      function normalizeMarkdown(markdown) {
        return String(markdown || "")
          .replace(/\\u00a0/g, " ")
          .split("\\n")
          .map((line) => line.replace(/[ \\t]+$/g, ""))
          .join("\\n")
          .replace(/\\n{3,}/g, "\\n\\n")
          .trim();
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

      function refreshMarkdownPreview(nodeId, markdown, options = {}) {
        const skipPreviewElement = options.skipPreviewElement || null;
        const previewHtml = markdownPreviewHtml(markdown, true);
        const drawerPreview = document.querySelector("#markdownLivePreview");
        if (drawerPreview && drawerPreview !== skipPreviewElement) {
          drawerPreview.innerHTML = previewHtml;
          setEditableMarkdownEmptyState(drawerPreview);
        }
        const nodePreviews = els.tree.querySelectorAll(
          '.node[data-node-id="' + cssEscape(nodeId) + '"] .node-markdown-preview-body'
        );
        for (const nodePreview of nodePreviews) {
          if (nodePreview === skipPreviewElement) continue;
          nodePreview.innerHTML = previewHtml;
          setEditableMarkdownEmptyState(nodePreview);
        }
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

        const heading = trimmed.match(/^(#{1,5})\\s+(.+)$/);
        if (heading) {
          const level = heading[1].length;
          return "<h" + level + ">" + renderInlineMarkdown(heading[2]) + "</h" + level + ">";
        }

        if (lines.every((line) => /^[-*]\\s+\\[[ xX]\\]\\s+/.test(line.trim()))) {
          return (
            '<ul class="markdown-task-list">' +
            lines.map((line) => {
              const checked = /^[-*]\\s+\\[[xX]\\]/.test(line.trim());
              const text = line.trim().replace(/^[-*]\\s+\\[[ xX]\\]\\s+/, "");
              return '<li data-md-task-item="true" data-md-task-checked="' + (checked ? "true" : "false") + '">' +
                '<span class="markdown-task-checkbox" aria-hidden="true"></span>' +
                renderInlineMarkdown(text) +
              "</li>";
            }).join("") +
            "</ul>"
          );
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

        if (lines.every((line) => /^!!\\s?/.test(line.trim()))) {
          const highlight = lines.map((line) => line.trim().replace(/^!!\\s?/, "")).join("<br />");
          return '<div class="markdown-highlight-block" data-md-block="highlight">' + renderInlineMarkdown(highlight) + "</div>";
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

        const renderedChildren = isModuleNode(node, depth) ? filteredModuleChildren(node) : (node.children || []);
        const childCount = renderedChildren.length;
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
          titleInput.addEventListener("focus", () => sendPresence(node.id));
          titleInput.addEventListener("input", () => {
            getNodeDraft(node).title = titleInput.value;
            scheduleAutoSave(node.id);
          });
          titleInput.addEventListener("blur", () => {
            scheduleAutoSave(node.id);
            window.requestAnimationFrame(() => {
              if (state.presence.focusedNodeId === node.id) {
                clearPresence();
              }
            });
          });
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

        // Column 3 wrapper: expand-indicator + presence icon stacked vertically
        const indicatorCol = document.createElement("div");
        indicatorCol.className = "node-indicator-col";

        const detailIndicator = document.createElement("span");
        detailIndicator.className = "node-expand-indicator";
        detailIndicator.setAttribute("aria-hidden", "true");
        indicatorCol.appendChild(detailIndicator);

        const presenceIcon = document.createElement("div");
        presenceIcon.className = "node-presence-icon";
        const presenceDot = document.createElement("span");
        presenceDot.className = "presence-dot";
        presenceIcon.appendChild(presenceDot);
        indicatorCol.appendChild(presenceIcon);

        summary.appendChild(indicatorCol);
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

        appendModuleFilterPanel(detailInner, node, depth);
        if (depth >= 2) {
          appendTaskAttrsPanel(detailInner, node);
        }
        appendMarkdownPreview(detailInner, node, draft);

        if (node.permissions.canAddChild || node.permissions.canDelete) {
          const actions = document.createElement("div");
          actions.className = "node-actions";
          if (node.permissions.canAddChild && canAddChildAtDepth(depth)) {
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "btn small secondary";
            addButton.textContent = "添加子节点";
            addButton.addEventListener("click", () =>
              addChildNode(node, depth).catch((error) => {
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

        if (renderedChildren.length > 0) {
          const childrenShell = document.createElement("div");
          childrenShell.className = "tree-children-shell" + (childrenExpanded ? " expanded" : "");
          const childrenInner = document.createElement("div");
          childrenInner.className = "tree-children-inner";
          const ul = document.createElement("ul");
          for (const child of renderedChildren) ul.appendChild(renderNode(child, depth + 1));
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
            for (const other of document.querySelectorAll(".multi-select")) {
              if (other !== details && other.open) {
                other.open = false;
              }
            }
          }
        });

        // 点击页面其他地方关闭所有下拉框
        if (!window.__customSelectGlobalClickBound) {
          window.__customSelectGlobalClickBound = true;
          document.addEventListener("click", (event) => {
            const target = event.target;
            if (!target || !target.closest) return;
            if (target.closest(".multi-select")) return;
            for (const detailsEl of document.querySelectorAll(".multi-select")) {
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
              escapeHtml(user.name + " / " + user.role) +
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
        if (active.dataset.mdPreviewEditable === "true") {
          const selection = captureContentEditableSelection(active);
          return {
            nodeId: active.dataset.nodeId,
            field: active.dataset.field,
            editablePreview: true,
            previewScope: active.dataset.mdPreviewScope || "",
            elementId: active.id || "",
            selectionStart: selection.start,
            selectionEnd: selection.end
          };
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
        if (focus.editablePreview) {
          const nextPreview = findEditablePreviewForFocus(focus, selector);
          if (!nextPreview) return;
          nextPreview.focus({ preventScroll: true });
          restoreContentEditableSelection(
            nextPreview,
            focus.selectionStart ?? 0,
            focus.selectionEnd ?? focus.selectionStart ?? 0
          );
          updateMarkdownBlockMenuForSelection(nextPreview);
          return;
        }
        const next =
          focus.field === "content"
            ? document.querySelector("#markdownContentEditor" + selector)
            : null;
        const fallback = next || els.tree.querySelector(selector) || document.querySelector(selector);
        if (!fallback) return;
        fallback.focus({ preventScroll: true });
        if (typeof fallback.setSelectionRange === "function") {
          const length = fallback.value.length;
          const start = Math.min(focus.selectionStart ?? length, length);
          const end = Math.min(focus.selectionEnd ?? start, length);
          fallback.setSelectionRange(start, end);
        }
      }

      function findEditablePreviewForFocus(focus, selector) {
        if (focus.elementId) {
          const exact = document.querySelector("#" + cssEscape(focus.elementId));
          if (exact && exact.dataset.mdPreviewEditable === "true") return exact;
        }
        if (focus.previewScope) {
          const scoped = document.querySelector(
            selector + '[data-md-preview-editable="true"][data-md-preview-scope="' + cssEscape(focus.previewScope) + '"]'
          );
          if (scoped) return scoped;
        }
        return document.querySelector(selector + '[data-md-preview-editable="true"]');
      }

      function captureContentEditableSelection(root) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          const length = String(root.textContent || "").length;
          return { start: length, end: length };
        }
        const range = selection.getRangeAt(0);
        if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
          const length = String(root.textContent || "").length;
          return { start: length, end: length };
        }
        const startRange = document.createRange();
        startRange.selectNodeContents(root);
        startRange.setEnd(range.startContainer, range.startOffset);
        const endRange = document.createRange();
        endRange.selectNodeContents(root);
        endRange.setEnd(range.endContainer, range.endOffset);
        return {
          start: startRange.toString().length,
          end: endRange.toString().length
        };
      }

      function restoreContentEditableSelection(root, start, end) {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        const textLength = String(root.textContent || "").length;
        const targetStart = Math.max(0, Math.min(start || 0, textLength));
        const targetEnd = Math.max(targetStart, Math.min(end || targetStart, textLength));
        const positions = findTextPositions(root, targetStart, targetEnd);
        if (!positions.startNode || !positions.endNode) {
          range.selectNodeContents(root);
          range.collapse(false);
        } else {
          range.setStart(positions.startNode, positions.startOffset);
          range.setEnd(positions.endNode, positions.endOffset);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }

      function findTextPositions(root, targetStart, targetEnd) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let current = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        let node = walker.nextNode();
        while (node) {
          const length = node.textContent.length;
          const next = current + length;
          if (!startNode && targetStart <= next) {
            startNode = node;
            startOffset = Math.max(0, Math.min(targetStart - current, length));
          }
          if (!endNode && targetEnd <= next) {
            endNode = node;
            endOffset = Math.max(0, Math.min(targetEnd - current, length));
            break;
          }
          current = next;
          node = walker.nextNode();
        }
        return { startNode, startOffset, endNode, endOffset };
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
          state.offline.connectionStatus === "connected" &&
          isSocketOpen()
        );
      }

      function isLikelyNetworkError(error) {
        const message = error && error.message ? String(error.message) : String(error || "");
        return (
          error instanceof TypeError ||
          /failed to fetch|networkerror|load failed|fetch|network|socket|offline|断网|离线|unexpected end of json input|ended before a valid json body/i.test(message)
        );
      }

      function markCurrentUserSendingItemsPending(reason) {
        let changed = false;
        for (const item of state.offline.queue) {
          if (item.userId !== currentUserId() || item.status !== "sending") continue;
          item.status = "pending";
          item.error = {
            name: "NetworkUnavailable",
            message: reason || "网络不可用，等待恢复联网后重试"
          };
          changed = true;
        }
        if (changed) {
          saveOfflineQueue();
          renderSyncState();
        }
        return changed;
      }

      function logOfflineQueued(title, detail, key) {
        appendOperationLog({
          kind: "local",
          title,
          detail,
          key: key || "offline-queued:" + Date.now()
        });
        renderOperationLogs();
      }

      function logQueuedWaiting(envelope, summary, detail) {
        logOfflineQueued(
          "等待同步：" + (summary ? summary.title : "离线操作"),
          detail || "操作已进入离线队列，等待恢复联网后同步",
          "offline:queued:" + envelope.id
        );
      }

      function isSocketActive() {
        return (
          state.socket &&
          (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)
        );
      }

      const AWARENESS_THROTTLE_MS = 200;

      function sendPresence(nodeId) {
        if (!state.token || !isSocketOpen()) return;
        state.presence.focusedNodeId = nodeId;
        if (state.presence._sendTimer) return;
        state.presence._sendTimer = setTimeout(() => {
          state.presence._sendTimer = null;
          try {
            state.socket.send(JSON.stringify({
              type: "awareness",
              awareness: { nodeId: state.presence.focusedNodeId }
            }));
          } catch (e) {
            // Silently ignore — awareness is non-critical
          }
        }, AWARENESS_THROTTLE_MS);
      }

      function clearPresence() {
        if (state.presence._sendTimer) {
          clearTimeout(state.presence._sendTimer);
          state.presence._sendTimer = null;
        }
        state.presence.focusedNodeId = null;
        if (isSocketOpen()) {
          try {
            state.socket.send(JSON.stringify({
              type: "awareness",
              awareness: { nodeId: null }
            }));
          } catch (e) {
            // Silently ignore
          }
        }
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
          operations.push({ type: "updateContent", nodeId, baseContent: draft.originalContent, content });
          draft.originalContent = content;
        }

        for (const operation of operations) {
          await submitOperation(operation);
        }

        if (operations.length > 0) {
          setStatus(isConnectionUsable() ? "编辑已发送，等待服务端确认" : "离线编辑已进入队列");
        }
      }

      async function addChildNode(parentNode, depth) {
        if (!canAddChildAtDepth(depth)) {
          setStatus("当前只支持三级结构，第三级节点不能再添加子节点");
          return;
        }
        const result = await showAddNodeDialog(parentNode);
        if (!result) return; // user cancelled

        const childDepth = depth + 1;
        const isTaskChild = childDepth >= 2;
        await submitOperation({
          type: "addNode",
          parentId: parentNode.id,
          nodeType: isTaskChild ? "task" : "folder",
          title: result.title,
          content: "",
          attrs: isTaskChild
            ? {
                priority: "C",
                budget: 0,
                taskStatus: "todo"
              }
            : undefined,
          aclPatch: aclPatchFromAudience(result.audience)
        });
      }

      async function addRootNode() {
        if (!state.user || state.user.role !== "admin") {
          setStatus("只有管理员可以添加一级节点");
          return;
        }
        const result = await showAddNodeDialog(null);
        if (!result) return;
        await submitOperation({
          type: "addNode",
          parentId: null,
          nodeType: "folder",
          title: result.title,
          content: "",
          aclPatch: aclPatchFromAudience(result.audience)
        }, "新增一级节点「" + result.title + "」");
      }

      async function updateTaskAttr(nodeId, attrName, value) {
        await submitOperation({
          type: "updateAttrs",
          nodeId,
          attrsPatch: {
            [attrName]: value
          }
        }, "更新任务属性");
      }

      async function applyBatchTaskAttr(moduleNode, editableTasks, attrName, value) {
        if (!editableTasks || editableTasks.length === 0) {
          setStatus("当前筛选结果无可编辑任务");
          return;
        }
        let queued = 0;
        for (const task of editableTasks) {
          await submitOperation({
            type: "updateAttrs",
            nodeId: task.id,
            attrsPatch: {
              [attrName]: value
            }
          }, "批量更新筛选任务");
          queued += 1;
        }
        setStatus(
          "已为「" +
            (moduleNode.title || moduleNode.id) +
            "」当前筛选结果生成 " +
            queued +
            " 个写回操作"
        );
      }

      async function updateUserRole(userId, role) {
        setUserManagementStatus("正在更新身份...");
        const existingUser = state.users.find((user) => user.id === userId);
        const body = await requestJson("/api/users/" + encodeURIComponent(userId), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            role
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

      async function deleteUserAccount(user) {
        const confirmed = await showConfirmDialog("删除账号", "确认删除账号「" + (user.name || user.username || user.id) + "」？此操作不可撤销。");
        if (!confirmed) return;
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
        const nodeTitle = resolveNodeTitle(nodeId);
        const confirmed = await showConfirmDialog("删除节点", "确定要删除节点「" + nodeTitle + "」吗？");
        if (!confirmed) return;
        if (!isConnectionUsable()) {
          await enqueueOfflineDelete(nodeId);
          return;
        }
        let impact;
        try {
          impact = await requestJson("/api/delete-impact?nodeId=" + encodeURIComponent(nodeId));
        } catch (error) {
          if (isLikelyNetworkError(error) || !isConnectionUsable()) {
            markConnectionUnavailable("删除影响分析请求失败，删除操作已保留在离线队列");
            await enqueueOfflineDelete(nodeId);
            return;
          }
          throw error;
        }
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

      async function enqueueOfflineDelete(nodeId) {
        await submitOperation({ type: "deleteNode", nodeId });
        delete state.editing.drafts[nodeId];
        setStatus("当前离线，删除操作已进入队列，重连后会重新校验");
      }

      function formatDeleteRejectedMessage(impact) {
        const childProjects = impact.visibleNodes
          .map((node) => node.title + " (" + node.id + ")")
          .join("、");
        return (
          "删除被拒绝：该父项目下存在你无权删除的子项目。\\n" +
          "请联系管理员申请高级删除冲突处理权限，或者先处理 " + (childProjects || "相关子项目") + "。"
        );
      }

      function formatDeleteImpact(impact) {
        const visibleNodes = impact.visibleNodes
          .map((node) => "- " + node.title + " (" + node.id + ")")
          .join("\\n");
        const affectedUsers = impact.affectedUsers
          .map((user) => "- " + user.name + " / " + user.role)
          .join("\\n");
        return (
          "删除已阻止：该子树包含当前用户无权删除的内容。\\n" +
          "将删除节点数：" + impact.deleteCount + "\\n" +
          "冲突节点：\\n" + (visibleNodes || "- 无") + "\\n" +
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
              ? "检测到无权直接删除的子节点，请选择处理方式"
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

      let confirmDialogResolver = null;

      function showConfirmDialog(title, message) {
        if (confirmDialogResolver) {
          confirmDialogResolver(false);
          confirmDialogResolver = null;
        }
        return new Promise((resolve) => {
          confirmDialogResolver = resolve;
          els.confirmDialogTitle.textContent = title;
          els.confirmDialogCopy.textContent = message;
          els.confirmDialog.classList.remove("hidden");
          els.confirmDialog.setAttribute("aria-hidden", "false");
        });
      }

      function closeConfirmDialog(result) {
        if (!confirmDialogResolver) return;
        const resolve = confirmDialogResolver;
        confirmDialogResolver = null;
        els.confirmDialog.classList.add("hidden");
        els.confirmDialog.setAttribute("aria-hidden", "true");
        resolve(result);
      }

      els.confirmDialogCancel.addEventListener("click", () => closeConfirmDialog(false));
      els.confirmDialogOk.addEventListener("click", () => closeConfirmDialog(true));
      els.confirmDialog.addEventListener("click", (event) => {
        if (event.target === els.confirmDialog) closeConfirmDialog(false);
      });

      // ── Add Node Dialog ──

      function buildAddNodeAclArea() {
        els.addNodeAclArea.innerHTML = "";
        const label = document.createElement("label");
        label.style.cssText = "display:grid;gap:5px;font-size:12px;color:var(--muted);font-weight:700;";
        label.textContent = "可见范围";
        const select = createCustomSelect(
          [
            { value: "all", label: "所有人可见" },
            { value: "admin-manager", label: "管理员和研发经理" },
            { value: "dev-team", label: "管理员和研发团队" },
            { value: "admin", label: "仅管理员" }
          ],
          "dev-team",
          () => {}
        );
        select.element.dataset.field = "addNodeVisibility";
        label.appendChild(select.element);
        els.addNodeAclArea.appendChild(label);
      }

      function showAddNodeDialog(parentNode) {
        return new Promise((resolve) => {
          const title = els.addNodeDialog.querySelector(".modal-title");
          if (title) title.textContent = parentNode ? "添加子节点" : "添加一级项目空间";
          els.addNodeParentInfo.textContent = parentNode
            ? "父节点：" + quotedNodeTitle(parentNode.title || parentNode.id) + " — 第三级任务会默认带任务优先级、经费预算和状态属性。"
            : "新节点将作为一级项目空间添加到完整树根部。";
          els.addNodeTitle.value = parentNode ? "新任务节点" : "新项目空间";
          buildAddNodeAclArea();
          els.addNodeDialog.classList.remove("hidden");
          els.addNodeDialog.setAttribute("aria-hidden", "false");
          els.addNodeTitle.focus();
          els.addNodeTitle.select();

          function onOk() {
            const title = els.addNodeTitle.value.trim() || "新任务节点";
            const visibilityEl = document.querySelector("[data-field='addNodeVisibility'] .multi-select");
            let audience = "dev-team";
            // Read selected value from the custom select summary text
            const summary = visibilityEl ? visibilityEl.querySelector("summary") : null;
            if (summary) {
              const text = summary.textContent || "";
              if (text.includes("仅管理员") && !text.includes("研发经理") && !text.includes("研发团队")) audience = "admin";
              else if (text.includes("研发经理") && text.includes("研发团队")) audience = "dev-team";
              else if (text.includes("研发经理") && !text.includes("研发团队")) audience = "admin-manager";
              else if (text.includes("所有人")) audience = "all";
            }
            cleanup();
            resolve({ title, audience });
          }

          function onCancel() {
            cleanup();
            resolve(null);
          }

          function cleanup() {
            els.addNodeDialog.classList.add("hidden");
            els.addNodeDialog.setAttribute("aria-hidden", "true");
            els.addNodeDialogOk.removeEventListener("click", onOk);
            els.addNodeDialogCancel.removeEventListener("click", onCancel);
          }

          els.addNodeDialogOk.addEventListener("click", onOk);
          els.addNodeDialogCancel.addEventListener("click", onCancel);
        });
      }

      els.addNodeDialog.addEventListener("click", (event) => {
        if (event.target === els.addNodeDialog) {
          els.addNodeDialogOk.click();
        }
      });

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
              ? "- " + item.name + " / " + item.role
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
          if (sendQueuedOperation(envelope)) {
            setStatus("操作已发送，等待确认");
          } else {
            setStatus("网络不可用，操作已进入离线队列");
            logQueuedWaiting(envelope, summary, "发送失败，操作已保留在离线队列");
          }
        } else {
          setStatus("WebSocket 离线，操作已进入队列");
          logQueuedWaiting(envelope, summary);
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
          markConnectionUnavailable("操作发送失败，操作已保留在离线队列");
          logOfflineQueued("网络已断开", "操作已留在离线队列，等待恢复联网", "offline:send-failed:" + envelope.id);
          return false;
        }
      }

      function sendUndoRequest() {
        if (!isConnectionUsable()) {
          setStatus("连接不可用，无法撤销");
          return;
        }
        if (state.undo.undoInFlight || state.undo.redoInFlight) return;
        state.undo.undoInFlight = true;
        renderSyncState();
        try {
          state.socket.send(JSON.stringify({ type: "undo" }));
        } catch (error) {
          state.undo.undoInFlight = false;
          renderSyncState();
          setStatus(error && error.message ? error.message : "撤销发送失败");
        }
      }

      function sendRedoRequest() {
        if (!isConnectionUsable()) {
          setStatus("连接不可用，无法重做");
          return;
        }
        if (state.undo.undoInFlight || state.undo.redoInFlight) return;
        state.undo.redoInFlight = true;
        renderSyncState();
        try {
          state.socket.send(JSON.stringify({ type: "redo" }));
        } catch (error) {
          state.undo.redoInFlight = false;
          renderSyncState();
          setStatus(error && error.message ? error.message : "重做发送失败");
        }
      }

      function updateUndoState() {
        if (isConnectionUsable()) {
          state.socket.send(JSON.stringify({ type: "undoStatus" }));
        }
      }

      // Undo/Redo keyboard shortcuts
      document.addEventListener("keydown", (event) => {
        // Don't intercept if user is typing in an input or textarea
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
        const isEditable = document.activeElement
          ? document.activeElement.isContentEditable
          : false;
        if (tag === "input" || tag === "textarea" || tag === "select" || isEditable) {
          return;
        }
        // Ctrl+Z (undo)
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
          event.preventDefault();
          if (state.undo.canUndo && !state.undo.undoInFlight && !state.undo.redoInFlight) {
            sendUndoRequest();
          }
          return;
        }
        // Ctrl+Y or Ctrl+Shift+Z (redo)
        if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))) {
          event.preventDefault();
          if (state.undo.canRedo && !state.undo.undoInFlight && !state.undo.redoInFlight) {
            sendRedoRequest();
          }
          return;
        }
      });

      // Undo/Redo button click handlers
      els.undoBtn.addEventListener("click", () => {
        if (state.undo.canUndo && !state.undo.undoInFlight && !state.undo.redoInFlight) sendUndoRequest();
      });
      els.redoBtn.addEventListener("click", () => {
        if (state.undo.canRedo && !state.undo.undoInFlight && !state.undo.redoInFlight) sendRedoRequest();
      });

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
          updateUndoState();
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
          }
          if (Array.isArray(body.results) && body.results.length > 0) {
            if ((!body.rejected || body.rejected.length === 0) && (!options || !options.silent)) {
              setStatus("离线队列已同步");
            }
            for (const result of body.results) {
              appendOperationLog(formatBatchSyncResult(result, operations));
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
          const message = error && error.message ? error.message : String(error);
          for (const item of operations) {
            if (item.status === "sending") {
              item.status = "pending";
              item.error = {
                name: "SyncError",
                message
              };
            }
          }
          saveOfflineQueue();
          if (isLikelyNetworkError(error)) {
            markConnectionUnavailable("离线队列同步失败，操作已保留并等待自动重试");
            setStatus("网络不可用，离线队列已保留，稍后会自动重试");
            logOfflineQueued("同步暂缓", "网络不可用，等待恢复联网后继续同步", "offline:sync-paused:" + Date.now());
          } else if (!options || !options.silent) {
            setStatus(message);
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
      if (els.addRootNode) {
        els.addRootNode.addEventListener("click", () =>
          addRootNode().catch((error) => {
            logOperationFailure({ type: "addNode", parentId: null, title: "一级节点" }, error);
            setStatus(error.message);
          })
        );
      }
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
      els.markdownBlockMenuTrigger.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      els.markdownBlockMenuTrigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (els.markdownBlockMenuPanel.classList.contains("hidden")) {
          openMarkdownBlockMenuPanel();
        } else {
          closeMarkdownBlockMenuPanel();
        }
      });
      els.markdownBlockMenuPanel.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      els.markdownBlockMenuPanel.addEventListener("click", (event) => {
        const button = event.target && event.target.closest
          ? event.target.closest("[data-md-block-format]")
          : null;
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        applyMarkdownBlockFormat(button.dataset.mdBlockFormat);
      });
      document.addEventListener("selectionchange", () => {
        const preview = editablePreviewFromSelection();
        if (preview) {
          updateMarkdownBlockMenuForSelection(preview);
          return;
        }
        if (
          !els.markdownBlockMenuPanel.contains(document.activeElement) &&
          !(document.activeElement && document.activeElement === els.markdownBlockMenuTrigger)
        ) {
          hideMarkdownBlockMenu();
        }
      });
      document.addEventListener("click", (event) => {
        if (
          event.target &&
          event.target.closest &&
          (event.target.closest("#markdownBlockMenuPanel") || event.target.closest("#markdownBlockMenuTrigger"))
        ) {
          return;
        }
        if (!editablePreviewFromSelection()) hideMarkdownBlockMenu();
        else closeMarkdownBlockMenuPanel();
      });
      window.addEventListener("scroll", () => {
        if (activeMarkdownBlockMenuTarget) updateMarkdownBlockMenuForSelection(activeMarkdownBlockMenuTarget.preview);
      }, true);
      window.addEventListener("resize", () => {
        if (activeMarkdownBlockMenuTarget) updateMarkdownBlockMenuForSelection(activeMarkdownBlockMenuTarget.preview);
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
        state.offline.connectionStatus = "offline";
        markCurrentUserSendingItemsPending("连接断开，等待恢复联网后重试");
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
        renderSyncState();
        if (message) {
          setStatus(message);
        }
      }

      function sendHeartbeat() {
        if (!state.token || !isSocketOpen()) return;
        try {
          state.socket.send(JSON.stringify({ type: "ping" }));
        } catch {
          markConnectionStale("心跳发送失败，连接可能已失效");
        }
      }

      function markConnectionStale(message, title) {
        if (state.offline.connectionStatus !== "stale") {
          appendOperationLog({
            kind: "failed",
            title: title || "心跳超时，进入离线",
            detail: message || "超过 " + Math.round(HEARTBEAT_TIMEOUT_MS / 1000) + " 秒未收到服务器响应",
            key: "network:stale:" + Date.now()
          });
          renderOperationLogs();
        }
        const socket = state.socket;
        state.socket = null;
        state.offline.connected = false;
        state.offline.connectionStatus = "stale";
        markCurrentUserSendingItemsPending("心跳超时，等待恢复联网后重试");
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
        renderSyncState();
      }

      function markConnectionUnavailable(message) {
        markConnectionStale(
          message || "操作发送失败，连接可能已经断开",
          "连接异常，进入等待同步"
        );
      }

      function checkHeartbeatTimeout() {
        if (!state.token) return;
        if (!isSocketOpen()) return;
        if (!state.offline.lastPongAt) return;
        if (Date.now() - state.offline.lastPongAt > HEARTBEAT_TIMEOUT_MS) {
          markConnectionStale();
        }
      }

      function autoReconnectIfNeeded() {
        if (!state.token || isSocketActive()) return;
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

      function connectWebSocket(options) {
        if (!state.token) return setStatus("请先登录");
        if (isSocketActive()) return setStatus("WebSocket 已连接或正在连接");
        const reconnectingFromFailure =
          (state.offline.connectionStatus === "stale" || state.offline.connectionStatus === "offline") &&
          state.offline.lastPongAt > 0;
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(protocol + "//" + location.host + "/ws?token=" + encodeURIComponent(state.token));
        state.socket = socket;
        state.offline.connected = false;
        state.offline.connectionStatus = "connecting";
        state.offline.reconnectingFromFailure = reconnectingFromFailure;
        renderSyncState();
        if (!options || !options.auto) {
          setStatus("正在联网...");
        }
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "pong") {
            const wasReconnecting = state.offline.reconnectingFromFailure;
            state.offline.lastPongAt = Date.now();
            state.offline.connected = true;
            state.offline.connectionStatus = "connected";
            state.offline.reconnectingFromFailure = false;
            if (wasReconnecting) {
              appendOperationLog({
                kind: "remote",
                title: "连接已恢复",
                detail: "已收到服务器心跳响应，开始同步离线队列",
                key: "network:recovered:" + state.offline.lastPongAt
              });
              renderOperationLogs();
              setStatus("已重新连接，正在同步离线队列");
            }
            renderSyncState();
            syncOfflineQueue({ silent: true }).catch((error) => setStatus(error.message));
            return;
          }
          if (message.type === "awareness") {
            state.onlineUsers = message.states || [];
            renderOnlineIndicator();
            renderNodeEditingIndicators();
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
                updateUndoState();
                render();
                setStatus("WebSocket 已更新视图");
              });
          }
          if (message.type === "undoApplied") {
            state.undo.undoInFlight = false;
            state.undo.redoInFlight = false;
            state.view = message.view;
            state.stateVector = message.stateVector || state.stateVector;
            state.policyVersion = message.policyVersion || state.policyVersion;
            const nodeTitle = resolveNodeTitle(message.nodeId);
            const opLabel = operationLabel(message.originalOpType || "");
            appendOperationLog({
              kind: "local",
              operator: state.user ? state.user.name : "",
              title: "撤销" + opLabel + "「" + nodeTitle + "」",
              detail: "已撤销",
              coalesceKey: "undo:" + message.undoneEntryId
            });
            renderOperationLogs();
            refreshSession()
              .catch((error) => setStatus(error.message))
              .finally(() => {
                updateUndoState();
                render();
                setStatus("已撤销");
              });
          }
          if (message.type === "redoApplied") {
            state.undo.undoInFlight = false;
            state.undo.redoInFlight = false;
            state.view = message.view;
            state.stateVector = message.stateVector || state.stateVector;
            state.policyVersion = message.policyVersion || state.policyVersion;
            const nodeTitle = resolveNodeTitle(message.nodeId);
            const opLabel = operationLabel(message.originalOpType || "");
            appendOperationLog({
              kind: "local",
              operator: state.user ? state.user.name : "",
              title: "重做" + opLabel + "「" + nodeTitle + "」",
              detail: "已重做",
              coalesceKey: "redo:" + message.redoneEntryId
            });
            renderOperationLogs();
            refreshSession()
              .catch((error) => setStatus(error.message))
              .finally(() => {
                updateUndoState();
                render();
                setStatus("已重做");
              });
          }
          if (message.type === "undoStatus") {
            state.undo.canUndo = message.canUndo;
            state.undo.canRedo = message.canRedo;
            state.undo.undoCount = message.undoCount;
            state.undo.redoCount = message.redoCount;
            renderSyncState();
          }
          if (message.type === "error") {
            state.undo.undoInFlight = false;
            state.undo.redoInFlight = false;
            appendOperationLog({
              kind: "failed",
              title: "操作失败：" + message.error.message,
              detail: "服务端返回错误",
              coalesceKey: "failed:socket:" + message.error.message
            });
            renderOperationLogs();
            updateUndoState();
            renderSyncState();
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
          updateUndoState();
        };
        socket.onclose = (event) => {
          if (state.socket !== socket) return;
          state.socket = null;
          state.offline.connected = false;
          state.offline.reconnectingFromFailure = true;
          state.undo.undoInFlight = false;
          state.undo.redoInFlight = false;
          markCurrentUserSendingItemsPending("WebSocket 已断开，等待恢复联网后重试");
          if (event.code === 4001) {
            setLoginStatus("该账号已在其他地方登录，当前会话已失效。");
            logout();
            return;
          }
          state.offline.connectionStatus = "offline";
          renderSyncState();
          setStatus("WebSocket 已断开");
        };
        socket.onerror = () => {
          if (state.socket !== socket) return;
          state.socket = null;
          state.offline.connected = false;
          state.offline.reconnectingFromFailure = true;
          state.undo.undoInFlight = false;
          state.undo.redoInFlight = false;
          state.offline.connectionStatus = "offline";
          markCurrentUserSendingItemsPending("WebSocket 错误，等待恢复联网后重试");
          renderSyncState();
        };
      }

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

      window.addEventListener("online", () => {
        appendOperationLog({
          kind: "local",
          title: "浏览器网络已恢复",
          detail: "正在重新连接服务器",
          key: "network:browser-online:" + Date.now()
        });
        renderOperationLogs();
        autoReconnectIfNeeded();
      });

      window.addEventListener("offline", () => {
        markConnectionUnavailable("浏览器报告网络已断开，操作会保留在离线队列");
      });

      // ── Avatar ──

      const AVATAR_GRADIENTS = [
        "linear-gradient(135deg, #4f46e5, #7c3aed)",
        "linear-gradient(135deg, #06b6d4, #0ea5e9)",
        "linear-gradient(135deg, #16a34a, #22c55e)",
        "linear-gradient(135deg, #d97706, #f59e0b)",
        "linear-gradient(135deg, #dc2626, #f97316)",
        "linear-gradient(135deg, #7c3aed, #a855f7)",
        "linear-gradient(135deg, #0891b2, #06b6d4)",
        "linear-gradient(135deg, #4f46e5, #06b6d4)"
      ];

      function avatarGradientIndex(userId) {
        if (!userId) return 0;
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
          hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) % AVATAR_GRADIENTS.length;
      }

      function avatarColorIndex(userId) {
        return avatarGradientIndex(userId);
      }

      function getAvatarKey(userId) {
        return "crdt-avatar-" + (userId || "anon");
      }

      function loadAvatarData(userId) {
        try {
          const stored = window.localStorage.getItem(getAvatarKey(userId));
          return stored || null;
        } catch { return null; }
      }

      function saveAvatarData(userId, dataUrl) {
        try {
          window.localStorage.setItem(getAvatarKey(userId), dataUrl);
        } catch { /* quota exceeded, ignore */ }
      }

      function removeAvatarData(userId) {
        try {
          window.localStorage.removeItem(getAvatarKey(userId));
        } catch { /* ignore */ }
      }

      function updateAvatar(el, user) {
        if (!user || !el) return;
        const avatarData = loadAvatarData(user.id);
        if (avatarData) {
          el.textContent = "";
          el.style.backgroundImage = "url(" + avatarData + ")";
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
        } else {
          el.textContent = user.name ? user.name.charAt(0).toUpperCase() : "U";
          el.style.backgroundImage = "";
          el.style.backgroundSize = "";
          el.style.backgroundPosition = "";
          el.style.background = AVATAR_GRADIENTS[avatarColorIndex(user.id)];
        }
      }

      // ── Settings Modal ──

      function openSettings(tab) {
        els.settingsDialog.classList.remove("hidden");
        els.settingsDialog.setAttribute("aria-hidden", "false");
        switchSettingsTab(tab || "general");
        populateSettingsForm();
      }

      function closeSettings() {
        els.settingsDialog.classList.add("hidden");
        els.settingsDialog.setAttribute("aria-hidden", "true");
      }

      function switchSettingsTab(tabName) {
        for (const tab of document.querySelectorAll(".settings-tab")) {
          tab.classList.toggle("active", tab.dataset.tab === tabName);
        }
        els.settingsPanelGeneral.classList.toggle("hidden", tabName !== "general");
        els.settingsPanelAccount.classList.toggle("hidden", tabName !== "account");
      }

      function populateSettingsForm() {
        if (!state.user) return;
        updateAvatar(els.settingsAvatar, state.user);
        els.settingsUsername.value = state.user.username || "";
        els.settingsName.value = state.user.name || "";
        els.settingsCurrentPassword.value = "";
        els.settingsNewPassword.value = "";
        els.settingsConfirmPassword.value = "";
        els.settingsProfileStatus.textContent = "";
        els.darkModeToggle.checked = document.documentElement.dataset.theme === "dark";
      }

      // ── Settings event handlers ──

      els.settingsBtn.addEventListener("click", () => {
        els.userDropdown.classList.remove("show");
        openSettings("account");
      });

      els.switchAccountBtn.addEventListener("click", () => {
        els.userDropdown.classList.remove("show");
        logout().catch((error) => setStatus(error.message));
      });

      els.settingsClose.addEventListener("click", closeSettings);

      els.settingsDialog.addEventListener("click", (event) => {
        if (event.target === els.settingsDialog) closeSettings();
      });

      for (const tab of document.querySelectorAll(".settings-tab")) {
        tab.addEventListener("click", () => {
          switchSettingsTab(tab.dataset.tab);
        });
      }

      // Dark mode toggle in settings
      els.darkModeToggle.addEventListener("change", () => {
        const theme = els.darkModeToggle.checked ? "dark" : "light";
        document.documentElement.dataset.theme = theme;
        const themeBtn = document.querySelector("#themeToggle");
        if (themeBtn) themeBtn.textContent = theme === "dark" ? "☀" : "☾";
      });

      // Avatar upload
      els.uploadAvatarBtn.addEventListener("click", () => {
        els.avatarFileInput.click();
      });

      els.avatarFileInput.addEventListener("change", () => {
        const file = els.avatarFileInput.files && els.avatarFileInput.files[0];
        if (!file || !state.user) return;
        if (!file.type.startsWith("image/")) {
          els.settingsProfileStatus.textContent = "请选择图片文件";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          // Resize to 128x128 before storing
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, 128, 128);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
              saveAvatarData(state.user.id, dataUrl);
              updateAvatar(els.settingsAvatar, state.user);
              updateAvatar(els.headerAvatar, state.user);
              els.settingsProfileStatus.textContent = "头像已更新";
            }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
        els.avatarFileInput.value = "";
      });

      // Remove custom avatar
      els.removeAvatarBtn.addEventListener("click", () => {
        if (!state.user) return;
        removeAvatarData(state.user.id);
        updateAvatar(els.settingsAvatar, state.user);
        updateAvatar(els.headerAvatar, state.user);
        els.settingsProfileStatus.textContent = "已恢复默认头像";
      });

      // Save nickname
      els.saveNameBtn.addEventListener("click", async () => {
        const newName = els.settingsName.value.trim();
        if (!newName) {
          els.settingsProfileStatus.textContent = "昵称不能为空";
          return;
        }
        if (newName === state.user.name) {
          els.settingsProfileStatus.textContent = "昵称未修改";
          return;
        }
        try {
          els.saveNameBtn.disabled = true;
          els.settingsProfileStatus.textContent = "保存中...";
          const body = await requestJson("/api/profile", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: newName })
          });
          if (body.passwordChanged) {
            els.settingsProfileStatus.textContent = "昵称已保存，密码变更导致会话刷新，请重新登录";
            logout();
            return;
          }
          state.user.name = newName;
          // Sync to user management panel (no operation log)
          const userInList = state.users.find((u) => u.id === state.user.id);
          if (userInList) userInList.name = newName;
          updateAvatar(els.headerAvatar, state.user);
          updateAvatar(els.settingsAvatar, state.user);
          els.settingsProfileStatus.textContent = "昵称已保存";
          render();
        } catch (error) {
          els.settingsProfileStatus.textContent = error.message || "保存失败";
        } finally {
          els.saveNameBtn.disabled = false;
        }
      });

      // Change password
      els.changePasswordBtn.addEventListener("click", async () => {
        const currentPassword = els.settingsCurrentPassword.value;
        const newPassword = els.settingsNewPassword.value;
        const confirmPassword = els.settingsConfirmPassword.value;

        if (!currentPassword) {
          els.settingsProfileStatus.textContent = "请输入当前密码";
          return;
        }
        if (!newPassword || newPassword.length < 3) {
          els.settingsProfileStatus.textContent = "新密码长度不能少于 3 位";
          return;
        }
        if (newPassword !== confirmPassword) {
          els.settingsProfileStatus.textContent = "两次输入的新密码不一致";
          return;
        }

        try {
          els.changePasswordBtn.disabled = true;
          els.settingsProfileStatus.textContent = "修改中...";
          const body = await requestJson("/api/profile", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword })
          });
          els.settingsProfileStatus.textContent = "密码已修改，会话已刷新，请重新登录";
          setTimeout(() => logout(), 1500);
        } catch (error) {
          els.settingsProfileStatus.textContent = error.message || "修改失败";
          els.changePasswordBtn.disabled = false;
        }
      });

      // Clear cache
      els.clearCacheBtn.addEventListener("click", () => {
        state.offline.queue = [];
        state.editing.drafts = {};
        saveOfflineQueue();
        els.settingsProfileStatus.textContent = "本地缓存已清除";
        setTimeout(() => {
          if (els.settingsProfileStatus.textContent === "本地缓存已清除") {
            els.settingsProfileStatus.textContent = "";
          }
        }, 2000);
      });

      // Keep dropdown visible when clicking inside it
      els.userDropdown.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", () => {
        els.userDropdown.classList.remove("show");
      });

      // Backup: allow click on user-pill to toggle dropdown (for touch devices)
      els.headerPill.addEventListener("click", (event) => {
        event.stopPropagation();
        els.userDropdown.classList.toggle("show");
      });

      // ── Log limit selector ──

      function updateLogLimitSummary() {
        var label;
        if (operationLogLimit === 0) {
          label = "不显示";
        } else if (operationLogLimit === Infinity) {
          label = "完全显示";
        } else {
          label = "显示 " + operationLogLimit + " 条";
        }
        els.logLimitSummary.title = label;
      }

      function buildLogLimitMenu() {
        updateLogLimitSummary();
        els.logLimitMenu.innerHTML = "";
        for (const opt of LOG_LIMIT_OPTIONS) {
          const isActive = opt.value === operationLogLimit;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "log-limit-option" + (isActive ? " active" : "");
          btn.textContent = opt.label;
          btn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            operationLogLimit = opt.value;
            saveLogLimit(operationLogLimit);
            updateLogLimitSummary();
            buildLogLimitMenu();
            els.logLimitSelect.open = false;
            renderOperationLogs();
          });
          els.logLimitMenu.appendChild(btn);
        }
      }

      buildLogLimitMenu();

      // Close log limit dropdown when clicking outside
      document.addEventListener("click", (event) => {
        if (event.target && event.target.closest) {
          if (!event.target.closest(".log-limit-select") && els.logLimitSelect.open) {
            els.logLimitSelect.open = false;
          }
        }
      });

      window.localStorage.removeItem("crdt-editor-session-token-v1");

      // Poll online count for login screen (no WebSocket yet)
      async function pollOnlineCount() {
        try {
          const resp = await fetch("/api/online-count");
          if (resp.ok) {
            const data = await resp.json();
            state.onlineCountPolled = data.count ?? 0;
            if (!state.user) renderOnlineIndicator();
          }
        } catch (e) {
          // Silently ignore — non-critical
        }
      }
      pollOnlineCount();
      setInterval(pollOnlineCount, 5000);

      // Clean up presence on page unload
      window.addEventListener("beforeunload", () => {
        if (isSocketOpen() && state.user) {
          try {
            state.socket.send(JSON.stringify({
              type: "awareness",
              awareness: { nodeId: null }
            }));
          } catch (e) {
            // Best-effort
          }
        }
      });

      // Delegated tooltip for presence icons (body-level, escapes node overflow:hidden)
      document.addEventListener("mouseenter", (e) => {
        const icon = e.target.closest(".node-presence-icon");
        if (!icon) return;
        const nodeEl = icon.closest(".node");
        if (!nodeEl) return;
        const nodeId = nodeEl.dataset.nodeId;
        const editorsByNode = getEditorsByNode();
        const editors = editorsByNode[nodeId] || [];
        const tooltip = els.presenceTooltip;
        if (!tooltip) return;

        if (editors.length > 0) {
          tooltip.innerHTML = editors.map((u) =>
            '<div class="presence-user-row">' +
              '<span class="presence-user-avatar" style="background:' + escapeAttr(u.color) + '">' +
                escapeHtml(u.userName.charAt(0).toUpperCase()) +
              '</span>' +
              '<span class="presence-user-name">' + escapeHtml(u.userName) + '</span>' +
            '</div>'
          ).join("");
        } else {
          tooltip.innerHTML = '<div class="presence-empty-hint">无</div>';
        }

        const rect = icon.getBoundingClientRect();
        tooltip.style.left = (rect.right + 8) + "px";
        tooltip.style.top = (rect.top + rect.height / 2) + "px";
        tooltip.style.transform = "translateY(-50%)";
        tooltip.classList.add("show");
      }, true);

      document.addEventListener("mouseleave", (e) => {
        const icon = e.target.closest(".node-presence-icon");
        if (!icon) return;
        const tooltip = els.presenceTooltip;
        if (tooltip) tooltip.classList.remove("show");
      }, true);

      render();
    </script>
  </body>
</html>`;
}
