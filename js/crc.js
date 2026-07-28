/**
 * crc.js —— 纯 JavaScript CRC 校验计算器（零依赖，无后端）
 *
 * 支持按位宽（8/16/32）、多项式、初始值、结果异或值、输入/输出反转
 * 计算任意字节序列的 CRC，并提供常见预设模型与本地历史记录。
 */
(function (global) {
  'use strict';

  var HISTORY_KEY = 'crc_history';

  // 常见 CRC 模型预设（参数含义与 reveng / CRC 计算器一致）
  var PRESETS = {
    'CRC-8/MAXIM':          { width: 8,  poly: 0x31,      init: 0x00,       xorOut: 0x00,       refIn: true,  refOut: true  },
    'CRC-16/MODBUS':        { width: 16, poly: 0x8005,    init: 0xFFFF,     xorOut: 0x0000,     refIn: true,  refOut: true  },
    'CRC-16/CCITT-FALSE':   { width: 16, poly: 0x1021,    init: 0xFFFF,     xorOut: 0x0000,     refIn: false, refOut: false },
    'CRC-32/ISO-HDLC':      { width: 32, poly: 0x04C11DB7, init: 0xFFFFFFFF, xorOut: 0xFFFFFFFF, refIn: true,  refOut: true  }
  };

  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  /** 按位反转（n 位内） */
  function reflectBits(x, n) {
    var res = 0;
    for (var i = 0; i < n; i++) {
      if (x & (1 << i)) res |= (1 << (n - 1 - i));
    }
    return res >>> 0;
  }

  /**
   * 计算 CRC
   * @param {Object} p 参数 {width, poly, init, xorOut, refIn, refOut}
   * @param {number[]} bytes 字节数组（每个 0-255）
   * @returns {number} 无符号整数结果
   */
  function compute(p, bytes) {
    var width = p.width;
    var poly = p.poly >>> 0;
    var init = p.init >>> 0;
    var xorOut = p.xorOut >>> 0;
    var refIn = !!p.refIn;
    var refOut = !!p.refOut;
    var mask = (width === 32) ? 0xFFFFFFFF : ((1 << width) - 1);
    var topbit = 1 << (width - 1);

    var crc = init & mask;
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] & 0xFF;
      if (refIn) b = reflectBits(b, 8);
      crc ^= (b << (width - 8));
      crc &= mask;
      for (var j = 0; j < 8; j++) {
        if (crc & topbit) crc = ((crc << 1) ^ poly) & mask;
        else crc = (crc << 1) & mask;
      }
    }
    crc ^= xorOut;
    crc &= mask;
    if (refOut) crc = reflectBits(crc, width);
    crc &= mask;
    return crc >>> 0;
  }

  /** 解析十六进制输入：去除所有非十六进制字符（含空格），按字节成对解析 */
  function parseHexInput(str) {
    if (!str) return [];
    var cleaned = String(str).replace(/[^0-9a-fA-F]/g, '');
    var bytes = [];
    for (var i = 0; i + 1 < cleaned.length + 1; i += 2) {
      var h = cleaned.substr(i, 2);
      if (h.length === 2) bytes.push(parseInt(h, 16));
    }
    return bytes;
  }

  /** ASCII 字符串 → 字节数组（取低 8 位） */
  function parseAscii(str) {
    var s = String(str || '');
    var bytes = [];
    for (var i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i) & 0xFF);
    return bytes;
  }

  /** 结果格式化为补零十六进制（如 0x29B1） */
  function formatHex(value, width) {
    var hex = (value >>> 0).toString(16).toUpperCase();
    var len = Math.max(1, Math.round(width / 4)); // 8->2, 16->4, 32->8
    while (hex.length < len) hex = '0' + hex;
    return '0x' + hex;
  }

  function getHistory() {
    try {
      var a = JSON.parse(lsGet(HISTORY_KEY, '[]'));
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }

  function addHistory(entry) {
    var a = getHistory();
    a.unshift(entry);
    if (a.length > 10) a = a.slice(0, 10);
    lsSet(HISTORY_KEY, JSON.stringify(a));
    return a;
  }

  function clearHistory() { lsSet(HISTORY_KEY, '[]'); }

  global.CRC = {
    PRESETS: PRESETS,
    compute: compute,
    reflectBits: reflectBits,
    parseHexInput: parseHexInput,
    parseAscii: parseAscii,
    formatHex: formatHex,
    getHistory: getHistory,
    addHistory: addHistory,
    clearHistory: clearHistory
  };
})(window);
