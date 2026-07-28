/**
 * github-sync.js —— 把 GitHub 当“云端后端”做笔记同步
 *
 * 设计要点：
 *  - 全部笔记序列化为一个 JSON 文件（默认 data/notes.json）存进一个私有 GitHub 仓库，
 *    通过 GitHub Contents API（支持浏览器跨域）读写，无需自建服务器。
 *  - 认证用 Personal Access Token（PAT，需 repo 权限），仅存在浏览器 localStorage，
 *    不进仓库。建议用独立“私有仓库”存数据，避免笔记内容被公开访问。
 *  - 同步策略：启动时自动拉取（合并）；改动后防抖自动推送；也可手动“立即同步”。
 *  - 冲突处理：笔记按 id 合并，updatedAt 较新者胜（按笔记粒度，而非整文件覆盖）。
 *  - push 遇到 409（远端已被改动）会自动 re-pull 再 push 一次。
 */
(function (global) {
  'use strict';

  var CONFIG_KEY = 'gh_sync_config';
  var STATUS_KEY = 'gh_sync_status';
  var DEFAULT_BRANCH = 'main';
  var DEFAULT_PATH = 'data/notes.json';

  var cfg = null;            // 当前配置（懒加载）
  var state = { sha: null, pending: false };  // 内存态：远端文件 sha、是否有待推送改动
  var handlers = {};         // onStatus / onError / onSyncStart
  var pushTimer = null;

  // ---------- 编码（UTF-8 安全，支持中文）----------
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------- 配置 ----------
  function loadConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      cfg = raw ? JSON.parse(raw) : null;
    } catch (e) { cfg = null; }
    return cfg;
  }
  function getConfig() { return cfg || loadConfig(); }

  function saveConfig(input) {
    var c = {
      owner: (input.owner || '').trim(),
      repo: (input.repo || '').trim(),
      branch: (input.branch || '').trim() || DEFAULT_BRANCH,
      path: (input.path || '').trim() || DEFAULT_PATH,
      token: (input.token || '').trim()
    };
    // 允许 owner/repo 用 "user/repo" 一体式输入
    if (c.owner && c.owner.indexOf('/') !== -1 && !c.repo) {
      var parts = c.owner.split('/');
      c.owner = parts[0].trim();
      c.repo = parts[1].trim();
      c.owner = c.owner; // 保持
    }
    cfg = c;
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }

  function clearConfig() {
    cfg = null; state.sha = null; state.pending = false;
    try { localStorage.removeItem(CONFIG_KEY); } catch (e) {}
  }

  function isConfigured() {
    var c = getConfig();
    return !!(c && c.owner && c.repo && c.token);
  }

  // 仓库标识：若只填了 owner 没填 repo（或反之），尝试拼 "owner/repo"
  function repoSlug() {
    var c = getConfig();
    if (!c) return '';
    if (c.owner && c.repo) return c.owner + '/' + c.repo;
    return (c.owner + '/' + c.repo).replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  }

  // ---------- GitHub API ----------
  function apiBase() {
    var slug = repoSlug();
    return 'https://api.github.com/repos/' + slug;
  }
  function contentsUrl() {
    var c = getConfig();
    var p = (c.path || DEFAULT_PATH).split('/').map(encodeURIComponent).join('/');
    return apiBase() + '/contents/' + p + '?ref=' + encodeURIComponent(c.branch || DEFAULT_BRANCH);
  }
  function repoUrl() { return apiBase(); }

  function ghHeaders(extra) {
    var c = getConfig();
    var h = {
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (c && c.token) h['Authorization'] = 'Bearer ' + c.token;
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  function httpError(status, message) { return { status: status, message: message }; }

  // 读取远端文件，返回 { content(string), sha }；404 时抛出 { status: 404 }
  function getFileRaw() {
    return fetch(contentsUrl(), { method: 'GET', headers: ghHeaders() }).then(function (r) {
      if (r.status === 404) throw httpError(404, '远端数据文件不存在');
      if (!r.ok) return r.json().then(function (j) { throw httpError(r.status, (j && j.message) || ('HTTP ' + r.status)); },
        function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return r.json();
    }).then(function (data) {
      return { content: b64decode(data.content), sha: data.sha };
    });
  }

  // 写入远端文件；sha 为 null 表示新建。返回新 sha。
  function putFile(content, sha, message) {
    var body = {
      message: message || ('sync notes ' + new Date().toISOString()),
      content: content,
      branch: getConfig().branch || DEFAULT_BRANCH
    };
    if (sha) body.sha = sha;
    return fetch(contentsUrl(), {
      method: 'PUT',
      headers: ghHeaders(),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 409) throw { conflict: true, status: 409 };
      if (!r.ok) return r.json().then(function (j) { throw httpError(r.status, (j && j.message) || ('HTTP ' + r.status)); },
        function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return r.json();
    }).then(function (data) {
      return data.content ? data.content.sha : sha;
    });
  }

  // ---------- 数据解析 / 合并 ----------
  /**
   * 解析远端文件内容，统一返回 { notes, goals, roadmap }。
   * 旧版只含 notes 数组的文件也能兼容（goals/roadmap 回退为空）。
   */
  function parsePayload(text) {
    try {
      var obj = JSON.parse(text);
      if (obj && typeof obj === 'object') {
        return {
          notes: Array.isArray(obj.notes) ? obj.notes : (Array.isArray(obj) ? obj : []),
          goals: Array.isArray(obj.goals) ? obj.goals : [],
          roadmap: (obj.roadmap && typeof obj.roadmap === 'object') ? obj.roadmap : null
        };
      }
    } catch (e) {}
    return { notes: [], goals: [], roadmap: null };
  }

  function parseNotes(text) {
    return parsePayload(text).notes;
  }

  /** 学习目标按 id 合并：任一端存在即保留；都存在时 updatedAt 较新者胜（相等取远端） */
  function mergeGoals(local, remote) {
    var map = {};
    (local || []).forEach(function (g) { if (g && g.id) map[g.id] = g; });
    (remote || []).forEach(function (g) {
      if (!g || !g.id) return;
      var cur = map[g.id];
      if (!cur) { map[g.id] = g; return; }
      var lu = cur.updatedAt || 0, ru = g.updatedAt || 0;
      if (ru >= lu) map[g.id] = g;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  /** 路线图进度按路线合并：同一节点在任一端为“已完成”则记为完成（OR 合并，避免进度丢失） */
  function mergeRoadmap(local, remote) {
    local = local || {}; remote = remote || {};
    var out = JSON.parse(JSON.stringify(local));
    Object.keys(remote).forEach(function (route) {
      var ra = remote[route];
      if (!Array.isArray(ra)) return;
      if (!Array.isArray(out[route])) { out[route] = ra.slice(); return; }
      var la = out[route];
      for (var i = 0; i < ra.length; i++) if (ra[i]) la[i] = true;
    });
    return out;
  }

  /** 把远端 payload 里的 goals/roadmap 合并写回本地（若存在对应模块） */
  function restoreExtras(obj) {
    if (global.LearningGoals && Array.isArray(obj.goals)) {
      global.LearningGoals.replaceAll(mergeGoals(global.LearningGoals.getAll(), obj.goals));
    }
    if (global.Roadmap && obj.roadmap && typeof obj.roadmap === 'object') {
      global.Roadmap.replaceAll(mergeRoadmap(global.Roadmap.getAll(), obj.roadmap));
    }
  }

  // 按 id 合并：远端有而本地无 → 取远端；都有 → updatedAt 较新者胜
  function mergeNotes(local, remote) {
    var map = {};
    (local || []).forEach(function (n) { if (n && n.id) map[n.id] = n; });
    (remote || []).forEach(function (r) {
      if (!r || !r.id) return;
      var cur = map[r.id];
      if (!cur || (r.updatedAt || 0) > (cur.updatedAt || 0)) map[r.id] = r;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  // ---------- 状态 ----------
  function readStatus() {
    try { return JSON.parse(localStorage.getItem(STATUS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeStatus(patch) {
    var s = readStatus();
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    try { localStorage.setItem(STATUS_KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function getStatus() {
    var s = readStatus();
    s.pending = !!state.pending;
    s.configured = isConfigured();
    return s;
  }
  function emitStatus() { if (handlers.onStatus) try { handlers.onStatus(getStatus()); } catch (e) {} }
  function notifyError(msg) { if (handlers.onError) try { handlers.onError(msg); } catch (e) {} }
  function notifySyncStart() { if (handlers.onSyncStart) try { handlers.onSyncStart(); } catch (e) {} }

  // ---------- 拉取 / 推送 ----------
  function pull() {
    return getFileRaw().then(function (f) {
      state.sha = f.sha;
      var obj = parsePayload(f.content);
      var merged = mergeNotes(global.NoteStore.getAll(), obj.notes);
      global.NoteStore.replaceAll(merged);
      // 同步学习目标与路线图进度（跨设备不丢失）
      restoreExtras(obj);
      writeStatus({ lastSynced: Date.now(), lastError: null });
      emitStatus();
      if (handlers.onAfterSync) try { handlers.onAfterSync(); } catch (e) {}
      return merged;
    }, function (err) {
      if (err && err.status === 404) {
        // 远端尚无数据文件：置空 sha，下次 push 会新建；本地数据不变
        state.sha = null;
        writeStatus({ lastError: null });
        emitStatus();
        return [];
      }
      writeStatus({ lastError: errMsg(err) });
      emitStatus();
      throw err;
    });
  }

  function push() {
    var notes = global.NoteStore.getAll();
    var payload = JSON.stringify({
      version: 1,
      syncedAt: Date.now(),
      notes: notes,
      goals: (global.LearningGoals ? global.LearningGoals.getAll() : []),
      roadmap: (global.Roadmap ? global.Roadmap.getAll() : {})
    });
    var content = b64encode(payload);

    // 没有 sha 时，先取一次远端（顺便把远端独有笔记合并进来，避免覆盖丢失）
    var getSha = state.sha ? Promise.resolve({ sha: state.sha, content: null }) : getFileRaw().then(
      function (f) { return { sha: f.sha, content: f.content }; },
      function (err) { if (err && err.status === 404) return { sha: null, content: null }; throw err; }
    );

    return getSha.then(function (info) {
      if (info.content != null) {
        var obj = parsePayload(info.content);
        var merged = mergeNotes(notes, obj.notes);
        if (merged.length !== notes.length) global.NoteStore.replaceAll(merged);
        restoreExtras(obj);
      }
      return putFile(content, info.sha, 'sync notes ' + new Date().toISOString());
    }).then(function (newSha) {
      state.sha = newSha;
      state.pending = false;
      writeStatus({ lastSynced: Date.now(), lastError: null });
      emitStatus();
    });
  }

  function pushWithRetry() {
    return push().catch(function (err) {
      if (err && err.conflict) {
        return pull().then(function () { return push(); });
      }
      throw err;
    });
  }

  function syncNow() {
    notifySyncStart();
    return pull().then(function () { return pushWithRetry(); })
      .then(function () { writeStatus({ lastError: null }); emitStatus(); })
      .catch(function (err) {
        writeStatus({ lastError: errMsg(err) });
        emitStatus();
        notifyError('同步失败：' + errMsg(err));
        throw err;
      });
  }

  // 改动后防抖推送
  function schedulePush() {
    if (!isConfigured()) return;
    state.pending = true;
    emitStatus();
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      pushWithRetry().catch(function (err) {
        notifyError('自动同步失败：' + errMsg(err));
      });
    }, 1500);
  }

  // 本地改动钩子（由 app.js 在 save/delete 后调用）
  function onLocalChange() { schedulePush(); }

  // 启动拉取（静默：失败时只记录状态，不打扰用户）
  function initPull(onDone) {
    if (!isConfigured()) { if (onDone) onDone(); return; }
    pull().then(function () {
      // 拉取完成后补推一次：把本地可能尚未上传的学习目标/路线图进度推上去，
      // 避免「只拉不推」导致旧设备上的目标永远留在本地、不上云。
      schedulePush();
      if (onDone) onDone();
    }, function (err) {
      writeStatus({ lastError: errMsg(err) });
      emitStatus();
      if (onDone) onDone();
    });
  }

  // 测试连接（读取仓库元数据）
  function testConnection() {
    return fetch(repoUrl(), { method: 'GET', headers: ghHeaders() }).then(function (r) {
      if (r.ok) return { ok: true, message: '连接成功，仓库可访问' };
      return r.json().then(function (j) {
        return { ok: false, message: (j && j.message) || ('HTTP ' + r.status) };
      }, function () { return { ok: false, message: 'HTTP ' + r.status }; });
    }).catch(function (e) { return { ok: false, message: '网络错误：' + (e && e.message || e) }; });
  }

  function errMsg(err) {
    if (!err) return '未知错误';
    if (err.status === 401) return 'Token 无效或无权限（需 repo 权限）';
    if (err.status === 403) return '无权限或被限流（检查 Token 的 repo 范围）';
    if (err.status === 404) return '仓库或数据文件不存在（确认 owner/repo 与路径）';
    if (err.status === 409) return '远端冲突，正在重试';
    if (err.message) return err.message;
    return 'HTTP ' + (err.status || '?');
  }

  function setHandlers(h) { handlers = h || {}; }

  global.GitHubSync = {
    getConfig: getConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    isConfigured: isConfigured,
    repoSlug: repoSlug,
    setHandlers: setHandlers,
    initPull: initPull,
    syncNow: syncNow,
    pull: pull,
    push: push,
    schedulePush: schedulePush,
    onLocalChange: onLocalChange,
    testConnection: testConnection,
    getStatus: getStatus,
    // 暴露给测试
    _mergeNotes: mergeNotes,
    _mergeGoals: mergeGoals,
    _mergeRoadmap: mergeRoadmap,
    _parsePayload: parsePayload,
    _b64encode: b64encode,
    _b64decode: b64decode,
    _parseNotes: parseNotes
  };
})(window);
