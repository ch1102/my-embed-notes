/**
 * roadmap.js —— 学习路线图（预设路线 + 完成进度）
 * 零依赖：进度存于 localStorage（key = roadmap_progress），形状：
 *   { "STM32入门": [true, false, true, ...], "FreeRTOS": [...], ... }
 * 暴露 window.Roadmap，便于独立单元测试。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'roadmap_progress';

  // 预设路线：键为路线名，值为知识点节点（5-8 个）
  var ROADMAPS = {
    'STM32入门': [
      '开发环境搭建',
      'GPIO 与中断',
      '时钟树配置',
      '定时器与 PWM',
      '串口通信 USART',
      'ADC 与 DMA'
    ],
    'FreeRTOS': [
      '任务创建与调度',
      '队列 Queue',
      '信号量 Semaphore',
      '互斥量 Mutex',
      '事件组 EventGroup',
      '软件定时器',
      '任务通知'
    ],
    'Linux驱动': [
      '内核模块编译',
      '字符设备驱动',
      '设备树 DTS',
      'platform 总线',
      '中断处理',
      '阻塞与 poll',
      'sysfs 与 procfs'
    ]
  };

  var DEFAULT_ROUTE = 'STM32入门';

  function readAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  /** 取得某路线的完成状态数组（长度与节点一致，缺失/长度不符则重置为全 false） */
  function getProgress(name) {
    var def = ROADMAPS[name] || [];
    var all = readAll();
    var arr = all[name];
    if (!Array.isArray(arr) || arr.length !== def.length) {
      arr = def.map(function () { return false; });
      all[name] = arr;
      writeAll(all);
    }
    return arr;
  }

  function setProgress(name, arr) {
    var all = readAll();
    all[name] = arr.slice();
    writeAll(all);
  }

  /** 取得全部路线进度对象（同步用） */
  function getAll() { return readAll(); }

  /** 批量覆盖写入全部路线进度（同步模块合并后调用） */
  function replaceAll(obj) { writeAll(obj && typeof obj === 'object' ? obj : {}); }

  /** 切换某节点完成状态，返回最新数组 */
  function toggle(name, idx) {
    var arr = getProgress(name);
    if (idx < 0 || idx >= arr.length) return arr;
    arr[idx] = !arr[idx];
    setProgress(name, arr);
    return arr;
  }

  /** 进度概览：{ done, total, percent, states } */
  function progressInfo(name) {
    var arr = getProgress(name);
    var done = arr.filter(function (x) { return x; }).length;
    var total = arr.length;
    return {
      done: done,
      total: total,
      percent: total ? Math.round((done / total) * 100) : 0,
      states: arr
    };
  }

  global.Roadmap = {
    ROADMAPS: ROADMAPS,
    DEFAULT_ROUTE: DEFAULT_ROUTE,
    getProgress: getProgress,
    setProgress: setProgress,
    getAll: getAll,
    replaceAll: replaceAll,
    toggle: toggle,
    progressInfo: progressInfo
  };
})(typeof window !== 'undefined' ? window : this);
