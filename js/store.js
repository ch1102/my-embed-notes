/**
 * store.js —— 纯前端数据层（localStorage 持久化）
 *
 * 设计要点：
 *  - 所有笔记以 JSON 数组存于 localStorage（key 见 STORAGE_KEY）。
 *  - 图片以内嵌 base64 data URL 的形式写在正文里（形如 [img:data:image/...]），
 *    因此无需任何文件系统，刷新/重开浏览器数据不丢失，且天然跨会话可用。
 *  - 不依赖任何后端或原生插件，浏览器直接运行。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'learning_notes_web_v1';
  var IMG_TOKEN_RE = /\[img:(data:image\/[^;\s]+;base64,[^\]]+)\]/g;
  // 代码块 token： [code:lang]...代码...[/code]
  var CODE_TOKEN_RE = /\[code:([a-zA-Z0-9_+-]+)\]([\s\S]*?)\[\/code\]/g;
  // 双向链接 token： [[笔记标题]]
  var LINK_TOKEN_RE = /\[\[([^\[\]]+)\]\]/g;

  /** 安全解析标签：逗号（中/英文）分隔，去空白、去空、去重、保序 */
  function parseTags(raw) {
    if (!raw || typeof raw !== 'string') return [];
    var seen = {};
    var out = [];
    raw.split(/[,，]/).forEach(function (part) {
      var t = part.trim();
      if (t && !seen[t]) {
        seen[t] = true;
        out.push(t);
      }
    });
    return out;
  }

  /** 读取全部笔记（按修改时间倒序） */
  function getAll() {
    var list = read();
    list.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    return list;
  }

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.error('读取笔记失败', e);
      return [];
    }
  }

  function write(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function genId() {
    return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /** 新建或更新一条笔记，返回保存后的对象 */
  function save(note) {
    var list = read();
    var now = Date.now();
    var existing = note.id ? list.filter(function (n) { return n.id === note.id; })[0] : null;

    var isHw = (note.type || 'note') === 'hardware';
    var isBug = (note.type || 'note') === 'bug';
    var isProj = (note.type || 'note') === 'project';
    var baseTitle = (note.title || '').trim();
    if (isHw && !baseTitle) {
      baseTitle = (note.hwName || '').trim() || (note.hwModel || '').trim() || '未命名外设';
    }
    if (isBug && !baseTitle) {
      baseTitle = (note.bugSymptom || '').trim() || '未命名Bug';
    }
    if (isProj && !baseTitle) {
      baseTitle = (note.projName || '').trim() || '未命名项目';
    }
    var record = {
      id: existing ? existing.id : genId(),
      title: baseTitle,
      body: note.body || '',
      tags: parseTags(note.tagsRaw != null ? note.tagsRaw : (Array.isArray(note.tags) ? note.tags.join(',') : (note.tags || ''))),
      type: isProj ? 'project' : (isBug ? 'bug' : (isHw ? 'hardware' : 'note')),
      // 硬件库存字段（仅硬件类型有意义）
      hwName: isHw ? (note.hwName || '').trim() : '',
      hwModel: isHw ? (note.hwModel || '').trim() : '',
      hwVoltage: isHw ? (note.hwVoltage || '').trim() : '',
      hwProtocol: isHw ? (note.hwProtocol || '') : '',
      hwPins: isHw ? (note.hwPins || '') : '',
      // Bug 报告字段（仅 bug 类型有意义）
      bugSymptom: isBug ? (note.bugSymptom || '').trim() : '',
      bugSteps: isBug ? (note.bugSteps || '') : '',
      bugRootCause: isBug ? (note.bugRootCause || '') : '',
      bugSolved: isBug ? !!note.bugSolved : false,
      // 项目字段（仅 project 类型有意义）
      projName: isProj ? (note.projName || '').trim() : '',
      projMcu: isProj ? (note.projMcu || '').trim() : '',
      projPeripherals: isProj ? (note.projPeripherals || '') : '',
      projGithub: isProj ? (note.projGithub || '').trim() : '',
      projStatus: isProj ? (note.projStatus || '规划中') : '',
      projDesc: isProj ? (note.projDesc || '') : '',
      // 学习路标关联（笔记 → 目标）：显式传入（含 ''）时以传入为准，未传则保留既有值
      goalId: (note.goalId != null) ? note.goalId : (existing ? (existing.goalId || '') : ''),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    if (existing) {
      var idx = list.indexOf(existing);
      list[idx] = record;
    } else {
      list.push(record);
    }
    write(list);
    return record;
  }

  function getById(id) {
    return read().filter(function (n) { return n.id === id; })[0] || null;
  }

  function remove(id) {
    var list = read().filter(function (n) { return n.id !== id; });
    write(list);
  }

  /**
   * 整体替换笔记（用于 GitHub 同步拉取后回写本地）。
   * 只保留含 id 的对象，避免脏数据写坏 localStorage。
   */
  function replaceAll(list) {
    if (!Array.isArray(list)) return;
    var clean = list.filter(function (n) { return n && typeof n === 'object' && n.id; });
    write(clean);
  }

  /** 按标题模糊搜索（不区分大小写） */
  function searchByTitle(q) {
    var kw = (q || '').trim().toLowerCase();
    var list = getAll();
    if (!kw) return list;
    return list.filter(function (n) {
      return (n.title || '').toLowerCase().indexOf(kw) !== -1;
    });
  }

  /** 全文搜索：标题 + 正文 + 标签（不区分大小写），用于“查看相关笔记”等 */
  function searchAll(q) {
    var kw = (q || '').trim().toLowerCase();
    var list = getAll();
    if (!kw) return list;
    return list.filter(function (n) {
      var hay = ((n.title || '') + ' ' + (n.body || '') + ' ' + (n.tags || []).join(' ')).toLowerCase();
      return hay.indexOf(kw) !== -1;
    });
  }

  /** 按标签筛选 */
  function getByTag(tag) {
    if (!tag) return getAll();
    return getAll().filter(function (n) {
      return (n.tags || []).indexOf(tag) !== -1;
    });
  }

  /** 全部标签及数量（按数量倒序） */
  function getAllTags() {
    var counter = {};
    read().forEach(function (n) {
      (n.tags || []).forEach(function (t) {
        counter[t] = (counter[t] || 0) + 1;
      });
    });
    return Object.keys(counter)
      .map(function (t) { return { tag: t, count: counter[t] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  /** 统计：今日 / 本周 / 最近 7 天 */
  function stats() {
    var list = read();
    var now = new Date();
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 本周一 00:00（周一为一周起点）
    var day = now.getDay(); // 0=周日
    var diffToMon = (day === 0 ? 6 : day - 1);
    var startOfWeek = startOfToday - diffToMon * 86400000;

    var todayCount = 0;
    var weekCount = 0;
    list.forEach(function (n) {
      if (n.createdAt >= startOfToday) todayCount++;
      if (n.createdAt >= startOfWeek) weekCount++;
    });

    // 最近 7 天（含今天）
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(startOfToday - i * 86400000);
      days.push({
        label: i === 0 ? '今天' : (i === 1 ? '昨天' : (d.getMonth() + 1) + '/' + d.getDate()),
        start: d.getTime(),
        end: d.getTime() + 86400000,
        count: 0
      });
    }
    list.forEach(function (n) {
      for (var j = 0; j < days.length; j++) {
        if (n.createdAt >= days[j].start && n.createdAt < days[j].end) {
          days[j].count++;
          break;
        }
      }
    });

    return {
      today: todayCount,
      week: weekCount,
      total: list.length,
      last7: days
    };
  }

  /** 提取正文中所有图片 data URL（用于统计/清理，当前保留内嵌不做清理） */
  function extractImages(body) {
    var out = [];
    var m;
    IMG_TOKEN_RE.lastIndex = 0;
    while ((m = IMG_TOKEN_RE.exec(body)) !== null) out.push(m[1]);
    return out;
  }

  /** 提取正文中所有代码块（用于详情页高亮与复制） */
  function extractCodeBlocks(body) {
    var out = [];
    var m;
    CODE_TOKEN_RE.lastIndex = 0;
    while ((m = CODE_TOKEN_RE.exec(body)) !== null) {
      out.push({ lang: m[1], code: m[2] });
    }
    return out;
  }

  /** 统计正文中代码块数量 */
  function countCode(body) {
    return extractCodeBlocks(body || '').length;
  }

  /** 提取正文中所有 [[笔记标题]] 链接（去重、保序，返回标题字符串数组） */
  function extractLinks(body) {
    var out = [];
    var seen = {};
    var m;
    LINK_TOKEN_RE.lastIndex = 0;
    while ((m = LINK_TOKEN_RE.exec(body || '')) !== null) {
      var t = m[1].trim();
      if (t && !seen[t]) { seen[t] = true; out.push(t); }
    }
    return out;
  }

  /** 按标题精确匹配一条笔记（去首尾空白、大小写不敏感） */
  function getByTitle(title) {
    var key = (title || '').trim().toLowerCase();
    if (!key) return null;
    var found = null;
    read().forEach(function (n) {
      if (!found && (n.title || '').trim().toLowerCase() === key) found = n;
    });
    return found;
  }

  /** 按关键词筛选“硬件”笔记（外设名称/型号/电压/协议/引脚 模糊匹配，不区分大小写） */
  function searchHardware(q) {
    var kw = (q || '').trim().toLowerCase();
    return read().filter(function (n) {
      if (n.type !== 'hardware') return false;
      if (!kw) return true;
      var hay = [n.title, n.hwName, n.hwModel, n.hwVoltage, n.hwProtocol, n.hwPins]
        .join(' ').toLowerCase();
      return hay.indexOf(kw) !== -1;
    });
  }

  /** 返回所有“待解决”的 Bug 报告（type==='bug' 且 bugSolved 为假） */
  function getUnresolvedBugs() {
    return read().filter(function (n) {
      return n.type === 'bug' && !n.bugSolved;
    });
  }

  /** 返回所有“项目”类型笔记（按更新时间倒序） */
  function getProjects() {
    return read().filter(function (n) {
      return n.type === 'project';
    }).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
  }

  /** 判断文本是否为合法图片 data URL */
  function isImageDataUrl(s) {
    return typeof s === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s);
  }

  global.NoteStore = {
    getAll: getAll,
    getById: getById,
    save: save,
    remove: remove,
    replaceAll: replaceAll,
    searchByTitle: searchByTitle,
    searchAll: searchAll,
    getByTag: getByTag,
    getAllTags: getAllTags,
    stats: stats,
    parseTags: parseTags,
    extractImages: extractImages,
    isImageDataUrl: isImageDataUrl,
    extractCodeBlocks: extractCodeBlocks,
    countCode: countCode,
    extractLinks: extractLinks,
    getByTitle: getByTitle,
    searchHardware: searchHardware,
    getUnresolvedBugs: getUnresolvedBugs,
    getProjects: getProjects,
    IMG_TOKEN_RE: IMG_TOKEN_RE,
    CODE_TOKEN_RE: CODE_TOKEN_RE,
    LINK_TOKEN_RE: LINK_TOKEN_RE
  };
})(window);
