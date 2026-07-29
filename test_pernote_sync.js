// 回归测试：每篇笔记一个文件的同步架构
global.window = global;

// --- 内存 localStorage ---
var mem = {};
global.localStorage = {
  getItem: function (k) { return k in mem ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

// --- 本地数据 mock ---
var store = { _notes: [], getAll: function () { return this._notes; }, replaceAll: function (a) { this._notes = a; } };
global.NoteStore = store;
global.LearningGoals = { _g: [], getAll: function () { return this._g; }, replaceAll: function (a) { this._g = a; } };
global.Roadmap = { _r: {}, getAll: function () { return this._r; }, replaceAll: function (a) { this._r = a; } };

function enc(s) { return Buffer.from(s, 'utf8').toString('base64'); }
function dec(b) { return Buffer.from(b, 'base64').toString('utf8'); }

// ---------- 模拟 GitHub 云端状态 ----------
// cloudNotes: { 'id.json': { contentB64, sha } }
// cloudExtras: { contentB64, sha } | null
var cloudNotes = {};
var cloudExtras = null;
// 标记某个 note 是否应触发 "too large" 错误
var tooLargeNotes = {}; // id -> true

var callLog = [];

function noteName(id) { return id + '.json'; }

global.fetch = function (url, opts) {
  opts = opts || {};
  var method = opts.method || 'GET';
  callLog.push({ method: method, url: (url || '').replace(/\?.*$/, '') });
  var u = typeof url === 'string' ? url : '';

  // 目录列举: .../contents/data/notes/?ref=main
  if (method === 'GET' && /\/contents\/data\/notes\/\?ref=/.test(u)) {
    var entries = Object.keys(cloudNotes).map(function (name) {
      return { name: name, sha: cloudNotes[name].sha, type: 'file', size: cloudNotes[name].contentB64.length };
    });
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(entries); } });
  }

  // 单篇笔记读取: .../contents/data/notes/<id>.json?ref=main
  if (method === 'GET' && /\/contents\/data\/notes\/[^/]+\.json\?ref=/.test(u)) {
    var id = u.split('/contents/data/notes/')[1].split('?')[0].replace(/\.json$/, '');
    var name = noteName(id);
    if (tooLargeNotes[id]) {
      return Promise.resolve({ ok: false, status: 403, json: function () { return Promise.resolve({ message: 'This API returns blobs up to 1 MB in size. The requested blob is too large to fetch via the API.' }); } });
    }
    if (!cloudNotes[name]) return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({ message: 'Not Found' }); } });
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: cloudNotes[name].contentB64, sha: cloudNotes[name].sha }); } });
  }

  // 单篇笔记写入: PUT .../contents/data/notes/<id>.json?ref=main
  if (method === 'PUT' && /\/contents\/data\/notes\/[^/]+\.json\?ref=/.test(u)) {
    var body = JSON.parse(opts.body);
    var id2 = body.message.replace('sync note ', '');
    var name2 = noteName(id2);
    var isNew = !cloudNotes[name2];
    cloudNotes[name2] = { contentB64: body.content, sha: 'sha_' + name2 + '_' + (isNew ? 'new' : 'upd') };
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: { sha: cloudNotes[name2].sha } }); } });
  }

  // 附加数据 extras: .../contents/data/_sync_extras.json
  if (u.indexOf('/contents/data/_sync_extras.json') !== -1) {
    if (method === 'GET') {
      if (!cloudExtras) return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({ message: 'Not Found' }); } });
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: cloudExtras.contentB64, sha: cloudExtras.sha }); } });
    }
    if (method === 'PUT') {
      var b2 = JSON.parse(opts.body);
      cloudExtras = { contentB64: b2.content, sha: 'sha_extras_' + (cloudExtras ? 'upd' : 'new') };
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: { sha: cloudExtras.sha } }); } });
    }
  }

  // ===== Git Data API（大文件回退）=====
  if (u.match(/\/git\/ref\/heads\//)) {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ object: { sha: 'commitSHA' } }); } });
  }
  if (u.match(/\/git\/trees\//)) {
    // tree 中包含大文件 n1 的条目，供 findInTree 定位
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ sha: 'treeSHA', tree: [{ path: 'data/notes/n1.json', mode: '100644', type: 'blob', sha: 'blobShaN1' }] }); } });
  }
  if (u.match(/\/git\/blobs$/) && method === 'POST') {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ sha: 'blobSHA' }); } });
  }
  if (u.match(/\/git\/trees$/) && method === 'POST') {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ sha: 'newTreeSHA' }); } });
  }
  if (u.match(/\/git\/commits$/) && method === 'POST') {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ sha: 'newCommitSHA' }); } });
  }
  if (u.match(/\/git\/refs\/heads\//) && method === 'PATCH') {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ object: { sha: 'newCommitSHA' } }); } });
  }
  if (u.match(/\/git\/blobs\//)) {
    // 大文件回退读取：返回内容；n1 的 blob 返回其真实内容
    var blobSha = u.split('/git/blobs/')[1];
    if (blobSha === 'blobShaN1' && cloudNotes['n1.json']) {
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: cloudNotes['n1.json'].contentB64, encoding: 'base64' }); } });
    }
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: enc(tooLargeContent), encoding: 'base64' }); } });
  }

  return Promise.reject(new Error('unexpected url: ' + u));
};

