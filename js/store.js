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
  // 富文本 HTML 中的图片 / 代码块 / 双链
  var HTML_IMG_RE = /<img\b[^>]*src="(data:image\/[^"]+)"[^>]*>/g;
  var HTML_PRE_RE = /<pre\b([^>]*)>([\s\S]*?)<\/pre>/g;
  var HTML_LINK_RE = /<span\b[^>]*data-link="([^"]*)"[^>]*>/g;

  /** 正文转纯文本（依赖 richtext.js，缺失时原样返回） */
  function plain(body) {
    return (global.RichText && global.RichText.toPlainText) ? global.RichText.toPlainText(body || '') : (body || '');
  }

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

  // ---------- 持久化后端：优先 IndexedDB（大容量），回退 localStorage ----------
  // 根因：正文内嵌 base64 图片导致数据量远超 localStorage 约 5MB 上限，
  //       write() 触发 QuotaExceededError 使保存崩溃。IndexedDB 配额达数百 MB~GB 级。
  // 设计：read() 始终返回内存缓存（同步，保持原 API 不变）；write() 同步更新缓存、
  //      异步持久化到 IndexedDB；启动 load() 时载入缓存，并自动从旧 localStorage 迁移。
  var IDB_NAME = 'learning_notes_web';
  var IDB_STORE = 'notes';
  var idbSupported = (typeof indexedDB !== 'undefined');
  var dbPromise = null;
  var cache = null; // 内存缓存；非 null 时 read() 直接返回（浅拷贝以保持独立快照）

  function readLS() {
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

  function getDB() {
    if (!idbSupported) return Promise.reject(new Error('indexedDB 不可用'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function persistIDB(list) {
    if (!idbSupported) {
      // 回退：写入 localStorage（超配额时静默失败，不阻塞 UI）
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
      catch (e) { console.warn('localStorage 写入失败（容量超限），已回退', e); }
      return;
    }
    getDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        var os = tx.objectStore(IDB_STORE);
        os.clear();
        list.forEach(function (n) { if (n && n.id) os.put(n); });
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function (err) {
      console.warn('IndexedDB 持久化失败，回退 localStorage', err);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e2) { /* 忽略 */ }
    });
  }

  /** 启动时从 IndexedDB 载入内存缓存；首次运行自动从旧 localStorage 迁移 */
  function load() {
    if (cache) return Promise.resolve(cache);
    if (!idbSupported) { cache = readLS(); return Promise.resolve(cache); }
    return getDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = function () {
          var arr = req.result || [];
          if (arr.length === 0) {
            var ls = readLS(); // 迁移旧数据
            if (ls.length) { cache = ls; persistIDB(ls); resolve(cache); return; }
          }
          cache = arr;
          resolve(cache);
        };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function (err) {
      console.warn('IndexedDB 读取失败，回退 localStorage', err);
      cache = readLS();
      return cache;
    });
  }

  /** 同步读取（依赖已载入的内存缓存；未载入时回退 localStorage） */
  function read() {
    if (cache) return cache.slice(); // 浅拷贝，保持每次读取为独立快照
    return readLS();
  }

  /** 同步写入：立即更新内存缓存，异步持久化到 IndexedDB（回退 localStorage） */
  function write(list) {
    cache = list;
    persistIDB(list);
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
      var hay = ((n.title || '') + ' ' + plain(n.body) + ' ' + (n.tags || []).join(' ')).toLowerCase();
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

  /** 提取正文中所有图片 data URL（兼容旧 token 与富文本 HTML） */
  function extractImages(body) {
    var out = [];
    var m;
    var s = body || '';
    IMG_TOKEN_RE.lastIndex = 0;
    while ((m = IMG_TOKEN_RE.exec(s)) !== null) out.push(m[1]);
    HTML_IMG_RE.lastIndex = 0;
    while ((m = HTML_IMG_RE.exec(s)) !== null) {
      // HTML 属性中 & 被转义为 &amp;，还原
      out.push(m[1].replace(/&amp;/g, '&'));
    }
    return out;
  }

  /** 提取正文中所有代码块（兼容旧 token 与富文本 HTML <pre>） */
  function extractCodeBlocks(body) {
    var out = [];
    var m;
    var s = body || '';
    CODE_TOKEN_RE.lastIndex = 0;
    while ((m = CODE_TOKEN_RE.exec(s)) !== null) {
      out.push({ lang: m[1], code: m[2] });
    }
    HTML_PRE_RE.lastIndex = 0;
    while ((m = HTML_PRE_RE.exec(s)) !== null) {
      var langM = /data-lang="([^"]*)"/.exec(m[1]);
      var code = m[2].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      out.push({ lang: langM ? langM[1] : '', code: code });
    }
    return out;
  }

  /** 统计正文中代码块数量 */
  function countCode(body) {
    return extractCodeBlocks(body || '').length;
  }

  /** 提取正文中所有双链（兼容 [[标题]] token 与富文本 <span data-link>；去重、保序） */
  function extractLinks(body) {
    var out = [];
    var seen = {};
    var m;
    var s = body || '';
    function add(t) {
      t = (t || '').trim();
      if (t && !seen[t]) { seen[t] = true; out.push(t); }
    }
    HTML_LINK_RE.lastIndex = 0;
    while ((m = HTML_LINK_RE.exec(s)) !== null) add(m[1].replace(/&amp;/g, '&'));
    LINK_TOKEN_RE.lastIndex = 0;
    while ((m = LINK_TOKEN_RE.exec(s)) !== null) add(m[1]);
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
    load: load,
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
