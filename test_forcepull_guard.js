// 回归测试：forcePull 在云端为空但本地有数据时，不得清空本机
global.window = global;
var mem = {};
global.localStorage = {
  getItem: function (k) { return k in mem ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
var store = {
  _notes: [{ id: 'local1', updatedAt: 100 }],
  getAll: function () { return this._notes; },
  replaceAll: function (a) { this._notes = a; }
};
global.NoteStore = store;
global.LearningGoals = { _g: [], getAll: function(){return this._g;}, replaceAll: function(a){this._g=a;} };
global.Roadmap = { _r: {}, getAll: function(){return this._r;}, replaceAll: function(a){this._r=a;} };

// 云端为空文件
var EMPTY = JSON.stringify({ version: 1, notes: [], goals: [], roadmap: {} });
function enc(s){ return Buffer.from(s, 'utf8').toString('base64'); }
global.fetch = function (url, opts) {
  if (opts && opts.method === 'PUT') {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: { sha: 'newsha' } }); } });
  }
  return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ content: enc(EMPTY), sha: 'sha123' }); } });
};

require('./js/github-sync.js');
var G = global.GitHubSync;
G.saveConfig({ owner: 'u', repo: 'r', branch: 'main', path: 'data/notes.json', token: 't' });

var pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('✗ ' + m); } }

G.forcePull().then(function (res) {
  ok(store.getAll().length === 1, 'forcePull 不该清空本机数据，应保留 1 条，实际: ' + store.getAll().length);
  ok(store.getAll()[0].id === 'local1', '本机笔记 local1 应仍在');
  var s = G.getStatus();
  ok(s.lastError && s.lastError.indexOf('云端为空') !== -1, '状态应提示云端为空且未覆盖，实际: ' + s.lastError);
  console.log('\n结果：通过 ' + pass + ' / 失败 ' + fail);
  process.exit(fail ? 1 : 0);
}).catch(function (e) {
  console.log('✗ forcePull 抛异常: ' + (e && e.message || e));
  process.exit(1);
});