require('./js/github-sync.js');
var G = global.GitHubSync;
G.saveConfig({ owner: 'u', repo: 'r', branch: 'main', path: 'data/notes.json', token: 't' });

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('✗ ' + m); } }

var tooLargeContent = JSON.stringify({ id: 'big', title: 'big note', body: 'x', updatedAt: 1 });

// 测试 1：pull 合并云端笔记到本地
(function () {
  cloudNotes = {
    'n1.json': { contentB64: enc(JSON.stringify({ id: 'n1', title: '云端笔记A', updatedAt: 100 })), sha: 's1' },
    'n2.json': { contentB64: enc(JSON.stringify({ id: 'n2', title: '云端笔记B', updatedAt: 200 })), sha: 's2' }
  };
  cloudExtras = { contentB64: enc(JSON.stringify({ version: 1, goals: [{ id: 'g1', updatedAt: 1 }], roadmap: {} })), sha: 'se' };
  store._notes = [{ id: 'local1', title: '本地独有', updatedAt: 50 }];
  global.LearningGoals._g = [];

  return G.pull().then(function (merged) {
    ok(merged.length === 3, 'pull 应合并出 3 条（local1/n1/n2），实际: ' + merged.length);
    ok(store.getAll().some(function (n) { return n.id === 'local1'; }), '应保留本地独有 local1');
    ok(store.getAll().some(function (n) { return n.id === 'n1'; }), '应包含云端 n1');
    ok(global.LearningGoals.getAll().length === 1, '应拉取并合并 goals');
    console.log('测试1 通过：pull 合并云端→本地');
  });
})()

// 测试 2：push 逐篇写文件 + 不删除云端独有笔记
.then(function () {
  // 当前本地已合并：local1/n1/n2。云端目前有 n1/n2（无 local1）。
  // push 后云端应有 local1/n1/n2（local1 被新建），且 n1/n2 保留（不删）。
  callLog = [];
  return G.push().then(function () {
    ok(!!cloudNotes['local1.json'], 'push 应创建 local1.json');
    ok(!!cloudNotes['n1.json'] && !!cloudNotes['n2.json'], 'push 应保留云端已有 n1/n2（不删除）');
    ok(!!cloudExtras, 'push 应写入 _sync_extras.json');
    console.log('测试2 通过：push 逐篇上传且不删云端独有');
  });
})

// 测试 3：forcePull 用云端替换本地
.then(function () {
  cloudNotes = {
    'r1.json': { contentB64: enc(JSON.stringify({ id: 'r1', title: '仅云端', updatedAt: 300 })), sha: 'sr1' }
  };
  cloudExtras = { contentB64: enc(JSON.stringify({ version: 1, goals: [], roadmap: {} })), sha: 'se2' };
  store._notes = [{ id: 'localX', title: '本地旧', updatedAt: 10 }];
  return G.forcePull().then(function (remote) {
    ok(remote.length === 1 && remote[0].id === 'r1', 'forcePull 应仅含云端 r1');
    ok(store.getAll().length === 1 && store.getAll()[0].id === 'r1', '本地应被云端完全替换');
    console.log('测试3 通过：forcePull 覆盖替换');
  });
})

// 测试 4：自动推送已关闭（onLocalChange 只标记 pending）
.then(function () {
  store._notes = [{ id: 'a', title: 't', updatedAt: 1 }];
  callLog = [];
  G.onLocalChange();
  var s = G.getStatus();
  ok(s.pending === true, 'onLocalChange 应标记 pending=true');
  // 不应有任何网络写操作（无 PUT 到 notes / extras）
  var wrote = callLog.some(function (c) { return c.method === 'PUT'; });
  ok(!wrote, 'onLocalChange 不应触发任何 PUT 上传');
  console.log('测试4 通过：关闭自动推送');
})

// 测试 5：单个笔记 >1MB 时回退 Git Data API
.then(function () {
  // 让 n1 触发 "too large"，forcePull 仍应拿到数据
  tooLargeNotes = { n1: true };
  cloudNotes = {
    'n1.json': { contentB64: enc(JSON.stringify({ id: 'n1', title: '超大笔记', updatedAt: 400 })), sha: 'sbig' }
  };
  store._notes = [];
  return G.forcePull().then(function (remote) {
    ok(remote.length === 1 && remote[0].id === 'n1', '超大笔记应通过 Git Data API 回退读取成功');
    var usedGit = callLog.some(function (c) { return c.url.indexOf('/git/') !== -1; });
    ok(usedGit, '应触发 Git Data API 调用');
    console.log('测试5 通过：>1MB 单文件 Git Data API 回退');
  });
})

.then(function () {
  console.log('\n结果：通过 ' + pass + ' / 失败 ' + fail);
  process.exit(fail ? 1 : 0);
}, function (e) {
  console.log('✗ 异常: ' + (e && e.message || e));
  process.exit(1);
});
