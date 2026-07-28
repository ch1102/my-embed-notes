// 无头测试：学习目标 / 路线图进度的合并与同步解析
global.window = global; // shim：让 IIFE 在 Node 下也能挂到全局
require('./js/github-sync.js');
var G = global.GitHubSync;

var pass = 0, fail = 0;
function eq(actual, expected, msg) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('✗ ' + msg + '\n  实际: ' + a + '\n  期望: ' + e); }
}

// ---- parsePayload ----
var p = G._parsePayload('{"version":1,"notes":[{"id":"n1"}],"goals":[{"id":"g1","name":"A"}],"roadmap":{"STM32入门":[true,false]}}');
eq(p.notes, [{id:'n1'}], 'parsePayload.notes');
eq(p.goals, [{id:'g1',name:'A'}], 'parsePayload.goals');
eq(p.roadmap, { 'STM32入门':[true,false] }, 'parsePayload.roadmap');

var pOld = G._parsePayload('[{"id":"n1"}]'); // 旧版仅数组
eq(pOld.notes, [{id:'n1'}], 'parsePayload 旧版数组兼容 notes');
eq(pOld.goals, [], 'parsePayload 旧版数组兼容 goals 回退空');
eq(pOld.roadmap, null, 'parsePayload 旧版数组兼容 roadmap 回退 null');

// ---- mergeGoals：联合 + 较新者胜 ----
var mg = G._mergeGoals(
  [{id:'g1',name:'本地A',updatedAt:100},{id:'g2',name:'仅本地',updatedAt:50}],
  [{id:'g1',name:'远端A',updatedAt:200},{id:'g3',name:'仅远端',updatedAt:60}]
);
eq(mg.length, 3, 'mergeGoals 联合保留三目标');
var g1 = mg.filter(function(g){return g.id==='g1';})[0];
eq(g1.name, '远端A', 'mergeGoals 同 id 取较新(远端)');
eq(mg.some(function(g){return g.id==='g2';}), true, 'mergeGoals 保留本地独有');
eq(mg.some(function(g){return g.id==='g3';}), true, 'mergeGoals 保留远端独有');

// 相等时间取远端
var mg2 = G._mergeGoals([{id:'x',v:1,updatedAt:0}],[{id:'x',v:2,updatedAt:0}]);
eq(mg2[0].v, 2, 'mergeGoals 时间相等取远端');

// ---- mergeRoadmap：OR 合并 ----
var mr = G._mergeRoadmap(
  {'STM32入门':[true,false,false], 'FreeRTOS':[false,false]},
  {'STM32入门':[false,true,false], 'Linux驱动':[true,false,true]}
);
eq(mr['STM32入门'], [true,true,false], 'mergeRoadmap OR 合并同路线');
eq(mr['FreeRTOS'], [false,false], 'mergeRoadmap 保留本地独有路线');
eq(mr['Linux驱动'], [true,false,true], 'mergeRoadmap 补齐远端独有路线');

// 处理非法输入
eq(G._mergeRoadmap(null, null), {}, 'mergeRoadmap 空输入安全');
eq(G._mergeGoals([], null).length, 0, 'mergeGoals 空输入安全');

console.log('\n结果：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
