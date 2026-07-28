/**
 * review.js —— 每日随机复习（闪卡模式）数据存储层
 * 纯前端，localStorage 持久化，零依赖。
 *
 * 存储结构：
 *  - review_focus : JSON 数组，收藏（待复习重点）笔记的 id 列表
 *  - review_count : 今日已复习条数（字符串数字）
 *  - review_date  : 最近一次计数的日期 YYYY-MM-DD（跨日自动重置）
 */
(function (global) {
  'use strict';

  var FOCUS_KEY = 'review_focus';
  var COUNT_KEY = 'review_count';
  var DATE_KEY = 'review_date';

  function lsGet(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function getFocus() {
    try {
      var a = JSON.parse(lsGet(FOCUS_KEY, '[]'));
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }

  function addFocus(id) {
    if (!id) return false;
    var a = getFocus();
    if (a.indexOf(id) !== -1) return false; // 已存在，不重复添加
    a.push(id);
    lsSet(FOCUS_KEY, JSON.stringify(a));
    return true;
  }

  function removeFocus(id) {
    var next = getFocus().filter(function (x) { return x !== id; });
    lsSet(FOCUS_KEY, JSON.stringify(next));
  }

  function todayStr() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /** 今日已复习条数（跨日自动视为 0） */
  function getTodayCount() {
    if (lsGet(DATE_KEY, '') !== todayStr()) return 0;
    return parseInt(lsGet(COUNT_KEY, '0'), 10) || 0;
  }

  /** 每次打开复习卡片调用一次：计数 +1（跨日先清零） */
  function bumpCount() {
    var isToday = lsGet(DATE_KEY, '') === todayStr();
    var c = isToday ? (parseInt(lsGet(COUNT_KEY, '0'), 10) || 0) : 0;
    c += 1;
    lsSet(DATE_KEY, todayStr());
    lsSet(COUNT_KEY, String(c));
    return c;
  }

  global.ReviewStore = {
    getFocus: getFocus,
    addFocus: addFocus,
    removeFocus: removeFocus,
    getTodayCount: getTodayCount,
    bumpCount: bumpCount
  };
})(window);
