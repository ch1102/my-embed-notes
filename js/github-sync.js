/**
 * github-sync.js —— 把 GitHub 当"云端后端"做笔记同步（每篇笔记一个文件）
 *
 * 存储模型（避免单文件 >1MB 触发 GitHub Contents API 限制）：
 *  - 每篇笔记独立存为一个 JSON 文件：<dir>/notes/<id>.json
 *  - 学习目标 + 路线图进度合并存一个文件：<dir>/_sync_extras.json
 *  - 小文件走 Contents API；单个文件 >1MB 时自动回退 Git Data API（最大 100MB）。
 *  - 认证用 PAT（仅 localStorage），冲突按 id / updatedAt 较新者胜。
 *  - 推送前先合并云端，再上传；绝不整文件覆盖，云端独有笔记受保护。
 */
(function (global) {
  'use strict';

  var CONFIG_KEY = 'gh_sync_config';
  var STATUS_KEY = 'gh_sync_status';
  var DEFAULT_BRANCH = 'main';
  var DEFAULT_PATH = 'data/notes.json'; // 仅用于推导目录

  var cfg = null;
  var state = { pending: false };
  var handlers = {};
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
    try { var raw = localStorage.getItem(CONFIG_KEY); cfg = raw ? JSON.parse(raw) : null; }
    catch (e) { cfg = null; }
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
    }
    cfg = c;
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }

  function clearConfig() {
    cfg = null; state.pending = false;
    try { localStorage.removeItem(CONFIG_KEY); } catch (e) {}
  }

  function isConfigured() {
    var c = getConfig();
    return !!(c && c.owner && c.repo && c.token);
  }

  function repoSlug() {
    var c = getConfig();
    if (!c) return '';
    if (c.owner && c.repo) return c.owner + '/' + c.repo;
    return (c.owner + '/' + c.repo).replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  }

  // 由 path 推导笔记目录与附加数据文件路径
  // 例：path = "data/notes.json" → notesDir = "data/notes/"，extrasPath = "data/_sync_extras.json"
  function notesDir() {
    var p = getConfig().path || DEFAULT_PATH;
    return p.replace(/\.json$/, '/');
  }
  function extrasPath() {
    var p = getConfig().path || DEFAULT_PATH;
    var dir = p.substring(0, p.lastIndexOf('/') + 1) || '';
    return dir + '_sync_extras.json';
  }

  // ---------- GitHub API 基础 ----------
  function apiBase() { return 'https://api.github.com/repos/' + repoSlug(); }
  function contentsUrlFor(path) {
    var c = getConfig();
    var p = path.split('/').map(encodeURIComponent).join('/');
    return apiBase() + '/contents/' + p + '?ref=' + encodeURIComponent(c.branch || DEFAULT_BRANCH);
  }
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
  function isTooLargeError(err) {
    if (!err || !err.message) return false;
    var m = err.message;
    return m.indexOf('too large') !== -1 ||
           m.indexOf('1 MB') !== -1 ||
           m.indexOf('100 MB') !== -1 ||
           m.indexOf('blobs up to') !== -1;
  }

  // ---------- Git Data API（单文件 >1MB 时回退，支持最大 100MB）----------
  function getRefSha(branch) {
    return ghGet(apiBase() + '/git/ref/heads/' + encodeURIComponent(branch || DEFAULT_BRANCH))
      .then(function (d) { return d.object.sha; });
  }
  function getTree(commitSha) { return ghGet(apiBase() + '/git/trees/' + commitSha + '?recursive=1'); }
  function findInTree(tree, path) {
    if (!tree || !Array.isArray(tree.tree)) return null;
    var t = (path || '').replace(/^\//, '');
    for (var i = 0; i < tree.tree.length; i++) if (tree.tree[i].path === t) return tree.tree[i];
    return null;
  }
  function getBlobContent(blobSha) {
    return ghGet(apiBase() + '/git/blobs/' + blobSha).then(function (d) {
      if (d.encoding === 'base64') return b64decode(d.content);
      if (d.encoding === 'utf-8') return d.content;
      throw httpError(500, '未知 blob 编码: ' + d.encoding);
    });
  }
  function writeLargeFile(path, b64content, message) {
    var c = getConfig(), branch = c.branch || DEFAULT_BRANCH, filePath = path;
    return ghPost(apiBase() + '/git/blobs', { content: b64content, encoding: 'base64' }).then(function (blobData) {
      var blobSha = blobData.sha;
      return getRefSha(branch).then(function (commitSha) {
        return getTree(commitSha).then(function (treeData) {
          var entry = findInTree(treeData, filePath);
          var newTree = [];
          for (var i = 0; i < treeData.tree.length; i++) {
            var it = treeData.tree[i];
            if (it.path === filePath) newTree.push({ path: it.path, mode: it.mode || '100644', type: 'blob', sha: blobSha });
            else newTree.push({ path: it.path, mode: it.mode || (it.type === 'tree' ? '040000' : '100644'), type: it.type, sha: it.sha });
          }
          if (!entry) newTree.push({ path: filePath, mode: '100644', type: 'blob', sha: blobSha });
          return ghPost(apiBase() + '/git/trees', { tree: newTree }).then(function (nt) {
            return ghPost(apiBase() + '/git/commits', {
              message: message || ('sync ' + filePath), tree: nt.sha, parents: [commitSha]
            }).then(function (cd) {
              return ghPatch(apiBase() + '/git/refs/heads/' + encodeURIComponent(branch), { sha: cd.sha })
                .then(function () { return cd.sha; });
            });
          });
        });
      });
    });
  }
  function getFileRawGitData(path) {
    var branch = (getConfig().branch || DEFAULT_BRANCH);
    return getRefSha(branch).then(function (commitSha) {
      return getTree(commitSha).then(function (treeData) {
        var entry = findInTree(treeData, path);
        if (!entry || entry.type !== 'blob') throw httpError(404, '远端文件不存在');
        return getBlobContent(entry.sha).then(function (content) { return { content: content, sha: commitSha }; });
      });
    });
  }
  function ghGet(url) {
    return fetch(url, { method: 'GET', headers: ghHeaders() }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw httpError(r.status, (j && j.message) || ('HTTP ' + r.status)); },
        function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return r.json();
    });
  }
  function ghPost(url, body) {
    return fetch(url, { method: 'POST', headers: ghHeaders(), body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw httpError(r.status, (j && j.message) || ('HTTP ' + r.status)); },
        function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return r.json();
    });
  }
  function ghPatch(url, body) {
    return fetch(url, { method: 'PATCH', headers: ghHeaders(), body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw httpError(r.status, (j && j.message) || ('HTTP ' + r.status)); },
        function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return r.json();
    });
  }

  // ---------- 统一文件读写（小文件 Contents API / 大文件 Git Data API）----------
  function readRemoteFile(path) {
    return fetch(contentsUrlFor(path), { method: 'GET', headers: ghHeaders() }).then(function (r) {
      if (r.status === 404) throw httpError(404, 'not found');
      if (!r.ok) {
        return r.json().then(function (j) {
          var err = httpError(r.status, (j && j.message) || ('HTTP ' + r.status));
          if (isTooLargeError(err)) throw { _useGitData: true, path: path };
          throw err;
        }, function () { throw httpError(r.status, 'HTTP ' + r.status); });
      }
      return r.json();
    }).then(function (data) {
      // ========== 新增修复：检查 content 是否为 null 或 message 包含 too large ==========
      if (!data.content || (data.message && data.message.toLowerCase().indexOf('too large') !== -1)) {
        throw { _useGitData: true, path: path };
      }
      return { content: b64decode(data.content), sha: data.sha };
    }, function (err) {
      if (err && err._useGitData) return getFileRawGitData(path);
      throw err;
    });
  }
  function writeRemoteFile(path, content, sha, message) {
    var body = { message: message || ('sync ' + path), content: content, branch: getConfig().branch || DEFAULT_BRANCH };
    if (sha) body.sha = sha;
    return fetch(contentsUrlFor(path), {
      method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 409) throw { conflict: true, status: 409, path: path };
      if (!r.ok) return r.json().then(function (j) {
        var err = httpError(r.status, (j && j.message) || ('HTTP ' + r.status));
        if (isTooLargeError(err)) return writeLargeFile(path, content, message);
        throw err;
      }, function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return r.json();
    }).then(function (data) { return data.content ? data.content.sha : sha; });
  }
  function deleteRemoteFile(path, sha) {
    return fetch(contentsUrlFor(path), {
      method: 'DELETE', headers: ghHeaders(),
      body: JSON.stringify({ message: 'delete ' + path, sha: sha })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw httpError(r.status, (j && j.message) || ('HTTP ' + r.status)); },
        function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return true;
    });
  }

  // ---------- 笔记目录列举 ----------
  function listNotesDir() {
    return fetch(contentsUrlFor(notesDir()), { method: 'GET', headers: ghHeaders() }).then(function (r) {
      if (r.status === 404) return [];
      if (!r.ok) return r.json().then(function (j) { throw httpError(r.status, (j && j.message) || ('HTTP ' + r.status)); },
        function () { throw httpError(r.status, 'HTTP ' + r.status); });
      return r.json();
    }).then(function (entries) {
      if (!Array.isArray(entries)) return [];
      return entries.filter(function (e) { return e.type === 'file' && /\.json$/.test(e.name); });
    });
  }

  // ---------- 数据解析 / 合并 ----------
  function parseExtras(text) {
    try {
      var obj = JSON.parse(text);
      if (obj && typeof obj === 'object') {
        return {
          goals: Array.isArray(obj.goals) ? obj.goals : [],
          roadmap: (obj.roadmap && typeof obj.roadmap === 'object') ? obj.roadmap : null
        };
      }
    } catch (e) {}
    return { goals: [], roadmap: null };
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

  /** 路线图进度按路线合并：同一节点在任一端为“已完成”则记为完成（OR 合并） */
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

  // ---------- 读取云端全部笔记 + 附加数据 ----------
  function fetchRemote() {
    return listNotesDir().then(function (entries) {
      var byName = {};
      entries.forEach(function (e) { byName[e.name] = e; });
      return Promise.all(entries.map(function (e) {
        return readRemoteFile(notesDir() + e.name).then(function (f) {
          try { return { ok: true, note: JSON.parse(f.content), name: e.name }; } catch (e2) {
            return { ok: false, name: e.name, reason: 'JSON解析失败: ' + (e2.message || e2) };
          }
        }).catch(function (err) {
          return { ok: false, name: e.name, reason: errMsg(err) || '未知错误' };
        });
      })).then(function (results) {
        var remoteNotes = [], failures = [];
        results.forEach(function (r) {
          if (r.ok && r.note && r.note.id) remoteNotes.push(r.note);
          else failures.push(r.name + '(' + (r.reason || '?') + ')');
        });
        return readRemoteFile(extrasPath()).then(function (f) {
          return { remoteNotes: remoteNotes, extras: parseExtras(f.content), byName: byName, extrasSha: f.sha, failures: failures };
        }, function (err) {
          if (err && err.status === 404) return { remoteNotes: remoteNotes, extras: { goals: [], roadmap: null }, byName: byName, extrasSha: null, failures: failures };
          throw err;
        });
      });
    });
  }

  // ---------- 拉取 ----------
  function pull() {
    var localCount = global.NoteStore.getAll().length;
    return fetchRemote().then(function (res) {
      var remoteNotes = res.remoteNotes, extras = res.extras, failures = res.failures || [];
      var merged = mergeNotes(global.NoteStore.getAll(), remoteNotes);
      global.NoteStore.replaceAll(merged);
      restoreExtras(extras);
      // 构建警告信息
      var warn = null;
      if (remoteNotes.length === 0 && localCount > 0) {
        warn = '云端文件为空(0条)，已保留本机 ' + merged.length + ' 条；请在有真实笔记的设备点「⬆ 推送」恢复云端';
      }
      if (failures.length > 0) {
        warn = (warn ? warn + '；' : '') + '⚠ ' + failures.length + ' 篇笔记读取失败: ' + failures.join('、');
      }
      writeStatus({ lastSynced: Date.now(), lastError: warn, lastPullRemote: remoteNotes.length, lastPullLocal: merged.length, lastPullExpected: (res.byName ? Object.keys(res.byName).length : remoteNotes.length) + (failures.length ? ' (失败' + failures.length + ')' : '') });
      emitStatus();
      if (handlers.onAfterSync) try { handlers.onAfterSync(); } catch (e) {}
      return merged;
    }, function (err) {
      if (err && err.status === 404) { writeStatus({ lastError: null }); emitStatus(); return []; }
      writeStatus({ lastError: errMsg(err) }); emitStatus(); throw err;
    });
  }

  // ---------- 强制从云端覆盖拉取 ----------
  function forcePull() {
    var localCount = global.NoteStore.getAll().length;
    return fetchRemote().then(function (res) {
      var remoteNotes = res.remoteNotes, failures = res.failures || [];
      if (remoteNotes.length === 0 && localCount > 0) {
        var msg = '云端为空(0 条)，已保留本机 ' + localCount + ' 条，未执行覆盖';
        writeStatus({ lastSynced: Date.now(), lastError: msg, lastPullRemote: 0, lastPullLocal: localCount });
        emitStatus();
        return global.NoteStore.getAll();
      }
      global.NoteStore.replaceAll(remoteNotes);
      restoreExtras(res.extras);
      var warn = failures.length > 0 ? ('⚠ ' + failures.length + ' 篇笔记读取失败: ' + failures.join('、')) : null;
      writeStatus({ lastSynced: Date.now(), lastError: warn, lastPullRemote: remoteNotes.length, lastPullLocal: remoteNotes.length });
      emitStatus();
      if (handlers.onAfterSync) try { handlers.onAfterSync(); } catch (e) {}
      return remoteNotes;
    }, function (err) {
      writeStatus({ lastError: errMsg(err) }); emitStatus(); throw err;
    });
  }

  // ---------- diff（推送前反馈）----------
  function diffNotes(local, remote) {
    var rmap = {};
    (remote || []).forEach(function (n) { if (n && n.id) rmap[n.id] = n; });
    var added = 0, updated = 0, unchanged = 0, remoteNewer = 0;
    (local || []).forEach(function (n) {
      if (!n || !n.id) return;
      var r = rmap[n.id];
      if (!r) added++;
      else if ((n.updatedAt || 0) > (r.updatedAt || 0)) updated++;
      else if ((r.updatedAt || 0) > (n.updatedAt || 0)) remoteNewer++;
      else unchanged++;
    });
    return { added: added, updated: updated, unchanged: unchanged, remoteNewer: remoteNewer };
  }

  // ---------- 推送（先合并云端，再逐篇上传；不删除云端独有笔记）----------
  function push() {
    if (!isConfigured()) return Promise.reject(httpError(400, '未配置同步'));

    var localNotes = global.NoteStore.getAll();
    var localGoals = global.LearningGoals ? global.LearningGoals.getAll() : [];
    var localRoadmap = global.Roadmap ? global.Roadmap.getAll() : {};

    return fetchRemote().then(function (res) {
      var remoteNotes = res.remoteNotes, extras = res.extras, byName = res.byName, extrasSha = res.extrasSha;

      // 合并（保护云端独有笔记 + updatedAt 较新者胜）
      var merged = mergeNotes(localNotes, remoteNotes);
      var mergedGoals = mergeGoals(localGoals, extras.goals);
      var mergedRoadmap = mergeRoadmap(localRoadmap, extras.roadmap);

      // 推前差异（基于合并前的 remoteNotes）
      var d = diffNotes(localNotes, remoteNotes);

      // 写回本地，保证与即将上传一致
      global.NoteStore.replaceAll(merged);
      if (global.LearningGoals) global.LearningGoals.replaceAll(mergedGoals);
      if (global.Roadmap) global.Roadmap.replaceAll(mergedRoadmap);

      // 逐篇上传笔记（含云端独有，已合并进 merged）
      var writes = merged.map(function (note) {
        if (!note || !note.id) return Promise.resolve();
        var name = note.id + '.json';
        var entry = byName[name];
        var content = b64encode(JSON.stringify(note));
        return writeRemoteFile(notesDir() + name, content, entry ? entry.sha : null, 'sync note ' + note.id)
          .catch(function (err) {
            if (err && err.conflict) {
              // 并发冲突：重新取 sha 再写一次
              return readRemoteFile(notesDir() + name).then(function (f) {
                return writeRemoteFile(notesDir() + name, content, f.sha, 'sync note ' + note.id);
              });
            }
            throw err;
          });
      });

      // 上传附加数据（goals/roadmap）
      var extrasContent = b64encode(JSON.stringify({ version: 1, goals: mergedGoals, roadmap: mergedRoadmap }));
      var extrasWrite = writeRemoteFile(extrasPath(), extrasContent, extrasSha, 'sync extras');

      return Promise.all(writes.concat([extrasWrite])).then(function () {
        state.pending = false;
        writeStatus({ lastSynced: Date.now(), lastError: null, lastPushDiff: d });
        emitStatus();
      });
    });
  }

  function pushWithRetry() {
    return push().catch(function (err) {
      if (err && err.conflict) return pull().then(function () { return push(); });
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

  // 改动后：仅标记“待推送”，不再自动上传
  function markDirty() {
    if (!isConfigured()) return;
    state.pending = true;
    emitStatus();
  }
  function onLocalChange() { markDirty(); }
  function schedulePush() { markDirty(); }

  // 启动拉取（静默：失败只记录状态）
  function initPull(onDone) {
    if (!isConfigured()) { if (onDone) onDone(); return; }
    pull().then(function () { if (onDone) onDone(); },
      function (err) { writeStatus({ lastError: errMsg(err) }); emitStatus(); if (onDone) onDone(); });
  }

  // 测试连接（读取仓库元数据）
  function testConnection() {
    return fetch(apiBase(), { method: 'GET', headers: ghHeaders() }).then(function (r) {
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
    forcePull: forcePull,
    push: push,
    schedulePush: schedulePush,
    onLocalChange: onLocalChange,
    testConnection: testConnection,
    getStatus: getStatus,
    // 暴露给测试
    _mergeNotes: mergeNotes,
    _mergeGoals: mergeGoals,
    _mergeRoadmap: mergeRoadmap,
    _parseExtras: parseExtras,
    _b64encode: b64encode,
    _b64decode: b64decode,
    _notesDir: notesDir,
    _extrasPath: extrasPath,
    _listNotesDir: listNotesDir,
    _fetchRemote: fetchRemote
  };
})(window);
