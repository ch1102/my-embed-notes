// 无头测试：标签关联系数网络图的数据计算（js/tagnetwork.js）
global.window = global; // 让模块挂到 global 上
var T = require('./js/tagnetwork.js');
var compute = T.computeNetwork;

var pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('  ✗ ' + name); }
}
function approx(a, b) { return Math.abs(a - b) < 1e-9; }

// 1. 基本共现与关联度（归一化）
var notes = [
  { tags: ['A', 'B'] },
  { tags: ['A', 'C', 'B'] },
  { tags: ['A'] }
];
var r = compute(notes);
ok('节点数 = 3', r.nodes.length === 3);
ok('总笔记数 = 3', r.totalNotes === 3);
var byName = {};
r.nodes.forEach(function (n) { byName[n.name] = n; });
ok('A 出现 3 次', byName.A.value === 3);
ok('B 出现 2 次', byName.B.value === 2);
ok('C 出现 1 次', byName.C.value === 1);

// 连线：A-B(共现2) B-C(共现1) A-C(共现1)
ok('连线数 = 3', r.links.length === 3);
var ab = r.links.filter(function (l) { return (l.source === 'A' && l.target === 'B') || (l.source === 'B' && l.target === 'A'); })[0];
ok('A-B 共现 2 次', ab.co === 2);
ok('A-B 关联度 2/3', approx(ab.corr, 2 / 3));
var bc = r.links.filter(function (l) { return (l.source === 'B' && l.target === 'C') || (l.source === 'C' && l.target === 'B'); })[0];
ok('B-C 关联度 1/3', approx(bc.corr, 1 / 3));

// 2. 从未共现的标签不生成连线
var notes2 = [{ tags: ['X'] }, { tags: ['Y'] }];
var r2 = compute(notes2);
ok('无连线（X/Y 从未共现）', r2.links.length === 0);
ok('节点 X/Y 各 1', r2.nodes.length === 2 && r2.nodes.every(function (n) { return n.value === 1; }));

// 3. 单篇笔记内重复标签只计一次
var notes3 = [{ tags: ['P', 'P', 'Q'] }];
var r3 = compute(notes3);
var pq = r3.links.filter(function (l) { return (l.source === 'P' && l.target === 'Q') || (l.source === 'Q' && l.target === 'P'); })[0];
ok('重复标签去重后共现 1', pq.co === 1);
ok('P 出现 1 次（非 2）', r3.nodes.filter(function (n) { return n.name === 'P'; })[0].value === 1);

// 4. 边界：空输入
var r4 = compute([]);
ok('空笔记 -> 0 节点 0 连线', r4.nodes.length === 0 && r4.links.length === 0 && r4.totalNotes === 0);

// 5. 边界：tagsRaw 兜底解析
var notes5 = [{ tagsRaw: 'M, N，O' }, { tagsRaw: 'M, N' }];
var r5 = compute(notes5);
ok('tagsRaw 兜底解析出 M/N/O', r5.nodes.length === 3);
ok('M-N 共现 2（corr=1）', r5.links.some(function (l) {
  var a = (l.source + '|' + l.target);
  return (a === 'M|N' || a === 'N|M') && l.co === 2 && approx(l.corr, 1);
}));

// 6. 节点大小范围（最大标签最大尺寸）
var big = [];
for (var i = 0; i < 5; i++) big.push({ tags: ['Z'] });
var rb = compute([{ tags: ['Z', 'W'] }].concat(big));
var z = rb.nodes.filter(function (n) { return n.name === 'Z'; })[0];
var w = rb.nodes.filter(function (n) { return n.name === 'W'; })[0];
ok('出现最多的 Z 尺寸最大', z.symbolSize >= w.symbolSize);
ok('最大尺寸 = 60', z.symbolSize === 60);

console.log('\n标签网络计算测试： ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
