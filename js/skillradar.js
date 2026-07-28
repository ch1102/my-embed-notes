/**
 * skillradar.js —— 技能雷达图（统计页子面板）
 *
 * 设计要点：
 *  - 预设 5 个嵌入式技能维度，每个维度带一组关键词。
 *  - 自动打分：遍历全部笔记的「标题 + 正文 + 标签」，统计命中关键词的笔记数
 *    （而非出现次数，避免一篇长文刷分）。原始分 = 命中笔记数 / 总笔记数 × 10（最高 10 分）。
 *  - 手动校准：用户可用滑动条调整某维度分数；调整后覆盖自动值，标记写入
 *    localStorage 的 skill_manual_overrides；同时把当前分数写入 skill_scores。
 *  - 重新计算：每次新增/修改/删除笔记时调用 recomputeOnNoteChange()，仅更新
 *    “未被手动调整过”的维度，已手动校准的维度保持用户数值。
 *  - 纯 Canvas 绘制五边形雷达图（无外部依赖，离线可用）。
 */
(function (global) {
  'use strict';

  var STORAGE_SCORES = 'skill_scores';         // 每个维度的当前分数
  var STORAGE_OVERRIDES = 'skill_manual_overrides'; // 哪些维度被手动调整过

  /** 五个维度定义（顺序即雷达图顶点顺序，顺时针） */
  var DIMENSIONS = [
    {
      key: 'hw',
      name: '硬件基础',
      keywords: ['寄存器', 'GPIO', 'ADC', 'PWM', '时钟', '引脚', '上拉', '下拉', '滤波']
    },
    {
      key: 'clang',
      name: 'C/汇编编程',
      keywords: ['指针', '内存', '中断', '堆栈', '位运算', 'volatile', 'static', '内联汇编']
    },
    {
      key: 'rtos',
      name: 'RTOS/嵌入式Linux',
      keywords: ['FreeRTOS', '任务', '信号量', '队列', '互斥量', '设备树', '驱动', 'insmod']
    },
    {
      key: 'proto',
      name: '通信协议',
      keywords: ['I2C', 'SPI', 'UART', 'CAN', 'Modbus', 'RS485', '波特率', '帧格式']
    },
    {
      key: 'debug',
      name: '调试排错能力',
      keywords: ['HardFault', '示波器', '逻辑分析仪', '断点', 'Watchpoint', '调试器', 'JTAG', 'SWD']
    }
  ];

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return (v && typeof v === 'object') ? v : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* 忽略写入异常 */ }
  }

  function loadScores() { return readJSON(STORAGE_SCORES, {}); }
  function loadOverrides() { return readJSON(STORAGE_OVERRIDES, {}); }

  /** 计算自动分数：返回 { key: 0~10 } */
  function computeAuto() {
    var notes = (global.NoteStore ? global.NoteStore.getAll() : []) || [];
    var total = notes.length;
    var result = {};
    DIMENSIONS.forEach(function (dim) {
      var lowerKw = dim.keywords.map(function (k) { return k.toLowerCase(); });
      var hit = 0;
      notes.forEach(function (n) {
        var hay = ((n.title || '') + ' ' + (n.body || '') + ' ' + (n.tags || []).join(' ')).toLowerCase();
        for (var i = 0; i < lowerKw.length; i++) {
          if (hay.indexOf(lowerKw[i]) !== -1) { hit++; break; }
        }
      });
      result[dim.key] = total ? (hit / total * 10) : 0;
    });
    return result;
  }

  /**
   * 合并后的当前分数：
   *  - 被手动调整过的维度：取存储的 skill_scores 值；
   *  - 其余维度：取实时自动分数（始终与笔记同步）。
   */
  function getScores() {
    var auto = computeAuto();
    var scores = loadScores();
    var overrides = loadOverrides();
    var merged = {};
    DIMENSIONS.forEach(function (dim) {
      if (overrides[dim.key] && scores[dim.key] != null) {
        merged[dim.key] = scores[dim.key];
      } else {
        merged[dim.key] = auto[dim.key];
      }
    });
    return merged;
  }

  /**
   * 笔记变更时调用：仅更新“未被手动调整过”的维度，
   * 已手动校准的维度保持不变。结果写回 skill_scores。
   */
  function recomputeOnNoteChange() {
    var auto = computeAuto();
    var scores = loadScores();
    var overrides = loadOverrides();
    DIMENSIONS.forEach(function (dim) {
      if (!overrides[dim.key]) scores[dim.key] = auto[dim.key];
    });
    writeJSON(STORAGE_SCORES, scores);
  }

  /** 手动设定某维度分数（0~10），并标记手动覆盖 */
  function setManual(key, value) {
    var v = Math.max(0, Math.min(10, Number(value) || 0));
    var scores = loadScores();
    var overrides = loadOverrides();
    scores[key] = v;
    overrides[key] = true;
    writeJSON(STORAGE_SCORES, scores);
    writeJSON(STORAGE_OVERRIDES, overrides);
  }

  /** 清除某维度的手动覆盖，恢复为该维度的自动分数 */
  function resetManual(key) {
    var scores = loadScores();
    var overrides = loadOverrides();
    delete overrides[key];
    var auto = computeAuto();
    scores[key] = auto[key];
    writeJSON(STORAGE_SCORES, scores);
    writeJSON(STORAGE_OVERRIDES, overrides);
  }

  /** 当前哪些维度被手动调整过（返回 { key: true }） */
  function getOverrides() { return loadOverrides(); }

  /** 自动原始分数（用于下方“原始得分”展示） */
  function getAuto() { return computeAuto(); }

  /** 取某维度的代表核心关键词（用于“查看相关笔记”搜索） */
  function coreKeyword(key) {
    for (var i = 0; i < DIMENSIONS.length; i++) {
      if (DIMENSIONS[i].key === key) return DIMENSIONS[i].keywords[0];
    }
    return '';
  }

  global.SkillRadar = {
    DIMENSIONS: DIMENSIONS,
    getScores: getScores,
    getAuto: getAuto,
    getOverrides: getOverrides,
    setManual: setManual,
    resetManual: resetManual,
    recomputeOnNoteChange: recomputeOnNoteChange,
    coreKeyword: coreKeyword
  };
})(window);
