/**
 * export.js —— 一键打包导出（Markdown + 图片 -> ZIP）
 * 纯前端、零依赖：自实现 ZIP（stored，无压缩，支持 UTF-8 中文文件名）。
 * 暴露 window.NoteExport，便于独立单元测试。
 */
(function (global) {
  'use strict';

  // ---------- CRC32 ----------
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xFF];
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var arr = new Uint8Array(str.length); // 仅 ASCII 降级
    for (var i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xFF;
    return arr;
  }

  /** data: URL -> { bytes: Uint8Array, ext: 'png'|'jpg'|... } */
  function dataUrlToBytes(dataUrl) {
    var comma = dataUrl.indexOf(',');
    if (comma < 0) return { bytes: new Uint8Array(0), ext: 'png' };
    var meta = dataUrl.slice(0, comma);
    var b64 = dataUrl.slice(comma + 1);
    var m = /^data:image\/([a-zA-Z0-9.+-]+);base64$/.exec(meta);
    var ext = m ? m[1].toLowerCase() : 'png';
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return { bytes: arr, ext: ext };
  }

  // ---------- 正文 -> Markdown ----------
  // 处理 [img:...] 与 [code:lang]...[/code]；其余文本原样保留（含 [[双链]]）
  var MD_RE = /\[img:(data:image\/[^;\s]+;base64,[^\]]+)\]|\[code:([a-zA-Z0-9_+-]+)\]([\s\S]*?)\[\/code\]/g;
  function bodyToMarkdown(body, imageCollector) {
    // 富文本 HTML 正文：走 RichText.toMarkdown，图片仍收集到 images/ 目录
    if (global.RichText && global.RichText.looksLikeHtml && global.RichText.looksLikeHtml(body || '')) {
      return global.RichText.toMarkdown(body, function (dataUrl) {
        var info = dataUrlToBytes(dataUrl);
        // 用收集器长度做全局唯一序号，避免多篇笔记图片重名
        var fname = 'images/img_' + imageCollector.length + '.' + info.ext;
        imageCollector.push({ name: fname, data: info.bytes });
        return '![image](' + fname + ')';
      });
    }
    var out = '';
    var last = 0, m, idx = 0;
    MD_RE.lastIndex = 0;
    while ((m = MD_RE.exec(body || '')) !== null) {
      if (m.index > last) out += body.slice(last, m.index);
      if (m[1]) {
        var info = dataUrlToBytes(m[1]);
        var fname = 'images/img_' + (idx++) + '.' + info.ext;
        imageCollector.push({ name: fname, data: info.bytes });
        out += '![image](' + fname + ')\n';
      } else if (m[2] !== undefined) {
        out += '```' + m[2] + '\n' + m[3] + '```\n';
      }
      last = MD_RE.lastIndex;
    }
    if (last < (body || '').length) out += body.slice(last);
    return out.replace(/\r\n/g, '\n');
  }

  function sanitizeFileName(name) {
    var s = (name || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
    return s || '未命名';
  }

  /** 汇总所有笔记为文件列表 [{name, data:Uint8Array}]，图片写入 images/ */
  function collectFiles(notes) {
    var files = [];
    var used = {};
    notes.forEach(function (note) {
      var md = '';
      if (note.type === 'hardware') {
        md += '# ' + (note.title || '未命名外设') + '\n\n';
        md += '> 类型：硬件外设\n\n';
        if (note.hwModel) md += '- 型号：' + note.hwModel + '\n';
        if (note.hwVoltage) md += '- 电压：' + note.hwVoltage + '\n';
        if (note.hwProtocol) md += '- 协议：' + note.hwProtocol + '\n';
        if (note.hwPins) md += '- 引脚：\n\n```\n' + note.hwPins + '\n```\n';
        md += '\n';
        if (note.body) md += bodyToMarkdown(note.body, files) + '\n';
      } else if (note.type === 'bug') {
        md += '# ' + (note.title || '未命名Bug') + '\n\n';
        md += '> 类型：Bug 报告 · 状态：' + (note.bugSolved ? '已解决' : '待解决') + '\n\n';
        if (note.bugSymptom) md += '## 现象描述\n\n' + note.bugSymptom + '\n\n';
        if (note.bugSteps) md += '## 复现步骤\n\n' + note.bugSteps + '\n\n';
        if (note.bugRootCause) md += '## 根因分析\n\n' + note.bugRootCause + '\n\n';
        if (note.body) md += '## 备注\n\n' + bodyToMarkdown(note.body, files) + '\n';
      } else if (note.type === 'project') {
        md += '# ' + (note.title || '未命名项目') + '\n\n';
        md += '> 类型：项目 · 状态：' + (note.projStatus || '规划中') + '\n\n';
        if (note.projMcu) md += '- 所用主控：' + note.projMcu + '\n';
        if (note.projPeripherals) md += '- 关键外设：\n\n```\n' + note.projPeripherals + '\n```\n';
        if (note.projGithub) md += '- GitHub：' + note.projGithub + '\n';
        if (note.projDesc) md += '\n## 项目简介\n\n' + note.projDesc + '\n\n';
        if (note.body) md += '## 备注\n\n' + bodyToMarkdown(note.body, files) + '\n';
      } else {
        md += '# ' + (note.title || '（无标题）') + '\n\n';
        if ((note.tags || []).length) md += '标签：' + note.tags.map(function (t) { return '#' + t; }).join(' ') + '\n\n';
        md += bodyToMarkdown(note.body || '', files) + '\n';
      }
      md += '\n---\n\n*创建：' + new Date(note.createdAt).toLocaleString() +
            ' · 更新：' + new Date(note.updatedAt).toLocaleString() + '*\n';

      var base = sanitizeFileName(note.title || note.hwName || '未命名');
      var fname = base + '.md';
      var n = 2;
      while (used[fname]) fname = base + '_' + (n++) + '.md';
      used[fname] = true;
      files.push({ name: fname, data: utf8Bytes(md) });
    });
    return files;
  }

  // ---------- 构建 ZIP（stored，无压缩，UTF-8 文件名） ----------
  function buildZip(files) {
    var chunks = [];
    var central = [];
    var offset = 0;

    files.forEach(function (f) {
      var nameBytes = utf8Bytes(f.name);
      var data = f.data;
      var crc = crc32(data);
      var size = data.length;

      var lh = new Uint8Array(30 + nameBytes.length);
      var dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);   // 语言编码标志：UTF-8 文件名
      dv.setUint16(8, 0, true);        // 压缩方式 0 = stored
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, size, true);
      dv.setUint32(22, size, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      chunks.push(lh, data);

      var ch = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      central.push(ch);

      offset += lh.length + data.length;
    });

    var centralSize = central.reduce(function (s, c) { return s + c.length; }, 0);
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    var total = chunks.reduce(function (s, c) { return s + c.length; }, 0) + centralSize + eocd.length;
    var outBuf = new Uint8Array(total);
    var p = 0;
    chunks.forEach(function (c) { outBuf.set(c, p); p += c.length; });
    central.forEach(function (c) { outBuf.set(c, p); p += c.length; });
    outBuf.set(eocd, p);
    return outBuf;
  }

  global.NoteExport = {
    crc32: crc32,
    bodyToMarkdown: bodyToMarkdown,
    collectFiles: collectFiles,
    buildZip: buildZip,
    dataUrlToBytes: dataUrlToBytes,
    utf8Bytes: utf8Bytes
  };
})(typeof window !== 'undefined' ? window : this);
