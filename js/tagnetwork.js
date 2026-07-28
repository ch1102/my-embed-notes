/**
 * 标签关联系数网络图 —— 数据计算（纯函数，可 Node 单测）
 *
 * 数据来源：遍历所有笔记，统计每对标签「共同出现在同一篇笔记」的次数。
 *  - 共现次数 co：两标签同处一篇笔记记 1 次
 *  - 关联度 corr：co / 总笔记数（归一化 0~1）
 *  - 仅当 co > 0 时生成连线（从未共现则不显示）
 *  - 节点大小：该标签出现的笔记数量（出现越多越大）
 */
(function (global) {
  'use strict';

  // 标签取值：优先用已解析的 tags 数组，兜底用 tagsRaw 解析
  function noteTags(n) {
    if (n && Array.isArray(n.tags) && n.tags.length) return n.tags;
    if (n && typeof n.tagsRaw === 'string' && n.tagsRaw) {
      return n.tagsRaw.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return [];
  }

  /**
   * 计算标签关系网络
   * @param {Array} notes 笔记数组（每项含 tags 数组或 tagsRaw 字符串）
   * @returns {{nodes: Array, links: Array, totalNotes: number}}
   *   nodes: [{ name, value(出现篇数), symbolSize }]
   *   links: [{ source, target, co(共现次数), corr(关联度 0~1) }]
   */
  function computeNetwork(notes) {
    var list = Array.isArray(notes) ? notes : [];
    var total = list.length;

    var counts = {};           // tag -> 出现篇数
    var pairCount = {};         // "a\u0001b" -> 共现次数

    list.forEach(function (n) {
      var tags = noteTags(n);
      var seen = {};
      // 去重（同一篇笔记内重复标签只计一次）
      var uniq = [];
      tags.forEach(function (t) {
        if (t && !seen[t]) { seen[t] = true; uniq.push(t); }
      });
      uniq.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
      for (var i = 0; i < uniq.length; i++) {
        for (var j = i + 1; j < uniq.length; j++) {
          var a = uniq[i], b = uniq[j];
          var key = a < b ? a + '' + b : b + '' + a;
          pairCount[key] = (pairCount[key] || 0) + 1;
        }
      }
    });

    var maxCount = 1;
    Object.keys(counts).forEach(function (t) {
      if (counts[t] > maxCount) maxCount = counts[t];
    });

    var nodes = Object.keys(counts).map(function (t) {
      return {
        name: t,
        value: counts[t],
        symbolSize: 18 + (counts[t] / maxCount) * 42 // 18~60
      };
    });

    var links = [];
    Object.keys(pairCount).forEach(function (key) {
      var idx = key.indexOf('');
      var source = key.slice(0, idx);
      var target = key.slice(idx + 1);
      var co = pairCount[key];
      links.push({
        source: source,
        target: target,
        co: co,
        corr: total ? co / total : 0
      });
    });

    return { nodes: nodes, links: links, totalNotes: total };
  }

  var api = {
    computeNetwork: computeNetwork,
    noteTags: noteTags
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.TagNetwork = api;
})(typeof window !== 'undefined' ? window : this);
