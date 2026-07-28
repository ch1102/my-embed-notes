/**
 * logparse.js —— 串口日志智能解析（纯函数，无 DOM 依赖）
 *
 * 扫描多行日志文本，统计包含 ERROR / WARN / OK / FAIL 的行数，
 * 并对每一行归类（行内出现的关键词决定其级别）。
 *
 * 级别配色约定（按用户需求）：
 *   ERROR -> 红   WARN -> 橙   OK -> 绿   FAIL -> 灰
 * 一行若同时命中多个关键词，按优先级 ERROR > WARN > FAIL > OK 取一个级别。
 *
 * 以 (window || globalThis).LogParser 暴露，便于在浏览器与 Node 中复用/测试。
 */
(function (global) {
  'use strict';

  // 优先级顺序：靠前的优先
  var RULES = [
    { re: /\bERROR\b/i,            level: 'error' },
    { re: /\bWARN(?:ING)?\b/i,     level: 'warn'  },
    { re: /\bFAIL(?:ED)?\b/i,      level: 'fail'  },
    { re: /\bOK\b/i,               level: 'ok'    }
  ];

  /**
   * 解析日志文本。
   * @param {string} body 原始文本（可能包含 \r\n / \r / \n）
   * @returns {{counts: {error:number,warn:number,fail:number,ok:number},
   *            lines: Array<{text:string, level:?string}>, total:number}}
   */
  function classify(body) {
    var raw = (body || '');
    var lines = raw.split(/\r\n|\r|\n/);
    var counts = { error: 0, warn: 0, fail: 0, ok: 0 };
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var text = lines[i];
      var level = null;
      for (var j = 0; j < RULES.length; j++) {
        if (RULES[j].re.test(text)) { level = RULES[j].level; break; }
      }
      if (level) counts[level]++;
      out.push({ text: text, level: level });
    }
    return { counts: counts, lines: out, total: lines.length };
  }

  /** 是否存在任何标准日志级别（用于判断“未检测到标准日志级别”） */
  function hasStandardLevel(result) {
    if (!result || !result.counts) return false;
    var c = result.counts;
    return (c.error + c.warn + c.fail + c.ok) > 0;
  }

  global.LogParser = {
    classify: classify,
    hasStandardLevel: hasStandardLevel
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
