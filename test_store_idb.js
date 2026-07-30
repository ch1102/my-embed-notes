/**
 * test_store_idb.js —— store.js 持久化层回归测试（Node 无头）
 * 场景：无 indexedDB 时回退 localStorage，验证 save/getById/getAll/remove/replaceAll
 *       以及 load() 从 localStorage 载入缓存、旧数据迁移逻辑。
 */
var fs = require('fs');
var vm = require('vm');
var path = require('path');

var pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name); }
}

// ---- 模拟浏览器环境（无 indexedDB → 触发 localStorage 回退路径）----
function makeLocalStorage() {
  var map = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
    setItem: function (k, v) { map[k] = String(v); },
    removeItem: function (k) { delete map[k]; },
    _dump: function () { return map; }
  };
}

function loadStore(localStorageMock) {
  var sandbox = {
    console: console,
    localStorage: localStorageMock,
    indexedDB: undefined, // 关键：模拟不支持 IndexedDB
    window: null
  };
  sandbox.window = sandbox; // store.js 末尾 (function(global){...})(window) → global === window
  var code = fs.readFileSync(path.join(__dirname, 'js/store.js'), 'utf8');
  vm.runInNewContext(code, sandbox);
  return sandbox.window.NoteStore;
}

// ===== 测试 1：基础保存/读取/删除（localStorage 回退）=====
(function () {
  var ls = makeLocalStorage();
  var Store = loadStore(ls);
  var n = Store.save({ title: '测试笔记', body: 'hello', type: 'note', tagsRaw: 'a, b, a' });
  ok('save 返回带 id 的对象', !!n.id);
  ok('save 解析去重标签', JSON.stringify(n.tags) === JSON.stringify(['a', 'b']));

  var got = Store.getById(n.id);
  ok('getById 命中', got && got.title === '测试笔记');

  var all = Store.getAll();
  ok('getAll 含 1 条', all.length === 1);

  Store.remove(n.id);
  ok('remove 后 getAll 为空', Store.getAll().length === 0);
})();

// ===== 测试 2：replaceAll 过滤脏数据 =====
(function () {
  var ls = makeLocalStorage();
  var Store = loadStore(ls);
  Store.replaceAll([{ id: 'x1', title: 'A' }, { id: 'x2', title: 'B' }, { foo: 1 }]); // 第三条无 id
  var all = Store.getAll();
  ok('replaceAll 仅保留含 id 的对象', all.length === 2 && all.every(function (x) { return x.id; }));
})();

// ===== 测试 3：load() 从旧 localStorage 迁移到缓存 =====
(function () {
  var ls = makeLocalStorage();
  // 模拟旧版本已写入 localStorage 的数据
  ls.setItem('learning_notes_web_v1', JSON.stringify([
    { id: 'old1', title: '旧笔记', body: 'x', type: 'note', tags: [], updatedAt: 1, createdAt: 1 }
  ]));
  var Store = loadStore(ls);
  return Store.load().then(function (cache) {
    ok('load() 迁移旧 localStorage 数据', cache.length === 1 && cache[0].id === 'old1');
    ok('load() 后 getAll 可读', Store.getAll().length === 1);
  });
})().catch(function (e) { fail++; console.log('  ✗ 测试3 异常', e); });

// ===== 测试 4：idbSupported 标志在无 indexedDB 时为 false（回退生效）=====
(function () {
  var ls = makeLocalStorage();
  var Store = loadStore(ls);
  // save 后 localStorage 应有值（证明走了回退写入）
  Store.save({ title: 't', body: 'b', type: 'note' });
  ok('无 indexedDB 时回退写入 localStorage', !!ls.getItem('learning_notes_web_v1'));
})();

setTimeout(function () {
  console.log('\n存储层回归测试：' + pass + ' 通过, ' + fail + ' 失败');
  process.exit(fail > 0 ? 1 : 0);
}, 50);
