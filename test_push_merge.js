// 回归测试：push() 必须先合并云端再上传，绝不能用陈旧本地整文件覆盖云端
global.window = global;

// --- 内存 localStorage ---
var mem = {};
global.localStorage = {
  getItem: function (k) { return k in mem ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

// --- 本地数据模块 mock ---
var store = {
  _notes: [
    { id: 'local1', updatedAt: 100 },          // 仅本地存在
    { id: 'shared', updatedAt: 50 }            // 云端也有，但本地这份更旧
  ],
  getAll: function () { return this._notes; },
  replaceAll: function (a) { this._notes = a; }
};
global.NoteStore = store;
global.LearningGoals = { _g: [], getAll: function(){return this._g;}, replaceAll: function(a){this._g=a;} };
global.Roadmap = { _r: {}, getAll: function(){return this._r;}, replaceAll: function(a){this._r=a;} };

// --- 云端“更新后”的文件内容 ---
var REMOTE = JSON.stringify({
  version: 1, syncedAt: 1,
  notes: [
    { id: 'shared', updatedAt: 200 },          // 云端更新（较新）
    { id: 'cloudOnly', updatedAt: 150 }         // 仅云端存在
  ],
  goals: [], roadmap: {}
});
function enc(s){ return Buffer.from(s, 'utf8').toString('base64'); }
function dec(b){ return Buffer.from(b, 'base64').toString('utf8'); }

// --- fetch mock：GET 返回云端文件，PUT 记录上传内容 ---
var lastPut = null;
global.fetch = function (url, opts) {
  if (opts && opts.method === 'PUT') {
    lastPut = { url: url, body: JSON.parse(opts.body) };
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: { sha: 'newsha' } }); } });
  }
  return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: enc(REMOTE), sha: 'sha123' }); } });
};

require('./js/github-sync.js');
var G = global.GitHubSync;
G.saveConfig({ owner: 'u', repo: 'r', branch: 'main', path: 'data/notes.json', token: 't' });

var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('✗ ' + msg); } }

G.push().then(function () {
  ok(lastPut !== null, 'push 应当发起 PUT 上传');
  var payload = JSON.parse(dec(lastPut.body.content));
  var ids = payload.notes.map(function (n) { return n.id; }).sort();
  ok(ids.length === 3, '合并后应有 3 条笔记（local1 / shared / cloudOnly），实际: ' + JSON.stringify(ids));
  ok(ids.indexOf('local1') !== -1, '应保留本地独有笔记 local1');
  ok(ids.indexOf('cloudOnly') !== -1, '应保留云端独有笔记 cloudOnly');
  var shared = payload.notes.filter(function (n) { return n.id === 'shared'; })[0];
  ok(shared && shared.updatedAt === 200, 'shared 应采用云端较新版本(updatedAt=200)，实际: ' + (shared && shared.updatedAt));
  // 本地 store 也应被同步为合并结果，避免下次启动又落后
  var localIds = store.getAll().map(function(n){return n.id;}).sort();
  ok(JSON.stringify(localIds) === JSON.stringify(ids), '本地 store 应等于合并结果');
  console.log('\n结果：通过 ' + pass + ' / 失败 ' + fail);
  process.exit(fail ? 1 : 0);
}).catch(function (e) {
  console.log('✗ push 抛出异常: ' + (e && e.message || e));
  process.exit(1);
});
