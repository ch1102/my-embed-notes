// 回归测试：① 改动后不再自动推送（仅标记待推送）；② 推送会按更新情况上报差异
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

// 云端空文件
var EMPTY = JSON.stringify({ version: 1, notes: [], goals: [], roadmap: {} });
function enc(s){ return Buffer.from(s, 'utf8').toString('base64'); }
var calls = [];
global.fetch = function (url, opts) {
  calls.push(opts && opts.method);
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

// ① 改动后不应自动推送（等待防抖窗口，确认无 PUT）
var before = calls.length;
G.onLocalChange();
setTimeout(function () {
  ok(calls.length === before, 'onLocalChange 不应触发任何网络请求（实际请求数: ' + calls.length + '）');
  var st = G.getStatus();
  ok(st.pending === true, 'onLocalChange 应标记 pending=待推送');

  // ② 推送应上报差异（本地 1 条为新增）
  G.push().then(function () {
    var s = G.getStatus();
    ok(s.lastPushDiff && s.lastPushDiff.added === 1, '推送差异应显示新增 1 条，实际: ' + JSON.stringify(s.lastPushDiff));
    ok(calls.indexOf('PUT') !== -1, '点击推送应发起 PUT 上传');
    console.log('\n结果：通过 ' + pass + ' / 失败 ' + fail);
    process.exit(fail ? 1 : 0);
  }).catch(function (e) {
    console.log('✗ push 异常: ' + (e && e.message || e));
    process.exit(1);
  });
}, 200);
